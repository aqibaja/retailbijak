from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import SavedScreener, get_db
router = APIRouter(prefix="/api", tags=["scanner"])


@router.get("/scanner")
def scanner(rule: str | None = None):
    demo_rows = [
        {"ticker": "BBCA", "price": 1000, "per": 8, "pbv": 1.2, "roe": 18, "volume_spike": 2.5, "trend_score": 60, "breakout": True, "market_cap": 2_000_000_000_000, "dividend_yield": 2.5, "dividend_consistency": 3},
        {"ticker": "GAMA", "price": 500, "per": 50, "pbv": 8, "roe": 2, "volume_spike": 3.0, "market_cap": 300_000_000_000, "volatility_score": 85},
    ]
    return {"count": len(demo_rows), "data": scan_universe(demo_rows, rule=rule)}


# ─── Saved Screeners CRUD (19.1) ─────────────────


class SavedScreenerPayload(BaseModel):
    name: str
    filters_json: str = "{}"
    active: bool = True


@router.get("/screener/saved/{screener_id}")
def get_saved_screener(screener_id: int, db: Session = Depends(get_db)):
    row = db.query(SavedScreener).filter(SavedScreener.id == screener_id).first()
    if not row:
        raise HTTPException(404, 'Saved screener not found')
    return {
        'data': {
            'id': row.id,
            'name': row.name,
            'filters_json': row.filters_json,
            'active': bool(row.active),
            'match_count': row.match_count,
            'created_at': row.created_at.isoformat() if row.created_at else None,
        }
    }


@router.get("/screener/saved")
def list_saved_screeners(db: Session = Depends(get_db)):
    rows = db.query(SavedScreener).order_by(SavedScreener.created_at.desc()).all()
    return {
        'count': len(rows),
        'data': [
            {
                'id': r.id,
                'name': r.name,
                'filters_json': r.filters_json,
                'active': bool(r.active),
                'match_count': r.match_count,
                'created_at': r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


@router.post("/screener/saved")
def create_saved_screener(payload: SavedScreenerPayload, db: Session = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(400, 'Name is required')
    row = SavedScreener(name=name, filters_json=payload.filters_json, active=1 if payload.active else 0)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {'ok': True, 'id': row.id, 'name': row.name}


@router.put("/screener/saved/{screener_id}")
def update_saved_screener(screener_id: int, payload: SavedScreenerPayload, db: Session = Depends(get_db)):
    row = db.query(SavedScreener).filter(SavedScreener.id == screener_id).first()
    if not row:
        raise HTTPException(404, 'Saved screener not found')
    row.name = payload.name.strip()
    row.filters_json = payload.filters_json
    row.active = 1 if payload.active else 0
    db.commit()
    return {'ok': True, 'id': row.id}


@router.delete("/screener/saved/{screener_id}")
def delete_saved_screener(screener_id: int, db: Session = Depends(get_db)):
    row = db.query(SavedScreener).filter(SavedScreener.id == screener_id).first()
    if not row:
        raise HTTPException(404, 'Saved screener not found')
    db.delete(row)
    db.commit()
    return {'ok': True}
