from __future__ import annotations

from typing import Any


def _clamp(v: float, lo: float = 0, hi: float = 100) -> float:
    return max(lo, min(hi, v))


def score_gorengan(data: dict[str, Any]) -> dict[str, Any]:
    score = 10.0
    reasons: list[str] = []

    market_cap = data.get("market_cap") or 0
    volume_spike = data.get("volume_spike", 1.0) or 1.0
    volatility = data.get("volatility_score", 50)
    per = data.get("per")
    pbv = data.get("pbv")

    if market_cap and market_cap < 1_000_000_000_000:
        score += 20
        reasons.append("small cap")
    if volume_spike >= 3:
        score += 25
        reasons.append("extreme volume spike")
    elif volume_spike >= 1.5:
        score += 10
        reasons.append("volume spike")
    if isinstance(volatility, (int, float)) and volatility >= 70:
        score += 20
        reasons.append("high volatility")
    if isinstance(per, (int, float)) and per > 40:
        score += 10
        reasons.append("high PER")
    if isinstance(pbv, (int, float)) and pbv > 5:
        score += 10
        reasons.append("high PBV")

    score = _clamp(score)
    label = "high" if score >= 70 else "medium" if score >= 40 else "low"
    return {"score": round(score, 1), "label": label, "reasons": reasons}
