from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, case
from sqlalchemy.orm import Session

try:
    from database import BrokerSummary, UserSetting, OHLCVDaily, Stock, get_db
except ModuleNotFoundError:
    from backend.database import BrokerSummary, UserSetting, OHLCVDaily, Stock, get_db

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


@router.get('/api/foreign-flow')
def get_foreign_flow(limit: int = 10, db: Session = Depends(get_db)):
    """Aggregate BrokerSummary per ticker — real net foreign buy/sell from IDX broker data."""
    try:
        from sqlalchemy import func
        latest = db.query(func.max(BrokerSummary.date)).scalar()
        if not latest:
            return {'count': 0, 'data': [], 'source': 'no_data'}
        rows = db.query(
            BrokerSummary.ticker,
            func.sum(BrokerSummary.buy_volume).label('total_buy_vol'),
            func.sum(BrokerSummary.sell_volume).label('total_sell_vol'),
            func.sum(BrokerSummary.net_volume).label('total_net_vol'),
            func.sum(BrokerSummary.buy_value).label('total_buy_val'),
            func.sum(BrokerSummary.sell_value).label('total_sell_val'),
            func.sum(BrokerSummary.net_value).label('total_net_val'),
        ).filter(
            BrokerSummary.date == latest
        ).group_by(BrokerSummary.ticker).order_by(
            func.sum(BrokerSummary.net_value).desc()
        ).limit(limit).all()

        data = []
        for r in rows:
            data.append({
                'ticker': r.ticker,
                'buy_value': round(float(r.total_buy_val or 0), 2),
                'sell_value': round(float(r.total_sell_val or 0), 2),
                'net_value': round(float(r.total_net_val or 0), 2),
                'buy_volume': int(r.total_buy_vol or 0),
                'sell_volume': int(r.total_sell_vol or 0),
                'net_volume': int(r.total_net_vol or 0),
                'date': latest.isoformat() if hasattr(latest, 'isoformat') else str(latest),
                'source': 'db',
            })
        return {'count': len(data), 'data': data, 'source': 'db'}
    except Exception:
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


@router.get('/api/market/breadth')
def market_breadth(days: int = 50, db: Session = Depends(get_db)):
    """Return daily market breadth (gainers/decliners/unchanged)."""
    rows = db.query(
        OHLCVDaily.date,
        func.count().label('total'),
        func.sum(case((OHLCVDaily.close > OHLCVDaily.open, 1), else_=0)).label('gainers'),
        func.sum(case((OHLCVDaily.close < OHLCVDaily.open, 1), else_=0)).label('decliners'),
    ).filter(
        OHLCVDaily.close.isnot(None),
        OHLCVDaily.open.isnot(None),
    ).group_by(OHLCVDaily.date).order_by(OHLCVDaily.date.desc()).limit(days).all()
    
    data = []
    cum_breadth = 0
    for r in reversed(rows):
        gainers = int(r.gainers or 0)
        decliners = int(r.decliners or 0)
        unchanged = int(r.total) - gainers - decliners
        cum_breadth += gainers - decliners
        data.append({
            'date': str(r.date)[:10],
            'total': int(r.total),
            'gainers': gainers,
            'decliners': decliners,
            'unchanged': max(0, unchanged),
            'breadth_ratio': round(gainers / max(decliners, 1), 2),
            'cumulative_breadth': cum_breadth,
        })
    
    return {'count': len(data), 'data': data}


