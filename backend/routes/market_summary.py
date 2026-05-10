from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import OHLCVDaily, Stock, UserSetting, get_db
from routes.shared_market_summary_helpers import _load_period_for_ihsg, _parse_sector_snapshot_payload, _safe_pct
router = APIRouter()




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
        fallback = _load_period_for_ihsg(db, 'idx_ihsg_chart_1M')
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


@router.get('/api/sectors/{sector_name}/stocks')
def get_sector_stocks(sector_name: str, db: Session = Depends(get_db)):
    from sqlalchemy import func
    sector_name = sector_name.replace('-', ' ').upper()
    stocks = db.query(Stock).filter(func.upper(Stock.sector) == sector_name).order_by(Stock.market_cap.desc().nullslast()).limit(100).all()
    tickers = [s.ticker for s in stocks]
    # Get latest OHLCV for each ticker
    latest = db.query(
        OHLCVDaily.ticker,
        func.max(OHLCVDaily.date).label('max_date')
    ).filter(OHLCVDaily.ticker.in_(tickers)).group_by(OHLCVDaily.ticker).subquery()
    prices = db.query(OHLCVDaily).join(
        latest,
        (OHLCVDaily.ticker == latest.c.ticker) & (OHLCVDaily.date == latest.c.max_date)
    ).all()
    price_map = {p.ticker: {'close': p.close, 'volume': p.volume} for p in prices}
    # Get previous day close for change calculation
    prev_data = db.query(OHLCVDaily).filter(
        OHLCVDaily.ticker.in_(tickers)
    ).order_by(OHLCVDaily.ticker, OHLCVDaily.date.desc()).all()
    # Build map: ticker -> [most_recent_close, prev_close]
    ticker_closes = {}
    for row in prev_data:
        if row.ticker not in ticker_closes:
            ticker_closes[row.ticker] = []
        if len(ticker_closes[row.ticker]) < 2:
            ticker_closes[row.ticker].append(row.close)
    result = []
    for s in stocks:
        p = price_map.get(s.ticker, {})
        close_val = p.get('close')
        closes = ticker_closes.get(s.ticker, [])
        change_val = (closes[0] - closes[1]) if len(closes) >= 2 and closes[0] is not None and closes[1] is not None else None
        result.append({
            'ticker': s.ticker,
            'name': s.name or '',
            'market_cap': s.market_cap,
            'sector': s.sector,
            'industry': s.industry,
            'price': close_val,
            'change': change_val,
            'volume': p.get('volume'),
        })
    return {'count': len(result), 'data': result, 'sector': sector_name}


@router.get('/api/market/heatmap')
def sector_heatmap(db: Session = Depends(get_db)):
    """Return sector-level heatmap: per-sector change%, market cap, stock count."""
    from collections import defaultdict

    # Get all stocks with sector
    stocks = db.query(Stock).filter(Stock.sector.isnot(None), Stock.sector != '').all()

    # Get latest two OHLCV dates for each ticker to compute change%
    sector_data = defaultdict(lambda: {'tickers': [], 'total_market_cap': 0.0, 'total_value': 0.0, 'changes': []})

    for s in stocks:
        sec = s.sector.strip()
        sec = 'Infrastructure' if sec == 'Infrastructures' else sec  # normalise typo
        latest = db.query(OHLCVDaily).filter(
            OHLCVDaily.ticker == s.ticker
        ).order_by(OHLCVDaily.date.desc()).first()
        prev = db.query(OHLCVDaily).filter(
            OHLCVDaily.ticker == s.ticker
        ).order_by(OHLCVDaily.date.desc()).offset(1).first()

        close = float(latest.close) if latest and latest.close else None
        prev_close = float(prev.close) if prev and prev.close else None
        change = (close - prev_close) if close is not None and prev_close is not None else None
        change_pct = round((change / prev_close) * 100, 2) if change is not None and prev_close else None
        mc = float(s.market_cap or 0)

        sector_data[sec]['tickers'].append(s.ticker)
        sector_data[sec]['total_market_cap'] += mc
        if close is not None:
            sector_data[sec]['total_value'] += close
        if change_pct is not None:
            sector_data[sec]['changes'].append(change_pct)

    result = []
    for sec, data in sorted(sector_data.items(), key=lambda x: -x[1]['total_market_cap']):
        avg_change = round(sum(data['changes']) / len(data['changes']), 2) if data['changes'] else None
        result.append({
            'name': sec,
            'change_pct': avg_change,
            'stock_count': len(data['tickers']),
            'total_market_cap': round(data['total_market_cap'], 2),
            'strength': _strength_label(avg_change),
        })

    return {'count': len(result), 'data': result}


def _strength_label(pct):
    if pct is None:
        return 'neutral'
    if pct >= 2:
        return 'very_strong'
    if pct >= 1:
        return 'strong'
    if pct >= 0:
        return 'positive'
    if pct >= -1:
        return 'negative'
    if pct >= -2:
        return 'weak'
    return 'very_weak'
