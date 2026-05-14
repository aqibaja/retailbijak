from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

try:
    from database import Stock, get_db
except ModuleNotFoundError:
    from backend.database import Stock, get_db

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
def search_stocks(q: str = '', limit: int = 10, db: Session = Depends(get_db)):
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
                data.append({
                    'ticker': ticker,
                    'name': name,
                    'sector': sector,
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
