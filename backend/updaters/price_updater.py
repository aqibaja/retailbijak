import logging
import time
import pandas as pd
import yfinance as yf
from sqlalchemy.orm import Session
from sqlalchemy.dialects.sqlite import insert

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from database import SessionLocal, OHLCVDaily
except ModuleNotFoundError:
    from backend.database import SessionLocal, OHLCVDaily
try:
    from stocks import get_all_tickers
except ModuleNotFoundError:
    from backend.stocks import get_all_tickers
from scanner import TIMEFRAME_CONFIG

logger = logging.getLogger(__name__)

def update_daily_ohlcv():
    """Yahoo Finance download is DISABLED — rate-limited on VPS.
    
    All OHLCV data comes from IDX website via idx_daily_sync.py (jobs/idx_daily_sync.py).
    The IDX API provides reliable daily OHLCV for all tickers going back 2+ years.
    """
    logger.info("yfinance OHLCV download disabled — using IDX website data source instead.")
    return

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    update_daily_ohlcv()
