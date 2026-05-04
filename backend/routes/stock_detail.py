from __future__ import annotations

from typing import Any
import json

import pandas as pd
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

try:
    from database import Fundamental, OHLCVDaily, Signal, Stock, News, BrokerSummary, Alert, get_db
except ModuleNotFoundError:
    from backend.database import Fundamental, OHLCVDaily, Signal, Stock, News, BrokerSummary, Alert, get_db

try:
    from routes.shared_stock_fallbacks import _ticker_base, _ticker_with_suffix, _fallback_row_for_ticker
except ModuleNotFoundError:
    from backend.routes.shared_stock_fallbacks import _ticker_base, _ticker_with_suffix, _fallback_row_for_ticker

try:
    from routes.shared_stock_detail_helpers import _compute_analysis_metrics_from_ohlcv, _serialize_signal_rows
except ModuleNotFoundError:
    from backend.routes.shared_stock_detail_helpers import _compute_analysis_metrics_from_ohlcv, _serialize_signal_rows

try:
    from services.idx_response_factory import ok as _resp_ok
except ModuleNotFoundError:
    from backend.services.idx_response_factory import ok as _resp_ok

try:
    from services.openrouter_llm import build_stock_analysis_llm_payload
except ModuleNotFoundError:
    from backend.services.openrouter_llm import build_stock_analysis_llm_payload

try:
    from services.openrouter_llm import build_stock_chat_llm_payload
except ModuleNotFoundError:
    from backend.services.openrouter_llm import build_stock_chat_llm_payload

router = APIRouter()


@router.get('/api/stocks/{ticker}')
def get_stock(ticker: str, db: Session = Depends(get_db)):
    base = _ticker_base(ticker)
    payload = _fallback_row_for_ticker(base, db)
    if not payload['price'] and not payload['signals']:
        return {'ticker': base, 'message': 'No signals found', 'data': payload}
    return {'ticker': base, 'data': payload}


@router.get('/api/stocks/{ticker}/analysis')
def get_stock_analysis(ticker: str, llm: bool = Query(False), db: Session = Depends(get_db)):
    try:
        from backend.services.scanner_engine import analyze_stock
    except ModuleNotFoundError:
        from services.scanner_engine import analyze_stock

    row = _fallback_row_for_ticker(ticker, db)
    metrics = _compute_analysis_metrics_from_ohlcv(db, row['ticker'])
    row.update(metrics)
    analysis = analyze_stock(row)
    response = _resp_ok(analysis, source='scanner_engine')
    if llm:
        try:
            response['llm'] = build_stock_analysis_llm_payload(ticker=row['ticker'], row=row, analysis=analysis, db=db)
        except TypeError:
            response['llm'] = build_stock_analysis_llm_payload(ticker=row['ticker'], row=row, analysis=analysis)
    return response


