"""
Route: Index Constituents API endpoints.

Provides:
- GET /api/index-constituents — list all indices with metadata
- GET /api/index-constituents/{index_name} — get constituents for an index
- GET /api/stocks/{ticker}/indices — get indices a stock belongs to
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import StockIndex, Stock, get_db
from updaters.idx_index_updater import INDEX_META
router = APIRouter()


@router.get('/api/index-constituents')
def list_indices(db: Session = Depends(get_db)):
    """Return list of all available indices with metadata and constituent counts."""
    indices = []
    for name, meta in INDEX_META.items():
        count = db.query(StockIndex).filter(
            StockIndex.index_name == name
        ).count()
        indices.append({
            **meta,
            "actual_count": count,
        })
    return {"data": indices}


@router.get('/api/index-constituents/{index_name}')
def get_index_constituents(
    index_name: str,
    period: str = Query("H1-2026"),
    db: Session = Depends(get_db),
):
    """Return constituents for a specific index, optionally filtering by period."""
    name_upper = index_name.upper()
    if name_upper not in INDEX_META:
        return {"error": f"Unknown index: {index_name}", "available": list(INDEX_META.keys())}

    meta = INDEX_META[name_upper]
    rows = db.query(StockIndex).filter(
        StockIndex.index_name == name_upper,
        StockIndex.period == period,
    ).all()

    tickers = [r.ticker for r in rows]

    # Also fetch names if available
    stock_rows = db.query(Stock).filter(
        Stock.ticker.in_(tickers)
    ).all()
    name_map = {s.ticker: s.name for s in stock_rows}

    constituents = [
        {"ticker": t, "name": name_map.get(t, None)}
        for t in sorted(tickers)
    ]

    return {
        "index": name_upper,
        "full_name": meta["full_name"],
        "description": meta["description"],
        "period": period,
        "constituent_count": len(constituents),
        "data": constituents,
    }


@router.get('/api/stocks/{ticker}/indices')
def get_stock_indices(
    ticker: str,
    period: str = Query("H1-2026"),
    db: Session = Depends(get_db),
):
    """Return all indices a given ticker belongs to."""
    base_ticker = ticker.upper().replace('.JK', '')

    rows = db.query(StockIndex).filter(
        StockIndex.ticker == base_ticker,
        StockIndex.period == period,
    ).all()

    indices = []
    for r in rows:
        meta = INDEX_META.get(r.index_name, {})
        indices.append({
            "index_name": r.index_name,
            "full_name": meta.get("full_name", r.index_name),
            "description": meta.get("description", ""),
        })

    return {
        "ticker": base_ticker,
        "period": period,
        "indices": indices,
        "count": len(indices),
    }
