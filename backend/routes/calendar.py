"""
Calendar Events API Routes
==========================
Endpoints for viewing calendar events (dividend dates, earnings, corporate actions).

Endpoints:
    GET /api/calendar          — events filtered by month & type
    GET /api/calendar/today    — events happening today
"""

from datetime import datetime, date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import CalendarEvent, Fundamental, Stock, get_db
router = APIRouter()

VALID_EVENT_TYPES = {"dividend", "earnings", "corporate", "economic", "ipo", "rights", "all"}


def _event_to_dict(ev: CalendarEvent) -> dict:
    return {
        "id": ev.id,
        "ticker": ev.ticker,
        "title": ev.title,
        "event_type": ev.event_type,
        "event_date": ev.event_date.isoformat() if hasattr(ev.event_date, "isoformat") else str(ev.event_date),
        "description": ev.description,
        "source": ev.source,
    }


@router.get("/api/calendar")
def get_calendar_events(
    month: Optional[str] = Query(None, description="Month in YYYY-MM format, e.g. '2026-05'. Defaults to current month."),
    event_type: str = Query("all", description=f"Filter by type: {' | '.join(sorted(VALID_EVENT_TYPES))}"),
    db: Session = Depends(get_db),
):
    """Return calendar events for a given month and type."""
    # Resolve month
    if month:
        try:
            year_str, month_str = month.split("-")
            year = int(year_str)
            mo = int(month_str)
        except (ValueError, AttributeError):
            return {"count": 0, "month": month, "events": [], "error": "Invalid month format, use YYYY-MM"}
    else:
        today = date.today()
        year = today.year
        mo = today.month
        month = f"{year:04d}-{mo:02d}"

    # Build date range
    start_date = date(year, mo, 1)
    if mo == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, mo + 1, 1)

    # Query
    q = db.query(CalendarEvent).filter(
        CalendarEvent.event_date >= start_date,
        CalendarEvent.event_date < end_date,
    )

    if event_type != "all" and event_type in VALID_EVENT_TYPES:
        q = q.filter(CalendarEvent.event_type == event_type)

    events = q.order_by(CalendarEvent.event_date, CalendarEvent.ticker).all()

    return {
        "count": len(events),
        "month": month,
        "events": [_event_to_dict(e) for e in events],
    }


@router.get("/api/calendar/today")
def get_today_calendar_events(
    event_type: str = Query("all", description=f"Filter by type: {' | '.join(sorted(VALID_EVENT_TYPES))}"),
    db: Session = Depends(get_db),
):
    """Return calendar events happening today."""
    today = date.today()
    tomorrow = today + timedelta(days=1)

    q = db.query(CalendarEvent).filter(
        CalendarEvent.event_date >= today,
        CalendarEvent.event_date < tomorrow,
    )

    if event_type != "all" and event_type in VALID_EVENT_TYPES:
        q = q.filter(CalendarEvent.event_type == event_type)

    events = q.order_by(CalendarEvent.ticker).all()

    return {
        "count": len(events),
        "date": today.isoformat(),
        "events": [_event_to_dict(e) for e in events],
    }


@router.get("/api/calendar/upcoming")
def get_upcoming_calendar_events(
    days: int = Query(7, description="Number of days ahead to look", ge=1, le=90),
    event_type: str = Query("all", description=f"Filter by type: {' | '.join(sorted(VALID_EVENT_TYPES))}"),
    db: Session = Depends(get_db),
):
    """Return upcoming calendar events within the next N days."""
    today = date.today()
    end = today + timedelta(days=days)

    q = db.query(CalendarEvent).filter(
        CalendarEvent.event_date >= today,
        CalendarEvent.event_date <= end,
    )

    if event_type != "all" and event_type in VALID_EVENT_TYPES:
        q = q.filter(CalendarEvent.event_type == event_type)

    events = q.order_by(CalendarEvent.event_date, CalendarEvent.ticker).all()

    return {
        "count": len(events),
        "start_date": today.isoformat(),
        "end_date": end.isoformat(),
        "events": [_event_to_dict(e) for e in events],
    }


# ─── Dividend Dashboard Endpoints ─────────────────────────────────
# 26.1.2 — Dividend Dashboard & Kalkulator


