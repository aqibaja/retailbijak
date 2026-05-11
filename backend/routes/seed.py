from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db, WatchlistItem, PortfolioPosition

router = APIRouter()

SAMPLE_WATCHLIST = ['BBCA', 'BBRI', 'TLKM', 'ASII', 'GOTO', 'BMRI', 'UNVR', 'ICBP']
SAMPLE_PORTFOLIO = [
    {'ticker': 'BBCA', 'lots': 1, 'avg_price': 9500},
    {'ticker': 'TLKM', 'lots': 5, 'avg_price': 3800},
    {'ticker': 'ASII', 'lots': 2, 'avg_price': 5200},
    {'ticker': 'GOTO', 'lots': 100, 'avg_price': 68},
    {'ticker': 'BMRI', 'lots': 3, 'avg_price': 6100},
]

@router.post('/api/seed/sample')
def seed_sample_data(db: Session = Depends(get_db)):
    # Clear existing
    db.query(WatchlistItem).delete()
    db.query(PortfolioPosition).delete()
    # Seed watchlist
    for ticker in SAMPLE_WATCHLIST:
        db.add(WatchlistItem(ticker=ticker, notes='Sample'))
    # Seed portfolio
    for p in SAMPLE_PORTFOLIO:
        db.add(PortfolioPosition(
            ticker=p['ticker'],
            lots=p['lots'],
            avg_price=p['avg_price'],
        ))
    db.commit()
    return {'ok': True, 'watchlist': len(SAMPLE_WATCHLIST), 'portfolio': len(SAMPLE_PORTFOLIO)}

@router.delete('/api/seed/clear')
def clear_sample_data(db: Session = Depends(get_db)):
    db.query(WatchlistItem).delete()
    db.query(PortfolioPosition).delete()
    db.commit()
    return {'ok': True}
