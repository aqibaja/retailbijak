from __future__ import annotations

import logging

from sqlalchemy.orm import Session
from sqlalchemy import or_

try:
    from database import Fundamental, OHLCVDaily, Signal, Stock
except ModuleNotFoundError:
    from backend.database import Fundamental, OHLCVDaily, Signal, Stock

try:
    from updaters.sector_classifier import classify_by_keywords
except ModuleNotFoundError:
    from backend.updaters.sector_classifier import classify_by_keywords

logger = logging.getLogger(__name__)


def _ticker_base(ticker: str) -> str:
    return ticker.upper().replace('.JK', '').strip()


def _ticker_with_suffix(ticker: str) -> str:
    base = _ticker_base(ticker)
    return f'{base}.JK' if base else '.JK'


def _yfinance_fallback_sector_industry(ticker: str, db: Session) -> tuple[str | None, str | None]:
    """Try yfinance to populate missing sector/industry for a ticker."""
    try:
        import yfinance as yf
        tk = yf.Ticker(f'{ticker}.JK')
        info = tk.info or {}
        sector = info.get('sector')
        industry = info.get('industry')
        if sector or industry:
            stock = db.query(Stock).filter(Stock.ticker == ticker).first()
            if stock:
                updated = False
                if sector and not stock.sector:
                    stock.sector = sector
                    updated = True
                if industry and not stock.industry:
                    stock.industry = industry
                    updated = True
                if updated:
                    db.commit()
            return sector, industry
    except Exception as exc:
        logger.debug("yfinance sector/industry fallback failed for %s: %s", ticker, exc)
    return None, None


def _keyword_fallback_sector_industry(ticker: str, name: str, db: Session) -> tuple[str | None, str | None]:
    """Classify sector/industry using name-based keyword matching."""
    try:
        result = classify_by_keywords(ticker, name)
        if result:
            sector, industry = result
            stock = db.query(Stock).filter(Stock.ticker == ticker).first()
            if stock:
                updated = False
                if sector and not stock.sector:
                    stock.sector = sector
                    updated = True
                if industry and not stock.industry:
                    stock.industry = industry
                    updated = True
                if updated:
                    db.commit()
            return sector, industry or None
    except Exception as exc:
        logger.debug("Keyword sector/industry classification failed for %s: %s", ticker, exc)
    return None, None


def _fallback_row_for_ticker(ticker: str, db: Session) -> dict:
    base = _ticker_base(ticker)
    stock = db.query(Stock).filter(Stock.ticker == base).first()
    try:
        fundamental = db.query(Fundamental).filter(
            (Fundamental.ticker == base) | (Fundamental.ticker == f'{base}.JK')
        ).first()
    except Exception:
        fundamental = db.query(Fundamental).filter(Fundamental.ticker == f'{base}.JK').first()
    latest_ohlcv = (
        db.query(OHLCVDaily)
        .filter(OHLCVDaily.ticker == base)
        .order_by(OHLCVDaily.date.desc())
        .first()
    )
    latest_signal = (
        db.query(Signal)
        .filter(Signal.ticker == base)
        .order_by(Signal.signal_date.desc())
        .first()
    )

    # Determine sector/industry
    sector = stock.sector if stock else None
    industry = stock.industry if stock else None

    # Debug logging for missing data
    if not stock:
        logger.warning("Stock not found in DB for ticker '%s'", base)
    else:
        if not sector:
            logger.info("Sector missing for %s — will try yfinance fallback", base)
        if not industry:
            logger.info("Industry missing for %s — will try yfinance fallback", base)

    # If sector/industry are missing and the stock exists, try yfinance fallback
    if stock and (not sector or not industry):
        yf_sector, yf_industry = _yfinance_fallback_sector_industry(base, db)
        if not sector and yf_sector:
            sector = yf_sector
        if not industry and yf_industry:
            industry = yf_industry

    # If still missing, try keyword-based classification
    if stock and (not sector or not industry):
        kw_sector, kw_industry = _keyword_fallback_sector_industry(base, stock.name or '', db)
        if not sector and kw_sector:
            sector = kw_sector
            logger.info("Keyword classification assigned sector='%s' for %s", sector, base)
        if not industry and kw_industry:
            industry = kw_industry
            logger.info("Keyword classification assigned industry='%s' for %s", industry, base)

    # Price with logging
    price = latest_ohlcv.close if latest_ohlcv else None
    if not price:
        logger.info("No OHLCV price found for %s", base)

    return {
        'ticker': base,
        'name': stock.name if stock and stock.name else base,
        'sector': sector,
        'industry': industry,
        'price': price,
        'change_pct': None,
        'market_cap': stock.market_cap if stock else None,
        'per': fundamental.trailing_pe if fundamental else None,
        'pbv': fundamental.price_to_book if fundamental else None,
        'roe': fundamental.roe if fundamental else None,
        'roa': fundamental.roa if fundamental else None,
        'dividend_yield': fundamental.dividend_yield if fundamental else None,
        'signals': [{'timeframe': latest_signal.timeframe, 'signal_type': latest_signal.signal_type}] if latest_signal else [],
    }
