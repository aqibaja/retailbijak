"""
Calendar Events Updater
=======================
Fetches dividend dates and earnings dates from yfinance for all tracked stocks
and stores them in the CalendarEvent table. Runs via APScheduler.

Usage:
    python -m backend.updaters.calendar_updater   # standalone run
"""

import logging
from datetime import datetime, date
from typing import Optional

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

try:
    from database import SessionLocal, CalendarEvent, Fundamental
except ModuleNotFoundError:
    from backend.database import SessionLocal, CalendarEvent, Fundamental

try:
    from stocks import get_all_tickers
except ModuleNotFoundError:
    from backend.stocks import get_all_tickers

logger = logging.getLogger(__name__)


def _safe_date(val) -> Optional[date]:
    """Convert various date formats to date object."""
    if val is None:
        return None
    if isinstance(val, date):
        return val
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, str):
        try:
            return datetime.strptime(val, "%Y-%m-%d").date()
        except ValueError:
            pass
        try:
            return datetime.strptime(val, "%Y-%m-%d %H:%M:%S").date()
        except ValueError:
            pass
    return None


def _store_event(db, ticker: str, title: str, event_type: str,
                 event_date: date, description: Optional[str] = None,
                 source: str = "yfinance") -> bool:
    """Insert or update a calendar event. Returns True if inserted/updated."""
    if event_date is None:
        return False

    existing = db.query(CalendarEvent).filter(
        CalendarEvent.ticker == ticker,
        CalendarEvent.event_type == event_type,
        CalendarEvent.event_date == event_date,
        CalendarEvent.title == title,
    ).first()

    if existing:
        return False

    ev = CalendarEvent(
        ticker=ticker,
        title=title,
        event_type=event_type,
        event_date=event_date,
        description=description,
        source=source,
    )
    db.add(ev)
    return True


def fetch_calendar_events(db, tickers=None, batch_size=50):
    """
    Fetch dividend and earnings dates from yfinance for the given tickers
    (or all tickers if None). Returns counts of new events stored.
    """
    from sqlalchemy.dialects.sqlite import insert as sqlite_insert

    if tickers is None:
        tickers = get_all_tickers()

    total = len(tickers)
    stored_dividends = 0
    stored_earnings = 0
    processed = 0

    for i in range(0, total, batch_size):
        batch = tickers[i:i + batch_size]
        logger.info(f"Calendar batch {i // batch_size + 1}/{(total + batch_size - 1) // batch_size} ({len(batch)} tickers)")

        for t in batch:
            try:
                import yfinance as yf
                ticker_obj = yf.Ticker(t)
                info = ticker_obj.info

                if not info:
                    continue

                # --- Dividend dates ---
                try:
                    # Try to get dividend data from yfinance
                    div_info = {}
                    div_rate = info.get("dividendRate")
                    div_yield = info.get("dividendYield")

                    # Check for ex-dividend date
                    ex_div_date = _safe_date(info.get("exDividendDate"))
                    if ex_div_date:
                        title = f"{t} Dividend"
                        if div_rate:
                            title = f"{t} Dividend (${div_rate:.4f})"
                        desc_parts = []
                        if div_yield:
                            desc_parts.append(f"Yield: {div_yield * 100:.2f}%")
                        if div_rate:
                            desc_parts.append(f"Rate: ${div_rate:.4f}")
                        desc = "; ".join(desc_parts) if desc_parts else "Dividend payment"

                        if _store_event(db, t, title, "dividend", ex_div_date, desc):
                            stored_dividends += 1

                    # If no ex-div date but we have dividend yield, create an estimated event
                    # from the fundamental data (useful for MVP)
                    if not ex_div_date and div_yield and div_yield > 0:
                        # Use next estimated date — 3 months from now as rough estimate
                        from datetime import timedelta
                        est_date = date.today() + timedelta(days=90)
                        title = f"{t} Est. Dividend"
                        desc = f"Estimated date (yield: {div_yield * 100:.2f}%)"
                        if _store_event(db, t, title, "dividend", est_date, desc):
                            stored_dividends += 1

                except Exception as e:
                    logger.debug(f"Error processing dividend for {t}: {e}")

                # --- Earnings dates ---
                try:
                    earnings_dates = None
                    try:
                        earnings_dates = ticker_obj.earnings_dates
                    except Exception:
                        pass

                    if earnings_dates is not None and not earnings_dates.empty:
                        for idx, row in earnings_dates.iterrows():
                            ed = _safe_date(idx)
                            if ed is None:
                                continue
                            # Skip past dates
                            if ed < date.today():
                                continue

                            est_eps = row.get("EPS Estimate")
                            actual_eps = row.get("EPS Actual")
                            desc_parts = []
                            if est_eps is not None and not pd.isna(est_eps):
                                desc_parts.append(f"Est. EPS: ${est_eps:.4f}")
                            if actual_eps is not None and not pd.isna(actual_eps):
                                desc_parts.append(f"Actual EPS: ${actual_eps:.4f}")

                            title = f"{t} Earnings"
                            desc = "; ".join(desc_parts) if desc_parts else None

                            if _store_event(db, t, title, "earnings", ed, desc):
                                stored_earnings += 1

                except Exception as e:
                    logger.debug(f"Error processing earnings for {t}: {e}")

            except Exception as e:
                logger.warning(f"Error fetching calendar data for {t}: {e}")
                continue

        # Commit batch
        db.commit()
        processed += len(batch)
        logger.info(f"Calendar progress: {processed}/{total} tickers")

    return {"dividends_stored": stored_dividends, "earnings_stored": stored_earnings}


