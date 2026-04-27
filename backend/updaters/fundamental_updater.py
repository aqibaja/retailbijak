import logging
import yfinance as yf
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.dialects.sqlite import insert

# Adjust path if needed
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from database import SessionLocal, Fundamental
from stocks import get_all_tickers

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

def fetch_and_store_fundamentals(db: Session, batch_size=50):
    """
    Fetches fundamental data from yfinance for all stocks and stores it in the database.
    Since fetching .info is slow, we process it in batches and use a simple iteration.
    For MVP, we might only want to fetch for a subset if it takes too long, 
    but we'll do all of them sequentially for now.
    """
    logging.info("Starting fundamental data update...")
    tickers = get_all_tickers()
    
    # Process in batches to avoid locking the DB for too long and to track progress
    total = len(tickers)
    processed = 0
    updated_count = 0
    
    for i in range(0, total, batch_size):
        batch_tickers = tickers[i:i+batch_size]
        logging.info(f"Processing fundamentals batch {i//batch_size + 1}/{(total+batch_size-1)//batch_size} ({len(batch_tickers)} tickers)")
        
        fundamentals_to_insert = []
        
        for t in batch_tickers:
            try:
                ticker_obj = yf.Ticker(t)
                info = ticker_obj.info
                
                # Some tickers might not return info or be delisted
                if not info or 'regularMarketPrice' not in info and 'previousClose' not in info:
                    continue
                
                f_data = {
                    "ticker": t,
                    "trailing_pe": info.get("trailingPE"),
                    "forward_pe": info.get("forwardPE"),
                    "price_to_book": info.get("priceToBook"),
                    "trailing_eps": info.get("trailingEps"),
                    "dividend_yield": info.get("dividendYield"),
                    "roe": info.get("returnOnEquity"),
                    "roa": info.get("returnOnAssets"),
                    "debt_to_equity": info.get("debtToEquity"),
                    "revenue": info.get("totalRevenue"),
                    "net_income": info.get("netIncomeToCommon"),
                    "free_cashflow": info.get("freeCashflow"),
                    "updated_at": datetime.utcnow()
                }
                
                fundamentals_to_insert.append(f_data)
                
            except Exception as e:
                logging.warning(f"Error fetching fundamental for {t}: {e}")
                
        if fundamentals_to_insert:
            stmt = insert(Fundamental).values(fundamentals_to_insert)
            # Update on conflict
            stmt = stmt.on_conflict_do_update(
                index_elements=['ticker'],
                set_={
                    "trailing_pe": stmt.excluded.trailing_pe,
                    "forward_pe": stmt.excluded.forward_pe,
                    "price_to_book": stmt.excluded.price_to_book,
                    "trailing_eps": stmt.excluded.trailing_eps,
                    "dividend_yield": stmt.excluded.dividend_yield,
                    "roe": stmt.excluded.roe,
                    "roa": stmt.excluded.roa,
                    "debt_to_equity": stmt.excluded.debt_to_equity,
                    "revenue": stmt.excluded.revenue,
                    "net_income": stmt.excluded.net_income,
                    "free_cashflow": stmt.excluded.free_cashflow,
                    "updated_at": stmt.excluded.updated_at
                }
            )
            db.execute(stmt)
            db.commit()
            updated_count += len(fundamentals_to_insert)
            
        processed += len(batch_tickers)
        logging.info(f"Progress: {processed}/{total} tickers")
        
    logging.info(f"Fundamental update complete. Updated {updated_count} records.")

def update_fundamentals():
    db = SessionLocal()
    try:
        fetch_and_store_fundamentals(db)
    finally:
        db.close()

if __name__ == "__main__":
    update_fundamentals()
