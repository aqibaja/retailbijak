from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

try:
    from database import UserSetting, WatchlistItem, PortfolioPosition, get_db
except ModuleNotFoundError:
    from backend.database import UserSetting, WatchlistItem, PortfolioPosition, get_db

router = APIRouter()


def _coerce_setting_value(value):
    if isinstance(value, str):
        low = value.lower().strip()
        if low in {'true', '1', 'yes', 'on'}:
            return True
        if low in {'false', '0', 'no', 'off'}:
            return False
        try:
            if '.' in value:
                return float(value)
            return int(value)
        except ValueError:
            return value
    return value


@router.get('/api/settings')
def get_settings(db: Session = Depends(get_db)):
    rows = db.query(UserSetting).all()
    data = {row.key: _coerce_setting_value(row.value) for row in rows}
    data.setdefault('compact_table_rows', False)
    data.setdefault('auto_refresh_screener', True)
    data.setdefault('default_theme', 'dark')
    data.setdefault('watchlist_limit', 30)
    return data


@router.put('/api/settings')
def update_settings(payload: dict, db: Session = Depends(get_db)):
    for key, value in payload.items():
        row = db.query(UserSetting).filter(UserSetting.key == key).first()
        value_str = str(value)
        if row:
            row.value = value_str
        else:
            db.add(UserSetting(key=key, value=value_str))
    db.commit()
    return {"status": "ok", "updated": list(payload.keys())}


@router.get('/api/watchlist')
def get_watchlist(db: Session = Depends(get_db)):
    rows = db.query(WatchlistItem).all()
    return {"count": len(rows), "data": [{"ticker": r.ticker, "notes": r.notes} for r in rows], "source": "db"}


@router.post('/api/watchlist')
def add_watchlist(payload: dict, db: Session = Depends(get_db)):
    ticker = (payload.get('ticker') or '').upper().strip()
    notes = payload.get('notes') or ''
    if not ticker:
        return {"status": "error", "message": "ticker required"}
    existing = db.query(WatchlistItem).filter(WatchlistItem.ticker == ticker).first()
    if existing:
        existing.notes = notes
    else:
        db.add(WatchlistItem(ticker=ticker, notes=notes))
    db.commit()
    return {"status": "ok", "ticker": ticker}


@router.delete('/api/watchlist/{ticker}')
def delete_watchlist(ticker: str, db: Session = Depends(get_db)):
    row = db.query(WatchlistItem).filter(WatchlistItem.ticker == ticker.upper()).first()
    if row:
        db.delete(row)
        db.commit()
    return {"status": "ok", "ticker": ticker.upper()}


@router.get('/api/portfolio')
def get_portfolio(db: Session = Depends(get_db)):
    rows = db.query(PortfolioPosition).all()
    data = []
    for r in rows:
        data.append({"ticker": r.ticker, "lots": r.lots, "avg_price": r.avg_price})
    return {"count": len(data), "data": data, "source": "db"}


@router.post('/api/portfolio')
def upsert_portfolio(payload: dict, db: Session = Depends(get_db)):
    ticker = (payload.get('ticker') or '').upper().strip()
    lots = int(payload.get('lots') or 0)
    avg_price = float(payload.get('avg_price') or 0)
    row = db.query(PortfolioPosition).filter(PortfolioPosition.ticker == ticker).first()
    if row:
        row.lots = lots
        row.avg_price = avg_price
    else:
        db.add(PortfolioPosition(ticker=ticker, lots=lots, avg_price=avg_price))
    db.commit()
    return {"status": "ok", "ticker": ticker}


@router.delete('/api/portfolio/{ticker}')
def delete_portfolio(ticker: str, db: Session = Depends(get_db)):
    row = db.query(PortfolioPosition).filter(PortfolioPosition.ticker == ticker.upper()).first()
    if row:
        db.delete(row)
        db.commit()
    return {"status": "ok", "ticker": ticker.upper()}
