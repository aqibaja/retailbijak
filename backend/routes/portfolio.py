"""
Portfolio API Routes
=====================
Endpoints for portfolio analysis, including the What-If Simulator.
"""
from __future__ import annotations

from datetime import datetime, date
from math import pow

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import OHLCVDaily, Fundamental, PortfolioPosition, Stock, PaperTrade, get_db
from routes.shared_stock_fallbacks import _ticker_base

router = APIRouter()


class WhatIfPayload(BaseModel):
    ticker: str = Field(min_length=1)
    buy_price: float = Field(gt=0)
    shares: int = Field(gt=0)
    buy_date: str | None = None  # "YYYY-MM-DD", optional
    sell_date: str | None = None  # "YYYY-MM-DD", optional


@router.post("/api/portfolio/what-if")
def portfolio_what_if(payload: WhatIfPayload, db: Session = Depends(get_db)):
    """Simulate a hypothetical buy & sell scenario for a given ticker."""
    base = _ticker_base(payload.ticker)

    # Determine available date range for this ticker
    date_range = db.query(
        func.min(OHLCVDaily.date).label("earliest"),
        func.max(OHLCVDaily.date).label("latest"),
        func.count(OHLCVDaily.date).label("data_points"),
    ).filter(OHLCVDaily.ticker == base).first()

    if not date_range or date_range.earliest is None:
        # Try with .JK suffix
        ticker_jk = f"{base}.JK"
        date_range = db.query(
            func.min(OHLCVDaily.date).label("earliest"),
            func.max(OHLCVDaily.date).label("latest"),
            func.count(OHLCVDaily.date).label("data_points"),
        ).filter(OHLCVDaily.ticker == ticker_jk).first()

        if not date_range or date_range.earliest is None:
            raise HTTPException(status_code=404, detail=f"No OHLCV data found for ticker '{payload.ticker}'")
        ticker_to_use = ticker_jk
    else:
        ticker_to_use = base

    earliest_date = date_range.earliest
    latest_date = date_range.latest
    data_points = date_range.data_points

    # Resolve buy_date
    buy_date_raw = payload.buy_date
    if buy_date_raw:
        buy_date_target = _parse_date(buy_date_raw)
    else:
        buy_date_target = earliest_date

    # Resolve sell_date
    sell_date_raw = payload.sell_date
    if sell_date_raw:
        sell_date_target = _parse_date(sell_date_raw)
    else:
        sell_date_target = latest_date

    # Find closest close price to buy_date_target (at or before)
    buy_row = db.query(OHLCVDaily).filter(
        OHLCVDaily.ticker == ticker_to_use,
        OHLCVDaily.date <= buy_date_target,
    ).order_by(OHLCVDaily.date.desc()).first()

    # If nothing before, use the first available
    if buy_row is None:
        buy_row = db.query(OHLCVDaily).filter(
            OHLCVDaily.ticker == ticker_to_use,
        ).order_by(OHLCVDaily.date.asc()).first()

    if buy_row is None:
        raise HTTPException(status_code=404, detail=f"No OHLCV data found for ticker '{payload.ticker}'")

    actual_buy_date = buy_row.date

    # Find closest close price to sell_date_target (at or before)
    sell_row = db.query(OHLCVDaily).filter(
        OHLCVDaily.ticker == ticker_to_use,
        OHLCVDaily.date <= sell_date_target,
    ).order_by(OHLCVDaily.date.desc()).first()

    if sell_row is None:
        # If nothing before, use the last available
        sell_row = db.query(OHLCVDaily).filter(
            OHLCVDaily.ticker == ticker_to_use,
        ).order_by(OHLCVDaily.date.desc()).first()

    if sell_row is None:
        raise HTTPException(status_code=404, detail=f"No OHLCV data found for ticker '{payload.ticker}'")

    actual_sell_date = sell_row.date

    # Compute values
    total_investment = payload.buy_price * payload.shares
    sell_price = sell_row.close
    current_value = sell_price * payload.shares
    pnl = current_value - total_investment
    pnl_pct = ((sell_price - payload.buy_price) / payload.buy_price) * 100

    # Holding period in days
    if isinstance(actual_buy_date, datetime):
        buy_dt = actual_buy_date
    else:
        buy_dt = datetime.combine(actual_buy_date, datetime.min.time())

    if isinstance(actual_sell_date, datetime):
        sell_dt = actual_sell_date
    else:
        sell_dt = datetime.combine(actual_sell_date, datetime.min.time())

    holding_period_days = (sell_dt - buy_dt).days
    if holding_period_days < 0:
        holding_period_days = 0

    # CAGR
    if holding_period_days > 0 and payload.buy_price > 0:
        years = holding_period_days / 365.0
        cagr = (pow(sell_price / payload.buy_price, 1.0 / years) - 1) * 100
    else:
        cagr = 0.0

    # Format dates as strings
    buy_date_str = _format_date(actual_buy_date)
    sell_date_str = _format_date(actual_sell_date)

    return {
        "ticker": base,
        "buy_price": payload.buy_price,
        "shares": payload.shares,
        "total_investment": total_investment,
        "buy_date": buy_date_str,
        "sell_date": sell_date_str,
        "sell_price": sell_price,
        "current_value": current_value,
        "pnl": round(pnl, 2),
        "pnl_pct": round(pnl_pct, 2),
        "pnl_annualized": round(cagr, 2),
        "holding_period_days": holding_period_days,
        "data_points": data_points,
    }


