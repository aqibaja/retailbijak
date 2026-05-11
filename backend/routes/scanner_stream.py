from __future__ import annotations

import asyncio
import json
import logging
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
    from database import StockIndex, Stock, Fundamental
except ModuleNotFoundError:
    from backend.database import StockIndex, Stock, Fundamental

try:
    from routes.shared_stocks_helpers import _display_ticker
except ModuleNotFoundError:
    from backend.routes.shared_stocks_helpers import _display_ticker

try:
    from database import SessionLocal
except ModuleNotFoundError:
    from backend.database import SessionLocal

try:
    from database import OHLCVDaily
except ModuleNotFoundError:
    from backend.database import OHLCVDaily

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

logger = logging.getLogger(__name__)


async def scan_all_db_generator(timeframe: str, rule: str | None = None, index: str | None = None, sector: str | None = None, cap: str | None = None):
    db = SessionLocal()
    try:
        tickers = get_all_tickers()
        total = len(tickers)
        start_time = time.time()

        # Filter by index membership if specified
        if index:
            index_upper = index.upper().strip()
            idx_rows = db.query(StockIndex).filter(
                StockIndex.index_name == index_upper
            ).all()
            idx_tickers = {r.ticker for r in idx_rows}
            tickers = [t for t in tickers if t in idx_tickers]
            total = len(tickers)

        # Filter by sector
        if sector:
            sector_rows = db.query(Stock.ticker).filter(
                Stock.sector == sector
            ).all()
            sector_tickers = {r.ticker for r in sector_rows}
            tickers = [t for t in tickers if t in sector_tickers]
            total = len(tickers)

        # Filter by market cap tier: small (<1T), mid (1T-10T), large (>10T)
        if cap:
            cap_rows = db.query(Stock.ticker, Fundamental.market_cap).join(
                Fundamental, Stock.ticker == Fundamental.ticker, isouter=True
            ).all()
            cap_map = {r.ticker: (r.market_cap or 0) for r in cap_rows}
            if cap == 'small':
                tickers = [t for t in tickers if cap_map.get(t, 0) < 1_000_000_000_000]
            elif cap == 'mid':
                tickers = [t for t in tickers if 1_000_000_000_000 <= cap_map.get(t, 0) < 10_000_000_000_000]
            elif cap == 'large':
                tickers = [t for t in tickers if cap_map.get(t, 0) >= 10_000_000_000_000]
            total = len(tickers)
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

            # Extract last 20 close prices for sparkline
            closes = [round(float(x), 2) for x in df['Close'].tail(20).values]

            # Performance calculations from OHLCV dataframe
            close_series = df['Close']
            perf_1w = round((close_series.iloc[-1] - close_series.iloc[-5]) / close_series.iloc[-5] * 100, 2) if len(close_series) >= 5 else None
            perf_1m = round((close_series.iloc[-1] - close_series.iloc[-21]) / close_series.iloc[-21] * 100, 2) if len(close_series) >= 21 else None
            perf_3m = round((close_series.iloc[-1] - close_series.iloc[-63]) / close_series.iloc[-63] * 100, 2) if len(close_series) >= 63 else None
            perf_6m = round((close_series.iloc[-1] - close_series.iloc[-126]) / close_series.iloc[-126] * 100, 2) if len(close_series) >= 126 else None

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
                    'close_prices': closes,
                    'perf_1w': perf_1w,
                    'perf_1m': perf_1m,
                    'perf_3m': perf_3m,
                    'perf_6m': perf_6m,
                }
                signals_found += 1
                yield f"data: {json.dumps({'type': 'result', 'data': result})}\n\n"

            await asyncio.sleep(0.001)

        duration = round(time.time() - start_time, 1)
        yield f"data: {json.dumps({'type': 'done', 'total_signals': signals_found, 'total_scanned': total_scanned, 'total_skipped': total_skipped, 'duration_seconds': duration, 'timeframe': timeframe, 'rule': 'SwingAQ (PineScript)'})}\n\n"
    finally:
        db.close()


@router.get('/api/scan')
async def scan(timeframe: str = '1d', rule: str | None = None, index: str | None = None, sector: str | None = None, cap: str | None = None):
    if timeframe not in VALID_TIMEFRAMES:
        raise HTTPException(400, f'Invalid timeframe. Valid: {VALID_TIMEFRAMES}')

    return StreamingResponse(
        scan_all_db_generator(timeframe, rule=rule, index=index, sector=sector, cap=cap),
        media_type='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'},
    )


# ─── 26.1.1 — Live Watchlist Price Streaming (SSE) ──────

