from __future__ import annotations

from typing import Any
import math

try:
    from backend.services.scoring import score_swing, score_valuation, score_gorengan, score_dividend
except ModuleNotFoundError:
    from services.scoring import score_swing, score_valuation, score_gorengan, score_dividend


PRESET_RULES = {
    "swing_breakout": lambda s: s["swing"]["score"] >= 70,
    "value_cheap": lambda s: s["valuation"]["score"] >= 70,
    "dividend_pick": lambda s: s["dividend"]["score"] >= 70,
    "low_risk": lambda s: s["gorengan"]["score"] < 40 and s["valuation"]["score"] >= 45,
    "gorengan_watchlist": lambda s: s["gorengan"]["score"] >= 60,
}


def _series(row: dict[str, Any], *keys: str, default: float | None = None) -> float | None:
    for key in keys:
        val = row.get(key)
        if val is not None:
            try:
                return float(val)
            except (TypeError, ValueError):
                continue
    return default


def _hlc3_from_row(row: dict[str, Any]) -> float | None:
    high = _series(row, 'high', 'day_high', 'h')
    low = _series(row, 'low', 'day_low', 'l')
    close = _series(row, 'close', 'price', 'last', 'c')
    if None in (high, low, close):
        return close
    return (high + low + close) / 3


def _cci_proxy(row: dict[str, Any]) -> float:
    trend = _series(row, 'trend_score', default=50) or 50
    volume = _series(row, 'volume_spike', default=1.0) or 1.0
    breakout = bool(row.get('breakout'))
    val = (trend - 50) * 1.4 + min(max(volume - 1.0, 0), 4) * 8 + (18 if breakout else 0)
    return max(min(val, 200), -200)


def _magic_proxy(row: dict[str, Any]) -> float:
    base = _hlc3_from_row(row) or _series(row, 'price', default=0) or 0
    volatility = _series(row, 'volatility_score', default=50) or 50
    return base * (1 + (volatility - 50) / 1000)


def _signal_from_row(row: dict[str, Any]) -> dict[str, Any]:
    cci = _cci_proxy(row)
    magic = _magic_proxy(row)
    close = _series(row, 'close', 'price', 'last', 'c', default=0) or 0
    recent_swing_low = _series(row, 'swing_low', 'support', default=None)
    if recent_swing_low is None:
        recent_swing_low = close * 0.94 if close else 0
    below_cci = cci < -100
    cross_up = cci > -100 and _series(row, 'prev_cci', default=-120) < -100
    above_magic = close >= magic if magic else True
    pending = bool(row.get('pending_buy'))
    cci_bullish = bool(row.get('cci_bullish')) or (cross_up and above_magic and below_cci)
    stop = max(recent_swing_low, close * 0.94) if close else recent_swing_low
    entry = close or magic
    risk = max(entry - stop, 0) if entry and stop else 0
    target = max(_series(row, 'target', default=0) or 0, entry + risk * 1.8 if risk else entry * 1.08)
    rr = (target - entry) / risk if risk else None
    return {
        'cci': round(cci, 2),
        'magicLine': round(magic, 4) if magic else None,
        'stopLoss': round(stop, 4) if stop else None,
        'entry': round(entry, 4) if entry else None,
        'target': round(target, 4) if target else None,
        'rr': round(rr, 2) if rr is not None else None,
        'pendingBuy': pending,
        'cciBullish': cci_bullish,
        'signal': 'BUY' if cci_bullish or (close > magic and close > stop) else 'WATCH',
        'tags': [t for t, cond in [('cci_cross', cross_up), ('magic_above', above_magic), ('swing_buy', cci_bullish)] if cond],
    }


def analyze_stock(data: dict[str, Any]) -> dict[str, Any]:
    swing = score_swing(data)
    valuation = score_valuation(data)
    gorengan = score_gorengan(data)
    dividend = score_dividend(data)
    signal = _signal_from_row(data)
    tags = []
    for name, checker in PRESET_RULES.items():
        try:
            if checker({'swing': swing, 'valuation': valuation, 'gorengan': gorengan, 'dividend': dividend, 'signal': signal}):
                tags.append(name)
        except Exception:
            continue
    tags.extend(signal['tags'])
    return {
        'ticker': data.get('ticker'),
        'name': data.get('name'),
        'price': data.get('price'),
        'swing': swing,
        'valuation': valuation,
        'gorengan': gorengan,
        'dividend': dividend,
        'signal': signal,
        'tags': tags,
    }


def scan_universe(rows: list[dict[str, Any]], rule: str | None = None) -> list[dict[str, Any]]:
    analyzed = [analyze_stock(row) for row in rows]
    if rule and rule in PRESET_RULES:
        analyzed = [row for row in analyzed if PRESET_RULES[rule](row)]
    analyzed.sort(key=lambda x: (x['signal'].get('rr') or 0, x['swing']['score'] + x['valuation']['score'] - x['gorengan']['score']), reverse=True)
    return analyzed
