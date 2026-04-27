"""
SwingAQ — Scanner Orchestrator
================================
Download OHLCV via yfinance, jalankan sinyal SwingAQ, stream hasil via SSE.
Referensi: planning/ARCHITECTURE.md, planning/API_SPEC.md
"""

import asyncio
import json
import time
from datetime import datetime

import pandas as pd
import yfinance as yf

from indicators import has_active_buy_signal, MIN_BARS_REQUIRED
from stocks import get_all_tickers, get_ticker_display

# Timeframe config: yfinance interval & period mapping
TIMEFRAME_CONFIG = {
    "1d":  {"interval": "1d",  "period": "2y"},
    "1h":  {"interval": "1h",  "period": "730d"},
    "4h":  {"interval": "1h",  "period": "730d", "resample": "4h"},
    "1wk": {"interval": "1wk", "period": "5y"},
    "1mo": {"interval": "1mo", "period": "10y"},
}

VALID_TIMEFRAMES = list(TIMEFRAME_CONFIG.keys())


def resample_to_h4(df: pd.DataFrame) -> pd.DataFrame:
    """Resample 1H OHLCV ke 4H."""
    return df.resample("4h").agg({
        "Open": "first", "High": "max", "Low": "min",
        "Close": "last", "Volume": "sum",
    }).dropna()


def download_ohlcv(ticker: str, timeframe: str) -> pd.DataFrame | None:
    """Download OHLCV data via yfinance. Returns None if insufficient data."""
    cfg = TIMEFRAME_CONFIG[timeframe]
    max_retries = 2

    for attempt in range(max_retries):
        try:
            df = yf.download(
                ticker,
                interval=cfg["interval"],
                period=cfg["period"],
                progress=False,
                auto_adjust=True,
                timeout=15,
            )
            if df is None or df.empty:
                return None

            # Flatten MultiIndex columns if present
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)

            df = df.dropna()

            # Resample for 4H
            if "resample" in cfg:
                df = resample_to_h4(df)

            if len(df) < MIN_BARS_REQUIRED:
                return None

            return df

        except Exception:
            if attempt < max_retries - 1:
                time.sleep(1)
            continue

    return None


def scan_ticker(ticker: str, timeframe: str) -> dict | None:
    """Scan single ticker. Returns result dict or None."""
    df = download_ohlcv(ticker, timeframe)
    if df is None:
        return None

    signal = has_active_buy_signal(df)
    if signal is None:
        return None

    signal["ticker"] = ticker
    signal["name"] = get_ticker_display(ticker)
    signal["timeframe"] = timeframe
    return signal


async def scan_all_generator(timeframe: str):
    """Async generator yielding SSE events for full IDX scan."""
    tickers = get_all_tickers()
    total = len(tickers)
    start_time = time.time()

    # Start event
    yield _sse({"type": "start", "total": total, "timeframe": timeframe,
                "timestamp": datetime.now().isoformat(timespec="seconds")})

    signals_found = 0
    total_scanned = 0
    total_skipped = 0

    for i, ticker in enumerate(tickers):
        try:
            result = scan_ticker(ticker, timeframe)
            total_scanned += 1

            # Progress event
            yield _sse({
                "type": "progress", "current": i + 1, "total": total,
                "ticker": ticker,
                "percent": round((i + 1) / total * 100, 2),
            })

            if result:
                signals_found += 1
                yield _sse({"type": "result", "data": result})

        except Exception as e:
            total_skipped += 1
            yield _sse({"type": "error", "ticker": ticker, "message": str(e)})

        # Yield control so SSE events flush
        await asyncio.sleep(0)

    duration = round(time.time() - start_time, 1)
    yield _sse({
        "type": "done", "total_signals": signals_found,
        "total_scanned": total_scanned, "total_skipped": total_skipped,
        "duration_seconds": duration, "timeframe": timeframe,
    })


def _sse(data: dict) -> str:
    """Format dict as SSE data line."""
    return f"data: {json.dumps(data)}\n\n"
