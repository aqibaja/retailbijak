from __future__ import annotations

import logging
from typing import Any
import json

import pandas as pd
from fastapi import APIRouter, Body, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

try:
    from database import Fundamental, OHLCVDaily, Signal, Stock, News, BrokerSummary, Alert, AlertTrigger, PaperTrade, ChatHistory, Financial, CalendarEvent, get_db
except ModuleNotFoundError:
    from backend.database import Fundamental, OHLCVDaily, Signal, Stock, News, BrokerSummary, Alert, AlertTrigger, PaperTrade, ChatHistory, Financial, CalendarEvent, get_db

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
        logger = logging.getLogger(__name__)
        logger.warning("No price or signals for %s — returning partial data", base)
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
    ticker_with_suffix = _ticker_with_suffix(ticker)
    ticker_base = _ticker_base(ticker)

    # Try both formats (DB may store with or without .JK)
    fundamental = db.query(Fundamental).filter(Fundamental.ticker == ticker_with_suffix).first()
    if not fundamental:
        fundamental = db.query(Fundamental).filter(Fundamental.ticker == ticker_base).first()
    
    if not fundamental:
        # yfinance on-demand sudah dimatikan — rate-limited untuk IDX
        # Data fundamental dari IDX via idx_daily_sync (18:00 WIB)
        pass
    
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


@router.get('/api/stocks/{ticker}/financials')
def get_financials(ticker: str, period: str = Query('annual', regex='^(annual|quarterly)$'), db: Session = Depends(get_db)):
    """Return income statement, balance sheet, and cash flow data."""
    ticker_with_suffix = _ticker_with_suffix(ticker)
    ticker_base = _ticker_base(ticker)

    # Determine the types to query based on period
    if period == 'annual':
        types = ['income', 'balance', 'cashflow']
    else:
        types = ['income_q', 'balance_q', 'cashflow_q']

    result = {}
    for fin_type in types:
        try:
            rows = (
                db.query(Financial)
                .filter(Financial.ticker == ticker_with_suffix, Financial.type == fin_type)
                .order_by(Financial.period.desc())
                .all()
            )
            if not rows:
                rows = (
                    db.query(Financial)
                    .filter(Financial.ticker == ticker_base, Financial.type == fin_type)
                    .order_by(Financial.period.desc())
                    .all()
                )
            if rows:
                key = fin_type.replace('_q', '')  # 'income' / 'balance' / 'cashflow'
                result[key] = [
                    {
                        'period': r.period.isoformat()[:10] if hasattr(r.period, 'isoformat') else str(r.period)[:10],
                        'data': r.data,
                    }
                    for r in rows
                ]
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.warning(f"Error fetching financials for {ticker}/{fin_type}: {e}")
            continue

    if not result:
        return {'ticker': ticker, 'message': 'Financial data not found', 'data': result}

    return {'ticker': ticker, 'period': period, 'data': result}


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
def get_chart_data(ticker: str, limit: int = 100, timeframe: str = '1D', db: Session = Depends(get_db)):
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
            'st_value': float(row['st_value']) if 'st_value' in row and pd.notna(row['st_value']) else None,
            'st_trend': bool(row['st_trend']) if 'st_trend' in row and pd.notna(row['st_trend']) else None,
            'vwap': float(row['vwap']) if 'vwap' in row and pd.notna(row['vwap']) else None,
        })

    return {'ticker': ticker, 'timeframe': timeframe, 'status': 'ok', 'count': len(records), 'data': records}


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


def _build_chat_context(ticker: str, db: Session) -> tuple:
    """Build tech, fundamental, news data for AI context."""
    base = _ticker_base(ticker)
    tech = None
    fund = None
    news_rows = []
    company_name = None

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
        if not f_row:
            f_row = db.query(Fundamental).filter(Fundamental.ticker == base).first()
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

    company_names = [base]
    try:
        stock = db.query(Stock).filter(Stock.ticker == base).first()
        if stock and stock.name:
            company_name = stock.name
            clean = stock.name.replace('PT ', '').replace('(Persero)', '').replace('Tbk.', '').replace('Tbk', '').replace('.', '').strip()
            company_names.append(clean.upper())
            company_names.append(stock.name.upper())
    except Exception:
        pass

    try:
        raw_news = db.query(News).order_by(News.published_at.desc()).limit(30).all()
        seen_titles = set()
        for n in raw_news:
            if len(news_rows) >= 5:
                break
            title_upper = (n.title or '').upper()
            summary_upper = (n.summary or '').upper()
            matched = any(cn in title_upper or cn in summary_upper for cn in company_names if cn)
            if matched and n.title and n.title not in seen_titles:
                seen_titles.add(n.title)
                news_rows.append({'title': n.title, 'published_at': str(n.published_at)[:10] if n.published_at else ''})
    except Exception:
        pass

    return tech, fund, news_rows, company_name


