from __future__ import annotations

from typing import Any


def _clamp(v: float, lo: float = 0, hi: float = 100) -> float:
    return max(lo, min(hi, v))


def score_dividend(data: dict[str, Any]) -> dict[str, Any]:
    yield_pct = data.get("dividend_yield") or 0
    payout_ratio = data.get("payout_ratio")
    consistency = data.get("dividend_consistency", 0)
    score = 15.0
    reasons: list[str] = []

    if yield_pct >= 5:
        score += 25
        reasons.append("yield tinggi")
    elif yield_pct >= 2:
        score += 15
        reasons.append("yield oke")

    if consistency >= 3:
        score += 20
        reasons.append("konsisten")
    elif consistency >= 1:
        score += 10

    if isinstance(payout_ratio, (int, float)):
        if 20 <= payout_ratio <= 70:
            score += 10
            reasons.append("payout sehat")
        elif payout_ratio > 90:
            score -= 10

    score = _clamp(score)
    label = "attractive" if score >= 70 else "neutral" if score >= 45 else "weak"
    return {"score": round(score, 1), "label": label, "reasons": reasons}
