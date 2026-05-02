from __future__ import annotations

import json
from datetime import datetime

try:
    from database import UserSetting
except ModuleNotFoundError:
    from backend.database import UserSetting


def _load_period_for_ihsg(db, period_key: str):
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
