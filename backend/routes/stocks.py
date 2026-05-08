from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

try:
    from database import Stock, OHLCVDaily, get_db
except ModuleNotFoundError:
    from backend.database import Stock, OHLCVDaily, get_db

try:
    from routes.shared_stocks_helpers import _display_ticker, _company_name, _stock_row_from_static, _search_rank, _search_bucket, SECTOR_HINTS
except ModuleNotFoundError:
    from backend.routes.shared_stocks_helpers import _display_ticker, _company_name, _stock_row_from_static, _search_rank, _search_bucket, SECTOR_HINTS

try:
    from stocks import get_all_tickers
except ModuleNotFoundError:
    from backend.stocks import get_all_tickers

router = APIRouter()


@router.get('/api/stocks/search')
def search_stocks(q: str = '', limit: int = 15, db: Session = Depends(get_db)):
    query = q.strip().upper()
    if not query:
        return {'count': 0, 'data': [], 'source': 'empty'}

    rows = db.query(Stock).limit(2000).all()
    data = []
    if rows:
        for row in rows:
            ticker = _display_ticker(row.ticker)
            name = row.name or _company_name(row.ticker)
            sector = row.sector or SECTOR_HINTS.get(ticker, '')
            if query in ticker or query in name.upper() or (len(query) >= 4 and query in sector.upper()):
                # Fetch latest price
                latest = db.query(OHLCVDaily).filter(
                    OHLCVDaily.ticker == row.ticker
                ).order_by(OHLCVDaily.date.desc()).first()
                prev = db.query(OHLCVDaily).filter(
                    OHLCVDaily.ticker == row.ticker
                ).order_by(OHLCVDaily.date.desc()).offset(1).first()
                close = float(latest.close) if latest and latest.close else None
                prev_close = float(prev.close) if prev and prev.close else (close or 0)
                change = (close - prev_close) if close and prev_close else None
                change_pct = ((change / prev_close) * 100) if change is not None and prev_close else None
                data.append({
                    'ticker': ticker,
                    'name': name,
                    'sector': sector,
                    'price': close,
                    'change': round(change, 2) if change is not None else None,
                    'change_pct': round(change_pct, 2) if change_pct is not None else None,
                    'source': 'db',
                    'bucket': _search_bucket(ticker, name, sector, query),
                    '_rank': _search_rank(row.ticker, row.name, row.sector, query),
                })
    if not data:
        for i, ticker in enumerate(get_all_tickers()):
            base = _display_ticker(ticker)
            name = _company_name(base)
            sector = SECTOR_HINTS.get(base, '')
            if query in base or query in name.upper() or (len(query) >= 4 and query in sector.upper()):
                item = _stock_row_from_static(base, i)
                item['price'] = None
                item['change'] = None
                item['change_pct'] = None
                item['source'] = 'idx_universe'
                item['bucket'] = _search_bucket(base, name, sector, query)
                item['_rank'] = _search_rank(base, name, sector, query)
                data.append(item)

    data.sort(key=lambda r: (r.get('_rank') or (9, 9, 9, 9), r.get('ticker') or ''))
    for item in data:
        item.pop('_rank', None)
    grouped = {'ticker': [], 'company': [], 'sector': []}
    for item in data:
        grouped[item.get('bucket', 'company')].append(item)
    ordered = grouped['ticker'] + grouped['company'] + grouped['sector']
    return {'count': len(ordered[:limit]), 'data': ordered[:limit], 'source': 'db' if rows else 'idx_universe', 'groups': {k: len(v) for k, v in grouped.items()}}
