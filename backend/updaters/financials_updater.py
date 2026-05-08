"""Financial statements updater — income statement, balance sheet, cash flow.

Fetches annual (& quarterly) financial data from yfinance and stores it
in the `financials` table as JSON blobs keyed by (ticker, period, type).

Ticker convention: stored WITHOUT .JK suffix (matches `stocks` and `fundamentals` tables).

Handles yfinance rate limiting with exponential backoff and retries.
"""

import json
import logging
import time
import random
from datetime import datetime

import yfinance as yf
from sqlalchemy.dialects.sqlite import insert

# Adjust path if needed
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

try:
    from database import SessionLocal, Financial, Stock
except ModuleNotFoundError:
    from backend.database import SessionLocal, Financial, Stock

logger = logging.getLogger(__name__)

FINANCIAL_TYPES_ANNUAL = {
    "income": "income_stmt",
    "balance": "balance_sheet",
    "cashflow": "cashflow",
}

FINANCIAL_TYPES_QUARTERLY = {
    "income_q": "quarterly_income_stmt",
    "balance_q": "quarterly_balance_sheet",
    "cashflow_q": "quarterly_cashflow",
}

# ── helpers ──────────────────────────────────────────────────────────────────


def _sleep_with_backoff(attempt: int, base: float = 3.0, max_delay: float = 120.0):
    """Exponential backoff sleep with jitter.

    Each retry: 3s, 6s, 12s, 24s, 48s, 96s (capped at 120s).
    """
    delay = min(base * (2 ** attempt), max_delay)
    jitter = random.uniform(0, delay * 0.2)
    total = delay + jitter
    logger.info(f"Backoff: sleeping {total:.1f}s (attempt {attempt + 1})")
    time.sleep(total)


def _check_rate_limited(tk) -> bool:
    """Quick check if we're rate-limited by trying to access info.

    Returns True if rate-limited, False if OK.
    """
    try:
        _ = tk.info
        return False
    except yf.exceptions.YFRateLimitError:
        return True
    except Exception:
        return False  # other errors (e.g. symbol not found) = not rate limit


def _parse_financial_dataframe(df, ticker: str, fin_type: str) -> list[dict]:
    """Parse a yfinance financials DataFrame into upsert-ready dicts.

    DataFrame layout:
        index   = line items (e.g. 'Total Revenue', 'Net Income')
        columns = period end dates (pd.DatetimeIndex)
    """
    if df is None or df.empty:
        return []

    rows = []
    for period_date in df.columns:
        # Normalise to datetime
        if hasattr(period_date, "to_pydatetime"):
            period_dt = period_date.to_pydatetime()
        elif isinstance(period_date, str):
            try:
                period_dt = datetime.fromisoformat(period_date.replace("Z", ""))
            except Exception:
                continue
        else:
            period_dt = period_date

        # Build JSON object of all line items for this period
        period_data = {}
        for line_item in df.index:
            try:
                val = df.loc[line_item, period_date]
                if val is not None and not (
                    isinstance(val, float) and val != val
                ):  # not NaN
                    if hasattr(val, "item"):
                        val = val.item()  # numpy → native
                    period_data[str(line_item)] = val
            except (KeyError, TypeError):
                continue

        if period_data:
            rows.append(
                {
                    "ticker": ticker,
                    "period": period_dt,
                    "type": fin_type,
                    "data": json.dumps(period_data),
                }
            )

    return rows


def _fetch_one_stock(ticker_no_suffix: str) -> list[dict]:
    """Fetch ALL financial statements for a single stock.

    Args:
        ticker_no_suffix: ticker WITHOUT .JK (e.g. 'BBCA').

    Returns:
        list of {ticker, period, type, data} dicts.

    Raises:
        yf.exceptions.YFRateLimitError: if rate-limited (caller should retry).
    """
    yf_symbol = f"{ticker_no_suffix}.JK"
    records = []

    tk = yf.Ticker(yf_symbol)

    # First check: if we're rate-limited, abort early so caller can retry
    if _check_rate_limited(tk):
        raise yf.exceptions.YFRateLimitError()

    # Annual statements
    for fin_type, attr_name in FINANCIAL_TYPES_ANNUAL.items():
        try:
            df = getattr(tk, attr_name)
            if df is not None and not df.empty:
                records.extend(_parse_financial_dataframe(df, ticker_no_suffix, fin_type))
            else:
                logger.debug("Annual %s empty for %s", fin_type, ticker_no_suffix)
        except Exception as exc:
            logger.debug("Annual %s failed for %s: %s", fin_type, ticker_no_suffix, exc)

    # Quarterly statements
    for fin_type, attr_name in FINANCIAL_TYPES_QUARTERLY.items():
        try:
            df = getattr(tk, attr_name)
            if df is not None and not df.empty:
                records.extend(_parse_financial_dataframe(df, ticker_no_suffix, fin_type))
            else:
                logger.debug("Quarterly %s empty for %s", fin_type, ticker_no_suffix)
        except Exception as exc:
            logger.debug(
                "Quarterly %s failed for %s: %s", fin_type, ticker_no_suffix, exc
            )

    return records


# ── main entry points ────────────────────────────────────────────────────────


