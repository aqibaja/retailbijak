from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import Stock, OHLCVDaily, get_db
from routes.shared_stocks_helpers import _display_ticker, _company_name, _stock_row_from_static, _search_rank, _search_bucket, SECTOR_HINTS
from stocks import get_all_tickers
router = APIRouter()


@router.get('/api/stocks/search')
def search_stocks(
    q: str = '',
    sector: str = '',
    industry: str = '',
    mcap_min: float = None,
    mcap_max: float = None,
    limit: int = 15,
    db: Session = Depends(get_db),
):
    query = q.strip().upper()
    
    # Get all stocks from DB
    rows = db.query(Stock).limit(2000).all()
    data = []
    
    # Build sector filter list
    sector_filters = [s.strip().upper() for s in sector.split(',') if s.strip()] if sector else []
    
    if rows:
        for row in rows:
            ticker = _display_ticker(row.ticker)
            name = row.name or _company_name(row.ticker)
            sector_val = row.sector or SECTOR_HINTS.get(ticker, '')
            industry_val = row.industry or ''
            market_cap = row.market_cap
            
            # Text query filter
            text_match = True
            if query:
                text_match = (query in ticker or query in name.upper() or 
                             (len(query) >= 3 and query in sector_val.upper()))
            
            # Sector filter
            sector_match = True
            if sector_filters:
                sector_match = any(f in sector_val.upper() for f in sector_filters)
            
            # Industry filter
            industry_match = True
            if industry:
                industry_match = industry.upper() in industry_val.upper()
            
            # Market cap filter
            mcap_match = True
            if market_cap is not None:
                if mcap_min is not None and market_cap < mcap_min:
                    mcap_match = False
                if mcap_max is not None and market_cap > mcap_max:
                    mcap_match = False
            
            if not (text_match and sector_match and industry_match and mcap_match):
                continue
            
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
                'sector': sector_val,
                'industry': industry_val,
                'market_cap': market_cap,
                'price': close,
                'change': round(change, 2) if change is not None else None,
                'change_pct': round(change_pct, 2) if change_pct is not None else None,
                'source': 'db',
                'bucket': _search_bucket(ticker, name, sector_val, query),
                '_rank': _search_rank(row.ticker, row.name, row.sector, query),
            })
    
    # Fallback: search from static list if empty
    if not data:
        for i, ticker in enumerate(get_all_tickers()):
            base = _display_ticker(ticker)
            name = _company_name(base)
            sector_val = SECTOR_HINTS.get(base, '')
            
            text_match = True
            if query:
                text_match = (query in base or query in name.upper() or 
                             (len(query) >= 3 and query in sector_val.upper()))
            
            sector_match = True
            if sector_filters:
                sector_match = any(f in sector_val.upper() for f in sector_filters)
            
            if not (text_match and sector_match):
                continue
            
            item = _stock_row_from_static(base, i)
            item['price'] = None
            item['change'] = None
            item['change_pct'] = None
            item['sector'] = sector_val
            item['source'] = 'idx_universe'
            item['bucket'] = _search_bucket(base, name, sector_val, query)
            item['_rank'] = _search_rank(base, name, sector_val, query)
            data.append(item)
    
    data.sort(key=lambda r: (r.get('_rank') or (9, 9, 9, 9), r.get('ticker') or ''))
    for item in data:
        item.pop('_rank', None)
    
    grouped = {'ticker': [], 'company': [], 'sector': []}
    for item in data:
        grouped[item.get('bucket', 'company')].append(item)
    ordered = grouped['ticker'] + grouped['company'] + grouped['sector']
    
    # Also return available sectors for filter chips
    sectors_list = []
    try:
        sec_rows = db.query(Stock.sector, func.count(Stock.ticker)).filter(
            Stock.sector.isnot(None), Stock.sector != ''
        ).group_by(Stock.sector).order_by(func.count(Stock.ticker).desc()).all()
        sectors_list = [{'name': r[0], 'count': r[1]} for r in sec_rows]
    except Exception:
        pass
    
    return {
        'count': len(ordered[:limit]),
        'data': ordered[:limit],
        'source': 'db' if rows else 'idx_universe',
        'groups': {k: len(v) for k, v in grouped.items()},
        'filters': {
            'sectors': sectors_list,
            'active': {
                'sector': sector or '',
                'industry': industry or '',
                'mcap_min': mcap_min,
                'mcap_max': mcap_max,
            },
        },
    }
