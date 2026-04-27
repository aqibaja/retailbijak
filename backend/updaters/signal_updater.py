import logging
import time
from datetime import datetime
import pandas as pd
import yfinance as yf

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, Signal
from sqlalchemy.dialects.sqlite import insert

from scanner import VALID_TIMEFRAMES, TIMEFRAME_CONFIG, resample_to_h4
from stocks import get_all_tickers
from indicators import has_active_buy_signal, MIN_BARS_REQUIRED

logger = logging.getLogger(__name__)

def update_signals():
    """Batch compute and update signals for all tickers and all timeframes."""
    logger.info("Starting signal pre-computation...")
    db = SessionLocal()
    tickers = get_all_tickers()
    ticker_str = " ".join(tickers)

    for timeframe in VALID_TIMEFRAMES:
        logger.info(f"Computing signals for timeframe: {timeframe}")
        cfg = TIMEFRAME_CONFIG[timeframe]
        
        try:
            # Batch download OHLCV for this timeframe
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
                logger.warning(f"No data for timeframe {timeframe}")
                continue
            
            records = []
            
            for ticker in tickers:
                if ticker not in data.columns.levels[0]:
                    continue
                
                df_ticker = data[ticker].dropna()
                
                # Resample for 4H
                if "resample" in cfg:
                    df_ticker = resample_to_h4(df_ticker)
                
                if df_ticker.empty or len(df_ticker) < MIN_BARS_REQUIRED:
                    continue
                    
                signal = has_active_buy_signal(df_ticker)
                if signal:
                    # Convert date string to datetime
                    # Format from indicators.py is '%Y-%m-%d %H:%M' or just string representation
                    try:
                        date_val = datetime.strptime(signal['date'], '%Y-%m-%d %H:%M')
                    except ValueError:
                        try:
                            date_val = datetime.strptime(signal['date'], '%Y-%m-%d %H:%M:%S')
                        except ValueError:
                            # Fallback if it's just date
                            date_val = datetime.strptime(signal['date'][:10], '%Y-%m-%d')
                    
                    records.append({
                        "ticker": ticker,
                        "timeframe": timeframe,
                        "signal_date": date_val,
                        "signal_type": "buy",
                        "close": signal['close'],
                        "magic_line": signal['magic_line'],
                        "cci": signal['cci'],
                        "stop_loss": signal['stop_loss'],
                        "sl_pct": signal['sl_pct']
                    })
            
            if records:
                # Upsert into DB
                stmt = insert(Signal).values(records)
                stmt = stmt.on_conflict_do_update(
                    index_elements=['ticker', 'timeframe', 'signal_date'],
                    set_={
                        "signal_type": stmt.excluded.signal_type,
                        "close": stmt.excluded.close,
                        "magic_line": stmt.excluded.magic_line,
                        "cci": stmt.excluded.cci,
                        "stop_loss": stmt.excluded.stop_loss,
                        "sl_pct": stmt.excluded.sl_pct
                    }
                )
                db.execute(stmt)
                db.commit()
                logger.info(f"Saved {len(records)} buy signals for {timeframe}")
                
        except Exception as e:
            logger.error(f"Error computing signals for {timeframe}: {e}")
            db.rollback()
            
    db.close()
    logger.info("Signal computation finished.")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    update_signals()
