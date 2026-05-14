from __future__ import annotations

from sqlalchemy.orm import Session

try:
    from database import Fundamental, OHLCVDaily, Signal, Stock
except ModuleNotFoundError:
    from backend.database import Fundamental, OHLCVDaily, Signal, Stock


def _ticker_base(ticker: str) -> str:
    return ticker.upper().replace('.JK', '').strip()


def _ticker_with_suffix(ticker: str) -> str:
    base = _ticker_base(ticker)
    return f'{base}.JK' if base else '.JK'


def _fallback_row_for_ticker(ticker: str, db: Session) -> dict:
    base = _ticker_base(ticker)
    stock = db.query(Stock).filter(Stock.ticker == base).first()
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
    return {
        'ticker': base,
        'name': stock.name if stock and stock.name else base,
        'sector': stock.sector if stock else None,
        'industry': stock.industry if stock else None,
        'price': latest_ohlcv.close if latest_ohlcv else None,
        'change_pct': None,
        'market_cap': stock.market_cap if stock else None,
        'per': fundamental.trailing_pe if fundamental else None,
        'pbv': fundamental.price_to_book if fundamental else None,
        'roe': fundamental.roe if fundamental else None,
        'roa': fundamental.roa if fundamental else None,
        'dividend_yield': fundamental.dividend_yield if fundamental else None,
        'signals': [{'timeframe': latest_signal.timeframe, 'signal_type': latest_signal.signal_type}] if latest_signal else [],
    }
