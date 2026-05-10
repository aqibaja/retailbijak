from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

try:
    from database import ChartDrawing, get_db
except ModuleNotFoundError:
    from backend.database import ChartDrawing, get_db

router = APIRouter()


class DrawingPayload(BaseModel):
    type: str  # 'trendline', 'hline', 'fibonacci'
    data: dict = {}


@router.get("/api/chart/{ticker}/drawings")
def list_drawings(ticker: str, db: Session = Depends(get_db)):
    """List all drawings for a ticker."""
    drawings = (
        db.query(ChartDrawing)
        .filter(ChartDrawing.ticker == ticker.upper())
        .order_by(ChartDrawing.created_at.asc())
        .all()
    )
    return {
        "data": [
            {
                "id": d.id,
                "ticker": d.ticker,
                "type": d.drawing_type,
                "data": d.data_json,
                "created_at": d.created_at.isoformat() if d.created_at else None,
                "updated_at": d.updated_at.isoformat() if d.updated_at else None,
            }
            for d in drawings
        ],
        "count": len(drawings),
    }


@router.post("/api/chart/{ticker}/drawings")
def create_drawing(ticker: str, payload: DrawingPayload, db: Session = Depends(get_db)):
    """Save a new drawing for a ticker."""
    drawing = ChartDrawing(
        ticker=ticker.upper(),
        drawing_type=payload.type,
        data_json=payload.data,
    )
    db.add(drawing)
    db.commit()
    db.refresh(drawing)
    return {
        "id": drawing.id,
        "ticker": drawing.ticker,
        "type": drawing.drawing_type,
        "data": drawing.data_json,
        "created_at": drawing.created_at.isoformat() if drawing.created_at else None,
        "updated_at": drawing.updated_at.isoformat() if drawing.updated_at else None,
    }


@router.delete("/api/chart/{ticker}/drawings/{drawing_id}")
def delete_drawing(ticker: str, drawing_id: int, db: Session = Depends(get_db)):
    """Delete a single drawing by ID."""
    drawing = (
        db.query(ChartDrawing)
        .filter(
            ChartDrawing.id == drawing_id,
            ChartDrawing.ticker == ticker.upper(),
        )
        .first()
    )
    if drawing is None:
        raise HTTPException(status_code=404, detail="Drawing not found")
    db.delete(drawing)
    db.commit()
    return {"detail": "Drawing deleted"}


@router.delete("/api/chart/{ticker}/drawings")
def delete_all_drawings(ticker: str, db: Session = Depends(get_db)):
    """Delete all drawings for a ticker."""
    deleted = (
        db.query(ChartDrawing)
        .filter(ChartDrawing.ticker == ticker.upper())
        .delete()
    )
    db.commit()
    return {"detail": f"Deleted {deleted} drawing(s)"}
