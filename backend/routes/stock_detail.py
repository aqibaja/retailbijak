from __future__ import annotations

from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

try:
    from database import Fundamental, OHLCVDaily, Signal, Stock, get_db
except ModuleNotFoundError:
    from backend.database import Fundamental, OHLCVDaily, Signal, Stock, get_db

try:
    from routes.stocks import _display_ticker
except ModuleNotFoundError:
    from backend.routes.stocks import _display_ticker

try:
    from services.idx_response_factory import ok as _resp_ok
except ModuleNotFoundError:
    from backend.services.idx_response_factory import ok as _resp_ok

router = APIRouter()


def _ticker_base(ticker: str) -> str:
    return ticker.upper().replace('.JK', '').strip()


def _fallback_row_for_ticker(ticker: str, db: Session) -> dict:
    base = _ticker_base(ticker)
    stock = db.query(Stock).filter(Stock.ticker == base).first()
    fundamental = db.query(Fundamental).filter(Fundamental.ticker == f"{base}.JK").first()
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


@router.get('/api/stocks/{ticker}')
def get_stock(ticker: str, db: Session = Depends(get_db)):
    base = _ticker_base(ticker)
    payload = _fallback_row_for_ticker(base, db)
    if not payload['price'] and not payload['signals']:
        return {'ticker': base, 'message': 'No signals found', 'data': payload}
    return {'ticker': base, 'data': payload}


def _compute_analysis_metrics_from_ohlcv(db: Session, ticker: str) -> dict[str, Any]:
    try:
        from indicators_extended import get_ohlcv_dataframe, calculate_all_indicators
    except ModuleNotFoundError:
        from backend.indicators_extended import get_ohlcv_dataframe, calculate_all_indicators

    df = get_ohlcv_dataframe(db, ticker, limit=100)
    if df.empty or len(df) < 20:
        return {'volume_spike': 1.0, 'trend_score': 50, 'volatility_score': 50, 'breakout': False}

    df = calculate_all_indicators(df)
    latest = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else latest

    close = float(latest['close']) if pd.notna(latest['close']) else 0
    volume = float(latest['volume']) if pd.notna(latest['volume']) else 0

    vol_sma20 = latest.get('vol_sma_20')
    if pd.isna(vol_sma20) or vol_sma20 is None or vol_sma20 == 0:
        vol_sma20 = volume
    volume_spike = round(volume / vol_sma20, 2) if vol_sma20 else 1.0

    sma5 = latest.get('sma_5')
    sma20 = latest.get('sma_20')
    sma50 = latest.get('sma_50')
    rsi = latest.get('rsi')
    trend = 50
    if pd.notna(sma5) and pd.notna(sma20):
        if close > sma5 > sma20:
            trend += 20
        elif close < sma5 < sma20:
            trend -= 20
        elif close > sma20:
            trend += 10
        elif close < sma20:
            trend -= 10
    if pd.notna(sma50):
        trend += 10 if close > sma50 else -10
    if pd.notna(rsi):
        trend += (rsi - 50) * 0.3
    trend_score = max(min(int(trend), 100), 0)

    atr = latest.get('atr')
    if pd.notna(atr) and close > 0:
        atr_pct = (atr / close) * 100
        vol_score = int(min(max(30 + atr_pct * 5, 0), 100))
    else:
        vol_score = 50
    volatility_score = vol_score

    bb_high = latest.get('bb_high')
    high_20 = df['high'].astype(float).tail(20).max() if len(df) >= 20 else close
    breakout = bool(close >= high_20 * 0.99 or (pd.notna(bb_high) and close > bb_high))

    return {
        'volume_spike': volume_spike,
        'trend_score': trend_score,
        'volatility_score': volatility_score,
        'breakout': breakout,
    }


@router.get('/api/stocks/{ticker}/analysis')
def get_stock_analysis(ticker: str, db: Session = Depends(get_db)):
    try:
        from backend.services.scanner_engine import analyze_stock
    except ModuleNotFoundError:
        from services.scanner_engine import analyze_stock

    row = _fallback_row_for_ticker(ticker, db)
    metrics = _compute_analysis_metrics_from_ohlcv(db, row['ticker'])
    row.update(metrics)
    analysis = analyze_stock(row)
    return _resp_ok(analysis, source='scanner_engine')


