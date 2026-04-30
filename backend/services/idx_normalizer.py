from __future__ import annotations

from datetime import datetime
from typing import Any


def _to_float(value: Any) -> float | None:
    if value in (None, "", "-"):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_int(value: Any) -> int | None:
    if value in (None, "", "-"):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def normalize_stock_payload(ticker: str, payload: dict[str, Any], source: str = "idx-api") -> dict[str, Any]:
    ticker = ticker.upper().replace(".JK", "")
    meta = payload.get("data") if isinstance(payload.get("data"), dict) else payload

    return {
        "ticker": ticker,
        "trade_date": payload.get("trade_date") or datetime.utcnow().date().isoformat(),
        "source": source,
        "close": _to_float(meta.get("close") or meta.get("last") or meta.get("price")),
        "change_pct": _to_float(meta.get("change_pct") or meta.get("percent_change")),
        "market_cap": _to_float(meta.get("market_cap") or meta.get("marketCap")),
        "per": _to_float(meta.get("per") or meta.get("pe")),
        "pbv": _to_float(meta.get("pbv") or meta.get("price_to_book")),
        "roe": _to_float(meta.get("roe")),
        "roa": _to_float(meta.get("roa")),
        "dividend_yield": _to_float(meta.get("dividend_yield") or meta.get("dy")),
        "volume": _to_int(meta.get("volume")),
        "payload_json": payload,
        "updated_at": datetime.utcnow().isoformat(timespec="seconds"),
    }
