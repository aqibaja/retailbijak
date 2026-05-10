"""
Screener Evaluator — evaluate saved screeners against latest OHLCV data.

Runs every 15 minutes during market hours via APScheduler.
Loads active SavedScreener records, runs filter conditions against all stocks,
counts matches, creates AlertTrigger records when match count changes.
"""
import json
import logging
from datetime import datetime, timedelta

from database import SavedScreener, AlertTrigger, OHLCVDaily, Stock, SessionLocal

logger = logging.getLogger(__name__)

# Prevent re-triggering the same screener within this window (minutes)
COOLDOWN_MINUTES = 30


def evaluate_saved_screeners() -> dict:
    """Evaluate all active saved screeners against current OHLCV data."""
    db = SessionLocal()
    checked = 0
    matched_total = 0
    triggered = 0
    errors = 0
    try:
        screeners = db.query(SavedScreener).filter(SavedScreener.active == 1).all()
        if not screeners:
            logger.info("Screener evaluator: no active saved screeners")
            return {"checked": 0, "matched": 0, "triggered": 0, "errors": 0}

        # Get stocks with latest OHLCV data
        all_stocks = _fetch_all_stocks_with_ohlcv(db)
        if not all_stocks:
            logger.warning("Screener evaluator: no stocks with OHLCV data")
            return {"checked": len(screeners), "matched": 0, "triggered": 0, "errors": 0}

        # Build historical prices for change% calculations
        hist_prices = _build_historical_prices(db, days_back=5)

        cutoff = datetime.utcnow() - timedelta(minutes=COOLDOWN_MINUTES)

        for screener in screeners:
            checked += 1
            try:
                filters = {}
                if screener.filters_json:
                    try:
                        filters = json.loads(screener.filters_json) if isinstance(screener.filters_json, str) else (screener.filters_json or {})
                    except (json.JSONDecodeError, TypeError):
                        filters = {}

                # Apply filter conditions
                matches = _evaluate_filters(all_stocks, hist_prices, filters)
                match_count = len(matches)

                # Update match_count
                old_count = screener.match_count or 0
                screener.match_count = match_count
                db.flush()

                matched_total += match_count

                # Only trigger if match count increased from last check
                if match_count > 0 and match_count > old_count:
                    recent = db.query(AlertTrigger).filter(
                        AlertTrigger.alert_type == f"screener_match_{screener.id}",
                        AlertTrigger.triggered_at > cutoff,
                    ).first()
                    if not recent:
                        trigger = AlertTrigger(
                            alert_id=0,
                            ticker="",
                            alert_type=f"screener_match_{screener.id}",
                            trigger_value=float(old_count),
                            current_value=float(match_count),
                        )
                        db.add(trigger)
                        triggered += 1

            except Exception as exc:
                logger.warning("Screener evaluator failed for #%d %s: %s",
                               screener.id, screener.name, exc)
                errors += 1

        db.commit()
        logger.info(
            "Screener evaluator: %d screeners, %d total matches, %d new triggers, %d errors",
            checked, matched_total, triggered, errors,
        )
        return {
            "checked": checked,
            "matched": matched_total,
            "triggered": triggered,
            "errors": errors,
        }
    except Exception:
        db.rollback()
        logger.exception("Screener evaluator failed")
        return {"checked": 0, "matched": 0, "triggered": 0, "errors": 1}
    finally:
        db.close()


def _fetch_all_stocks_with_ohlcv(db):
    """Fetch all stocks with latest OHLCV data."""
    from sqlalchemy import func

    latest_date = db.query(func.max(OHLCVDaily.date)).scalar()
    if not latest_date:
        return []

    latest_subq = db.query(
        OHLCVDaily.ticker,
        func.max(OHLCVDaily.date).label("max_date"),
    ).filter(
        OHLCVDaily.date <= latest_date,
    ).group_by(OHLCVDaily.ticker).subquery()

    rows = db.query(
        OHLCVDaily.ticker,
        OHLCVDaily.date,
        OHLCVDaily.close,
        OHLCVDaily.volume,
    ).join(
        latest_subq,
        (OHLCVDaily.ticker == latest_subq.c.ticker)
        & (OHLCVDaily.date == latest_subq.c.max_date),
    ).all()

    result = []
    for r in rows:
        if r.close and r.close > 0:
            result.append({
                "ticker": r.ticker,
                "close": float(r.close),
                "volume": int(r.volume or 0),
                "date": str(r.date),
            })
    return result


def _build_historical_prices(db, days_back=5):
    """Build a dict of {ticker: [close prices]} for historical comparison."""
    from collections import defaultdict

    latest_date = db.query(OHLCVDaily.date).order_by(OHLCVDaily.date.desc()).first()
    if not latest_date:
        return {}
    latest_date = latest_date[0]
    cutoff = latest_date - timedelta(days=days_back * 2)

    rows = db.query(
        OHLCVDaily.ticker, OHLCVDaily.close, OHLCVDaily.date
    ).filter(
        OHLCVDaily.date >= cutoff,
        OHLCVDaily.date <= latest_date,
        OHLCVDaily.close.isnot(None),
        OHLCVDaily.close > 0,
    ).order_by(OHLCVDaily.date.asc()).all()

    hist = defaultdict(list)
    for r in rows:
        hist[r.ticker].append(float(r.close))
    return dict(hist)


def _evaluate_filters(stocks, hist_prices, filters):
    """Apply filter conditions and return matching stocks.

    Supported filter keys (all optional):
      - search: str — filter by ticker substring match
      - price_min / price_max: float
      - change_min / change_max: float (1-day % change)
      - volume_min: int
    """
    results = []
    search_q = (filters.get("search") or "").strip().lower()
    price_min = _safe_float(filters.get("price_min"))
    price_max = _safe_float(filters.get("price_max"))
    change_min = _safe_float(filters.get("change_min"))
    change_max = _safe_float(filters.get("change_max"))
    volume_min = _safe_int(filters.get("volume_min"))

    for st in stocks:
        ticker = st["ticker"]
        close = st["close"]
        volume = st["volume"]

        # Search filter
        if search_q and search_q not in ticker.lower():
            continue

        # Price range
        if price_min is not None and close < price_min:
            continue
        if price_max is not None and close > price_max:
            continue

        # Volume minimum
        if volume_min is not None and volume < volume_min:
            continue

        # Price change from previous day
        if change_min is not None or change_max is not None:
            prices = hist_prices.get(ticker, [])
            if len(prices) < 2:
                continue
            prev_close = prices[-2]
            if prev_close <= 0:
                continue
            change_pct = ((close - prev_close) / prev_close) * 100
            if change_min is not None and change_pct < change_min:
                continue
            if change_max is not None and change_pct > change_max:
                continue

        results.append(ticker)

    return results


def _safe_float(val):
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _safe_int(val):
    if val is None:
        return None
    try:
        return int(val)
    except (TypeError, ValueError):
        return None