def _parse_date(date_str: str) -> datetime:
    """Parse 'YYYY-MM-DD' string to datetime."""
    try:
        parts = date_str.strip().split("-")
        return datetime(int(parts[0]), int(parts[1]), int(parts[2]))
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail=f"Invalid date format: '{date_str}'. Expected YYYY-MM-DD.")


def _format_date(dt: datetime | date) -> str:
    """Format a datetime or date object to 'YYYY-MM-DD' string."""
    if isinstance(dt, datetime):
        return dt.strftime("%Y-%m-%d")
    return dt.isoformat()


@router.get('/api/portfolio/sector-allocation')
def portfolio_sector_allocation(db: Session = Depends(get_db)):
    """Return portfolio value breakdown by sector."""
    SECTOR_COLORS = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
        '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
    ]

    positions = db.query(PortfolioPosition).all()

    if not positions:
        # Dummy data — 5 representative IDX sectors
        dummy = [
            {'name': 'Keuangan',        'value': 35_000_000},
            {'name': 'Energi',          'value': 20_000_000},
            {'name': 'Konsumer',        'value': 18_000_000},
            {'name': 'Infrastruktur',   'value': 15_000_000},
            {'name': 'Teknologi',       'value': 12_000_000},
        ]
        total = sum(d['value'] for d in dummy)
        sectors = [
            {
                'name':  d['name'],
                'value': d['value'],
                'pct':   round(d['value'] / total * 100, 1),
                'color': SECTOR_COLORS[i % len(SECTOR_COLORS)],
            }
            for i, d in enumerate(dummy)
        ]
        return {'sectors': sectors, 'total_value': total, 'is_dummy': True}

    # Build sector → value map
    sector_map: dict[str, float] = {}
    total_value = 0.0

    for pos in positions:
        ticker = pos.ticker
        base = _ticker_base(ticker)
        shares = (pos.lots or 0) * 100

        # Resolve current price from OHLCV
        price_row = db.query(OHLCVDaily).filter(
            OHLCVDaily.ticker == ticker,
        ).order_by(OHLCVDaily.date.desc()).first()
        if price_row is None:
            price_row = db.query(OHLCVDaily).filter(
                OHLCVDaily.ticker == f'{base}.JK',
            ).order_by(OHLCVDaily.date.desc()).first()

        price = price_row.close if price_row else (pos.avg_price or 0)
        value = shares * price

        # Resolve sector from stocks table
        stock = db.query(Stock).filter(Stock.ticker == ticker).first()
        if stock is None:
            stock = db.query(Stock).filter(Stock.ticker == f'{base}.JK').first()

        sector_name = (stock.sector if stock and stock.sector else 'Lainnya').strip() or 'Lainnya'

        sector_map[sector_name] = sector_map.get(sector_name, 0.0) + value
        total_value += value

    if total_value == 0:
        total_value = 1  # avoid division by zero

    # Sort descending by value
    sorted_sectors = sorted(sector_map.items(), key=lambda x: x[1], reverse=True)

    sectors = [
        {
            'name':  name,
            'value': round(val, 2),
            'pct':   round(val / total_value * 100, 1),
            'color': SECTOR_COLORS[i % len(SECTOR_COLORS)],
        }
        for i, (name, val) in enumerate(sorted_sectors)
    ]

    return {'sectors': sectors, 'total_value': round(total_value, 2), 'is_dummy': False}