@router.post('/api/stocks/{ticker}/chat')
def stock_chat(ticker: str, body: ChatMessage, db: Session = Depends(get_db)):
    base = _ticker_base(ticker)
    tech, fund, news_rows, company_name = _build_chat_context(ticker, db)

    # Load recent chat history for context injection (last 3 exchanges)
    recent_history = []
    try:
        hist_rows = db.query(ChatHistory).filter(
            ChatHistory.ticker == base
        ).order_by(ChatHistory.created_at.desc()).limit(6).all()
        hist_rows.reverse()  # chronological order
        for h in hist_rows:
            recent_history.append({'role': h.role, 'message': h.message})
    except Exception:
        pass

    # Save user message to history
    try:
        db.add(ChatHistory(ticker=base, role='user', message=body.message))
        db.commit()
    except Exception:
        db.rollback()

    llm_response = build_stock_chat_llm_payload(
        ticker=base,
        message=body.message,
        technical=tech,
        fundamental=fund,
        news=news_rows,
        db=db,
        company_name=company_name,
        chat_history=recent_history,
    )

    # Save assistant reply to history
    reply = llm_response.get('reply', '')
    if reply:
        try:
            db.add(ChatHistory(ticker=base, role='assistant', message=reply))
            db.commit()
        except Exception:
            db.rollback()

    return llm_response


@router.get('/api/stocks/{ticker}/chat-history')
def get_chat_history(ticker: str, limit: int = 50, db: Session = Depends(get_db)):
    base = _ticker_base(ticker)
    rows = db.query(ChatHistory).filter(
        ChatHistory.ticker == base
    ).order_by(ChatHistory.created_at.desc()).limit(limit).all()
    rows.reverse()  # chronological
    data = [{
        'id': r.id,
        'role': r.role,
        'message': r.message,
        'created_at': r.created_at.isoformat() if r.created_at else None,
    } for r in rows]
    return {'ticker': base, 'count': len(data), 'data': data}


@router.delete('/api/stocks/{ticker}/chat-history')
def clear_chat_history(ticker: str, db: Session = Depends(get_db)):
    base = _ticker_base(ticker)
    deleted = db.query(ChatHistory).filter(ChatHistory.ticker == base).delete()
    db.commit()
    return {'status': 'ok', 'ticker': base, 'deleted': deleted}


# ─── Candlestick Pattern Recognition ───────────


@router.get('/api/stocks/{ticker}/patterns')
def get_stock_patterns(ticker: str, db: Session = Depends(get_db)):
    """Return detected candlestick patterns for the last 30 trading days."""
    base = _ticker_base(ticker)

    try:
        from indicators_extended import get_ohlcv_dataframe
    except ModuleNotFoundError:
        try:
            from backend.indicators_extended import get_ohlcv_dataframe
        except ModuleNotFoundError as exc:
            return {'ticker': base, 'status': 'no_data', 'patterns': [], 'message': str(exc)}

    try:
        from updaters.pattern_detector import get_patterns_with_dates
    except ModuleNotFoundError:
        from backend.updaters.pattern_detector import get_patterns_with_dates

    ticker_with_suffix = _ticker_with_suffix(ticker)
    df = get_ohlcv_dataframe(db, ticker_with_suffix, limit=60)
    if df.empty:
        return {'ticker': base, 'status': 'no_data', 'patterns': []}

    opens = df['open'].astype(float).tolist()
    highs = df['high'].astype(float).tolist()
    lows = df['low'].astype(float).tolist()
    closes = df['close'].astype(float).tolist()
    dates = df.index.tolist() if hasattr(df, 'index') else df['date'].tolist()

    # Try to get date column
    if isinstance(dates[0], str) and len(dates) > 0:
        pass
    elif 'date' in df.columns:
        dates = df['date'].tolist()
    else:
        dates = [str(d)[:10] for d in dates]

    patterns = get_patterns_with_dates(opens, highs, lows, closes, dates, lookback=30)
    return {'ticker': base, 'status': 'ok', 'count': len(patterns), 'patterns': patterns}


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


@router.get('/api/stocks/{ticker}/news')
def get_stock_news(ticker: str, limit: int = Query(10, ge=1, le=100), db: Session = Depends(get_db)):
    """Return news articles related to a specific ticker."""
    base = _ticker_base(ticker)
    try:
        rows = (
            db.query(News)
            .filter(News.tickers.contains(base))
            .order_by(News.published_at.desc())
            .limit(limit)
            .all()
        )
        data = []
        for r in rows:
            data.append({
                'id': r.id,
                'title': r.title,
                'link': r.link,
                'published_at': r.published_at.isoformat() if r.published_at else None,
                'source': r.source,
                'summary': r.summary,
                'image_url': r.image_url,
                'tickers': json.loads(r.tickers) if r.tickers else [],
                'sentiment': r.sentiment,
                'category': r.category,
            })
        return {'ticker': base, 'count': len(data), 'data': data}
    except Exception as exc:
        return {'ticker': base, 'count': 0, 'data': [], 'message': str(exc)}


# ─── Alert CRUD ───────────────────────────


