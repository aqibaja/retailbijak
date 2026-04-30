from __future__ import annotations

from typing import Any


def _clamp(v: float, lo: float = 0, hi: float = 100) -> float:
    return max(lo, min(hi, v))


def estimate_fair_value(price: float | None, per: float | None = None, pbv: float | None = None, target_per: float = 15.0, target_pbv: float = 2.0) -> float | None:
    if price is None:
        return None
    factors = []
    if per and per > 0:
        factors.append(target_per / per)
    if pbv and pbv > 0:
        factors.append(target_pbv / pbv)
    if not factors:
        return price
    multiplier = sum(factors) / len(factors)
    return round(price * multiplier, 2)


def score_valuation(data: dict[str, Any]) -> dict[str, Any]:
    per = data.get("per")
    pbv = data.get("pbv")
    roe = data.get("roe")
    price = data.get("price")
    fair_value = estimate_fair_value(price, per=per, pbv=pbv)
    score = 50.0
    reasons: list[str] = []

    if isinstance(per, (int, float)):
        if per <= 10:
            score += 15
            reasons.append("PER murah")
        elif per >= 25:
            score -= 15
            reasons.append("PER mahal")

    if isinstance(pbv, (int, float)):
        if pbv <= 1.5:
            score += 12
            reasons.append("PBV murah")
        elif pbv >= 4:
            score -= 12
            reasons.append("PBV mahal")

    if isinstance(roe, (int, float)):
        if roe >= 15:
            score += 10
            reasons.append("ROE bagus")
        elif roe < 5:
            score -= 8

    score = _clamp(score)
    label = "cheap" if score >= 70 else "fair" if score >= 45 else "expensive"
    upside_pct = None
    if fair_value and price:
        upside_pct = round((fair_value - price) / price * 100, 2)
    return {"score": round(score, 1), "label": label, "fair_value": fair_value, "upside_pct": upside_pct, "reasons": reasons}