@router.get('/api/stocks/{ticker}/fundamental')
def get_fundamental(ticker: str, db: Session = Depends(get_db)):
    ticker = _ticker_with_suffix(ticker)

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
        return {'ticker': _ticker_with_suffix(ticker), 'status': 'no_data', 'technical': empty, 'message': str(exc)}

    ticker = _ticker_with_suffix(ticker)

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
        return {'ticker': _ticker_with_suffix(ticker), 'status': 'no_data', 'message': str(exc), 'data': []}

    ticker = _ticker_with_suffix(ticker)

    limit = max(20, min(int(limit), 400))
    df = get_ohlcv_dataframe(db, ticker, limit=limit)
    if df.empty:
        return {'ticker': ticker, 'status': 'no_data', 'data': []}

    df = calculate_all_indicators(df)
    records = []
    for _, row in df.tail(limit).iterrows():
        row_date = row.get('date', row.name)
        records.append({
            'date': row_date.isoformat() if hasattr(row_date, 'isoformat') else str(row_date),
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
    base = _ticker_base(ticker)
    ticker = _ticker_with_suffix(ticker)

    signals = db.query(Signal).filter(Signal.ticker == base, Signal.timeframe == timeframe).order_by(Signal.signal_date.desc()).limit(20).all()
    data = _serialize_signal_rows(signals)
    return {'ticker': ticker, 'count': len(data), 'data': data}


# ─── Stock Chat (AI Assistant) ─────────────────────────


class ChatMessage(BaseModel):
    message: str = Field(min_length=1, max_length=500)


@router.post('/api/stocks/{ticker}/chat')
def stock_chat(ticker: str, body: ChatMessage, db: Session = Depends(get_db)):
    base = _ticker_base(ticker)
    # Build context: technical, fundamental, recent news
    tech = None
    fund = None
    news_rows = []
    try:
        from indicators_extended import get_ohlcv_dataframe, calculate_all_indicators, get_technical_summary
    except ModuleNotFoundError:
        try:
            from backend.indicators_extended import get_ohlcv_dataframe, calculate_all_indicators, get_technical_summary
        except ModuleNotFoundError:
            tech = None

    if tech is None:
        try:
            t_sym = _ticker_with_suffix(ticker)
            df = get_ohlcv_dataframe(db, t_sym, limit=200)
            if not df.empty:
                df_ind = calculate_all_indicators(df)
                tech = get_technical_summary(df_ind)
        except Exception:
            tech = None

    try:
        f_sym = _ticker_with_suffix(ticker)
        f_row = db.query(Fundamental).filter(Fundamental.ticker == f_sym).first()
        if f_row:
            fund = {
                'trailing_pe': f_row.trailing_pe,
                'price_to_book': f_row.price_to_book,
                'roe': f_row.roe,
                'debt_to_equity': f_row.debt_to_equity,
                'revenue': f_row.revenue,
            }
    except Exception:
        fund = None

    try:
        raw_news = db.query(News).order_by(News.published_at.desc()).limit(5).all()
        for n in raw_news:
            if base in (n.title or '').upper() or base in (n.summary or '').upper():
                news_rows.append({'title': n.title, 'published_at': str(n.published_at)[:10] if n.published_at else ''})
    except Exception:
        pass

    llm_response = build_stock_chat_llm_payload(
        ticker=base,
        message=body.message,
        technical=tech,
        fundamental=fund,
        news=news_rows,
        db=db,
    )
    return llm_response


@router.get('/api/stocks/{ticker}/broker-activity')
def get_broker_activity(ticker: str, limit: int = 10, db: Session = Depends(get_db)):
    base = _ticker_base(ticker)
    try:
        rows = db.query(BrokerSummary).filter(BrokerSummary.ticker == base).order_by(BrokerSummary.date.desc(), BrokerSummary.net_value.desc()).limit(limit).all()
        data = []
        for r in rows:
            data.append({
                'date': r.date.isoformat()[:10] if r.date else '',
                'broker': r.broker_code,
                'buy_volume': r.buy_volume or 0,
                'sell_volume': r.sell_volume or 0,
                'net_volume': r.net_volume or 0,
                'buy_value': r.buy_value or 0,
                'sell_value': r.sell_value or 0,
                'net_value': r.net_value or 0,
            })
        return {'ticker': base, 'count': len(data), 'data': data, 'source': 'db' if data else 'no_data'}
    except Exception as exc:
        return {'ticker': base, 'count': 0, 'data': [], 'source': 'no_data', 'message': str(exc)}


# ─── Alert CRUD ───────────────────────────


class AlertPayload(BaseModel):
    ticker: str = Field(min_length=1)
    alert_type: str = Field(pattern=r'^(price_above|price_below|rsi_above|rsi_below)$')
    value: float = Field(gt=0)


@router.get('/api/alerts')
def list_alerts(ticker: str = '', db: Session = Depends(get_db)):
    q = db.query(Alert)
    if ticker:
        q = q.filter(Alert.ticker == ticker.upper().strip())
    rows = q.order_by(Alert.created_at.desc()).limit(30).all()
    return {'count': len(rows), 'data': [{
        'id': r.id, 'ticker': r.ticker, 'alert_type': r.alert_type,
        'value': r.value, 'active': bool(r.active),
        'created_at': r.created_at.isoformat()[:19] if r.created_at else '',
    } for r in rows]}


@router.post('/api/alerts')
def create_alert(payload: AlertPayload, db: Session = Depends(get_db)):
    alert = Alert(ticker=payload.ticker.upper().strip(), alert_type=payload.alert_type, value=payload.value)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return {'ok': True, 'id': alert.id, 'message': f'Alert {payload.alert_type} untuk {alert.ticker} pada {payload.value} dibuat.'}


@router.delete('/api/alerts/{alert_id}')
def delete_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return {'ok': False, 'message': 'Alert tidak ditemukan.'}
    db.delete(alert)
    db.commit()
    return {'ok': True, 'message': f'Alert {alert_id} dihapus.'}


# ─── Peer Comparison ────────────────────


@router.get('/api/stocks/{ticker}/peers')
def get_peers(ticker: str, limit: int = 6, db: Session = Depends(get_db)):
    base = _ticker_base(ticker)
    # Find sector from the current stock
    stock = db.query(Stock).filter(Stock.ticker == base).first()
    peers = []
    if stock and stock.sector:
        similar = db.query(Stock).filter(Stock.sector == stock.sector, Stock.ticker != base).limit(limit).all()
        for s in similar:
            # Fetch latest OHLCV for price data
            latest = db.query(OHLCVDaily).filter(OHLCVDaily.ticker == s.ticker).order_by(OHLCVDaily.date.desc()).first()
            prev = db.query(OHLCVDaily).filter(OHLCVDaily.ticker == s.ticker).order_by(OHLCVDaily.date.desc()).offset(1).first() if latest else None
            price = float(latest.close) if latest else None
            prev_close = float(prev.close) if prev else None
            change = (price - prev_close) if (price and prev_close) else None
            change_pct = (change / prev_close * 100) if (change and prev_close) else None
            peers.append({
                'ticker': s.ticker, 'name': s.name or '', 'sector': s.sector or '',
                'market_cap': s.market_cap, 'price': price,
                'change': round(change, 2) if change is not None else None,
                'change_pct': round(change_pct, 2) if change_pct is not None else None,
            })
    return {'ticker': base, 'source': 'db', 'count': len(peers), 'data': peers}