@router.get('/api/portfolio/dividends')
def portfolio_dividend_projection(db: Session = Depends(get_db)):
    """Project annual dividend income for all portfolio positions."""
    positions = db.query(PortfolioPosition).order_by(PortfolioPosition.ticker.asc()).all()

    if not positions:
        return {
            "total_projected_dividend": 0,
            "total_invested": 0,
            "total_current_value": 0,
            "average_yield": 0.0,
            "positions": [],
        }

    results = []
    total_current_value = 0.0
    total_invested = 0.0
    total_dividend = 0.0

    for pos in positions:
        ticker = pos.ticker
        base = _ticker_base(ticker)
        lots = pos.lots or 0
        avg_price = pos.avg_price or 0

        shares = lots * 100

        # Get current close price from OHLCV daily (most recent)
        price_row = db.query(OHLCVDaily).filter(
            OHLCVDaily.ticker == ticker,
        ).order_by(OHLCVDaily.date.desc()).first()

        if price_row is None:
            # Try with .JK suffix
            price_row = db.query(OHLCVDaily).filter(
                OHLCVDaily.ticker == f"{base}.JK",
            ).order_by(OHLCVDaily.date.desc()).first()

        current_price = price_row.close if price_row else 0.0
        current_value = shares * current_price

        # Get Fundamental dividend yield
        fund = db.query(Fundamental).filter(Fundamental.ticker == ticker).first()
        if fund is None:
            fund = db.query(Fundamental).filter(Fundamental.ticker == f"{base}.JK").first()

        dividend_yield = 0.0
        if fund and fund.dividend_yield is not None:
            dividend_yield = fund.dividend_yield

        # dividend_yield stored as percentage (e.g. 3.5 means 3.5%)
        annual_dividend_est = current_value * (dividend_yield / 100.0)

        total_current_value += current_value
        total_invested += shares * avg_price
        total_dividend += annual_dividend_est

        results.append({
            "ticker": base,
            "lots": lots,
            "shares": shares,
            "avg_price": avg_price,
            "current_price": round(current_price, 2),
            "current_value": round(current_value, 2),
            "dividend_yield": round(dividend_yield, 2),
            "annual_dividend_est": round(annual_dividend_est, 2),
            "income_pct": 0.0,  # placeholder, computed below
        })

    # Sort by annual_dividend_est descending
    results.sort(key=lambda r: r["annual_dividend_est"], reverse=True)

    # Compute income_pct for each position
    for r in results:
        if total_dividend > 0:
            r["income_pct"] = round((r["annual_dividend_est"] / total_dividend) * 100, 2)
        else:
            r["income_pct"] = 0.0

    # Weighted average yield
    average_yield = 0.0
    if total_current_value > 0:
        average_yield = round((total_dividend / total_current_value) * 100, 2)

    return {
        "total_projected_dividend": round(total_dividend, 2),
        "total_invested": round(total_invested, 2),
        "total_current_value": round(total_current_value, 2),
        "average_yield": average_yield,
        "positions": results,
    }


# ---------------------------------------------------------------------------
# Paper Trades — Pydantic schemas
# ---------------------------------------------------------------------------

class PaperTradeOpen(BaseModel):
    ticker: str = Field(min_length=1)
    lots: int = Field(gt=0)
    entry_price: float = Field(gt=0)
    direction: str = Field(default="BUY")  # BUY or SELL
    notes: str = ""


