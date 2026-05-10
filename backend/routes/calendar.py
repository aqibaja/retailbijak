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

from database import CalendarEvent, get_db
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
