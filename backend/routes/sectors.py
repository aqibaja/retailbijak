from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, text
from sqlalchemy.orm import Session

try:
    from database import Stock, OHLCVDaily, get_db
except ModuleNotFoundError:
    from backend.database import Stock, OHLCVDaily, get_db

router = APIRouter()


@router.get('/api/sectors/performance')
def sector_performance(
    db: Session = Depends(get_db),
):
    """Aggregate sector performance from OHLCV data.
    Returns avg return % per sector for multiple periods (1d, 5d, 1m, 3m).
    """
    # 1. Get all stocks with sector data
    stocks_with_sector = db.query(
        Stock.ticker, Stock.name, Stock.sector, Stock.industry
    ).filter(
        Stock.sector.isnot(None),
        Stock.sector != '',
    ).all()

    # Build sector → stocks mapping
    sector_map = {}
    for s in stocks_with_sector:
        sec = s.sector.strip() if s.sector else 'Unknown'
        if sec not in sector_map:
            sector_map[sec] = {'stocks': [], 'count': 0, 'industries': set()}
        sector_map[sec]['stocks'].append(s.ticker)
        sector_map[sec]['count'] += 1
        if s.industry:
            sector_map[sec]['industries'].add(s.industry.strip())

    # 2. For each sector, calc average return
    today = datetime.utcnow().date()

    # Get latest close for each stock
    latest_close_subq = db.query(
        OHLCVDaily.ticker,
        func.max(OHLCVDaily.date).label('max_date')
    ).group_by(OHLCVDaily.ticker).subquery()

    latest_closes = db.query(
        OHLCVDaily.ticker,
        OHLCVDaily.date,
        OHLCVDaily.close,
    ).join(
        latest_close_subq,
        (OHLCVDaily.ticker == latest_close_subq.c.ticker) &
        (OHLCVDaily.date == latest_close_subq.c.max_date)
    ).all()

    latest_close_map = {r.ticker: {'date': r.date, 'close': r.close} for r in latest_closes}

    # For historical closes: 1d, 5d, 1m, 3m ago
    periods = {
        '1d': today - timedelta(days=3),   # allow weekend gap
        '5d': today - timedelta(days=9),
        '1m': today - timedelta(days=35),
        '3m': today - timedelta(days=95),
    }

    result = []
    for sector, info in sorted(sector_map.items()):
        stock_data = []
        total_sector_return = {'1d': 0.0, '5d': 0.0, '1m': 0.0, '3m': 0.0}
        stock_count = 0

        # For each stock in sector, get historical close and calc return
        for ticker in info['stocks']:
            latest = latest_close_map.get(ticker)
            if not latest or not latest['close'] or latest['close'] == 0:
                continue

            # Get historical closes for each period
            hist_closes = {}
            for period_name, cutoff_date in periods.items():
                hist = db.query(OHLCVDaily.close).filter(
                    OHLCVDaily.ticker == ticker,
                    OHLCVDaily.date <= cutoff_date,
                    OHLCVDaily.close.isnot(None),
                ).order_by(OHLCVDaily.date.desc()).first()
                if hist and hist[0] and hist[0] > 0:
                    hist_closes[period_name] = hist[0]

            if not hist_closes:
                continue

            latest_close = latest['close']
            stock_entry = {
                'ticker': ticker,
                'close': latest_close,
                'returns': {},
            }

            for period_name, hist_close in hist_closes.items():
                ret = ((latest_close - hist_close) / hist_close) * 100
                stock_entry['returns'][period_name] = round(ret, 2)
                total_sector_return[period_name] += ret

            stock_count += 1
            stock_data.append(stock_entry)

        # Sort stocks by 1d return desc
        stock_data.sort(key=lambda x: x['returns'].get('1d', 0), reverse=True)

        # Sector avg return
        avg_returns = {}
        for period_name in periods:
            if stock_count > 0:
                avg_returns[period_name] = round(total_sector_return[period_name] / stock_count, 2)
            else:
                avg_returns[period_name] = 0

        # Top/bottom performers
        top_stock = stock_data[0] if stock_data else None
        bottom_stock = stock_data[-1] if len(stock_data) > 1 else None

        result.append({
            'sector': sector,
            'count': stock_count,
            'industries': list(info['industries']),
            'avg_returns': avg_returns,
            'top_stock': {
                'ticker': top_stock['ticker'],
                'returns': top_stock['returns'],
            } if top_stock else None,
            'bottom_stock': {
                'ticker': bottom_stock['ticker'],
                'returns': bottom_stock['returns'],
            } if bottom_stock else None,
            'stocks': stock_data[:10],  # top 10 by 1d return
        })

    return {
        'sectors': result,
        'total_sectors': len(result),
        'updated_at': str(today),
    }


@router.get('/api/sectors/list')
def sector_list(db: Session = Depends(get_db)):
    """Return just the list of sectors with count."""
    rows = db.query(
        Stock.sector, func.count(Stock.ticker)
    ).filter(
        Stock.sector.isnot(None),
        Stock.sector != '',
    ).group_by(Stock.sector).order_by(func.count(Stock.ticker).desc()).all()

    return {
        'sectors': [{'name': r[0], 'count': r[1]} for r in rows],
    }
