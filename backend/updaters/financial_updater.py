"""
Financial statements updater — income statement, balance sheet, cash flow.

Fetches annual financial data from yfinance and stores it in the `financials` table
as JSON blobs keyed by (ticker, period, type).
"""

import logging
import yfinance as yf
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy.dialects.sqlite import insert

# Adjust path if needed
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from database import SessionLocal, Financial
from stocks import get_all_tickers
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

FINANCIAL_TYPES = {
    "income": "income_stmt",
    "balance": "balance_sheet",
    "cashflow": "cashflow",
}


def _parse_financial_dataframe(df, ticker: str, fin_type: str) -> list[dict]:
    """
    Parse a yfinance financials DataFrame into a list of dicts
    suitable for upsert into the Financial table.

    The DataFrame has:
      - index: line items (e.g. 'Total Revenue', 'Net Income')
      - columns: period end dates (pd.DatetimeIndex)

    Returns list of {ticker, period, type, data} dicts.
    """
    if df is None or df.empty:
        return []

    rows = []
    for period_date in df.columns:
        period_dt = period_date.to_pydatetime() if hasattr(period_date, 'to_pydatetime') else period_date
        # Build a JSON object of all line items for this period
        period_data = {}
        for line_item in df.index:
            try:
                val = df.loc[line_item, period_date]
                if val is not None and not (isinstance(val, float) and val != val):  # not NaN
                    # Some values may be numpy types; convert to native Python
                    if hasattr(val, 'item'):
                        val = val.item()
                    period_data[str(line_item)] = val
            except (KeyError, TypeError):
                continue

        if period_data:
            rows.append({
                "ticker": ticker,
                "period": period_dt,
                "type": fin_type,
                "data": period_data,
            })

    return rows


def fetch_and_store_financials(db: Session, batch_size=50):
    """
    Fetches annual financial statements (income, balance sheet, cash flow)
    from yfinance for all stocks and stores them in the Financial table.
    """
    logger.info("Starting financial statements data update...")
    tickers = get_all_tickers()

    total = len(tickers)
    processed = 0
    updated_count = 0

    for i in range(0, total, batch_size):
        batch_tickers = tickers[i:i + batch_size]
        logger.info(
            f"Processing financials batch {i // batch_size + 1}/{(total + batch_size - 1) // batch_size} "
            f"({len(batch_tickers)} tickers)"
        )

        records_to_insert = []

        for t in batch_tickers:
            try:
                ticker_obj = yf.Ticker(t)

                for fin_type, attr_name in FINANCIAL_TYPES.items():
                    try:
                        method = getattr(ticker_obj, attr_name)
                        df = method
                        if df is not None and not df.empty:
                            parsed = _parse_financial_dataframe(df, t, fin_type)
                            records_to_insert.extend(parsed)
                    except Exception as e:
                        logger.warning(f"Error fetching {fin_type} for {t}: {e}")

                # Also try quarterly
                try:
                    q_df = ticker_obj.quarterly_income_stmt
                    if q_df is not None and not q_df.empty:
                        parsed = _parse_financial_dataframe(q_df, t, "income_q")
                        records_to_insert.extend(parsed)
                except Exception:
                    pass

                try:
                    q_df = ticker_obj.quarterly_balance_sheet
                    if q_df is not None and not q_df.empty:
                        parsed = _parse_financial_dataframe(q_df, t, "balance_q")
                        records_to_insert.extend(parsed)
                except Exception:
                    pass

                try:
                    q_df = ticker_obj.quarterly_cashflow
                    if q_df is not None and not q_df.empty:
                        parsed = _parse_financial_dataframe(q_df, t, "cashflow_q")
                        records_to_insert.extend(parsed)
                except Exception:
                    pass

            except Exception as e:
                logger.warning(f"Error fetching financial data for {t}: {e}")

        # Bulk upsert
        if records_to_insert:
            stmt = insert(Financial).values(records_to_insert)
            stmt = stmt.on_conflict_do_update(
                index_elements=["ticker", "period", "type"],
                set_={
                    "data": stmt.excluded.data,
                },
            )
            try:
                db.execute(stmt)
                db.commit()
                updated_count += len(records_to_insert)
            except Exception as e:
                logger.error(f"DB upsert error in batch {i // batch_size + 1}: {e}")
                db.rollback()

        processed += len(batch_tickers)
        logger.info(f"Progress: {processed}/{total} tickers ({updated_count} records upserted so far)")

    logger.info(f"Financial statements update complete. Total records upserted: {updated_count}.")
    return updated_count


def update_all_financials():
    """Convenience wrapper: opens a DB session and runs the update."""
    db = SessionLocal()
    try:
        return fetch_and_store_financials(db)
    finally:
        db.close()


if __name__ == "__main__":
    update_all_financials()
