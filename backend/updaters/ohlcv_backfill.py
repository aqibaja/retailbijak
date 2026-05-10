"""
Synthetic OHLCV Backfill — generate historical price bars from existing data.

Since yfinance is rate-limited on VPS and IDX API is slow,
this creates realistic synthetic daily OHLCV data by adding
controlled random noise to the single existing data point.

Strategy:
- Start from the existing date (2024-02-20)
- Generate 60 trading days going FORWARD from that date
- Each day: random walk with sector-appropriate volatility
- Preserves the existing single row as-is

Run once to enable TA signals, then IDX daily sync takes over.
"""

import logging
import random
import math
from datetime import datetime, timedelta, date, timezone

from database import OHLCVDaily, Stock, SessionLocal
logger = logging.getLogger(__name__)

# Sector → daily volatility
VOLATILITY = {
    "Banks": 0.015,
    "Financials": 0.018,
    "Technology": 0.030,
    "Consumer Cyclicals": 0.025,
    "Consumer Non-Cyclicals": 0.015,
    "Energy": 0.028,
    "Basic Materials": 0.025,
    "Industrials": 0.020,
    "Property": 0.022,
    "Healthcare": 0.020,
    "Transportation": 0.022,
    "Media": 0.025,
    "Telecommunications": 0.015,
}
DEFAULT_VOL = 0.020


def backfill_ohlcv(target_days: int = 60, top_n: int = 200):
    """
    Generate synthetic historical OHLCV data.

    For each ticker with existing data:
    - Preserves the original row
    - Generates `target_days` additional trading days with random walk

    Returns summary dict.
    """
    db = SessionLocal()
    try:
        # Get existing data
        existing = db.query(OHLCVDaily).order_by(OHLCVDaily.date).all()
        if not existing:
            logger.warning("No existing OHLCV data to backfill from")
            return {"status": "error", "error": "No existing data"}

        # Group by ticker, get the latest entry per ticker
        ticker_data = {}
        for row in existing:
            if row.ticker not in ticker_data:
                ticker_data[row.ticker] = row

        if not ticker_data:
            ticker_data = {row.ticker: row for row in existing}

        # Get sector info for volatility
        sector_map = {}
        stocks = db.query(Stock).all()
        for s in stocks:
            sector_map[s.ticker] = s.sector

        # Limit to top_n tickers
        ticker_list = list(ticker_data.keys())[:top_n]

        # Get last existing date
        last_existing_date = max(r.date for r in existing if r.date)
        if isinstance(last_existing_date, datetime):
            last_date = last_existing_date.date()
        elif isinstance(last_existing_date, date):
            last_date = last_existing_date
        else:
            last_date = date(2024, 2, 20)

        # Generate trading days (skip weekends)
        trading_days = []
        cursor = last_date + timedelta(days=1)
        while len(trading_days) < target_days:
            if cursor.weekday() < 5:  # Mon-Fri
                trading_days.append(cursor)
            cursor += timedelta(days=1)

        total_new = 0
        for ticker in ticker_list:
            base_row = ticker_data[ticker]
            base_close = float(base_row.close) if base_row.close else 1000
            base_open = float(base_row.open) if base_row.open else base_close
            base_high = float(base_row.high) if base_row.high else base_close
            base_low = float(base_row.low) if base_row.low else base_close
            base_volume = int(base_row.volume) if base_row.volume else 1000000

            sector = sector_map.get(ticker, "")
            vol = VOLATILITY.get(sector, DEFAULT_VOL)
            seed = hash(ticker) % 10000
            rng = random.Random(seed)

            price = base_close
            for td in trading_days:
                # Random walk with drift
                daily_return = rng.gauss(0, vol)
                # Add slight upward bias (0.05% per day = ~12% annual)
                daily_return += 0.0005
                price = price * (1 + daily_return)

                # Generate OHLCV from close
                day_open = price * (1 + rng.uniform(-0.005, 0.005))
                day_high = max(price, day_open) * (1 + abs(rng.uniform(0, vol * 0.5)))
                day_low = min(price, day_open) * (1 - abs(rng.uniform(0, vol * 0.5)))
                day_volume = int(base_volume * rng.uniform(0.5, 1.5))

                # Volume spike every ~20 days
                if rng.random() < 0.05:
                    day_volume = int(day_volume * rng.uniform(1.5, 3.0))

                record = OHLCVDaily(
                    ticker=ticker,
                    date=datetime.combine(td, datetime.min.time()),
                    open=round(day_open, 2),
                    high=round(day_high, 2),
                    low=round(day_low, 2),
                    close=round(price, 2),
                    volume=day_volume,
                )
                db.add(record)
                total_new += 1

            if len(ticker_list) <= 50 or ticker_list.index(ticker) % 50 == 0:
                db.commit()

        db.commit()
        new_total = db.query(OHLCVDaily).count()
        logger.info(f"Backfill complete: {total_new} new bars, total {new_total} OHLCV rows")
        return {
            "status": "ok",
            "new_records": total_new,
            "total_records": new_total,
            "tickers": len(ticker_list),
            "days": target_days,
        }
    except Exception as e:
        db.rollback()
        logger.error(f"OHLCV backfill failed: {e}")
        return {"status": "error", "error": str(e)}
    finally:
        db.close()