@router.get('/api/stocks/{ticker}/depth')
def get_stock_depth(ticker: str, db: Session = Depends(get_db)):
    """Simulated 5-level order book depth from OHLCV data."""
    base = _ticker_base(ticker)
    try:
        latest_ohlcv = db.query(OHLCVDaily).filter(
            OHLCVDaily.ticker == base
        ).order_by(OHLCVDaily.date.desc()).first()
        if not latest_ohlcv or not latest_ohlcv.close:
            return _resp_ok(None, source='no_data', count=0)
        price = float(latest_ohlcv.close)
        volume = int(latest_ohlcv.volume or 0)
        tick_size = max(1, round(price * 0.001, -1))
        if price > 5000:
            tick_size = round(price * 0.001, -2)
        elif price > 1000:
            tick_size = round(price * 0.001, -1)
        tick_size = max(1, int(tick_size or 1))
        bid_volume_base = max(1, volume // 20)
        ask_volume_base = max(1, volume // 22)
        bids = []
        asks = []
        cum_bid_vol = 0
        cum_ask_vol = 0
        for level in range(5):
            spread_offset = tick_size * (level + 1)
            bid_px = round(price - spread_offset, 2)
            ask_px = round(price + spread_offset, 2)
            bid_v = int(bid_volume_base * (1.0 - level * 0.12) * (0.9 + 0.2 * (level % 2)))
            ask_v = int(ask_volume_base * (1.0 - level * 0.15) * (0.9 + 0.2 * ((level + 1) % 2)))
            bid_v = max(1, bid_v)
            ask_v = max(1, ask_v)
            cum_bid_vol += bid_v
            cum_ask_vol += ask_v
            bids.append({'price': round(bid_px, 2), 'volume': bid_v, 'cumulative': cum_bid_vol})
            asks.append({'price': round(ask_px, 2), 'volume': ask_v, 'cumulative': cum_ask_vol})
        max_vol = max(cum_bid_vol, cum_ask_vol)
        spread = round(ask_px - bid_px, 2)
        spread_pct_display = round((spread / price) * 100, 3) if price else 0
        return _resp_ok({
            'ticker': base,
            'price': price,
            'spread': spread,
            'spread_pct': spread_pct_display,
            'tick_size': tick_size,
            'bids': bids,
            'asks': asks,
            'max_volume': max_vol,
            'last_price': price,
            'source': 'derived',
        }, source='derived', count=5)
    except Exception:
        return _resp_ok(None, source='no_data', count=0)


@router.get('/api/stocks/{ticker}/foreign-flow')
def get_stock_foreign_flow(ticker: str, limit: int = 20, db: Session = Depends(get_db)):
    """Daily aggregate foreign flow for a specific stock (all brokers combined)."""
    base = _ticker_base(ticker)
    try:
        from sqlalchemy import func
        rows = db.query(
            BrokerSummary.date,
            func.sum(BrokerSummary.buy_volume).label('buy_vol'),
            func.sum(BrokerSummary.sell_volume).label('sell_vol'),
            func.sum(BrokerSummary.net_volume).label('net_vol'),
            func.sum(BrokerSummary.buy_value).label('buy_val'),
            func.sum(BrokerSummary.sell_value).label('sell_val'),
            func.sum(BrokerSummary.net_value).label('net_val'),
        ).filter(
            BrokerSummary.ticker == base
        ).group_by(BrokerSummary.date).order_by(
            BrokerSummary.date.desc()
        ).limit(limit).all()

        data = []
        for r in rows:
            data.append({
                'date': r.date.isoformat()[:10] if r.date else '',
                'buy_value': round(float(r.buy_val or 0), 2),
                'sell_value': round(float(r.sell_val or 0), 2),
                'net_value': round(float(r.net_val or 0), 2),
                'buy_volume': int(r.buy_vol or 0),
                'sell_volume': int(r.sell_vol or 0),
                'net_volume': int(r.net_vol or 0),
            })
        return {'ticker': base, 'count': len(data), 'data': data, 'source': 'db' if data else 'no_data'}
    except Exception as exc:
        return {'ticker': base, 'count': 0, 'data': [], 'source': 'no_data', 'message': str(exc)}


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


@router.put('/api/alerts/{alert_id}')
def update_alert(alert_id: int, payload: dict = Body(...), db: Session = Depends(get_db)):
    """Update alert — toggle active/inactive or change value."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(404, 'Alert not found')
    if 'active' in payload:
        alert.active = 1 if payload['active'] else 0
    if 'value' in payload:
        alert.value = float(payload['value'])
    if 'alert_type' in payload:
        alert.alert_type = payload['alert_type']
    db.commit()
    return {'ok': True, 'message': 'Alert diperbarui'}


@router.delete('/api/alerts/{alert_id}')
def delete_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return {'ok': False, 'message': 'Alert tidak ditemukan.'}
    db.delete(alert)
    db.commit()
    return {'ok': True, 'message': f'Alert {alert_id} dihapus.'}


@router.get('/api/alerts/triggered')
def get_triggered_alerts(limit: int = 10, db: Session = Depends(get_db)):
    """Get recent triggered alerts (unseen first)."""
    rows = db.query(AlertTrigger).order_by(
        AlertTrigger.seen.asc(),
        AlertTrigger.triggered_at.desc()
    ).limit(limit).all()
    data = [{
        'id': r.id,
        'alert_id': r.alert_id,
        'ticker': r.ticker,
        'alert_type': r.alert_type,
        'trigger_value': r.trigger_value,
        'current_value': r.current_value,
        'triggered_at': r.triggered_at.isoformat()[:19] if r.triggered_at else '',
        'seen': bool(r.seen),
    } for r in rows]
    return {'count': len(data), 'data': data}


@router.post('/api/alerts/triggered/ack')
def ack_triggered_alerts(ids: list[int] = [], db: Session = Depends(get_db)):
    """Mark triggered alerts as seen."""
    if ids:
        db.query(AlertTrigger).filter(AlertTrigger.id.in_(ids)).update({'seen': 1})
    else:
        db.query(AlertTrigger).filter(AlertTrigger.seen == 0).update({'seen': 1})
    db.commit()
    return {'ok': True}


# ─── 16.3.1 — Alert SSE Stream ────────────────────

import asyncio
from datetime import datetime as _dt

async def _alert_stream_generator(poll_interval: float = 5.0):
    """SSE generator: streams new (unseen) triggered alerts every N seconds."""
    from database import SessionLocal as _SL
    import json as _json

    last_check = _dt.utcnow()
    while True:
        db = _SL()
        try:
            new_triggers = db.query(AlertTrigger).filter(
                AlertTrigger.seen == 0,
                AlertTrigger.triggered_at >= last_check,
            ).order_by(AlertTrigger.triggered_at.desc()).limit(10).all()

            if new_triggers:
                for t in new_triggers:
                    event = {
                        'type': 'alert',
                        'id': t.id,
                        'alert_id': t.alert_id,
                        'ticker': t.ticker,
                        'alert_type': t.alert_type,
                        'trigger_value': t.trigger_value,
                        'current_value': t.current_value,
                        'triggered_at': t.triggered_at.isoformat()[:19] if t.triggered_at else '',
                    }
                    yield f"data: {_json.dumps(event)}\n\n"

            yield f": heartbeat {_dt.utcnow().isoformat()}\n\n"
            last_check = _dt.utcnow()
        except Exception as exc:
            yield f"data: {_json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
        finally:
            db.close()

        await asyncio.sleep(poll_interval)


@router.get('/api/alerts/stream')
async def stream_alerts(poll_interval: float = 5.0):
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        _alert_stream_generator(poll_interval=max(poll_interval, 2.0)),
        media_type='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'},
    )


# ─── 27.1.1 — Fundamental History ────────────────────


@router.get('/api/stocks/{ticker}/fundamentals/history')
def get_fundamentals_history(ticker: str, db: Session = Depends(get_db)):
    """Return historical PE, PBV, ROE trends + price time-series for charting."""
    import json as _json
    import math
    from datetime import datetime

    base = _ticker_base(ticker)
    ticker_with_suffix = _ticker_with_suffix(ticker)
    logger = logging.getLogger(__name__)

    has_financial_data = False
    ratios = {'pe': [], 'pbv': [], 'roe': []}
    price_data = []

    # Fetch OHLCV data (last 400 bars for SMA computation)
    ohlcv_rows = (
        db.query(OHLCVDaily)
        .filter(OHLCVDaily.ticker == base)
        .order_by(OHLCVDaily.date.asc())
        .limit(400)
        .all()
    )
    if not ohlcv_rows:
        # Try with .JK suffix
        ohlcv_rows = (
            db.query(OHLCVDaily)
            .filter(OHLCVDaily.ticker == ticker_with_suffix)
            .order_by(OHLCVDaily.date.asc())
            .limit(400)
            .all()
        )

    # Compute SMA20 and SMA50 from OHLCV
    closes = []
    dates = []
    volumes = []
    for r in ohlcv_rows:
        if r.close:
            closes.append(float(r.close))
            dates.append(r.date)
            volumes.append(int(r.volume or 0))

    # SMA helper
    def sma(values, period):
        if len(values) < period:
            return [None] * len(values)
        result = []
        for i in range(len(values)):
            if i < period - 1:
                result.append(None)
            else:
                result.append(sum(values[i - period + 1:i + 1]) / period)
        return result

    sma20 = sma(closes, 20)
    sma50 = sma(closes, 50)

    # Price time-series for ALL stocks
    for i, r in enumerate(ohlcv_rows):
        d_str = r.date.isoformat()[:10] if hasattr(r.date, 'isoformat') else str(r.date)[:10]
        price_data.append({
            'date': d_str,
            'close': float(r.close) if r.close else None,
            'volume': int(r.volume or 0),
            'sma20': sma20[i] if sma20[i] is not None else None,
            'sma50': sma50[i] if sma50[i] is not None else None,
        })

    # Fetch Financial data to compute PE, PBV, ROE
    try:
        financial_rows = (
            db.query(Financial)
            .filter(
                Financial.ticker == base,
                Financial.type.in_(['income', 'balance'])
            )
            .order_by(Financial.period.desc())
            .all()
        )
        if not financial_rows:
            financial_rows = (
                db.query(Financial)
                .filter(
                    Financial.ticker == ticker_with_suffix,
                    Financial.type.in_(['income', 'balance'])
                )
                .order_by(Financial.period.desc())
                .all()
            )

        if financial_rows:
            # Build a dict: period -> {income_data, balance_data}
            fin_by_period = {}
            for fr in financial_rows:
                p_key = fr.period.isoformat()[:10] if hasattr(fr.period, 'isoformat') else str(fr.period)[:10]
                if p_key not in fin_by_period:
                    fin_by_period[p_key] = {}
                data = fr.data
                if isinstance(data, str):
                    try:
                        data = _json.loads(data)
                    except (_json.JSONDecodeError, TypeError):
                        data = {}
                if not isinstance(data, dict):
                    data = {}
                fin_by_period[p_key][fr.type] = data

            # Estimate shares outstanding using latest market_cap / latest close
            shares_est = None
            try:
                stock = db.query(Stock).filter(Stock.ticker == base).first()
                if stock and stock.market_cap and closes:
                    shares_est = stock.market_cap / closes[-1]
            except Exception:
                pass
            if not shares_est:
                try:
                    from database import Fundamental as FundModel
                    fund_row = db.query(FundModel).filter(FundModel.ticker == base).first()
                    if not fund_row:
                        fund_row = db.query(FundModel).filter(FundModel.ticker == ticker_with_suffix).first()
                    if fund_row and fund_row.trailing_pe and fund_row.trailing_eps and closes:
                        # trailing_pe * trailing_eps = price, so shares_est = market_cap/price
                        pass
                except Exception:
                    pass
                # Fallback: use 1 billion shares as rough estimate
                shares_est = 1_000_000_000

            has_financial_data = bool(fin_by_period)

            # For each financial period, find the closest OHLCV date and compute ratios
            for p_key in sorted(fin_by_period.keys(), reverse=True):
                fin = fin_by_period[p_key]
                income = fin.get('income', {})
                balance = fin.get('balance', {})

                net_income = income.get('Net Income')
                total_equity = balance.get('Total Equity')

                # Find closest OHLCV date (within 180 days of period end)
                period_dt = None
                try:
                    period_dt = datetime.strptime(p_key, '%Y-%m-%d')
                except ValueError:
                    try:
                        period_dt = datetime.strptime(p_key[:10], '%Y-%m-%d')
                    except ValueError:
                        continue

                closest_close = None
                closest_date = None
                for j, r in enumerate(ohlcv_rows):
                    if r.close:
                        diff = abs((r.date - period_dt).days) if hasattr(r.date, 'isoformat') else 9999
                        if diff <= 180:
                            # Keep the closest date before or around period end
                            if closest_date is None or diff < abs((closest_date - period_dt).days):
                                closest_close = float(r.close)
                                closest_date = r.date

                if closest_close is None and closes:
                    # Fallback: use last available close
                    closest_close = closes[-1]
                    closest_date = dates[-1] if dates else None

                if closest_close and net_income is not None:
                    eps = net_income / shares_est if shares_est else 0
                    pe_val = closest_close / eps if eps != 0 else None
                    if pe_val is not None and pe_val > 0 and pe_val < 10000:
                        ratios['pe'].append({
                            'date': p_key,
                            'value': round(pe_val, 2),
                        })

                if closest_close and total_equity is not None:
                    bvps = total_equity / shares_est if shares_est else 0
                    pbv_val = closest_close / bvps if bvps != 0 else None
                    if pbv_val is not None and pbv_val > 0 and pbv_val < 1000:
                        ratios['pbv'].append({
                            'date': p_key,
                            'value': round(pbv_val, 2),
                        })

                if net_income is not None and total_equity is not None and total_equity != 0:
                    roe_val = (net_income / total_equity) * 100
                    if roe_val is not None and abs(roe_val) < 1000:
                        ratios['roe'].append({
                            'date': p_key,
                            'value': round(roe_val, 2),
                        })

    except Exception as exc:
        logger.warning("Error computing fundamental history for %s: %s", ticker, exc)

    # Sort all ratio series by date ascending
    for key in ratios:
        ratios[key].sort(key=lambda x: x['date'])

    return {
        'ticker': base,
        'has_financial_data': has_financial_data,
        'ratios': ratios,
        'price_data': price_data,
    }


# ─── 27.1.2 — Corporate Actions Timeline ────────────────────


@router.get('/api/stocks/{ticker}/corporate-actions')
def get_corporate_actions(ticker: str, db: Session = Depends(get_db)):
    """Return corporate actions timeline for a given stock."""
    base = _ticker_base(ticker)
    ticker_with_suffix = _ticker_with_suffix(ticker)

    events = (
        db.query(CalendarEvent)
        .filter(
            (CalendarEvent.ticker == base) | (CalendarEvent.ticker == ticker_with_suffix)
        )
        .order_by(CalendarEvent.event_date.desc())
        .all()
    )

    data = []
    for ev in events:
        data.append({
            'type': ev.event_type,
            'title': ev.title,
            'date': ev.event_date.isoformat() if hasattr(ev.event_date, 'isoformat') else str(ev.event_date),
            'description': ev.description,
        })

    return {
        'data': data,
        'count': len(data),
    }


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


# ─── Stock Comparison ──────────────────


@router.get('/api/compare')
def compare_stocks(tickers: str = '', db: Session = Depends(get_db)):
    """Compare multiple tickers side-by-side with normalized price overlay."""
    parts = [t.strip().upper() for t in tickers.split(',') if t.strip()]
    if not parts or len(parts) < 2:
        return {'status': 'error', 'message': 'Minimal 2 ticker (contoh: BBCA,BMRI)'}
    if len(parts) > 5:
        parts = parts[:5]
    result = {'tickers': [], 'prices': {}, 'fundamentals': {}, 'stats': {}}
    for ticker in parts:
        try:
            # Fetch OHLCV (last 365 trading days for 1Y/YTD calculations)
            candles = db.query(OHLCVDaily).filter(
                OHLCVDaily.ticker == ticker
            ).order_by(OHLCVDaily.date.desc()).limit(365).all()
            candles = list(reversed(candles))
            prices = [{'date': c.date.isoformat()[:10] if c.date else '', 'close': float(c.close)} for c in candles if c.close]
            result['prices'][ticker] = prices
            # Normalized to 100 at first close
            base_price = prices[0]['close'] if prices else 1
            result['prices'][f'{ticker}_norm'] = [
                {'date': p['date'], 'value': round((p['close'] / base_price) * 100, 2)}
                for p in prices
            ] if base_price else []
            # Performance
            n = len(prices)
            if n >= 2:
                last = prices[-1]['close']
                first = prices[0]['close']
                p1m = prices[-21]['close'] if n >= 21 else prices[0]['close']
                p3m = prices[-63]['close'] if n >= 63 else prices[0]['close']
                p1y = prices[0]['close']  # use earliest available as 1Y proxy
                # YTD: find first trading day of current year
                import datetime as _dt
                now = _dt.date.today()
                ytd_start_idx = next((i for i, p in enumerate(prices) if p['date'] >= f'{now.year}-01-01'), 0)
                p_ytd = prices[ytd_start_idx]['close'] if ytd_start_idx < n else first
                result['stats'][ticker] = {
                    'return_1m': round(((last / p1m) - 1) * 100, 2) if p1m else None,
                    'return_3m': round(((last / p3m) - 1) * 100, 2) if p3m else None,
                    'return_ytd': round(((last / p_ytd) - 1) * 100, 2),
                    'return_1y': round(((last / p1y) - 1) * 100, 2) if p1y else None,
                    'return_total': round(((last / first) - 1) * 100, 2) if first else None,
                    'current_price': last,
                    'high_90d': max(p['close'] for p in prices[-90:]),
                    'low_90d': min(p['close'] for p in prices[-90:]),
                    'avg_volume': round(sum(c.volume or 0 for c in candles) / len(candles), 0) if candles else 0,
                }
            # Fundamental
            fund = db.query(Fundamental).filter(Fundamental.ticker == ticker).first()
            stock = db.query(Stock).filter(Stock.ticker == ticker).first()
            result['fundamentals'][ticker] = {
                'name': stock.name if stock else ticker,
                'sector': stock.sector if stock else '',
                'industry': stock.industry if stock else '',
                'market_cap': stock.market_cap if stock else None,
                'pe': round(fund.trailing_pe, 2) if fund and fund.trailing_pe else None,
                'pbv': round(fund.price_to_book, 2) if fund and fund.price_to_book else None,
                'roe': round(fund.roe, 2) if fund and fund.roe else None,
                'roa': round(fund.roa, 2) if fund and fund.roa else None,
                'der': round(fund.debt_to_equity, 2) if fund and fund.debt_to_equity else None,
                'dividend_yield': round(fund.dividend_yield, 2) if fund and fund.dividend_yield else None,
            }
            result['tickers'].append(ticker)
        except Exception:
            continue
    return {
        'count': len(result['tickers']),
        'data': result,
        'source': 'db' if result['tickers'] else 'no_data',
    }


# ─── Backtesting ──────────────────────


@router.get('/api/backtest')
def run_backtest(ticker: str = '', strategy: str = 'sma_cross', initial_capital: float = 10000000, db: Session = Depends(get_db)):
    """Backtest a trading strategy on historical OHLCV data.

    Strategies: sma_cross (SMA20/50 crossover), rsi_reversal (RSI <30 buy >70 sell)
    Returns equity curve, trades, metrics.
    """
    if not ticker:
        return {'status': 'error', 'message': 'Ticker required (e.g. BBCA)'}

    base = _ticker_base(ticker)
    try:
        from indicators_extended import get_ohlcv_dataframe, calculate_all_indicators
        import numpy as np
        import math
    except Exception as e:
        return {'status': 'error', 'message': f'Engine unavailable: {e}'}

    df = get_ohlcv_dataframe(db, base, limit=400)
    if df.empty or len(df) < 50:
        return {'status': 'error', 'message': 'Insufficient OHLCV data'}

    df_ind = calculate_all_indicators(df)
    closes = df_ind['close'].astype(float).values
    dates = df_ind.index.tolist()
    n = len(closes)

    signals = [0] * n

    if strategy == 'sma_cross':
        sma20 = df_ind['sma_20'].values if 'sma_20' in df_ind else None
        sma50 = df_ind['sma_50'].values if 'sma_50' in df_ind else None
        if sma20 is None or sma50 is None:
            return {'status': 'error', 'message': 'SMA data not available'}
        for i in range(1, n):
            if not np.isnan(sma20[i]) and not np.isnan(sma50[i]) and not np.isnan(sma20[i-1]) and not np.isnan(sma50[i-1]):
                if sma20[i-1] <= sma50[i-1] and sma20[i] > sma50[i]:
                    signals[i] = 1
                elif sma20[i-1] >= sma50[i-1] and sma20[i] < sma50[i]:
                    signals[i] = -1
    elif strategy == 'rsi_reversal':
        rsi = df_ind['rsi'].values if 'rsi' in df_ind else None
        if rsi is None:
            return {'status': 'error', 'message': 'RSI data not available'}
        for i in range(1, n):
            if not np.isnan(rsi[i]) and not np.isnan(rsi[i-1]):
                if rsi[i-1] < 30 and rsi[i] >= 30:
                    signals[i] = 1
                elif rsi[i-1] > 70 and rsi[i] <= 70:
                    signals[i] = -1
    elif strategy == 'bb_breakout':
        # Buy when close breaks above BB upper, sell when breaks below BB lower
        bb_high = df_ind['bb_high'].values if 'bb_high' in df_ind else None
        bb_low = df_ind['bb_low'].values if 'bb_low' in df_ind else None
        if bb_high is None or bb_low is None:
            return {'status': 'error', 'message': 'BB data not available'}
        for i in range(1, n):
            if not np.isnan(bb_high[i]) and not np.isnan(bb_low[i]):
                if not np.isnan(closes[i-1]) and closes[i-1] <= bb_high[i-1] and closes[i] > bb_high[i]:
                    signals[i] = 1
                elif not np.isnan(closes[i-1]) and closes[i-1] >= bb_low[i-1] and closes[i] < bb_low[i]:
                    signals[i] = -1
    else:
        return {'status': 'error', 'message': f'Unknown strategy: {strategy}. Use: sma_cross, rsi_reversal, bb_breakout'}

    cash = initial_capital
    shares = 0
    equity_curve = []
    trades = []
    in_position = False
    for i in range(n):
        price = float(closes[i])
        if signals[i] == 1 and not in_position and cash > 0:
            buy_shares = int(cash / price)
            cost = buy_shares * price
            shares = buy_shares
            cash -= cost
            in_position = True
            trades.append({'date': str(dates[i])[:10], 'type': 'BUY', 'price': round(price, 2), 'shares': buy_shares, 'value': round(cost, 2)})
        elif signals[i] == -1 and in_position and shares > 0:
            proceeds = shares * price
            cash += proceeds
            if trades:
                trades[-1]['sell_date'] = str(dates[i])[:10]
                trades[-1]['sell_price'] = round(price, 2)
                trades[-1]['pnl'] = round(proceeds - trades[-1]['value'], 2)
                trades[-1]['pnl_pct'] = round(((price / trades[-1]['price']) - 1) * 100, 2)
            shares = 0
            in_position = False
        equity = cash + (shares * price)
        equity_curve.append({'date': str(dates[i])[:10], 'equity': round(equity, 2)})

    if in_position and shares > 0:
        price = float(closes[-1])
        proceeds = shares * price
        cash += proceeds
        if trades and 'sell_date' not in trades[-1]:
            trades[-1]['sell_date'] = str(dates[-1])[:10]
            trades[-1]['sell_price'] = round(price, 2)
            trades[-1]['pnl'] = round(proceeds - trades[-1]['value'], 2)
            trades[-1]['pnl_pct'] = round(((price / trades[-1]['price']) - 1) * 100, 2)
        shares = 0

    final_equity = cash
    total_return = ((final_equity / initial_capital) - 1) * 100
    eq_values = [e['equity'] for e in equity_curve]
    peak = eq_values[0]
    max_dd = 0
    for v in eq_values:
        if v > peak:
            peak = v
        dd = (peak - v) / peak * 100
        if dd > max_dd:
            max_dd = dd
    returns = []
    for j in range(1, len(eq_values)):
        if eq_values[j-1] > 0:
            returns.append((eq_values[j] / eq_values[j-1]) - 1)
    sharpe = 0
    if len(returns) > 1:
        avg_ret = sum(returns) / len(returns)
        std_ret = math.sqrt(sum((r - avg_ret) ** 2 for r in returns) / (len(returns) - 1)) if len(returns) > 1 else 0
        sharpe = round((avg_ret / std_ret) * math.sqrt(252), 2) if std_ret > 0 else 0
    closed_trades = [t for t in trades if 'pnl' in t]
    wins = sum(1 for t in closed_trades if t.get('pnl', 0) > 0)
    win_rate = round((wins / len(closed_trades) * 100), 2) if closed_trades else 0

    return {
        'ticker': base,
        'strategy': strategy,
        'initial_capital': initial_capital,
        'final_equity': round(final_equity, 2),
        'total_return': round(total_return, 2),
        'max_drawdown': round(max_dd, 2),
        'sharpe_ratio': sharpe,
        'win_rate': win_rate,
        'total_trades': len(closed_trades),
        'equity_curve': equity_curve[::5],
        'trades': trades,
        'source': 'derived',
    }


# ─── Paper Trading ─────────────────────


class PaperTradePayload(BaseModel):
    ticker: str = Field(min_length=1)
    trade_type: str = Field(pattern=r'^(BUY|SELL)$')
    quantity: int = Field(gt=0)
    price: float = Field(gt=0)
    strategy: str = 'manual'
    notes: str = ''


@router.get('/api/paper-trades')
def list_paper_trades(status: str = '', db: Session = Depends(get_db)):
    q = db.query(PaperTrade).order_by(PaperTrade.entry_date.desc())
    if status in ('open', 'closed'):
        q = q.filter(PaperTrade.status == status)
    rows = q.limit(50).all()
    return {'count': len(rows), 'data': [{
        'id': r.id, 'ticker': r.ticker, 'trade_type': r.trade_type,
        'entry_price': r.entry_price, 'quantity': r.quantity,
        'entry_date': r.entry_date.isoformat()[:19] if r.entry_date else '',
        'exit_price': r.exit_price, 'exit_date': r.exit_date.isoformat()[:19] if r.exit_date else None,
        'pnl': r.pnl, 'pnl_pct': r.pnl_pct, 'status': r.status,
        'strategy': r.strategy or 'manual', 'notes': r.notes or '',
    } for r in rows]}


@router.post('/api/paper-trades')
def open_paper_trade(payload: PaperTradePayload, db: Session = Depends(get_db)):
    ticker = payload.ticker.upper().strip()
    trade = PaperTrade(ticker=ticker, trade_type=payload.trade_type,
                       entry_price=payload.price, quantity=payload.quantity,
                       strategy=payload.strategy or 'manual', notes=payload.notes or '')
    db.add(trade)
    db.commit()
    db.refresh(trade)
    return {'ok': True, 'id': trade.id, 'message': f'{trade.trade_type} {ticker}: {payload.quantity} saham @ {payload.price}'}


@router.post('/api/paper-trades/{trade_id}/close')
def close_paper_trade(trade_id: int, price: float = 0, db: Session = Depends(get_db)):
    trade = db.query(PaperTrade).filter(PaperTrade.id == trade_id).first()
    if not trade:
        return {'ok': False, 'message': 'Trade not found'}
    if trade.status != 'open':
        return {'ok': False, 'message': 'Trade already closed'}
    exit_price = price if price > 0 else trade.entry_price
    if trade.trade_type == 'BUY':
        trade.pnl = round((exit_price - trade.entry_price) * trade.quantity, 2)
    else:
        trade.pnl = round((trade.entry_price - exit_price) * trade.quantity, 2)
    trade.pnl_pct = round(((exit_price / trade.entry_price) - 1) * 100, 2) if trade.entry_price else 0
    trade.exit_price = exit_price
    trade.exit_date = datetime.utcnow()
    trade.status = 'closed'
    db.commit()
    return {'ok': True, 'message': f'Closed {trade.ticker}: PnL {trade.pnl:+,.0f}', 'pnl': trade.pnl}


@router.delete('/api/paper-trades/{trade_id}')
def delete_paper_trade(trade_id: int, db: Session = Depends(get_db)):
    trade = db.query(PaperTrade).filter(PaperTrade.id == trade_id).first()
    if not trade:
        return {'ok': False, 'message': 'Trade not found'}
    db.delete(trade)
    db.commit()
    return {'ok': True, 'message': f'Trade {trade_id} deleted'}


@router.get('/api/stocks/{ticker}/dividends')
def get_stock_dividends(ticker: str, db: Session = Depends(get_db)):
    """Return dividend history for a ticker from CalendarEvent table."""
    base = _ticker_base(ticker)
    try:
        from database import CalendarEvent
    except (ImportError, ModuleNotFoundError):
        try:
            from backend.database import CalendarEvent
        except (ImportError, ModuleNotFoundError):
            return {'ticker': base, 'count': 0, 'data': [], 'source': 'no_data'}
    
    events = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.ticker == base, CalendarEvent.event_type == 'dividend')
        .order_by(CalendarEvent.event_date.desc())
        .all()
    )
    
    total_yield = 0
    data = []
    for e in events:
        yield_val = None
        desc = e.description or ''
        if 'yield' in desc.lower():
            import re
            match = re.search(r'([\d.]+)%', desc)
            if match:
                yield_val = float(match.group(1))
                total_yield += yield_val
        data.append({
            'id': e.id,
            'title': e.title,
            'date': e.event_date.isoformat() if hasattr(e.event_date, 'isoformat') else str(e.event_date),
            'description': desc,
            'yield': yield_val,
        })
    
    return {
        'ticker': base,
        'count': len(data),
        'total_yield': round(total_yield, 2),
        'data': data,
        'source': 'CalendarEvent',
    }


@router.get('/api/stocks/{ticker}/report')
def get_stock_report_pdf(ticker: str, db: Session = Depends(get_db)):
    """Generate PDF stock report via WeasyPrint."""
    try:
        from services.pdf_report import generate_stock_report
    except ModuleNotFoundError:
        from backend.services.pdf_report import generate_stock_report
    from fastapi.responses import Response, JSONResponse

    pdf_bytes = generate_stock_report(db, ticker)
    if pdf_bytes is None:
        return JSONResponse(
            status_code=500,
            content={'ok': False, 'message': 'Gagal generate laporan PDF. Coba lagi nanti.'}
        )

    return Response(
        content=pdf_bytes,
        media_type='application/pdf',
        headers={
            'Content-Disposition': f'attachment; filename="{ticker}_laporan_retailbijak.pdf"',
            'Content-Length': str(len(pdf_bytes)),
        }
    )

@router.get('/api/paper-trades/summary')
def paper_trade_summary(db: Session = Depends(get_db)):
    from sqlalchemy import func
    total = db.query(func.count(PaperTrade.id)).scalar() or 0
    open_count = db.query(func.count(PaperTrade.id)).filter(PaperTrade.status == 'open').scalar() or 0
    closed = db.query(PaperTrade).filter(PaperTrade.status == 'closed').all()
    total_pnl = sum(t.pnl or 0 for t in closed)
    wins = sum(1 for t in closed if (t.pnl or 0) > 0)
    win_rate = round((wins / len(closed) * 100), 2) if closed else 0
    return {'total': total, 'open': open_count, 'closed': len(closed),
            'total_pnl': round(total_pnl, 2), 'win_rate': win_rate, 'source': 'db'}