def fetch_and_store_financials(
    db, batch_size: int = 10, max_stocks: int | None = None
) -> dict:
    """Fetch financial statements for all stocks and upsert into DB.

    Args:
        db: SQLAlchemy session.
        batch_size: stocks per yfinance batch (default 10 for rate-limit safety).
        max_stocks: limit for testing (None = all).

    Returns:
        dict with counts per statement type and errors.
    """
    # Get active stocks from DB (tickers WITHOUT .JK suffix)
    stocks = (
        db.query(Stock.ticker)
        .filter(Stock.ticker.is_not(None), Stock.ticker != "")
        .order_by(Stock.ticker)
        .all()
    )
    tickers = [s.ticker for s in stocks]
    if max_stocks:
        tickers = tickers[:max_stocks]

    total = len(tickers)
    logger.info("Starting financials update for %d stocks", total)

    counts = {
        "income": 0, "balance": 0, "cashflow": 0,
        "income_q": 0, "balance_q": 0, "cashflow_q": 0,
        "no_data": 0, "rate_limited": 0, "errors": 0,
    }

    consecutive_rate_limits = 0

    for i in range(0, total, batch_size):
        batch = tickers[i : i + batch_size]
        batch_num = i // batch_size + 1
        total_batches = (total + batch_size - 1) // batch_size
        logger.info(
            "Batch %d/%d (%d stocks)", batch_num, total_batches, len(batch)
        )

        batch_records = []

        for idx, ticker in enumerate(batch):
            retries = 5  # max retries for rate limits
            fetched = False

            for attempt in range(retries):
                try:
                    records = _fetch_one_stock(ticker)
                    batch_records.extend(records)

                    # Update counts
                    for rec in records:
                        ftype = rec["type"]
                        if ftype in counts:
                            counts[ftype] += 1

                    if not records:
                        counts["no_data"] += 1

                    consecutive_rate_limits = 0  # reset on success
                    fetched = True
                    break  # success → exit retry loop

                except yf.exceptions.YFRateLimitError:
                    counts["rate_limited"] += 1
                    consecutive_rate_limits += 1
                    logger.warning(
                        "Rate limited on %s (attempt %d/%d, consecutive=%d)",
                        ticker, attempt + 1, retries, consecutive_rate_limits,
                    )
                    if attempt < retries - 1:
                        _sleep_with_backoff(attempt)
                    else:
                        logger.error(
                            "Gave up on %s after %d retries (rate limited)",
                            ticker, retries,
                        )

                except Exception as exc:
                    counts["errors"] += 1
                    logger.warning(
                        "Error fetching %s (attempt %d/%d): %s",
                        ticker, attempt + 1, retries, exc,
                    )
                    if attempt < retries - 1:
                        _sleep_with_backoff(attempt // 2)  # shorter backoff for non-rate-limit errors
                    else:
                        logger.error("Gave up on %s: %s", ticker, exc)

            if not fetched:
                logger.debug("No data fetched for %s", ticker)

            # Small intra-batch delay
            if idx < len(batch) - 1:
                if consecutive_rate_limits > 2:
                    time.sleep(3.0)  # longer delay when hammered
                else:
                    time.sleep(0.5)

        # Bulk upsert this batch
        if batch_records:
            stmt = insert(Financial).values(batch_records)
            stmt = stmt.on_conflict_do_update(
                index_elements=["ticker", "period", "type"],
                set_={"data": stmt.excluded.data},
            )
            try:
                db.execute(stmt)
                db.commit()
                logger.info(
                    "Batch %d: upserted %d records", batch_num, len(batch_records)
                )
            except Exception as exc:
                logger.error("DB upsert error in batch %d: %s", batch_num, exc)
                db.rollback()
        else:
            logger.info("Batch %d: no records to upsert", batch_num)

        # Inter-batch delay — longer if we're hitting rate limits
        if i + batch_size < total:
            if consecutive_rate_limits > 5:
                _sleep_with_backoff(
                    min(consecutive_rate_limits // 2, 5),
                    base=5.0, max_delay=120.0,
                )
            else:
                time.sleep(2.0)

    logger.info(
        "Financials update done — "
        "income:%d balance:%d cashflow:%d "
        "income_q:%d balance_q:%d cashflow_q:%d "
        "no_data:%d rate_limited:%d errors:%d",
        counts["income"], counts["balance"], counts["cashflow"],
        counts["income_q"], counts["balance_q"], counts["cashflow_q"],
        counts["no_data"], counts["rate_limited"], counts["errors"],
    )
    return counts


def update_financials():
    """Convenience wrapper — opens a DB session and runs the update.

    This is the function called by the APScheduler (scheduled daily 02:30).
    """
    db = SessionLocal()
    try:
        result = fetch_and_store_financials(db)
        return result
    except Exception as exc:
        logger.exception("Financials update failed: %s", exc)
        return {"error": str(exc)}
    finally:
        db.close()


def backfill_financials(max_stocks: int | None = None):
    """Run financials backfill (called from admin endpoint)."""
    db = SessionLocal()
    try:
        result = fetch_and_store_financials(db, max_stocks=max_stocks)
        db.commit()
        return result
    except Exception as exc:
        logger.error("Financials backfill failed: %s", exc)
        db.rollback()
        return {"error": str(exc)}
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    # Test with 3 stocks to verify yfinance connectivity
    result = backfill_financials(max_stocks=3)
    print(result)
