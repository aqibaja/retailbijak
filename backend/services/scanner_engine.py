from __future__ import annotations

from typing import Any

from backend.services.scoring import score_swing, score_valuation, score_gorengan, score_dividend


PRESET_RULES = {
    "swing_breakout": lambda s: s["swing"]["score"] >= 70,
    "value_cheap": lambda s: s["valuation"]["score"] >= 70,
    "dividend_pick": lambda s: s["dividend"]["score"] >= 70,
    "low_risk": lambda s: s["gorengan"]["score"] < 40 and s["valuation"]["score"] >= 45,
    "gorengan_watchlist": lambda s: s["gorengan"]["score"] >= 60,
}


def analyze_stock(data: dict[str, Any]) -> dict[str, Any]:
    swing = score_swing(data)
    valuation = score_valuation(data)
    gorengan = score_gorengan(data)
    dividend = score_dividend(data)
    tags = []
    for name, checker in PRESET_RULES.items():
        try:
            if checker({"swing": swing, "valuation": valuation, "gorengan": gorengan, "dividend": dividend}):
                tags.append(name)
        except Exception:
            continue
    return {
        "ticker": data.get("ticker"),
        "name": data.get("name"),
        "price": data.get("price"),
        "swing": swing,
        "valuation": valuation,
        "gorengan": gorengan,
        "dividend": dividend,
        "tags": tags,
    }


def scan_universe(rows: list[dict[str, Any]], rule: str | None = None) -> list[dict[str, Any]]:
    analyzed = [analyze_stock(row) for row in rows]
    if rule and rule in PRESET_RULES:
        analyzed = [row for row in analyzed if PRESET_RULES[rule](row)]
    analyzed.sort(key=lambda x: (x["swing"]["score"] + x["valuation"]["score"] - x["gorengan"]["score"]) , reverse=True)
    return analyzed