class PaperTradeClose(BaseModel):
    exit_price: float = Field(gt=0)
    close_date: str | None = None  # "YYYY-MM-DD", optional


# ---------------------------------------------------------------------------
# Helper: get latest close price for a ticker from ohlcv_daily
# ---------------------------------------------------------------------------

def _latest_price(ticker: str, db: Session) -> float | None:
    base = _ticker_base(ticker)
    row = (
        db.query(OHLCVDaily.close)
        .filter(OHLCVDaily.ticker == base)
        .order_by(OHLCVDaily.date.desc())
        .first()
    )
    if row:
        return row.close
    # try .JK suffix
    row = (
        db.query(OHLCVDaily.close)
        .filter(OHLCVDaily.ticker == f"{base}.JK")
        .order_by(OHLCVDaily.date.desc())
        .first()
    )
    return row.close if row else None


def _calc_pnl(trade: PaperTrade, current_price: float | None) -> dict:
    """Return unrealized or realized P&L dict for a trade."""
    lots = trade.quantity // 100  # quantity stored as shares; 1 lot = 100 shares
    shares = trade.quantity
    multiplier = 1 if trade.trade_type == "BUY" else -1

    if trade.status == "closed" and trade.exit_price is not None:
        pnl = multiplier * (trade.exit_price - trade.entry_price) * shares
        pnl_pct = multiplier * (trade.exit_price - trade.entry_price) / trade.entry_price * 100
        cur = trade.exit_price
    else:
        cur = current_price or trade.entry_price
        pnl = multiplier * (cur - trade.entry_price) * shares
        pnl_pct = multiplier * (cur - trade.entry_price) / trade.entry_price * 100

    return {
        "id": trade.id,
        "ticker": trade.ticker,
        "trade_type": trade.trade_type,
        "direction": trade.trade_type,
        "lots": lots,
        "quantity": shares,
        "entry_price": trade.entry_price,
        "exit_price": trade.exit_price,
        "current_price": round(cur, 2),
        "entry_date": trade.entry_date.isoformat() if trade.entry_date else None,
        "exit_date": trade.exit_date.isoformat() if trade.exit_date else None,
        "pnl": round(pnl, 2),
        "pnl_pct": round(pnl_pct, 4),
        "status": trade.status,
        "notes": trade.notes or "",
    }


# ---------------------------------------------------------------------------
# GET /api/paper-trades — list all positions with unrealized P&L
# ---------------------------------------------------------------------------

