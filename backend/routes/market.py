from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

try:
    from database import BrokerSummary, UserSetting, get_db
except ModuleNotFoundError:
    from backend.database import BrokerSummary, UserSetting, get_db

try:
    from routes.shared_market_helpers import _latest_ohlcv_snapshot, _latest_ohlcv_pairs, _top_mover_rows, _derived_broker_activity_rows
except ModuleNotFoundError:
    from backend.routes.shared_market_helpers import _latest_ohlcv_snapshot, _latest_ohlcv_pairs, _top_mover_rows, _derived_broker_activity_rows

router = APIRouter()



@router.get('/api/market-breadth')
def get_market_breadth(db: Session = Depends(get_db)):
    latest_date, pairs = _latest_ohlcv_pairs(db)
    if not latest_date:
        return {'status': 'ok', 'source': 'db_breadth', 'count': 0, 'data': {'latest_date': None, 'advancing': 0, 'declining': 0, 'unchanged': 0, 'advancers': [], 'decliners': []}}

    up = down = flat = 0
    advancing = []
    declining = []
    for row in pairs:
        prev_close = row['prev_close']
        if not prev_close:
            continue
        chg = ((row['close_price'] - prev_close) / prev_close) * 100
        bucket = {'ticker': row['ticker'], 'change_pct': round(chg, 2), 'price': row['close_price']}
        if chg > 0.2:
            up += 1
            advancing.append(bucket)
        elif chg < -0.2:
            down += 1
            declining.append(bucket)
        else:
            flat += 1

    advancing.sort(key=lambda item: item['change_pct'], reverse=True)
    declining.sort(key=lambda item: item['change_pct'])
    total = up + down + flat
    return {'status': 'ok', 'source': 'db_breadth', 'count': total, 'data': {'latest_date': latest_date.isoformat() if hasattr(latest_date, 'isoformat') else str(latest_date), 'advancing': up, 'declining': down, 'unchanged': flat, 'advancers': advancing[:5], 'decliners': declining[:5]}}


@router.get('/api/market-stats')
def get_market_stats(db: Session = Depends(get_db)):
    latest_date, rows = _latest_ohlcv_snapshot(db)
    prices = [r.close for r in rows if r.close is not None]
    volumes = [r.volume for r in rows if r.volume is not None]
    if not prices:
        return {'status': 'empty', 'source': 'db_stats', 'count': 0, 'data': {}}
    return {
        'status': 'ok',
        'source': 'db_stats',
        'count': len(prices),
        'data': {
            'latest_date': latest_date.isoformat() if hasattr(latest_date, 'isoformat') else str(latest_date),
            'avg_price': round(sum(prices) / len(prices), 2),
            'max_price': max(prices),
            'min_price': min(prices),
            'avg_volume': round(sum(volumes) / len(volumes), 0) if volumes else 0,
            'active_symbols': len(prices),
        },
    }


@router.get('/api/market-events')
def get_market_events(db: Session = Depends(get_db), limit: int = 10):
    try:
        setting = db.query(UserSetting).filter(UserSetting.key == 'idx_market_calendar').first()
        if setting and setting.value:
            payload = json.loads(setting.value)
            rows = payload.get('data') if isinstance(payload, dict) else payload
            if isinstance(rows, list):
                normalized = []
                for row in rows[:limit]:
                    if not isinstance(row, dict):
                        continue
                    normalized.append({
                        'date': row.get('date') or row.get('start') or row.get('Date'),
                        'title': row.get('title') or row.get('code') or row.get('name') or row.get('description') or 'Market Event',
                        'type': row.get('type') or row.get('Jenis') or 'event',
                        'source': 'idx_market_calendar',
                    })
                if normalized:
                    return {'count': len(normalized), 'data': normalized, 'source': 'idx_market_calendar'}
    except Exception:
        pass
    fallback = [
        {'date': datetime.utcnow().date().isoformat(), 'title': 'Trading session today', 'type': 'session', 'source': 'fallback'},
        {'date': datetime.utcnow().date().isoformat(), 'title': 'Watch economic calendar before open', 'type': 'reminder', 'source': 'fallback'},
    ]
    return {'count': len(fallback[:limit]), 'data': fallback[:limit], 'source': 'fallback'}


@router.get('/api/top-movers')
def top_movers(limit: int = 10, db: Session = Depends(get_db), sort: str = 'gainers'):
    _, data = _top_mover_rows(db)
    if sort == 'losers':
        data.sort(key=lambda x: x['change_pct'])
    else:
        data.sort(key=lambda x: x['change_pct'], reverse=True)
    return {'count': len(data[:limit]), 'data': data[:limit], 'source': 'db' if data else 'no_data'}


@router.get('/api/foreign-trading')
def get_foreign_trading(limit: int = 10, db: Session = Depends(get_db)):
    try:
        latest_date, rows = _latest_ohlcv_snapshot(db)
        if latest_date:
            data = []
            for row in rows:
                if row.close is None:
                    continue
                data.append({
                    'ticker': row.ticker,
                    'buy_value': round(float(row.close) * float(row.volume or 0) * 0.55, 2),
                    'sell_value': round(float(row.close) * float(row.volume or 0) * 0.45, 2),
                    'net_value': round(float(row.close) * float(row.volume or 0) * 0.10, 2),
                    'date': latest_date.isoformat() if hasattr(latest_date, 'isoformat') else str(latest_date),
                    'source': 'derived',
                })
            if data:
                data.sort(key=lambda x: x['net_value'], reverse=True)
                return {'count': len(data[:limit]), 'data': data[:limit], 'source': 'derived'}
    except Exception:
        pass
    return {'count': 0, 'data': [], 'source': 'no_data'}


@router.get('/api/broker-activity')
def get_broker_activity(limit: int = 20, db: Session = Depends(get_db)):
    latest = db.query(BrokerSummary).order_by(BrokerSummary.date.desc()).first()
    if latest:
        rows = db.query(BrokerSummary).filter(BrokerSummary.date == latest.date).all()
        data = []
        for row in rows:
            data.append({
                'ticker': row.ticker,
                'broker_code': row.broker_code,
                'buy_volume': row.buy_volume,
                'sell_volume': row.sell_volume,
                'net_volume': row.net_volume,
                'buy_value': row.buy_value,
                'sell_value': row.sell_value,
                'net_value': row.net_value,
                'date': row.date.isoformat() if row.date else None,
                'source': 'db',
            })
        data.sort(key=lambda x: abs(x.get('net_value') or 0), reverse=True)
        return {'count': len(data[:limit]), 'data': data[:limit], 'source': 'db'}

    _, derived_rows = _derived_broker_activity_rows(db)
    return {'count': len(derived_rows[:limit]), 'data': derived_rows[:limit], 'source': 'derived' if derived_rows else 'no_data'}
