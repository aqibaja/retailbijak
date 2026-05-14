from __future__ import annotations

from fastapi import APIRouter

from backend.services.scanner_engine import scan_universe

router = APIRouter(prefix="/api", tags=["scanner"])


@router.get("/scanner")
def scanner(rule: str | None = None):
    demo_rows = [
        {"ticker": "BBCA", "price": 1000, "per": 8, "pbv": 1.2, "roe": 18, "volume_spike": 2.5, "trend_score": 60, "breakout": True, "market_cap": 2_000_000_000_000, "dividend_yield": 2.5, "dividend_consistency": 3},
        {"ticker": "GAMA", "price": 500, "per": 50, "pbv": 8, "roe": 2, "volume_spike": 3.0, "market_cap": 300_000_000_000, "volatility_score": 85},
    ]
    return {"count": len(demo_rows), "data": scan_universe(demo_rows, rule=rule)}