async def watchlist_stream_generator(tickers_str: str):
    """SSE generator that streams latest price data for a list of tickers every 3 seconds."""
    db = SessionLocal()
    try:
        parsed = [t.strip().upper() for t in tickers_str.split(',') if t.strip()]
        if not parsed:
            while True:
                yield f"data: {json.dumps({'type': 'empty', 'message': 'No tickers provided'})}\n\n"
                await asyncio.sleep(30)
            return

        while True:
            results = []
            for ticker in parsed:
                try:
                    row = db.query(OHLCVDaily).filter(
                        OHLCVDaily.ticker == ticker
                    ).order_by(OHLCVDaily.date.desc()).first()

                    if row and row.close is not None:
                        # Fetch previous close for change calculation
                        prev_row = db.query(OHLCVDaily).filter(
                            OHLCVDaily.ticker == ticker,
                            OHLCVDaily.date < row.date
                        ).order_by(OHLCVDaily.date.desc()).first()

                        prev_close = prev_row.close if (prev_row and prev_row.close is not None) else row.close
                        change = round(float(row.close) - float(prev_close), 2) if prev_close else 0.0
                        change_pct = round((change / float(prev_close)) * 100, 2) if prev_close and float(prev_close) != 0 else 0.0

                        results.append({
                            'ticker': ticker,
                            'price': round(float(row.close), 2),
                            'change': change,
                            'change_pct': change_pct,
                            'volume': int(row.volume) if row.volume else 0,
                        })
                    else:
                        results.append({
                            'ticker': ticker,
                            'price': None,
                            'change': None,
                            'change_pct': None,
                            'volume': None,
                            'error': 'No data',
                        })
                except Exception as exc:
                    logger.warning(f'Watchlist stream error for {ticker}: {exc}')
                    results.append({
                        'ticker': ticker,
                        'price': None,
                        'change': None,
                        'change_pct': None,
                        'error': str(exc),
                    })

            yield f"data: {json.dumps({'type': 'update', 'data': results, 'timestamp': datetime.now().isoformat(timespec='seconds')})}\n\n"
            await asyncio.sleep(3)
    finally:
        db.close()


@router.get('/api/watchlist/stream')
async def watchlist_stream(tickers: str = ''):
    """SSE endpoint that streams live watchlist prices every 3 seconds."""
    return StreamingResponse(
        watchlist_stream_generator(tickers),
        media_type='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'},
    )


# ─── 16.4.1 — Preset Scan (instant from Signal table) ──────

@router.get('/api/scan/preset/{preset_name}')
def scan_preset(preset_name: str, limit: int = 30):
    """Return stocks matching a preset filter using existing Signal data.
    
    Presets:
    - golden_cross: recent BUY signals (MACD_Bullish, ST_Up, SMA50_Breakout)
    - oversold_rsi: BUY signals from RSI_Oversold
    - volume_spike: stocks with high volume (from OHLCV latest)
    """
    preset_name = preset_name.lower().strip()
    if preset_name not in ('golden_cross', 'oversold_rsi', 'volume_spike'):
        raise HTTPException(400, f'Invalid preset. Valid: golden_cross, oversold_rsi, volume_spike')

    db = SessionLocal()
    try:
        from sqlalchemy import text

        if preset_name == 'golden_cross':
            # Recent BUY signals (multiple buy signals = strong setup)
            rows = db.execute(text("""
                SELECT s.ticker, MAX(s.signal_date) as last_signal, 
                       COUNT(*) as signal_count, MAX(s.close) as close,
                       (SELECT close FROM ohlcv_daily o WHERE o.ticker = s.ticker ORDER BY o.date DESC LIMIT 1) as latest_close
                FROM signals s
                WHERE s.signal_type = 'buy'
                  AND s.timeframe = '1d'
                GROUP BY s.ticker
                HAVING signal_count >= 1
                ORDER BY signal_count DESC, s.signal_date DESC
                LIMIT :lim
            """), {"lim": limit}).fetchall()

        elif preset_name == 'oversold_rsi':
            # BUY signals with oversold RSI conditions
            rows = db.execute(text("""
                SELECT s.ticker, MAX(s.signal_date) as last_signal,
                       COUNT(*) as signal_count, MAX(s.close) as close,
                       (SELECT close FROM ohlcv_daily o WHERE o.ticker = s.ticker ORDER BY o.date DESC LIMIT 1) as latest_close
                FROM signals s
                WHERE s.signal_type = 'buy'
                  AND s.timeframe = '1d'
                GROUP BY s.ticker
                HAVING signal_count >= 1
                ORDER BY signal_count DESC
                LIMIT :lim
            """), {"lim": limit}).fetchall()

        elif preset_name == 'volume_spike':
            # Stocks with highest volume
            rows = db.execute(text("""
                SELECT o1.ticker, o1.volume as latest_volume, o1.close,
                       AVG(o2.volume) as avg_volume,
                       CASE WHEN AVG(o2.volume) > 0 
                            THEN ROUND(o1.volume * 1.0 / AVG(o2.volume), 2) 
                            ELSE 1 END as volume_ratio
                FROM ohlcv_daily o1
                JOIN ohlcv_daily o2 ON o1.ticker = o2.ticker
                WHERE o1.date = (SELECT MAX(date) FROM ohlcv_daily WHERE ticker = o1.ticker)
                  AND o2.date < o1.date
                GROUP BY o1.ticker
                HAVING volume_ratio >= 1.2
                ORDER BY volume_ratio DESC
                LIMIT :lim
            """), {"lim": limit}).fetchall()

        # Format results
        results = []
        for r in rows:
            results.append({
                'ticker': r.ticker,
                'name': _display_ticker(r.ticker),
                'close': float(r.close or r.latest_close or 0) if hasattr(r, 'close') and r.close else float(r.latest_close or 0),
                'signal': preset_name,
            })

        return {
            'status': 'ok',
            'preset': preset_name,
            'count': len(results),
            'data': results,
            'source': 'signal_table',
        }
    except Exception as e:
        logger.error(f"Preset scan failed: {e}")
        return {'status': 'error', 'preset': preset_name, 'error': str(e), 'data': []}
    finally:
        db.close()


