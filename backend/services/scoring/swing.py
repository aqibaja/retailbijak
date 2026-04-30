from __future__ import annotations

from typing import Any


def _clamp(v: float, lo: float = 0, hi: float = 100) -> float:
    return max(lo, min(hi, v))


def score_swing(data: dict[str, Any]) -> dict[str, Any]:
    score = 50.0
    reasons: list[str] = []

    trend = data.get("trend_score")
    if isinstance(trend, (int, float)):
        score += trend * 0.25
        reasons.append(f"trend:{trend}")

    volume_spike = data.get("volume_spike", 1.0) or 1.0
    if volume_spike >= 2:
        score += 12
        reasons.append("volume spike")
    elif volume_spike >= 1.2:
        score += 6
        reasons.append("volume above avg")

    liquidity = data.get("liquidity_score", 50)
    if isinstance(liquidity, (int, float)):
        score += (liquidity - 50) * 0.15

    volatility = data.get("volatility_score", 50)
    if isinstance(volatility, (int, float)):
        score -= max(0, volatility - 55) * 0.18

    breakout = data.get("breakout", False)
    if breakout:
        score += 10
        reasons.append("breakout")

    score = _clamp(score)
    label = "strong" if score >= 70 else "moderate" if score >= 45 else "weak"
    return {"score": round(score, 1), "label": label, "reasons": reasons}