@router.get("/api/dividends")
def get_dividends(
    sector: str = "",
    ticker: str = "",
    db: Session = Depends(get_db),
):
    """Return all dividend events grouped by ticker with yield & sector info."""
    q = (
        db.query(
            CalendarEvent.ticker,
            CalendarEvent.event_date,
            CalendarEvent.title,
            CalendarEvent.description,
            Fundamental.dividend_yield,
            Stock.sector,
            Stock.name,
        )
        .outerjoin(Fundamental, CalendarEvent.ticker == Fundamental.ticker)
        .outerjoin(Stock, CalendarEvent.ticker == Stock.ticker)
        .filter(CalendarEvent.event_type == "dividend")
    )

    if sector:
        q = q.filter(Stock.sector.ilike(f"%{sector}%"))
    if ticker:
        q = q.filter(CalendarEvent.ticker.ilike(f"%{ticker}%"))

    rows = q.order_by(CalendarEvent.event_date.desc()).all()

    # Build per-ticker grouping
    ticker_map = {}
    for row in rows:
        t = row.ticker or "UNKNOWN"
        if t not in ticker_map:
            ticker_map[t] = {
                "ticker": t,
                "company_name": row.name or "",
                "sector": row.sector or "",
                "dividend_yield": row.dividend_yield,
                "events": [],
            }
        ticker_map[t]["events"].append({
            "event_date": row.event_date.isoformat() if hasattr(row.event_date, "isoformat") else str(row.event_date),
            "title": row.title,
            "description": row.description,
        })

    data = list(ticker_map.values())
    data.sort(key=lambda x: x["ticker"])

    # Compute sector averages
    sector_avg = {}
    for item in data:
        sec = item["sector"] or "Unknown"
        if sec not in sector_avg:
            sector_avg[sec] = {"total_yield": 0.0, "count": 0}
        if item["dividend_yield"] is not None:
            sector_avg[sec]["total_yield"] += item["dividend_yield"]
            sector_avg[sec]["count"] += 1

    sector_averages = {}
    for sec, vals in sector_avg.items():
        if vals["count"] > 0:
            sector_averages[sec] = round(vals["total_yield"] / vals["count"], 2)
        else:
            sector_averages[sec] = 0

    # Attach sector avg to each item
    for item in data:
        sec = item["sector"] or "Unknown"
        item["sector_avg_yield"] = sector_averages.get(sec, 0)

    return {
        "count": len(data),
        "data": data,
        "sector_averages": sector_averages,
    }


@router.get("/api/dividends/aristocrats")
def get_dividend_aristocrats(
    min_years: int = 5,
    db: Session = Depends(get_db),
):
    """Companies with N+ years of consecutive dividend history."""
    from sqlalchemy import func as sa_func, extract

    # Get all dividend events with ticker and year
    rows = (
        db.query(
            CalendarEvent.ticker,
            extract("year", CalendarEvent.event_date).label("year"),
            Stock.sector,
            Stock.name,
            Fundamental.dividend_yield,
        )
        .outerjoin(Stock, CalendarEvent.ticker == Stock.ticker)
        .outerjoin(Fundamental, CalendarEvent.ticker == Fundamental.ticker)
        .filter(CalendarEvent.event_type == "dividend")
        .order_by(CalendarEvent.ticker, CalendarEvent.event_date.desc())
        .all()
    )

    # Group distinct years per ticker
    ticker_years = {}
    ticker_info = {}
    for row in rows:
        t = row.ticker
        if t not in ticker_years:
            ticker_years[t] = set()
            ticker_info[t] = {
                "sector": row.sector or "",
                "company_name": row.name or "",
                "dividend_yield": row.dividend_yield,
            }
        if row.year is not None:
            ticker_years[t].add(int(row.year))

    # Check consecutive years
    today_year = date.today().year
    aristocrats = []
    for t, years in ticker_years.items():
        sorted_years = sorted(years, reverse=True)
        if not sorted_years:
            continue
        # Count consecutive years backward from most recent
        consecutive = 1
        for i in range(1, len(sorted_years)):
            if sorted_years[i - 1] - sorted_years[i] == 1:
                consecutive += 1
            else:
                break
        # Also check if the most recent year is within the past 2 years
        is_recent = (today_year - sorted_years[0]) <= 2

        if consecutive >= min_years and is_recent:
            aristocrats.append({
                "ticker": t,
                "company_name": ticker_info[t]["company_name"],
                "sector": ticker_info[t]["sector"],
                "dividend_yield": ticker_info[t]["dividend_yield"],
                "consecutive_years": consecutive,
                "years_range": f"{sorted_years[-1]}–{sorted_years[0]}",
            })

    aristocrats.sort(key=lambda x: x["consecutive_years"], reverse=True)

    return {
        "count": len(aristocrats),
        "data": aristocrats,
    }
