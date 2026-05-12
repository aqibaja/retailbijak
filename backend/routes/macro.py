"""
Macro/Economic Dashboard API Routes
=====================================
Endpoints for macroeconomic indicators (BI Rate, CPI, GDP, Trade Balance, FX Reserves).

Endpoints:
    GET /api/macro             — all indicators grouped by name
    GET /api/macro/{indicator} — time series for one indicator
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import MacroIndicator, get_db

router = APIRouter()

# ─── Friendly labels for display ────────────────────────────────────────────
INDICATOR_LABELS = {
    "bi_rate": {"name": "BI Rate", "unit": "%", "icon": "🏦"},
    "cpi": {"name": "CPI Inflation", "unit": "%", "icon": "📈"},
    "gdp": {"name": "GDP Growth", "unit": "%", "icon": "📊"},
    "trade_balance": {"name": "Trade Balance", "unit": "$B", "icon": "📦"},
    "fx_reserves": {"name": "FX Reserves", "unit": "$B", "icon": "💵"},
}

VALID_INDICATORS = set(INDICATOR_LABELS.keys())


def _indicator_to_dict(rec: MacroIndicator) -> dict:
    return {
        "id": rec.id,
        "indicator_name": rec.indicator_name,
        "year": rec.year,
        "value": rec.value,
        "updated_at": rec.updated_at.isoformat() if rec.updated_at else None,
    }


@router.get("/api/macro")
def get_all_macro_indicators(db: Session = Depends(get_db)):
    """Return all macro indicators grouped by name with metadata."""
    from sqlalchemy import func
    
    rows = db.query(
        MacroIndicator.indicator_name,
        MacroIndicator.year,
        MacroIndicator.value,
        MacroIndicator.updated_at,
    ).order_by(
        MacroIndicator.indicator_name,
        MacroIndicator.year,
    ).all()

    # Group by indicator_name
    grouped = {}
    for r in rows:
        name = r.indicator_name
        if name not in grouped:
            meta = INDICATOR_LABELS.get(name, {"name": name, "unit": "", "icon": "📊"})
            grouped[name] = {
                "indicator_name": name,
                "label": meta["name"],
                "unit": meta["unit"],
                "icon": meta["icon"],
                "data": [],
                "latest_updated": r.updated_at,  # will keep max
            }
        # Append data point
        grouped[name]["data"].append({
            "year": r.year,
            "value": r.value,
        })
        # Update latest_updated to the max
        if r.updated_at > grouped[name]["latest_updated"]:
            grouped[name]["latest_updated"] = r.updated_at

    # Compute trend arrow (up/down) and current value for each
    result = []
    for name, info in grouped.items():
        years = info["data"]
        # Current value = latest year
        current = max(years, key=lambda x: x["year"]) if years else {}
        # Trend: compare current to previous
        sorted_years = sorted(years, key=lambda x: x["year"])
        trend = "up"
        if len(sorted_years) >= 2:
            prev = sorted_years[-2]["value"]
            curr = sorted_years[-1]["value"]
            trend = "up" if curr >= prev else "down"
        # Compute min/max for chart scaling
        values = [d["value"] for d in years]
        info["current_value"] = current.get("value")
        info["trend"] = trend
        info["min"] = min(values) if values else 0
        info["max"] = max(values) if values else 0
        info["data"] = sorted_years  # chronological order
        # Format last updated as a readable string
        info["last_updated"] = info["latest_updated"].strftime("%Y-%m-%d %H:%M")
        result.append(info)

    # Order: bi_rate, cpi, gdp, trade_balance, fx_reserves
    order = ["bi_rate", "cpi", "gdp", "trade_balance", "fx_reserves"]
    result.sort(key=lambda x: order.index(x["indicator_name"]) if x["indicator_name"] in order else 99)

    return {
        "count": len(result),
        "indicators": result,
    }


@router.get("/api/macro/{indicator_name}")
def get_macro_indicator(indicator_name: str, db: Session = Depends(get_db)):
    """Return time series for one macro indicator."""
    if indicator_name not in VALID_INDICATORS:
        raise HTTPException(status_code=404, detail=f"Unknown indicator: {indicator_name}")

    rows = db.query(MacroIndicator).filter(
        MacroIndicator.indicator_name == indicator_name
    ).order_by(MacroIndicator.year).all()

    if not rows:
        raise HTTPException(status_code=404, detail=f"No data for indicator: {indicator_name}")

    meta = INDICATOR_LABELS.get(indicator_name, {"name": indicator_name, "unit": "", "icon": "📊"})
    data = [{"year": r.year, "value": r.value} for r in rows]

    values = [d["value"] for d in data]
    current = data[-1] if data else {}
    trend = "up"
    if len(data) >= 2:
        trend = "up" if data[-1]["value"] >= data[-2]["value"] else "down"

    return {
        "indicator_name": indicator_name,
        "label": meta["name"],
        "unit": meta["unit"],
        "icon": meta["icon"],
        "current_value": current.get("value"),
        "trend": trend,
        "min": min(values) if values else 0,
        "max": max(values) if values else 0,
        "data": data,
    }