@router.get("/api/paper-trades")
def list_paper_trades(status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(PaperTrade)
    if status in ("open", "closed"):
        q = q.filter(PaperTrade.status == status)
    trades = q.order_by(PaperTrade.entry_date.desc()).all()

    data = []
    for t in trades:
        cur = _latest_price(t.ticker, db) if t.status == "open" else None
        data.append(_calc_pnl(t, cur))

    return {"count": len(data), "data": data}


# ---------------------------------------------------------------------------
# GET /api/paper-trades/summary
# ---------------------------------------------------------------------------

@router.get("/api/paper-trades/summary")
def paper_trades_summary(db: Session = Depends(get_db)):
    trades = db.query(PaperTrade).all()
    total = len(trades)
    open_count = sum(1 for t in trades if t.status == "open")

    total_pnl = 0.0
    wins = 0
    closed_count = 0

    for t in trades:
        cur = _latest_price(t.ticker, db) if t.status == "open" else None
        row = _calc_pnl(t, cur)
        total_pnl += row["pnl"]
        if t.status == "closed":
            closed_count += 1
            if row["pnl"] > 0:
                wins += 1

    win_rate = round(wins / closed_count * 100, 1) if closed_count > 0 else 0.0

    return {
        "total": total,
        "open_count": open_count,
        "closed_count": closed_count,
        "total_pnl": round(total_pnl, 2),
        "win_rate": win_rate,
    }


# ---------------------------------------------------------------------------
# POST /api/paper-trades — buka posisi baru
# ---------------------------------------------------------------------------

@router.post("/api/paper-trades")
def open_paper_trade(payload: PaperTradeOpen, db: Session = Depends(get_db)):
    ticker = payload.ticker.strip().upper()
    direction = payload.direction.upper()
    if direction not in ("BUY", "SELL"):
        raise HTTPException(status_code=400, detail="direction harus BUY atau SELL")

    shares = payload.lots * 100  # 1 lot = 100 saham IDX

    trade = PaperTrade(
        ticker=ticker,
        trade_type=direction,
        entry_price=payload.entry_price,
        quantity=shares,
        entry_date=datetime.utcnow(),
        status="open",
        notes=payload.notes,
    )
    db.add(trade)
    db.commit()
    db.refresh(trade)

    return {
        "ok": True,
        "message": f"Posisi {direction} {ticker} ({payload.lots} lot) dibuka @ Rp{payload.entry_price:,.0f}",
        "id": trade.id,
    }


# ---------------------------------------------------------------------------
# PUT /api/paper-trades/{id}/close — tutup posisi
# ---------------------------------------------------------------------------

@router.put("/api/paper-trades/{trade_id}/close")
def close_paper_trade(trade_id: int, payload: PaperTradeClose, db: Session = Depends(get_db)):
    trade = db.query(PaperTrade).filter(PaperTrade.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade tidak ditemukan")
    if trade.status == "closed":
        raise HTTPException(status_code=400, detail="Trade sudah ditutup")

    shares = trade.quantity
    multiplier = 1 if trade.trade_type == "BUY" else -1
    pnl = multiplier * (payload.exit_price - trade.entry_price) * shares
    pnl_pct = multiplier * (payload.exit_price - trade.entry_price) / trade.entry_price * 100

    close_dt = datetime.utcnow()
    if payload.close_date:
        try:
            close_dt = datetime.strptime(payload.close_date, "%Y-%m-%d")
        except ValueError:
            pass

    trade.exit_price = payload.exit_price
    trade.exit_date = close_dt
    trade.pnl = round(pnl, 2)
    trade.pnl_pct = round(pnl_pct, 4)
    trade.status = "closed"
    db.commit()

    return {
        "ok": True,
        "message": f"Posisi {trade.ticker} ditutup @ Rp{payload.exit_price:,.0f} | P&L: Rp{pnl:,.0f}",
        "pnl": round(pnl, 2),
        "pnl_pct": round(pnl_pct, 4),
    }


# ---------------------------------------------------------------------------
# POST /api/paper-trades/{id}/close — alias (frontend lama pakai POST)
# ---------------------------------------------------------------------------

@router.post("/api/paper-trades/{trade_id}/close")
def close_paper_trade_post(trade_id: int, price: float, db: Session = Depends(get_db)):
    """Legacy: close via query param ?price=xxx (POST)."""
    trade = db.query(PaperTrade).filter(PaperTrade.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade tidak ditemukan")
    if trade.status == "closed":
        raise HTTPException(status_code=400, detail="Trade sudah ditutup")

    shares = trade.quantity
    multiplier = 1 if trade.trade_type == "BUY" else -1
    pnl = multiplier * (price - trade.entry_price) * shares
    pnl_pct = multiplier * (price - trade.entry_price) / trade.entry_price * 100

    trade.exit_price = price
    trade.exit_date = datetime.utcnow()
    trade.pnl = round(pnl, 2)
    trade.pnl_pct = round(pnl_pct, 4)
    trade.status = "closed"
    db.commit()

    return {
        "ok": True,
        "message": f"Posisi {trade.ticker} ditutup @ Rp{price:,.0f} | P&L: Rp{pnl:,.0f}",
        "pnl": round(pnl, 2),
    }


# ---------------------------------------------------------------------------
# DELETE /api/paper-trades/{id} — hapus posisi
# ---------------------------------------------------------------------------

@router.delete("/api/paper-trades/{trade_id}")
def delete_paper_trade(trade_id: int, db: Session = Depends(get_db)):
    trade = db.query(PaperTrade).filter(PaperTrade.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade tidak ditemukan")
    db.delete(trade)
    db.commit()
    return {"ok": True, "message": "Trade dihapus"}
