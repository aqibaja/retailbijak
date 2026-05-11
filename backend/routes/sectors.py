from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import bindparam, func, text
from sqlalchemy.orm import Session

from database import Stock, OHLCVDaily, get_db
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
    pnow = today.isoformat()
    p1d  = (today - timedelta(days=3)).isoformat()
    p5d  = (today - timedelta(days=9)).isoformat()
    p1m  = (today - timedelta(days=35)).isoformat()
    p3m  = (today - timedelta(days=95)).isoformat()

    # Single query: full table scan with CASE MAX — all periods at once, filter in Python
    # Faster than IN(:tickers) with 900+ tickers on SQLite
    all_sector_tickers_set = {s.ticker for s in stocks_with_sector}
    bulk_rows = db.execute(text("""
        SELECT ticker,
            MAX(CASE WHEN date <= :pnow THEN close END) AS c_now,
            MAX(CASE WHEN date <= :p1d  THEN close END) AS c_1d,
            MAX(CASE WHEN date <= :p5d  THEN close END) AS c_5d,
            MAX(CASE WHEN date <= :p1m  THEN close END) AS c_1m,
            MAX(CASE WHEN date <= :p3m  THEN close END) AS c_3m
        FROM ohlcv_daily
        WHERE close IS NOT NULL
        GROUP BY ticker
    """), {'pnow': pnow, 'p1d': p1d, 'p5d': p5d, 'p1m': p1m, 'p3m': p3m}).fetchall()

    # Build lookup: ticker -> {period: close}
    closes_map: dict[str, dict[str, float | None]] = {}
    for ticker, c_now, c_1d, c_5d, c_1m, c_3m in bulk_rows:
        if ticker not in all_sector_tickers_set:
            continue
        closes_map[ticker] = {
            'now': c_now,
            '1d':  c_1d,
            '5d':  c_5d,
            '1m':  c_1m,
            '3m':  c_3m,
        }

    periods = ['1d', '5d', '1m', '3m']
    result = []
    for sector, info in sorted(sector_map.items()):
        stock_data = []
        total_sector_return = {'1d': 0.0, '5d': 0.0, '1m': 0.0, '3m': 0.0}
        period_counts = {'1d': 0, '5d': 0, '1m': 0, '3m': 0}

        for ticker in info['stocks']:
            closes = closes_map.get(ticker)
            if not closes or not closes['now'] or closes['now'] == 0:
                continue

            latest_close = closes['now']
            stock_entry = {
                'ticker': ticker,
                'close': latest_close,
                'returns': {},
            }

            for period_name in periods:
                hist_close = closes.get(period_name)
                if hist_close and hist_close > 0:
                    ret = ((latest_close - hist_close) / hist_close) * 100
                    stock_entry['returns'][period_name] = round(ret, 2)
                    total_sector_return[period_name] += ret
                    period_counts[period_name] += 1

            stock_data.append(stock_entry)

        # Sort stocks by 1d return desc
        stock_data.sort(key=lambda x: x['returns'].get('1d', 0), reverse=True)

        # Sector avg return
        avg_returns = {}
        for period_name in periods:
            cnt = period_counts[period_name]
            avg_returns[period_name] = round(total_sector_return[period_name] / cnt, 2) if cnt > 0 else 0

        # Top/bottom performers
        top_stock = stock_data[0] if stock_data else None
        bottom_stock = stock_data[-1] if len(stock_data) > 1 else None

        result.append({
            'sector': sector,
            'count': len(stock_data),
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


@router.get('/api/sectors/{sector}')
def sector_detail(sector: str, db: Session = Depends(get_db)):
    """Return sector detail with industry breakdown.

    Groups stocks by industry within the sector and computes avg returns.
    """
    from sqlalchemy import func as sa_func

    sector_normalized = sector.replace('-', ' ').strip()

    # Get all stocks in this sector
    stocks = db.query(
        Stock.ticker, Stock.name, Stock.sector, Stock.industry
    ).filter(
        sa_func.upper(Stock.sector) == sa_func.upper(sector_normalized),
        Stock.sector.isnot(None),
        Stock.sector != '',
    ).all()

    if not stocks:
        return {'sector': sector_normalized, 'count': 0, 'industry_breakdown': []}

    # Build industry → stocks mapping
    from collections import defaultdict
    industry_map = defaultdict(list)
    for s in stocks:
        ind = s.industry.strip() if s.industry else 'Unknown'
        industry_map[ind].append(s.ticker)

    # Get latest close for each ticker
    today = datetime.utcnow().date()
    periods = {
        '1d': today - timedelta(days=3),
        '5d': today - timedelta(days=9),
        '1m': today - timedelta(days=35),
        '3m': today - timedelta(days=95),
    }

    latest_close_subq = db.query(
        OHLCVDaily.ticker,
        func.max(OHLCVDaily.date).label('max_date')
    ).filter(OHLCVDaily.ticker.in_([s.ticker for s in stocks])).group_by(OHLCVDaily.ticker).subquery()

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

    # Build ticker -> name/industry mapping
    stock_info_map = {}
    for s in stocks:
        stock_info_map[s.ticker] = {
            'name': s.name or s.ticker,
            'industry': s.industry.strip() if s.industry else 'Unknown',
        }

    industry_breakdown = []
    for ind_name, tickers in sorted(industry_map.items()):
        stock_list = []
        total_return = {'1d': 0.0, '5d': 0.0, '1m': 0.0, '3m': 0.0}
        stock_count = 0

        for ticker in tickers:
            latest = latest_close_map.get(ticker)
            if not latest or not latest['close'] or latest['close'] == 0:
                continue

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
            stock_info = stock_info_map.get(ticker, {})
            stock_entry = {
                'ticker': ticker,
                'name': stock_info.get('name', ticker),
                'close': latest_close,
                'returns': {},
            }

            for period_name, hist_close in hist_closes.items():
                ret = ((latest_close - hist_close) / hist_close) * 100
                stock_entry['returns'][period_name] = round(ret, 2)
                total_return[period_name] += ret

            stock_count += 1
            stock_list.append(stock_entry)

        # Sort stocks by 1d return desc (sector detail)
        stock_list.sort(key=lambda x: x['returns'].get('1d', 0), reverse=True)

        avg_returns = {}
        for period_name in periods:
            if stock_count > 0:
                avg_returns[period_name] = round(total_return[period_name] / stock_count, 2)
            else:
                avg_returns[period_name] = 0

        industry_breakdown.append({
            'industry': ind_name,
            'count': stock_count,
            'avg_returns': avg_returns,
            'stocks': stock_list,
        })

    # Sort industries by count desc
    industry_breakdown.sort(key=lambda x: x['count'], reverse=True)

    return {
        'sector': sector_normalized,
        'total_stocks': len(stocks),
        'industry_breakdown': industry_breakdown,
        'updated_at': str(today),
    }


@router.get('/api/industries')
def industries_list(db: Session = Depends(get_db)):
    """Return list of all industries with stock count and avg performance."""
    from collections import defaultdict

    # Get all stocks with industry data
    stocks = db.query(
        Stock.ticker, Stock.name, Stock.sector, Stock.industry
    ).filter(
        Stock.industry.isnot(None),
        Stock.industry != '',
    ).all()

    # Group by industry
    industry_map = defaultdict(lambda: {'tickers': [], 'sectors': set()})
    for s in stocks:
        ind = s.industry.strip() if s.industry else 'Unknown'
        industry_map[ind]['tickers'].append(s.ticker)
        industry_map[ind]['sectors'].add(s.sector.strip() if s.sector else 'Unknown')

    # Single query: full table scan with CASE MAX — all periods at once, filter in Python
    today = datetime.utcnow().date()
    pnow = today.isoformat()
    p1d  = (today - timedelta(days=3)).isoformat()
    p5d  = (today - timedelta(days=9)).isoformat()
    p1m  = (today - timedelta(days=35)).isoformat()
    p3m  = (today - timedelta(days=95)).isoformat()

    all_tickers_set = {s.ticker for s in stocks}
    bulk_rows = db.execute(text("""
        SELECT ticker,
            MAX(CASE WHEN date <= :pnow THEN close END) AS c_now,
            MAX(CASE WHEN date <= :p1d  THEN close END) AS c_1d,
            MAX(CASE WHEN date <= :p5d  THEN close END) AS c_5d,
            MAX(CASE WHEN date <= :p1m  THEN close END) AS c_1m,
            MAX(CASE WHEN date <= :p3m  THEN close END) AS c_3m
        FROM ohlcv_daily
        WHERE close IS NOT NULL
        GROUP BY ticker
    """), {'pnow': pnow, 'p1d': p1d, 'p5d': p5d, 'p1m': p1m, 'p3m': p3m}).fetchall()

    closes_map: dict[str, dict[str, float | None]] = {}
    for ticker, c_now, c_1d, c_5d, c_1m, c_3m in bulk_rows:
        if ticker not in all_tickers_set:
            continue
        closes_map[ticker] = {
            'now': c_now,
            '1d':  c_1d,
            '5d':  c_5d,
            '1m':  c_1m,
            '3m':  c_3m,
        }

    periods = ['1d', '5d', '1m', '3m']
    result = []
    for ind_name, info in sorted(industry_map.items()):
        total_return = {'1d': 0.0, '5d': 0.0, '1m': 0.0, '3m': 0.0}
        period_counts = {'1d': 0, '5d': 0, '1m': 0, '3m': 0}

        for ticker in info['tickers']:
            closes = closes_map.get(ticker)
            if not closes or not closes['now'] or closes['now'] == 0:
                continue
            latest_close = closes['now']
            for period_name in periods:
                hist_close = closes.get(period_name)
                if hist_close and hist_close > 0:
                    ret = ((latest_close - hist_close) / hist_close) * 100
                    total_return[period_name] += ret
                    period_counts[period_name] += 1

        avg_returns = {}
        for period_name in periods:
            cnt = period_counts[period_name]
            avg_returns[period_name] = round(total_return[period_name] / cnt, 2) if cnt > 0 else 0

        result.append({
            'industry': ind_name,
            'count': len(info['tickers']),
            'sectors': sorted(info['sectors']),
            'avg_returns': avg_returns,
        })

    # Sort by count desc
    result.sort(key=lambda x: x['count'], reverse=True)

    return {
        'industries': result,
        'total_industries': len(result),
        'updated_at': str(today),
    }


# ─── Helper: shared sector performance computation ──


def _compute_sector_aggregates(db: Session) -> tuple:
    """Compute sector performance data (avg returns for 1d, 5d, 1m, 3m).
    Returns (sectors_data, today) where sectors_data is a list of dicts
    with keys: sector, count, industries, avg_returns.
    Reused by sector_performance and sector_rotation endpoints.
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

    # Single query: full table scan with CASE MAX — all periods at once, filter in Python
    today = datetime.utcnow().date()
    pnow = today.isoformat()
    p1d  = (today - timedelta(days=3)).isoformat()
    p5d  = (today - timedelta(days=9)).isoformat()
    p1m  = (today - timedelta(days=35)).isoformat()
    p3m  = (today - timedelta(days=95)).isoformat()

    all_agg_tickers_set = {s.ticker for s in stocks_with_sector}
    bulk_rows = db.execute(text("""
        SELECT ticker,
            MAX(CASE WHEN date <= :pnow THEN close END) AS c_now,
            MAX(CASE WHEN date <= :p1d  THEN close END) AS c_1d,
            MAX(CASE WHEN date <= :p5d  THEN close END) AS c_5d,
            MAX(CASE WHEN date <= :p1m  THEN close END) AS c_1m,
            MAX(CASE WHEN date <= :p3m  THEN close END) AS c_3m
        FROM ohlcv_daily
        WHERE close IS NOT NULL
        GROUP BY ticker
    """), {'pnow': pnow, 'p1d': p1d, 'p5d': p5d, 'p1m': p1m, 'p3m': p3m}).fetchall()

    closes_map: dict[str, dict[str, float | None]] = {}
    for ticker, c_now, c_1d, c_5d, c_1m, c_3m in bulk_rows:
        if ticker not in all_agg_tickers_set:
            continue
        closes_map[ticker] = {
            'now': c_now,
            '1d':  c_1d,
            '5d':  c_5d,
            '1m':  c_1m,
            '3m':  c_3m,
        }

    periods = ['1d', '5d', '1m', '3m']
    result = []
    for sector, info in sorted(sector_map.items()):
        total_sector_return = {'1d': 0.0, '5d': 0.0, '1m': 0.0, '3m': 0.0}
        period_counts = {'1d': 0, '5d': 0, '1m': 0, '3m': 0}

        for ticker in info['stocks']:
            closes = closes_map.get(ticker)
            if not closes or not closes['now'] or closes['now'] == 0:
                continue

            latest_close = closes['now']
            for period_name in periods:
                hist_close = closes.get(period_name)
                if hist_close and hist_close > 0:
                    ret = ((latest_close - hist_close) / hist_close) * 100
                    total_sector_return[period_name] += ret
                    period_counts[period_name] += 1

        # Sector avg return
        avg_returns = {}
        for period_name in periods:
            cnt = period_counts[period_name]
            avg_returns[period_name] = round(total_sector_return[period_name] / cnt, 2) if cnt > 0 else 0

        result.append({
            'sector': sector,
            'count': period_counts.get('1d', 0),
            'industries': list(info['industries']),
            'avg_returns': avg_returns,
        })

    return result, today


# ─── 16.5.1 — Sector Rotation Data ───────────────

@router.get('/api/sectors-rotation')
def sector_rotation(weeks: int = 12, db: Session = Depends(get_db)):
    """Return weekly return per sector for rotation chart.
    
    Groups OHLCV data by week and sector, calculates avg return.
    Returns {dates: [...], sectors: {sector_name: [weekly_returns...]}}
    """
    from sqlalchemy import text as _text
    from collections import defaultdict

    try:
        rows = db.execute(_text("""
            SELECT s.sector, o.date,
                   (o.close - o.open) / o.open * 100 as daily_return
            FROM ohlcv_daily o
            JOIN stocks s ON s.ticker = o.ticker
            WHERE s.sector IS NOT NULL AND s.sector != ''
              AND o.close > 0 AND o.open > 0
            ORDER BY o.date
            LIMIT 50000
        """)).fetchall()

        if not rows:
            return {'status': 'ok', 'dates': [], 'sectors': {}, 'count': 0}

        # Group by sector + week
        weekly = defaultdict(lambda: defaultdict(list))
        date_set = set()
        for r in rows:
            if r.date is None or r.daily_return is None:
                continue
            d = r.date
            # Handle both string and datetime.date
            if isinstance(d, str):
                d = datetime.strptime(d[:10], '%Y-%m-%d').date()
            elif hasattr(d, 'date'):
                d = d.date()
            # Get ISO week
            iso = d.isocalendar()
            week_key = f"{iso[0]}-W{iso[1]:02d}"
            date_set.add(week_key)
            weekly[r.sector][week_key].append(r.daily_return)

        # Sort dates
        sorted_dates = sorted(date_set)
        if len(sorted_dates) > weeks:
            sorted_dates = sorted_dates[-weeks:]

        # Build result: avg return per sector per week
        result = {}
        for sector, week_data in weekly.items():
            sector_returns = []
            for w in sorted_dates:
                vals = week_data.get(w, [])
                if vals:
                    sector_returns.append(round(sum(vals) / len(vals), 2))
                else:
                    sector_returns.append(None)
            result[sector] = sector_returns

        return {
            'status': 'ok',
            'dates': sorted_dates,
            'sectors': result,
            'sector_count': len(result),
            'week_count': len(sorted_dates),
        }
    except Exception as e:
        return {'status': 'error', 'error': str(e), 'dates': [], 'sectors': {}}


# ─── Heatmap: Sector Rotation ────────────────────


@router.get('/api/sectors/rotation')
def sector_rotation_heatmap(db: Session = Depends(get_db)):
    """Return sector rotation data optimized for heatmap visualization.

    For each sector, provides returns across 1d, 5d, 1m, 3m periods,
    ranks within each period, and a momentum score.
    Sorted by momentum_score descending.
    """
    sectors_data, today = _compute_sector_aggregates(db)

    periods = ['1d', '5d', '1m', '3m']

    # Build the heatmap-formatted sector entries
    sectors_heatmap = []
    for sec in sectors_data:
        returns = {}
        for p in periods:
            returns[p] = sec['avg_returns'].get(p, 0)

        # Momentum score: weighted average of recent returns
        momentum_score = (
            returns.get('1d', 0) * 0.4
            + returns.get('5d', 0) * 0.3
            + returns.get('1m', 0) * 0.2
            + returns.get('3m', 0) * 0.1
        )

        sectors_heatmap.append({
            'name': sec['sector'],
            'stocks_count': sec['count'],
            'returns': returns,
            'momentum_score': round(momentum_score, 2),
        })

    # Sort by momentum_score descending
    sectors_heatmap.sort(key=lambda x: x['momentum_score'], reverse=True)

    # Compute ranks within each period (1 = highest return)
    for p in periods:
        # Stable sort: higher return → better rank (1)
        ranked = sorted(
            enumerate(sectors_heatmap),
            key=lambda x: x[1]['returns'].get(p, 0),
            reverse=True,
        )
        for rank, (idx, _) in enumerate(ranked, start=1):
            sectors_heatmap[idx][f'rank_{p}'] = rank

    return {
        'periods': periods,
        'sectors': sectors_heatmap,
        'generated_at': datetime.utcnow().isoformat(),
    }
