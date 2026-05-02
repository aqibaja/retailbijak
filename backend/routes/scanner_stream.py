from __future__ import annotations

import asyncio
import json
import time
from datetime import datetime

import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

try:
    from stocks import get_all_tickers
except ModuleNotFoundError:
    from backend.stocks import get_all_tickers

try:
    from routes.shared_stocks_helpers import _display_ticker
except ModuleNotFoundError:
    from backend.routes.shared_stocks_helpers import _display_ticker

try:
    from database import SessionLocal
except ModuleNotFoundError:
    from backend.database import SessionLocal

try:
    from indicators import compute_swingaq_signals
except ModuleNotFoundError:
    from backend.indicators import compute_swingaq_signals

try:
    from indicators_extended import get_ohlcv_dataframe
except ModuleNotFoundError:
    from backend.indicators_extended import get_ohlcv_dataframe

VALID_TIMEFRAMES = ["1d", "1h", "4h", "1wk", "1mo"]

router = APIRouter()


async def scan_all_db_generator(timeframe: str, rule: str | None = None):
    db = SessionLocal()
    try:
        tickers = get_all_tickers()
        total = len(tickers)
        start_time = time.time()
        yield f"data: {json.dumps({'type': 'start', 'total': total, 'timeframe': timeframe, 'rule': 'SwingAQ (PineScript)', 'timestamp': datetime.now().isoformat(timespec='seconds')})}\n\n"

        signals_found = 0
        total_scanned = 0
        total_skipped = 0

        for i, ticker in enumerate(tickers):
            total_scanned += 1
            yield f"data: {json.dumps({'type': 'progress', 'current': i + 1, 'total': total, 'ticker': ticker, 'percent': round((i + 1) / total * 100, 2), 'rule': 'SwingAQ'})}\n\n"

            df = get_ohlcv_dataframe(db, ticker, limit=100)
            if df.empty or len(df) < 20:
                total_skipped += 1
                await asyncio.sleep(0.001)
                continue

            df.columns = [c.capitalize() for c in df.columns]
            df_sig = compute_swingaq_signals(df)
            latest = df_sig.iloc[-1]

            signal_type = 'BUY' if latest['buy_signal'] else None
            if signal_type:
                close = float(latest['Close'])
                sl = float(latest['sl']) if not pd.isna(latest['sl']) else close * 0.95
                result = {
                    'ticker': ticker,
                    'name': _display_ticker(ticker),
                    'timeframe': timeframe,
                    'rule': 'SwingAQ (PineScript)',
                    'reason': f'Signal {signal_type} Detected',
                    'date': latest.name.strftime('%Y-%m-%d'),
                    'close': round(close, 2),
                    'entry': round(close, 2),
                    'target': round(close * 1.05, 2),
                    'stop_loss': round(sl, 2),
                    'sl_pct': round((1 - sl / close) * 100, 2) if close else 0,
                    'magic_line': round(float(latest['magic_line']), 2),
                    'cci': round(float(latest['cci']), 2),
                    'volume_spike': round(float(latest.get('volume_spike', 0)), 2),
                    'signal': signal_type,
                }
                signals_found += 1
                yield f"data: {json.dumps({'type': 'result', 'data': result})}\n\n"

            await asyncio.sleep(0.001)

        duration = round(time.time() - start_time, 1)
        yield f"data: {json.dumps({'type': 'done', 'total_signals': signals_found, 'total_scanned': total_scanned, 'total_skipped': total_skipped, 'duration_seconds': duration, 'timeframe': timeframe, 'rule': 'SwingAQ (PineScript)'})}\n\n"
    finally:
        db.close()


@router.get('/api/scan')
async def scan(timeframe: str = '1d', rule: str | None = None):
    if timeframe not in VALID_TIMEFRAMES:
        raise HTTPException(400, f'Invalid timeframe. Valid: {VALID_TIMEFRAMES}')

    return StreamingResponse(
        scan_all_db_generator(timeframe, rule=rule),
        media_type='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'},
    )