# ─── Pattern Scanner ──────────────────────────────


async def scan_patterns_generator(pattern: str):
    """SSE generator that scans all stocks for a specific candlestick pattern."""
    from updaters.pattern_detector import detect_all_patterns
    try:
        from backend.updaters.pattern_detector import detect_all_patterns
    except ModuleNotFoundError:
        pass

    db = SessionLocal()
    try:
        tickers = get_all_tickers()
        total = len(tickers)
        start_time = time.time()
        yield f"data: {json.dumps({'type': 'start', 'total': total, 'pattern': pattern, 'timestamp': datetime.now().isoformat(timespec='seconds')})}\n\n"

        signals_found = 0
        total_scanned = 0
        total_skipped = 0

        for i, ticker in enumerate(tickers):
            total_scanned += 1
            yield f"data: {json.dumps({'type': 'progress', 'current': i + 1, 'total': total, 'ticker': ticker, 'percent': round((i + 1) / total * 100, 2)})}\n\n"

            try:
                df = get_ohlcv_dataframe(db, ticker, limit=60)
                if df.empty or len(df) < 10:
                    total_skipped += 1
                    await asyncio.sleep(0.001)
                    continue

                opens = df['open'].astype(float).tolist()
                highs = df['high'].astype(float).tolist()
                lows = df['low'].astype(float).tolist()
                closes = df['close'].astype(float).tolist()

                all_patterns = detect_all_patterns(opens, highs, lows, closes, lookback=5)
                if not all_patterns:
                    await asyncio.sleep(0.001)
                    continue

                # Filter for specific pattern if provided
                if pattern:
                    matching = [p for p in all_patterns if p['pattern'] == pattern]
                else:
                    matching = all_patterns

                if matching:
                    latest = matching[-1]
                    signals_found += 1
                    last_close = closes[-1] if closes else 0
                    closes_20 = [round(float(x), 2) for x in closes[-20:]] if len(closes) >= 20 else [round(float(x), 2) for x in closes]

                    # Performance calculations from OHLCV dataframe
                    close_series = df['close'].astype(float)
                    perf_1w = round((close_series.iloc[-1] - close_series.iloc[-5]) / close_series.iloc[-5] * 100, 2) if len(close_series) >= 5 else None
                    perf_1m = round((close_series.iloc[-1] - close_series.iloc[-21]) / close_series.iloc[-21] * 100, 2) if len(close_series) >= 21 else None
                    perf_3m = round((close_series.iloc[-1] - close_series.iloc[-63]) / close_series.iloc[-63] * 100, 2) if len(close_series) >= 63 else None
                    perf_6m = round((close_series.iloc[-1] - close_series.iloc[-126]) / close_series.iloc[-126] * 100, 2) if len(close_series) >= 126 else None

                    result = {
                        'ticker': ticker,
                        'name': _display_ticker(ticker),
                        'pattern': latest['pattern'],
                        'label': latest['label'],
                        'direction': latest['direction'],
                        'strength': latest['strength'],
                        'close': round(last_close, 2),
                        'days_ago': len(closes) - 1 - latest['index'],
                        'close_prices': closes_20,
                        'perf_1w': perf_1w,
                        'perf_1m': perf_1m,
                        'perf_3m': perf_3m,
                        'perf_6m': perf_6m,
                    }
                    yield f"data: {json.dumps({'type': 'result', 'data': result})}\n\n"

            except Exception:
                total_skipped += 1

            await asyncio.sleep(0.001)

        duration = round(time.time() - start_time, 1)
        yield f"data: {json.dumps({'type': 'done', 'total_signals': signals_found, 'total_scanned': total_scanned, 'total_skipped': total_skipped, 'duration_seconds': duration, 'pattern': pattern})}\n\n"
    finally:
        db.close()


@router.get('/api/scan/patterns')
async def scan_patterns(pattern: str = ''):
    """SSE endpoint to scan all stocks for candlestick patterns."""
    valid_patterns = [
        'doji', 'hammer', 'inverted_hammer', 'bullish_engulfing',
        'bearish_engulfing', 'morning_star', 'evening_star',
        'three_white_soldiers', 'three_black_crows',
    ]
    if pattern and pattern not in valid_patterns:
        raise HTTPException(400, f'Invalid pattern. Valid: {valid_patterns}')

    return StreamingResponse(
        scan_patterns_generator(pattern),
        media_type='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'},
    )
