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
    from routes.shared_stock_fallbacks import _ticker_base, _fallback_row_for_ticker
except ModuleNotFoundError:
    from backend.routes.shared_stock_fallbacks import _ticker_base, _fallback_row_for_ticker

try:
    from routes.shared_stock_detail_helpers import _compute_analysis_metrics_from_ohlcv
except ModuleNotFoundError:
    from backend.routes.shared_stock_detail_helpers import _compute_analysis_metrics_from_ohlcv

try:
    from services.idx_response_factory import ok as _resp_ok
except ModuleNotFoundError:
    from backend.services.idx_response_factory import ok as _resp_ok

router = APIRouter()


@router.get('/api/stocks/{ticker}')
def get_stock(ticker: str, db: Session = Depends(get_db)):
    base = _ticker_base(ticker)
    payload = _fallback_row_for_ticker(base, db)
    if not payload['price'] and not payload['signals']:
        return {'ticker': base, 'message': 'No signals found', 'data': payload}
    return {'ticker': base, 'data': payload}


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
        return {'ticker': ticker, 'status': 'no_data', 'message': str(exc), 'data': []}

    if not ticker.endswith('.JK'):
        ticker = f'{ticker}.JK'

    limit = max(20, min(int(limit), 400))
    df = get_ohlcv_dataframe(db, ticker, limit=limit)
    if df.empty:
        return {'ticker': ticker, 'status': 'no_data', 'data': []}

    df = calculate_all_indicators(df)
    records = []
    for _, row in df.tail(limit).iterrows():
        records.append({
            'date': row['date'].isoformat() if hasattr(row['date'], 'isoformat') else str(row['date']),
            'open': float(row['open']) if pd.notna(row['open']) else None,
            'high': float(row['high']) if pd.notna(row['high']) else None,
            'low': float(row['low']) if pd.notna(row['low']) else None,
            'close': float(row['close']) if pd.notna(row['close']) else None,
            'volume': float(row['volume']) if pd.notna(row['volume']) else None,
            'sma_20': float(row['sma_20']) if 'sma_20' in row and pd.notna(row['sma_20']) else None,
            'sma_50': float(row['sma_50']) if 'sma_50' in row and pd.notna(row['sma_50']) else None,
        })

    return {'ticker': ticker, 'status': 'ok', 'data': records}


@router.get('/api/stocks/{ticker}/signals')
def get_signals(ticker: str, timeframe: str = '1d', db: Session = Depends(get_db)):
    if not ticker.endswith('.JK'):
        ticker = f'{ticker}.JK'

    signals = db.query(Signal).filter(Signal.ticker == ticker.replace('.JK', ''), Signal.timeframe == timeframe).order_by(Signal.signal_date.desc()).limit(20).all()
    data = []
    for signal in signals:
        data.append({
            'ticker': signal.ticker,
            'timeframe': signal.timeframe,
            'signal_type': signal.signal_type,
            'signal_date': signal.signal_date.isoformat() if signal.signal_date else None,
            'price': signal.price,
            'entry_price': signal.entry_price,
            'target_price': signal.target_price,
            'stop_loss': signal.stop_loss,
            'rationale': signal.rationale,
        })
    return {'ticker': ticker, 'count': len(data), 'data': data}