@router.get('/api/stocks/{ticker}/fundamental')
def get_fundamental(ticker: str, db: Session = Depends(get_db)):
    if not ticker.endswith('.JK'):
        ticker = f'{ticker}.JK'

    fundamental = db.query(Fundamental).filter(Fundamental.ticker == ticker).first()
    if not fundamental:
        return {'ticker': ticker, 'message': 'Fundamental data not found'}

    return {
        'ticker': ticker,
        'data': {
            'trailing_pe': fundamental.trailing_pe,
            'forward_pe': fundamental.forward_pe,
            'price_to_book': fundamental.price_to_book,
            'trailing_eps': fundamental.trailing_eps,
            'dividend_yield': fundamental.dividend_yield,
            'roe': fundamental.roe,
            'roa': fundamental.roa,
            'debt_to_equity': fundamental.debt_to_equity,
            'revenue': fundamental.revenue,
            'net_income': fundamental.net_income,
            'free_cashflow': fundamental.free_cashflow,
            'updated_at': fundamental.updated_at.isoformat() if fundamental.updated_at else None,
        },
    }


@router.get('/api/stocks/{ticker}/technical')
def get_technical_summary_api(ticker: str, db: Session = Depends(get_db)):
    try:
        from indicators_extended import get_ohlcv_dataframe, calculate_all_indicators, get_technical_summary, empty_technical_summary
    except ModuleNotFoundError as exc:
        empty = {
            'status': 'no_data',
            'summary': f'Technical engine unavailable: {exc}',
            'rating': 'NO DATA',
            'score': 50,
            'indicators': {
                'rsi': {'value': None, 'status': 'Insufficient'},
                'macd': {'macd_line': None, 'signal': None, 'histogram': None, 'status': 'Insufficient'},
                'trend': {'sma_5': None, 'sma_10': None, 'sma_20': None, 'sma_50': None, 'sma_200': None, 'ema_20': None, 'status': 'Insufficient'},
                'bollinger_bands': {'upper': None, 'middle': None, 'lower': None},
                'stochastic': {'k': None, 'd': None, 'status': 'Insufficient'},
                'atr': {'value': None, 'status': 'Insufficient'},
                'volume': {'latest': None, 'avg_20': None, 'ratio': None, 'status': 'Insufficient'},
                'support_resistance': {'support_20d': None, 'resistance_20d': None},
            },
        }
        return {'ticker': ticker if ticker.endswith('.JK') else f'{ticker}.JK', 'status': 'no_data', 'technical': empty, 'message': str(exc)}

    if not ticker.endswith('.JK'):
        ticker = f'{ticker}.JK'

    df = get_ohlcv_dataframe(db, ticker, limit=300)
    if df.empty:
        return {'ticker': ticker, 'status': 'no_data', 'technical': empty_technical_summary()}

    df_ind = calculate_all_indicators(df)
    summary = get_technical_summary(df_ind)
    return {'ticker': ticker, 'technical': summary}


@router.get('/api/stocks/{ticker}/chart-data')
def get_chart_data(ticker: str, limit: int = 100, db: Session = Depends(get_db)):
    try:
        from indicators_extended import get_ohlcv_dataframe, calculate_all_indicators
        import numpy as np
    except ModuleNotFoundError as exc:
        return {'ticker': ticker if ticker.endswith('.JK') else f'{ticker}.JK', 'data': [], 'status': 'no_data', 'message': str(exc)}

    if not ticker.endswith('.JK'):
        ticker = f'{ticker}.JK'

    df = get_ohlcv_dataframe(db, ticker, limit=limit + 200)
    if df.empty:
        return {'ticker': ticker, 'data': []}

    df_ind = calculate_all_indicators(df)
    df_ind = df_ind.tail(limit)
    df_ind = df_ind.replace({np.nan: None})
    df_ind.index = df_ind.index.strftime('%Y-%m-%d')
    df_ind = df_ind.reset_index()
    records = df_ind.to_dict('records')
    return {'ticker': ticker, 'count': len(records), 'data': records}