@router.get('/api/market/treemap')
def get_market_treemap(
    date: str | None = Query(None, description='Date in YYYY-MM-DD format, defaults to latest'),
    db: Session = Depends(get_db),
):
    """Treemap visualization data for the entire IDX market by sector.

    Returns sectors with weight (by market cap), 1d return %, and top stocks per sector.
    Designed for a CSS-based treemap view (11.6.1).
    """
    # 1. Determine target date
    if date:
        try:
            target_date = datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            return {'status': 'error', 'message': 'Invalid date format. Use YYYY-MM-DD'}
    else:
        latest_date_row = db.query(OHLCVDaily.date).order_by(OHLCVDaily.date.desc()).first()
        if not latest_date_row:
            return {'status': 'empty', 'date': None, 'total_stocks': 0, 'sectors': []}
        target_date = latest_date_row[0]

    # 2. Get all stocks with sector info
    db_stocks = db.query(Stock).filter(
        Stock.sector.isnot(None),
        Stock.sector != '',
    ).all()

    if not db_stocks:
        return {'status': 'empty', 'date': str(target_date)[:10], 'total_stocks': 0, 'sectors': []}

    stock_map = {s.ticker: s for s in db_stocks}

    # 3. Get OHLCV rows for target date
    # Use func.date() cast to handle SQLite storing dates as full timestamp strings
    target_date_str = str(target_date)[:10]
    ohlcv_rows = db.query(OHLCVDaily).filter(
        func.date(OHLCVDaily.date) == target_date_str
    ).all()
    price_map = {r.ticker: r for r in ohlcv_rows}

    # 4. Get previous close prices (last trading day before target_date)
    prev_date_row = db.query(func.date(OHLCVDaily.date)).filter(
        func.date(OHLCVDaily.date) < target_date_str,
    ).order_by(func.date(OHLCVDaily.date).desc()).first()

    prev_price_map = {}
    if prev_date_row:
        prev_rows = db.query(OHLCVDaily).filter(
            func.date(OHLCVDaily.date) == str(prev_date_row[0])[:10]
        ).all()
        prev_price_map = {r.ticker: r.close for r in prev_rows if r.close is not None}

    # 5. Build unified stock data with sector info
    total_market_cap = 0.0
    stock_data_list = []

    for ticker, stock in stock_map.items():
        ohlcv = price_map.get(ticker)
        if not ohlcv or ohlcv.close is None:
            continue

        close_price = float(ohlcv.close)
        prev_close = prev_price_map.get(ticker)
        change_pct = None
        if prev_close is not None and prev_close > 0:
            change_pct = round(((close_price - prev_close) / prev_close) * 100, 2)

        market_cap = float(stock.market_cap or 0)
        total_market_cap += market_cap

        stock_data_list.append({
            'ticker': ticker,
            'name': stock.name or ticker,
            'price': close_price,
            'change': change_pct,
            'market_cap': market_cap,
            'sector': stock.sector.strip(),
        })

    if not stock_data_list:
        return {'status': 'empty', 'date': str(target_date)[:10], 'total_stocks': 0, 'sectors': []}

    # 6. Group by sector — accumulate market cap and returns
    sector_groups: dict[str, dict] = {}
    for sd in stock_data_list:
        sec = sd['sector']
        if sec not in sector_groups:
            sector_groups[sec] = {'stocks': [], 'total_market_cap': 0.0, 'return_sum': 0.0, 'return_count': 0}
        sector_groups[sec]['stocks'].append(sd)
        sector_groups[sec]['total_market_cap'] += sd['market_cap']
        if sd['change'] is not None:
            sector_groups[sec]['return_sum'] += sd['change']
            sector_groups[sec]['return_count'] += 1

    # 7. Build sector list with weight and avg return
    # Fallback: if no market_cap data, use stock count as weight proxy
    total_stock_count = len(stock_data_list)
    use_count_fallback = total_market_cap == 0

    sector_list = []
    for sec, info in sector_groups.items():
        if use_count_fallback:
            weight = len(info['stocks']) / total_stock_count if total_stock_count > 0 else 0
        else:
            weight = info['total_market_cap'] / total_market_cap if total_market_cap > 0 else 0
        avg_return = round(info['return_sum'] / info['return_count'], 2) if info['return_count'] > 0 else 0

        # Top 10 stocks in sector — by market_cap if available, else by price
        sort_key = (lambda x: x['market_cap']) if not use_count_fallback else (lambda x: x['price'] or 0)
        top_stocks = sorted(info['stocks'], key=sort_key, reverse=True)[:10]

        sector_list.append({
            'sector': sec,
            'weight': round(weight, 4),
            'return_1d': avg_return,
            'stocks': top_stocks,
        })

    # 8. Sort sectors by weight descending, limit top 10 + "Other" bucket
    sector_list.sort(key=lambda x: x['weight'], reverse=True)

    if len(sector_list) > 10:
        top_sectors = sector_list[:10]

        # Aggregate "Other" sector
        other_weight = 0.0
        other_total_return = 0.0
        other_count = 0
        other_stocks_pool = []
        for s in sector_list[10:]:
            other_weight += s['weight']
            sec_name = s['sector']
            if sec_name in sector_groups:
                for stk in sector_groups[sec_name]['stocks']:
                    other_stocks_pool.append(stk)
                    if stk['change'] is not None:
                        other_total_return += stk['change']
                        other_count += 1

        other_avg_return = round(other_total_return / other_count, 2) if other_count > 0 else 0
        other_stocks_sorted = sorted(other_stocks_pool, key=lambda x: x['market_cap'], reverse=True)[:10]

        sector_list = top_sectors + [{
            'sector': 'Other',
            'weight': round(other_weight, 4),
            'return_1d': other_avg_return,
            'stocks': other_stocks_sorted,
        }]

    return {
        'status': 'ok',
        'date': str(target_date)[:10],
        'total_stocks': len(stock_data_list),
        'sectors': sector_list,
    }


# ─── 16.2.1 — SSE Live Price Ticker ────────────────

import asyncio

async def _live_price_generator(top_n: int = 50, interval: float = 5.0):
    """SSE generator: stream latest prices for top N stocks every `interval` seconds."""
    from database import SessionLocal as _SL
    from sqlalchemy import text as _text
    import json as _json

    while True:
        db = _SL()
        try:
            # Get latest OHLCV for top stocks
            rows = db.execute(
                _text("""
                    WITH latest AS (
                        SELECT ticker, MAX(date) as max_date
                        FROM ohlcv_daily
                        GROUP BY ticker
                    )
                    SELECT o.ticker, o.close, o.volume, o.date,
                           s.name, COALESCE(s.sector, 'N/A') as sector
                    FROM ohlcv_daily o
                    JOIN latest l ON l.ticker = o.ticker AND l.max_date = o.date
                    JOIN stocks s ON s.ticker = o.ticker
                    ORDER BY o.volume DESC
                    LIMIT :n
                """),
                {"n": top_n}
            ).fetchall()

            prices = []
            for r in rows:
                prices.append({
                    "ticker": r.ticker,
                    "close": float(r.close) if r.close else None,
                    "volume": int(r.volume) if r.volume else 0,
                    "name": r.name or r.ticker,
                    "sector": r.sector or "N/A",
                })

            yield f"data: {_json.dumps({'type': 'tick', 'prices': prices, 'count': len(prices), 'ts': datetime.utcnow().isoformat(timespec='seconds')})}\n\n"
        except Exception as exc:
            yield f"data: {_json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
        finally:
            db.close()

        await asyncio.sleep(interval)


@router.get('/api/market/live-prices')
async def stream_live_prices(top_n: int = 50, interval: float = 5.0):
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        _live_price_generator(top_n=min(top_n, 200), interval=max(interval, 1.0)),
        media_type='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'},
    )
