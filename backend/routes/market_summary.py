from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

try:
    from database import OHLCVDaily, Stock, UserSetting, get_db
except ModuleNotFoundError:
    from backend.database import OHLCVDaily, Stock, UserSetting, get_db

try:
    from routes.shared_market_summary_helpers import _parse_sector_snapshot_payload
except ModuleNotFoundError:
    from backend.routes.shared_market_summary_helpers import _parse_sector_snapshot_payload

router = APIRouter()


def _load_period_for_ihsg(db: Session, period_key: str):
    setting = db.query(UserSetting).filter(UserSetting.key == period_key).first()
    if not (setting and setting.value):
        return None
    data = json.loads(setting.value)
    chart_data = data.get('ChartData', [])
    points = []
    for pt in chart_data:
        ts = pt.get('Date', 0)
        if ts:
            dt = datetime.fromtimestamp(ts / 1000)
            points.append({'date': dt.strftime('%Y-%m-%d'), 'value': pt.get('Close')})
    return {
        'period': period_key.rsplit('_', 1)[-1],
        'index_code': data.get('IndexCode', 'COMPOSITE'),
        'open_price': data.get('OpenPrice'),
        'max_price': data.get('MaxPrice'),
        'min_price': data.get('MinPrice'),
        'count': len(points),
        'data': points,
        'source': 'idx_cached',
    }


def _safe_pct(latest_close, prev_close):
    try:
        latest_close = float(latest_close)
        prev_close = float(prev_close)
        if prev_close == 0:
            return None
        return ((latest_close - prev_close) / prev_close) * 100.0
    except Exception:
        return None


@router.get('/api/ihsg-chart')
def get_ihsg_chart(period: str = '1M', db: Session = Depends(get_db)):
    valid_periods = ['1D', '1W', '1M', '1Q', '1Y']
    if period not in valid_periods:
        period = '1M'

    key = f'idx_ihsg_chart_{period}'
    payload = _load_period_for_ihsg(db, key)
    if payload and payload.get('data'):
        if period == '1W' and payload['count'] > 7:
            payload['data'] = payload['data'][-7:]
            payload['count'] = len(payload['data'])
            payload['source'] = 'idx_cached_derived_1w'
        return payload

    if period == '1W':
        fallback = _load_period('idx_ihsg_chart_1M')
        if fallback and fallback.get('data'):
            fallback['data'] = fallback['data'][-7:]
            fallback['count'] = len(fallback['data'])
            fallback['period'] = '1W'
            fallback['source'] = 'idx_cached_derived_1w'
            return fallback

    return {'period': period, 'count': 0, 'data': [], 'source': 'idx_cached', 'message': 'No cached data. Run daily sync first.'}


@router.get('/api/market-summary')
def get_market_summary(db: Session = Depends(get_db)):
    setting = db.query(UserSetting).filter(UserSetting.key == 'idx_market_summary').first()
    if setting and setting.value:
        try:
            payload = json.loads(setting.value)
            close = payload.get('close')
            previous = payload.get('previous') or payload.get('open')
            change_pct = payload.get('percent')
            if change_pct is None and close and previous:
                change_pct = ((float(close) - float(previous)) / float(previous)) * 100
            data_date = payload.get('date')
            return {
                'symbol': 'IHSG',
                'value': round(float(close), 2) if close is not None else None,
                'open': round(float(previous), 2) if previous is not None else None,
                'high': round(float(payload.get('high')), 2) if payload.get('high') is not None else None,
                'low': round(float(payload.get('low')), 2) if payload.get('low') is not None else None,
                'change': round(float(payload.get('change')), 2) if payload.get('change') is not None else None,
                'change_pct': round(float(change_pct), 2) if change_pct is not None else None,
                'source': 'idx_index_summary',
                'updated_at': data_date,
                'data_date': data_date,
                'data_label': f'Data IDX tanggal {data_date}' if data_date else None,
                'status': 'ok',
                'coverage': db.query(OHLCVDaily).filter(OHLCVDaily.date == datetime.fromisoformat(data_date) if data_date else True).count() if data_date else 0,
            }
        except Exception:
            pass

    latest_row = db.query(OHLCVDaily).order_by(OHLCVDaily.date.desc()).first()
    if not latest_row:
        return {'symbol': 'IHSG', 'value': None, 'change_pct': None, 'source': 'db', 'updated_at': None, 'status': 'no_data'}

    latest_date = latest_row.date
    latest_rows = db.query(OHLCVDaily).filter(OHLCVDaily.date == latest_date).all()
    if not latest_rows:
        return {'symbol': 'IHSG', 'value': None, 'change_pct': None, 'source': 'db', 'updated_at': latest_date.isoformat() if latest_date else None, 'status': 'no_data'}

    current_closes = [row.close for row in latest_rows if row.close is not None and row.close > 0]
    if not current_closes:
        return {'symbol': 'IHSG', 'value': None, 'change_pct': None, 'source': 'db', 'updated_at': latest_date.isoformat() if latest_date else None, 'status': 'no_data'}

    value = sum(current_closes) / len(current_closes)
    prev_row = db.query(OHLCVDaily).filter(OHLCVDaily.date < latest_date).order_by(OHLCVDaily.date.desc()).first()
    change_pct = None
    if prev_row:
        prev_date = prev_row.date
        prev_rows = db.query(OHLCVDaily).filter(OHLCVDaily.date == prev_date).all()
        prev_closes = [row.close for row in prev_rows if row.close is not None and row.close > 0]
        if prev_closes:
            prev_value = sum(prev_closes) / len(prev_closes)
            if prev_value > 0:
                change_pct = ((value - prev_value) / prev_value) * 100

    data_date = latest_date.date().isoformat() if latest_date else None
    return {
        'symbol': 'IDX Composite (Proxy)',
        'value': round(value, 2),
        'change_pct': round(change_pct, 2) if change_pct is not None else None,
        'source': 'db',
        'updated_at': latest_date.isoformat() if latest_date else None,
        'data_date': data_date,
        'data_label': f'Data IDX tanggal {data_date}' if data_date else None,
        'status': 'ok',
        'coverage': len(latest_rows),
    }


