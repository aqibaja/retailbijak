import logging
import pandas as pd
import yfinance as yf
from sqlalchemy.orm import Session
from sqlalchemy.dialects.sqlite import insert

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, OHLCVDaily
from stocks import get_all_tickers
from scanner import TIMEFRAME_CONFIG

logger = logging.getLogger(__name__)

def update_daily_ohlcv():
    """Batch download daily OHLCV for all tickers and save to DB."""
    logger.info("Starting daily OHLCV batch download...")
    db = SessionLocal()
    try:
        tickers = get_all_tickers()
        # yfinance can handle multiple tickers separated by space
        ticker_str = " ".join(tickers)
        
        cfg = TIMEFRAME_CONFIG["1d"]
        logger.info(f"Downloading data for {len(tickers)} tickers. Interval: {cfg['interval']}, Period: {cfg['period']}")
        
        # Batch download
        data = yf.download(
            tickers=ticker_str,
            interval=cfg["interval"],
            period=cfg["period"],
            group_by="ticker",
            auto_adjust=True,
            progress=False,
            threads=True
        )
        
        if data.empty:
            logger.warning("No data downloaded.")
            return

        total_inserted = 0
        
        # Iterate over tickers in the MultiIndex columns
        for ticker in tickers:
            if ticker in data.columns.levels[0]:
                df_ticker = data[ticker].dropna()
                if df_ticker.empty:
                    continue
                
                records = []
                for index, row in df_ticker.iterrows():
                    # Handle single index vs timezone aware
                    date_val = index.to_pydatetime()
                    if date_val.tzinfo is not None:
                        date_val = date_val.replace(tzinfo=None)
                        
                    records.append({
                        "ticker": ticker,
                        "date": date_val,
                        "open": float(row["Open"]),
                        "high": float(row["High"]),
                        "low": float(row["Low"]),
                        "close": float(row["Close"]),
                        "volume": int(row["Volume"]) if pd.notna(row["Volume"]) else 0
                    })
                
                if records:
                    # Upsert (insert or ignore for sqlite, or replace)
                    stmt = insert(OHLCVDaily).values(records)
                    stmt = stmt.on_conflict_do_update(
                        index_elements=['ticker', 'date'],
                        set_={
                            "open": stmt.excluded.open,
                            "high": stmt.excluded.high,
                            "low": stmt.excluded.low,
                            "close": stmt.excluded.close,
                            "volume": stmt.excluded.volume
                        }
                    )
                    db.execute(stmt)
                    total_inserted += len(records)
        
        db.commit()
        logger.info(f"Successfully upserted {total_inserted} OHLCV records.")

    except Exception as e:
        logger.error(f"Error in update_daily_ohlcv: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    update_daily_ohlcv()
