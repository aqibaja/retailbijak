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

from database import OHLCVDaily, get_db
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
