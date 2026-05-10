from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import Signal, Stock, get_db
from routes.shared_stock_fallbacks import _ticker_base
router = APIRouter()


@router.get('/api/signals/summary')
def signal_summary(
    signal_type: str = '',
    limit: int = 50,
    days_back: int = 30,
    db: Session = Depends(get_db),
):
    """Return signal summary: counts by type + latest signals per ticker."""
    # 1. Total counts
    count_query = db.query(Signal.signal_type, func.count(Signal.ticker))
    if days_back > 0:
        cutoff = datetime.utcnow() - timedelta(days=days_back)
        count_query = count_query.filter(Signal.signal_date >= cutoff)
    counts_raw = count_query.group_by(Signal.signal_type).all()
    counts = {row[0]: row[1] for row in counts_raw}

    # 2. Latest signal per ticker
    # Subquery: max signal_date per ticker
    subq = db.query(
        Signal.ticker,
        func.max(Signal.signal_date).label('max_date')
    )
    if days_back > 0:
        cutoff = datetime.utcnow() - timedelta(days=days_back)
        subq = subq.filter(Signal.signal_date >= cutoff)
    if signal_type:
        subq = subq.filter(Signal.signal_type == signal_type)
    subq = subq.group_by(Signal.ticker).subquery()

    latest = db.query(Signal).join(
        subq,
        (Signal.ticker == subq.c.ticker) &
        (Signal.signal_date == subq.c.max_date)
    ).order_by(Signal.signal_date.desc()).limit(limit).all()

    # 3. Enrich with company name
    stock_map = {}
    try:
        for s in db.query(Stock).all():
            stock_map[s.ticker] = s.name
    except Exception:
        pass

    data = []
    for row in latest:
        base = _ticker_base(row.ticker) if hasattr(row, 'ticker') else str(row.ticker)
        data.append({
            'ticker': row.ticker,
            'ticker_base': base,
            'signal_type': row.signal_type,
            'signal_date': str(row.signal_date)[:10] if row.signal_date else None,
            'close': row.close,
            'magic_line': row.magic_line,
            'company_name': stock_map.get(base, ''),
        })

    return {
        'counts': counts,
        'total': sum(counts.values()),
        'latest': data,
        'filters': {
            'signal_type': signal_type or 'all',
            'days_back': days_back,
        },
    }


@router.get('/api/signals/by-ticker/{ticker}')
def signal_by_ticker(
    ticker: str,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """Return signal history for a specific ticker."""
    base = _ticker_base(ticker)
    rows = db.query(Signal).filter(
        Signal.ticker == base
    ).order_by(Signal.signal_date.desc()).limit(limit).all()

    if not rows:
        # Try with .JK suffix
        rows = db.query(Signal).filter(
            Signal.ticker == f'{base}.JK'
        ).order_by(Signal.signal_date.desc()).limit(limit).all()

    data = [{
        'signal_type': r.signal_type,
        'signal_date': str(r.signal_date)[:10] if r.signal_date else None,
        'close': r.close,
        'magic_line': r.magic_line,
        'cci': r.cci,
    } for r in rows]

    return {'ticker': base, 'count': len(data), 'data': data}
