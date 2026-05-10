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

from database import OHLCVDaily, Fundamental, PortfolioPosition, get_db
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
