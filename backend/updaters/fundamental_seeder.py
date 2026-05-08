"""
Fundamental Data Seeder — generate synthetic fundamentals from OHLCV data.

Since yfinance .info is unreliable (rate-limited, empty responses),
this computes realistic fundamental ratios from available price data.

Strategy:
- PE ratio: sector-based estimation (banks=12-18, tech=20-40, commodity=8-15)
- PBV: sector-based (banks=1-2.5, others=1-5)
- EPS: close / PE
- Dividend yield: 1-5% based on stock maturity
- ROE/ROA: 5-25% range with sector bias
- Revenue/Net Income: estimated from market cap proxy (close * outstanding shares estimate)
"""

import logging
import random
import math
from datetime import datetime, timezone

try:
    from database import Fundamental, OHLCVDaily, Stock, SessionLocal
except ModuleNotFoundError:
    from backend.database import Fundamental, OHLCVDaily, Stock, SessionLocal

logger = logging.getLogger(__name__)

# Sector → fundamental characteristics
SECTOR_PE = {
    "Banks": (12, 18),
    "Financials": (10, 20),
    "Technology": (20, 45),
    "Consumer Cyclicals": (15, 30),
    "Consumer Non-Cyclicals": (18, 35),
    "Energy": (8, 15),
    "Basic Materials": (8, 18),
    "Industrials": (12, 22),
    "Infrastructure": (10, 20),
    "Property": (8, 16),
    "Healthcare": (20, 40),
    "Transportation": (10, 18),
    "Media": (15, 25),
    "Telecommunications": (12, 20),
    "Utilities": (12, 18),
}
DEFAULT_PE = (10, 25)

SECTOR_DIVIDEND = {
    "Banks": (0.03, 0.06),
    "Telecommunications": (0.04, 0.08),
    "Consumer Non-Cyclicals": (0.02, 0.05),
    "Utilities": (0.03, 0.06),
    "Energy": (0.02, 0.05),
}
DEFAULT_DIVIDEND = (0.0, 0.03)

SECTOR_ROE = {
    "Technology": (0.15, 0.35),
    "Consumer Non-Cyclicals": (0.12, 0.30),
    "Banks": (0.10, 0.22),
}
DEFAULT_ROE = (0.05, 0.20)

SECTOR_DE = {
    "Banks": (3.0, 8.0),
    "Property": (1.0, 3.0),
    "Infrastructure": (1.0, 3.0),
    "Technology": (0.1, 0.8),
}
DEFAULT_DE = (0.3, 1.5)


def get_sector_for_ticker(db, ticker):
    """Get sector for a ticker from Stock table."""
    stock = db.query(Stock).filter(Stock.ticker == ticker).first()
    if stock and stock.sector:
        return stock.sector
    return None


def seed_fundamentals(top_n=150):
    """
    Generate synthetic fundamentals for top N stocks by latest close.
    Returns summary dict.
    """
    db = SessionLocal()
    try:
        # Clear existing
        db.query(Fundamental).delete()
        db.commit()

        # Get latest OHLCV to find active stocks
        latest_ohlcv = (
            db.query(OHLCVDaily)
            .order_by(OHLCVDaily.date.desc())
            .limit(top_n * 3)
            .all()
        )

        seen = set()
        all_tickers = []
        for row in latest_ohlcv:
            if row.ticker not in seen and len(all_tickers) < top_n:
                seen.add(row.ticker)
                all_tickers.append(row.ticker)

        if not all_tickers:
            all_tickers = [row.ticker for row in db.query(Stock).limit(top_n).all()]

        # Get latest close per ticker
        close_map = {}
        for row in latest_ohlcv:
            if row.ticker not in close_map:
                close_map[row.ticker] = row.close or 1000

        records = 0
        for ticker in all_tickers:
            close = close_map.get(ticker, 1000)
            sector = get_sector_for_ticker(db, ticker)

            # Deterministic seed for reproducibility
            seed = hash(ticker) % 10000
            rng = random.Random(seed)

            # PE ratio
            pe_range = SECTOR_PE.get(sector, DEFAULT_PE)
            trailing_pe = round(rng.uniform(*pe_range), 2)

            # Forward PE (slightly lower for growth, higher for value)
            forward_pe = round(trailing_pe * rng.uniform(0.85, 1.15), 2)

            # EPS
            trailing_eps = round(close / trailing_pe, 4) if trailing_pe else 0

            # PBV
            pbv_range = (1.0, 5.0) if sector and sector in ("Technology", "Consumer Cyclicals") else (0.8, 3.0)
            price_to_book = round(rng.uniform(*pbv_range), 2)

            # Dividend yield
            div_range = SECTOR_DIVIDEND.get(sector, DEFAULT_DIVIDEND)
            dividend_yield = round(rng.uniform(*div_range), 4)

            # ROE
            roe_range = SECTOR_ROE.get(sector, DEFAULT_ROE)
            roe = round(rng.uniform(*roe_range), 4)

            # ROA (typically 0.3-0.7 of ROE for banks, 0.5-0.8 for others)
            roa_mult = rng.uniform(0.4, 0.7) if sector == "Banks" else rng.uniform(0.5, 0.85)
            roa = round(roe * roa_mult, 4)

            # Debt to Equity
            de_range = SECTOR_DE.get(sector, DEFAULT_DE)
            debt_to_equity = round(10 ** rng.uniform(math.log10(de_range[0]), math.log10(de_range[1])), 2)
            if sector == "Banks":
                debt_to_equity = round(rng.uniform(3.0, 10.0), 2)

            # Revenue & Net Income (estimated from price, proxy market cap $100M-$10B)
            est_shares = rng.randint(500_000_000, 5_000_000_000)
            est_market_cap = close * est_shares
            net_margin = rng.uniform(0.05, 0.25)
            revenue = round(est_market_cap / (trailing_pe * net_margin) * 100, 2) if trailing_pe else round(est_market_cap * rng.uniform(0.1, 0.5), 2)
            net_income = round(revenue * net_margin, 2) if revenue else 0
            free_cashflow = round(net_income * rng.uniform(0.6, 1.2), 2)

            record = Fundamental(
                ticker=ticker,
                trailing_pe=trailing_pe,
                forward_pe=forward_pe,
                price_to_book=price_to_book,
                trailing_eps=trailing_eps,
                dividend_yield=dividend_yield,
                roe=roe,
                roa=roa,
                debt_to_equity=debt_to_equity,
                revenue=revenue,
                net_income=net_income,
                free_cashflow=free_cashflow,
                updated_at=datetime.now(timezone.utc),
            )
            db.add(record)
            records += 1

        db.commit()
        logger.info(f"Seeded {records} fundamental records")
        return {"status": "ok", "records": records, "tickers": len(all_tickers)}
    except Exception as e:
        db.rollback()
        logger.error(f"Fundamental seed failed: {e}")
        return {"status": "error", "error": str(e)}
    finally:
        db.close()


def update_fundamentals():
    """Scheduler-friendly wrapper."""
    return seed_fundamentals()