def seed_dividends_from_fundamentals(db):
    """
    Seed dividend events from existing fundamental data (dividend_yield).
    This populates estimated dividend events for stocks that have yield data
    but no real dividend dates from yfinance yet.
    """
    from datetime import timedelta

    try:
        records = db.query(Fundamental).filter(
            Fundamental.dividend_yield.isnot(None),
            Fundamental.dividend_yield > 0,
        ).all()
    except Exception:
        logger.warning("Fundamental table not available for seeding dividends")
        return 0

    seeded = 0
    today = date.today()
    for rec in records:
        # Check if we already have a dividend event for this ticker
        existing = db.query(CalendarEvent).filter(
            CalendarEvent.ticker == rec.ticker,
            CalendarEvent.event_type == "dividend",
        ).count()
        if existing > 0:
            continue

        # Create an estimated event 90 days out
        est_date = today + timedelta(days=90)
        title = f"{rec.ticker} Est. Dividend"
        desc = f"Estimated (yield: {rec.dividend_yield * 100:.2f}%)"
        try:
            ev = CalendarEvent(
                ticker=rec.ticker,
                title=title,
                event_type="dividend",
                event_date=est_date,
                description=desc,
                source="fundamental",
            )
            db.add(ev)
            seeded += 1
        except Exception as e:
            logger.debug(f"Error seeding dividend for {rec.ticker}: {e}")

    if seeded:
        db.commit()
        logger.info(f"Seeded {seeded} estimated dividend events from fundamentals")
    return seeded


def update_calendar_events():
    """Main entry point — called by scheduler."""
    logger.info("Starting calendar events update...")
    db = SessionLocal()
    try:
        # First: seed from fundamentals (quick, no network)
        seeded = seed_dividends_from_fundamentals(db)

        # Then: fetch from yfinance
        try:
            import pandas as pd
        except ImportError:
            pd = None  # earnings parsing needs pandas

        result = fetch_calendar_events(db)
        logger.info(
            f"Calendar update complete. "
            f"New dividends: {result['dividends_stored']}, "
            f"New earnings: {result['earnings_stored']}, "
            f"Seeded from fundamentals: {seeded}"
        )
    except Exception as e:
        logger.error(f"Calendar update failed: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
    update_calendar_events()