def _parse_sector_snapshot_payload(payload: dict | list | None) -> tuple[list[dict], str | None]:
    data: list[dict] = []
    updated_at = None

    def _normalize_points(points):
        if not isinstance(points, list):
            return []
        return [p for p in points if isinstance(p, dict)]

    if isinstance(payload, dict):
        updated_at = payload.get('date') or payload.get('updated_at')
        container = payload.get('data') if isinstance(payload.get('data'), dict) else payload
        series = container.get('series') if isinstance(container, dict) else None
        if isinstance(series, list) and series:
            for idx, item in enumerate(series):
                if not isinstance(item, dict):
                    continue
                sector = item.get('seriesName') or item.get('name') or f'Sector {idx + 1}'
                points = _normalize_points(item.get('seriesData') or item.get('points') or [])
                latest_point = points[-1] if points else {}
                change_pct = latest_point.get('y') if isinstance(latest_point, dict) else None
                if change_pct is None and isinstance(latest_point, dict):
                    change_pct = latest_point.get('change')
                if change_pct is None and isinstance(latest_point, dict):
                    change_pct = latest_point.get('value')
                try:
                    change_pct = round(float(change_pct), 2) if change_pct is not None else 0.0
                except Exception:
                    change_pct = 0.0
                data.append({'sector': sector, 'count': len(points), 'market_cap': 0.0, 'change_pct': change_pct})
            return data, updated_at
        rows = container.get('data') if isinstance(container, dict) else payload.get('data')
    else:
        rows = payload

    if isinstance(rows, list) and rows:
        for idx, row in enumerate(rows):
            if not isinstance(row, dict):
                continue
            sector = row.get('SectorName') or row.get('sectorName') or row.get('sector') or row.get('IndexName') or row.get('name') or row.get('IndexCode') or f'Sector {idx+1}'
            change_pct = row.get('ChangePct') or row.get('changePct') or row.get('change_pct') or row.get('Percent') or row.get('percent')
            count = row.get('Count') or row.get('count') or row.get('Total') or row.get('total') or row.get('weight') or 0
            market_cap = row.get('MarketCap') or row.get('marketCap') or row.get('market_cap') or 0
            try:
                change_pct = round(float(change_pct), 2) if change_pct is not None else 0.0
            except Exception:
                change_pct = 0.0
            try:
                count = int(float(count))
            except Exception:
                count = 0
            try:
                market_cap = round(float(market_cap), 2)
            except Exception:
                market_cap = 0.0
            data.append({'sector': sector, 'count': count, 'market_cap': market_cap, 'change_pct': change_pct})
    return data, updated_at


@router.get('/api/sector-summary')
def get_sector_summary(db: Session = Depends(get_db)):
    setting = db.query(UserSetting).filter(UserSetting.key == 'idx_sectoral_snapshot').first()
    if setting and setting.value:
        try:
            payload = json.loads(setting.value)
            data, updated_at = _parse_sector_snapshot_payload(payload)
            if data:
                return {'count': len(data), 'data': data, 'source': 'idx_sectoral_snapshot', 'status': 'ok', 'updated_at': updated_at}
        except Exception:
            pass

    rows = db.query(Stock).all()
    buckets = defaultdict(lambda: {'count': 0, 'market_cap': 0.0, 'change_sum': 0.0, 'change_count': 0})

    for row in rows:
        sector = row.sector or 'Unknown'
        buckets[sector]['count'] += 1
        buckets[sector]['market_cap'] += float(row.market_cap or 0)
        ticker = (row.ticker or '').upper().strip()
        if not ticker:
            continue
        latest = db.query(OHLCVDaily).filter(OHLCVDaily.ticker == ticker).order_by(OHLCVDaily.date.desc()).limit(2).all()
        if len(latest) >= 2 and latest[0].close is not None and latest[1].close is not None:
            pct = _safe_pct(latest[0].close, latest[1].close)
            if pct is not None:
                buckets[sector]['change_sum'] += pct
                buckets[sector]['change_count'] += 1

    if not rows:
        return {'count': 0, 'data': [], 'source': 'db', 'status': 'no_data'}

    data = []
    for sector, val in sorted(buckets.items(), key=lambda item: item[1]['count'], reverse=True):
        change_pct = (val['change_sum'] / val['change_count']) if val['change_count'] else 0.0
        data.append({
            'sector': sector,
            'count': val['count'],
            'market_cap': round(val['market_cap'], 2),
            'change_pct': round(change_pct, 2),
        })
    return {'count': len(data), 'data': data, 'source': 'db', 'status': 'ok'}
