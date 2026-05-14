from __future__ import annotations

from fastapi import APIRouter

try:
    from stocks import get_all_tickers
except ModuleNotFoundError:
    from backend.stocks import get_all_tickers

VALID_TIMEFRAMES = ["1d", "1h", "4h", "1wk", "1mo"]

router = APIRouter()


@router.get('/api/timeframes')
async def timeframes():
    labels = {'1d': 'Daily', '1h': 'H1', '4h': 'H4', '1wk': 'Weekly', '1mo': 'Monthly'}
    return {'timeframes': [{'value': tf, 'label': labels.get(tf, tf)} for tf in VALID_TIMEFRAMES]}


@router.get('/api/stocks')
async def stocks():
    tickers = get_all_tickers()
    return {'count': len(tickers), 'tickers': tickers}
