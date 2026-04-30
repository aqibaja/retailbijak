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
    """Batch download daily OHLCV for all tickers and save to DB."""
    logger.info("Starting daily OHLCV batch download...")
    db = SessionLocal()
    try:
        tickers = get_all_tickers()
        cfg = TIMEFRAME_CONFIG["1d"]
        logger.info(f"Downloading data for {len(tickers)} tickers. Interval: {cfg['interval']}, Period: {cfg['period']}")

        total_inserted = 0
        chunk_size = 40
        pause_seconds = 2

        for i in range(0, len(tickers), chunk_size):
            chunk = tickers[i:i + chunk_size]
            ticker_str = " ".join(chunk)
            logger.info(f"Downloading chunk {i // chunk_size + 1}: {len(chunk)} tickers")

            try:
                data = yf.download(
                    tickers=ticker_str,
                    interval=cfg["interval"],
                    period=cfg["period"],
                    group_by="ticker",
                    auto_adjust=True,
                    progress=False,
                    threads=False,
                )
            except Exception as e:
                logger.warning(f"Chunk download failed ({i // chunk_size + 1}): {e}")
                time.sleep(pause_seconds)
                continue

            if data.empty:
                logger.warning(f"No data downloaded for chunk {i // chunk_size + 1}")
                time.sleep(pause_seconds)
                continue

            for ticker in chunk:
                if ticker not in data.columns.levels[0]:
                    continue
                df_ticker = data[ticker].dropna()
                if df_ticker.empty:
                    continue

                records = []
                for index, row in df_ticker.iterrows():
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
                        "volume": int(row["Volume"]) if pd.notna(row["Volume"]) else 0,
                    })

                if records:
                    stmt = insert(OHLCVDaily).values(records)
                    stmt = stmt.on_conflict_do_update(
                        index_elements=['ticker', 'date'],
                        set_={
                            "open": stmt.excluded.open,
                            "high": stmt.excluded.high,
                            "low": stmt.excluded.low,
                            "close": stmt.excluded.close,
                            "volume": stmt.excluded.volume,
                        },
                    )
                    db.execute(stmt)
                    total_inserted += len(records)

            db.commit()
            time.sleep(pause_seconds)

        logger.info(f"Successfully upserted {total_inserted} OHLCV records.")

    except Exception as e:
        logger.error(f"Error in update_daily_ohlcv: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    update_daily_ohlcv()
