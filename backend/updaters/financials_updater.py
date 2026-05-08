"""Financial statements updater — fetches income statement, balance sheet,
and cash flow from yfinance and stores in Financial table."""

import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Adjust path
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

try:
    from database import SessionLocal, Financial, Stock
except ModuleNotFoundError:
    from backend.database import SessionLocal, Financial, Stock
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy import func


def fetch_and_store_financials(db, batch_size=20, max_stocks=None):
    """Fetch financial statements (income, balance, cashflow) for all stocks.
    
    Args:
        db: SQLAlchemy session
        batch_size: stocks per yfinance batch
        max_stocks: limit for testing (None = all)
    
    Returns:
        dict with counts per statement type
    """
    try:
        import yfinance as yf
    except ImportError:
        logger.error("yfinance not installed")
        return {'error': 'yfinance not installed'}

    # Get stocks that have OHLCV data (active stocks)
    stocks = db.query(Stock.ticker).filter(
        Stock.ticker.isnot(None), Stock.ticker != ''
    ).order_by(Stock.ticker).all()
    
    tickers = [s.ticker for s in stocks]
    if max_stocks:
        tickers = tickers[:max_stocks]
    
    total = len(tickers)
    logger.info(f"Starting financials update for {total} stocks")
    
    counts = {'income': 0, 'balance': 0, 'cashflow': 0, 'errors': 0}
    
    for i in range(0, total, batch_size):
        batch = tickers[i:i + batch_size]
        logger.info(f"Processing batch {i // batch_size + 1}/{(total + batch_size - 1) // batch_size}")
        
        for ticker in batch:
            try:
                tk = yf.Ticker(f"{ticker}.JK")
                
                # Income statement
                try:
                    income = tk.income_stmt
                    if income is not None and not income.empty:
                        _store_financials(db, ticker, income, 'income')
                        counts['income'] += 1
                except Exception as e:
                    logger.debug(f"Income statement failed for {ticker}: {e}")
                
                # Balance sheet
                try:
                    balance = tk.balance_sheet
                    if balance is not None and not balance.empty:
                        _store_financials(db, ticker, balance, 'balance')
                        counts['balance'] += 1
                except Exception as e:
                    logger.debug(f"Balance sheet failed for {ticker}: {e}")
                
                # Cash flow
                try:
                    cashflow = tk.cashflow
                    if cashflow is not None and not cashflow.empty:
                        _store_financials(db, ticker, cashflow, 'cashflow')
                        counts['cashflow'] += 1
                except Exception as e:
                    logger.debug(f"Cash flow failed for {ticker}: {e}")
                    
            except Exception as e:
                counts['errors'] += 1
                logger.debug(f"Financials fetch failed for {ticker}: {e}")
        
        db.commit()
        logger.info(f"Progress: {min(i + batch_size, total)}/{total} — "
                    f"Income: {counts['income']}, Balance: {counts['balance']}, "
                    f"Cashflow: {counts['cashflow']}, Errors: {counts['errors']}")
    
    logger.info(f"Financials update done. "
                f"Income: {counts['income']}, Balance: {counts['balance']}, "
                f"Cashflow: {counts['cashflow']}, Errors: {counts['errors']}")
    return counts


def _store_financials(db, ticker, df, stmt_type):
    """Store a pandas DataFrame of financial statements into the Financial table.
    
    The DataFrame has columns as dates (periods) and rows as financial items.
    We transpose to store each period as a JSON object.
    """
    if df is None or df.empty:
        return
    
    # Transpose: columns become rows (periods), index becomes data
    # yfinance financials: columns = dates, index = line items
    records = []
    for period_date in df.columns:
        period_data = df[period_date]
        # Convert to dict, filtering out NaN
        data_dict = {}
        for idx, val in zip(period_data.index, period_data.values):
            key = str(idx).strip()
            if val is not None and not (isinstance(val, float) and (val != val)):  # not NaN
                try:
                    data_dict[key] = round(float(val), 2) if isinstance(val, (int, float)) else str(val)
                except (ValueError, TypeError):
                    data_dict[key] = str(val)
        
        if not data_dict:
            continue
        
        # Normalize period date
        try:
            if hasattr(period_date, 'to_pydatetime'):
                period_dt = period_date.to_pydatetime()
            elif isinstance(period_date, str):
                period_dt = datetime.fromisoformat(period_date.replace('Z', ''))
            else:
                period_dt = period_date
        except Exception:
            continue
        
        records.append({
            'ticker': ticker,
            'period': period_dt,
            'type': stmt_type,
            'data': json.dumps(data_dict),
        })
    
    if not records:
        return
    
    stmt = insert(Financial).values(records)
    stmt = stmt.on_conflict_do_update(
        index_elements=['ticker', 'period', 'type'],
        set_={
            'data': stmt.excluded.data,
        }
    )
    db.execute(stmt)


def backfill_financials(max_stocks=None):
    """Run financials update (called from scheduler or admin endpoint)."""
    db = SessionLocal()
    try:
        result = fetch_and_store_financials(db, max_stocks=max_stocks)
        db.commit()
        return result
    except Exception as e:
        logger.error(f"Financials backfill failed: {e}")
        db.rollback()
        return {'error': str(e)}
    finally:
        db.close()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    result = backfill_financials(max_stocks=5)  # Test with 5 stocks
    print(result)
