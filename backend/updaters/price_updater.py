import logging
import time
import pandas as pd
import yfinance as yf
from sqlalchemy.orm import Session
from sqlalchemy.dialects.sqlite import insert

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, OHLCVDaily
from stocks import get_all_tickers
logger = logging.getLogger(__name__)

def update_daily_ohlcv():
    """Fetch OHLCV data from IDX website directly (not yfinance).
    
    This function calls the IDX daily sync to fetch stock summary, OHLCV,
    and fundamental data from the IDX API. Runs Mon-Fri 09:05 & 16:05 WIB.
    """
    logger.info("Starting IDX OHLCV sync...")
    try:
        from jobs.idx_daily_sync import run_idx_daily_sync
        result = run_idx_daily_sync()
        logger.info("IDX OHLCV sync complete: ok=%s failed=%s date=%s", 
                    result.get('ok'), result.get('failed'), result.get('data_date'))
        return result
    except Exception as e:
        logger.error("IDX OHLCV sync failed: %s", e)
        return {"ok": 0, "failed": 0, "error": str(e)}

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    update_daily_ohlcv()
