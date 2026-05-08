"""
IDX Candlestick Pattern Recognition
====================================
Mendeteksi pola candlestick klasik untuk saham IDX.
Setiap fungsi menerima array open, high, low, close dan mengembalikan
pola yang terdeteksi dalam 30 candle terakhir.

Pola yang dideteksi:
- Doji
- Hammer
- Inverted Hammer
- Bullish Engulfing
- Bearish Engulfing
- Morning Star
- Evening Star
- Three White Soldiers
- Three Black Crows
"""

from typing import Any
import math

LOCALE_NAMES = {
    'doji': 'Doji',
    'hammer': 'Hammer',
    'inverted_hammer': 'Inverted Hammer',
    'bullish_engulfing': 'Bullish Engulfing',
    'bearish_engulfing': 'Bearish Engulfing',
    'morning_star': 'Morning Star',
    'evening_star': 'Evening Star',
    'three_white_soldiers': 'Three White Soldiers',
    'three_black_crows': 'Three Black Crows',
}

# Indonesian translations for UI display
LOCALE_NAMES_ID = {
    'doji': 'Doji',
    'hammer': 'Hammer',
    'inverted_hammer': 'Inverted Hammer',
    'bullish_engulfing': 'Bullish Engulfing',
    'bearish_engulfing': 'Bearish Engulfing',
    'morning_star': 'Morning Star',
    'evening_star': 'Evening Star',
    'three_white_soldiers': 'Three White Soldiers',
    'three_black_crows': 'Three Black Crows',
}


def _body_size(open_p, close_p):
    """Return absolute body size."""
    return abs(close_p - open_p)


def _total_range(high, low):
    return high - low


def _is_bullish(open_p, close_p):
    return close_p >= open_p


def _avg_body(opens, closes):
    """Calculate average body size from recent candles."""
    bodies = [abs(c - o) for o, c in zip(opens, closes)]
    return sum(bodies) / len(bodies) if bodies else 0


def _avg_range(highs, lows):
    ranges = [h - l for h, l in zip(highs, lows)]
    return sum(ranges) / len(ranges) if ranges else 0


def detect_doji(opens, highs, lows, closes, lookback=30):
    """
    Doji: open == close (or very close), small real body.
    Criteria: body_size <= 5% of total range.
    """
    patterns = []
    start = max(0, len(closes) - lookback)
    avg_r = _avg_range(highs[start:], lows[start:])
    threshold = avg_r * 0.05 if avg_r > 0 else 0.01

    for i in range(start, len(closes)):
        body = _body_size(opens[i], closes[i])
        rng = _total_range(highs[i], lows[i])
        if rng > 0 and body <= rng * 0.1 and body <= threshold * 2:
            patterns.append({
                'index': i,
                'pattern': 'doji',
                'label': 'Doji',
                'label_id': 'Doji',
                'direction': 'neutral',
                'strength': 'weak' if body < rng * 0.05 else 'moderate',
            })
    return patterns


def detect_hammer(opens, highs, lows, closes, lookback=30):
    """
    Hammer: small real body at upper end, long lower wick (2-3x body),
    little or no upper wick. Bullish reversal signal.
    """
    patterns = []
    start = max(0, len(closes) - lookback)
    avg_r = _avg_range(highs[start:], lows[start:])

    for i in range(start, len(closes)):
        body = _body_size(opens[i], closes[i])
        rng = _total_range(highs[i], lows[i])
        if body <= 0 or rng <= 0:
            continue
        lower_wick = min(opens[i], closes[i]) - lows[i]
        upper_wick = highs[i] - max(opens[i], closes[i])
        # Lower wick >= 2x body, upper wick <= 10% of body
        if lower_wick >= 2 * body and upper_wick <= 0.3 * body:
            patterns.append({
                'index': i,
                'pattern': 'hammer',
                'label': 'Hammer',
                'label_id': 'Hammer',
                'direction': 'bullish',
                'strength': 'moderate' if lower_wick >= 3 * body else 'weak',
            })
    return patterns


def detect_inverted_hammer(opens, highs, lows, closes, lookback=30):
    """
    Inverted Hammer: small real body at lower end, long upper wick (2-3x body),
    little or no lower wick. Bullish reversal.
    """
    patterns = []
    start = max(0, len(closes) - lookback)
    for i in range(start, len(closes)):
        body = _body_size(opens[i], closes[i])
        rng = _total_range(highs[i], lows[i])
        if body <= 0 or rng <= 0:
            continue
        lower_wick = min(opens[i], closes[i]) - lows[i]
        upper_wick = highs[i] - max(opens[i], closes[i])
        if upper_wick >= 2 * body and lower_wick <= 0.3 * body:
            patterns.append({
                'index': i,
                'pattern': 'inverted_hammer',
                'label': 'Inverted Hammer',
                'label_id': 'Inverted Hammer',
                'direction': 'bullish',
                'strength': 'moderate' if upper_wick >= 3 * body else 'weak',
            })
    return patterns


def detect_bullish_engulfing(opens, highs, lows, closes, lookback=30):
    """
    Bullish Engulfing: bearish candle followed by a larger bullish candle
    that completely engulfs the previous candle's body.
    """
    patterns = []
    start = max(0, len(closes) - lookback)
    for i in range(start + 1, len(closes)):
        prev_bearish = closes[i - 1] < opens[i - 1]
        curr_bullish = closes[i] > opens[i]
        if not (prev_bearish and curr_bullish):
            continue
        prev_body = _body_size(opens[i - 1], closes[i - 1])
        curr_body = _body_size(opens[i], closes[i])
        # Current body engulfs previous body
        if curr_body > prev_body and closes[i] > opens[i - 1] and opens[i] < closes[i - 1]:
            patterns.append({
                'index': i,
                'pattern': 'bullish_engulfing',
                'label': 'Bullish Engulfing',
                'label_id': 'Bullish Engulfing',
                'direction': 'bullish',
                'strength': 'strong' if curr_body >= 1.5 * prev_body else 'moderate',
            })
    return patterns


def detect_bearish_engulfing(opens, highs, lows, closes, lookback=30):
    """
    Bearish Engulfing: bullish candle followed by a larger bearish candle
    that completely engulfs the previous candle's body.
    """
    patterns = []
    start = max(0, len(closes) - lookback)
    for i in range(start + 1, len(closes)):
        prev_bullish = closes[i - 1] > opens[i - 1]
        curr_bearish = closes[i] < opens[i]
        if not (prev_bullish and curr_bearish):
            continue
        prev_body = _body_size(opens[i - 1], closes[i - 1])
        curr_body = _body_size(opens[i], closes[i])
        if curr_body > prev_body and closes[i] < opens[i - 1] and opens[i] > closes[i - 1]:
            patterns.append({
                'index': i,
                'pattern': 'bearish_engulfing',
                'label': 'Bearish Engulfing',
                'label_id': 'Bearish Engulfing',
                'direction': 'bearish',
                'strength': 'strong' if curr_body >= 1.5 * prev_body else 'moderate',
            })
    return patterns


def detect_morning_star(opens, highs, lows, closes, lookback=30):
    """
    Morning Star: 3-candle bullish reversal pattern:
    1. Long bearish candle
    2. Small-bodied candle (doji/spinning top) gapping down
    3. Long bullish candle closing >= 50% of first candle's body
    """
    patterns = []
    start = max(0, len(closes) - lookback)
    avg_b = _avg_body(opens[start:], closes[start:])

    for i in range(start + 2, len(closes)):
        c1, c2, c3 = closes[i - 2], closes[i - 1], closes[i]
        o1, o2, o3 = opens[i - 2], opens[i - 1], opens[i]

        # Candle 1: bearish
        if c1 >= o1:
            continue
        # Candle 2: small body (doji-like)
        body2 = abs(c2 - o2)
        if body2 > avg_b * 0.5:
            continue
        # Candle 3: bullish
        if c3 <= o3:
            continue
        # Gap down on candle 2
        if c2 > o1:  # no gap down relative to close of candle 1
            continue
        # Candle 3 closes at least halfway up candle 1's body
        midpoint1 = (o1 + c1) / 2
        if c3 <= midpoint1:
            continue

        patterns.append({
            'index': i,
            'pattern': 'morning_star',
            'label': 'Morning Star',
            'label_id': 'Morning Star',
            'direction': 'bullish',
            'strength': 'strong',
        })
    return patterns


def detect_evening_star(opens, highs, lows, closes, lookback=30):
    """
    Evening Star: 3-candle bearish reversal pattern:
    1. Long bullish candle
    2. Small-bodied candle (doji/spinning top) gapping up
    3. Long bearish candle closing <= 50% of first candle's body
    """
    patterns = []
    start = max(0, len(closes) - lookback)
    avg_b = _avg_body(opens[start:], closes[start:])

    for i in range(start + 2, len(closes)):
        c1, c2, c3 = closes[i - 2], closes[i - 1], closes[i]
        o1, o2, o3 = opens[i - 2], opens[i - 1], opens[i]

        # Candle 1: bullish
        if c1 <= o1:
            continue
        # Candle 2: small body (doji-like)
        body2 = abs(c2 - o2)
        if body2 > avg_b * 0.5:
            continue
        # Candle 3: bearish
        if c3 >= o3:
            continue
        # Gap up on candle 2
        if c2 < o1:
            continue
        # Candle 3 closes at most halfway down candle 1's body
        midpoint1 = (o1 + c1) / 2
        if c3 >= midpoint1:
            continue

        patterns.append({
            'index': i,
            'pattern': 'evening_star',
            'label': 'Evening Star',
            'label_id': 'Evening Star',
            'direction': 'bearish',
            'strength': 'strong',
        })
    return patterns


def detect_three_white_soldiers(opens, highs, lows, closes, lookback=30):
    """
    Three White Soldiers: 3 consecutive long bullish candles,
    each closing higher than the previous, with small/no upper wicks.
    """
    patterns = []
    start = max(0, len(closes) - lookback)
    avg_b = _avg_body(opens[start:], closes[start:])

    for i in range(start + 2, len(closes)):
        bullish = all(closes[j] > opens[j] for j in range(i - 2, i + 1))
        if not bullish:
            continue
        higher_close = all(closes[j] > closes[j - 1] for j in range(i - 1, i + 1))
        if not higher_close:
            continue
        bodies = [abs(closes[j] - opens[j]) for j in range(i - 2, i + 1)]
        if any(b < avg_b * 0.6 for b in bodies):
            continue
        # Small upper wicks
        small_upper_wick = all(
            (highs[j] - max(opens[j], closes[j])) <= bodies[idx] * 0.3
            for idx, j in enumerate(range(i - 2, i + 1))
        )
        if not small_upper_wick:
            continue

        patterns.append({
            'index': i,
            'pattern': 'three_white_soldiers',
            'label': 'Three White Soldiers',
            'label_id': 'Three White Soldiers',
            'direction': 'bullish',
            'strength': 'strong',
        })
    return patterns


def detect_three_black_crows(opens, highs, lows, closes, lookback=30):
    """
    Three Black Crows: 3 consecutive long bearish candles,
    each closing lower than the previous, with small/no lower wicks.
    """
    patterns = []
    start = max(0, len(closes) - lookback)
    avg_b = _avg_body(opens[start:], closes[start:])

    for i in range(start + 2, len(closes)):
        bearish = all(closes[j] < opens[j] for j in range(i - 2, i + 1))
        if not bearish:
            continue
        lower_close = all(closes[j] < closes[j - 1] for j in range(i - 1, i + 1))
        if not lower_close:
            continue
        bodies = [abs(closes[j] - opens[j]) for j in range(i - 2, i + 1)]
        if any(b < avg_b * 0.6 for b in bodies):
            continue
        # Small lower wicks
        small_lower_wick = all(
            (min(opens[j], closes[j]) - lows[j]) <= bodies[idx] * 0.3
            for idx, j in enumerate(range(i - 2, i + 1))
        )
        if not small_lower_wick:
            continue

        patterns.append({
            'index': i,
            'pattern': 'three_black_crows',
            'label': 'Three Black Crows',
            'label_id': 'Three Black Crows',
            'direction': 'bearish',
            'strength': 'strong',
        })
    return patterns


# Registry of all detectors
PATTERN_DETECTORS = [
    detect_doji,
    detect_hammer,
    detect_inverted_hammer,
    detect_bullish_engulfing,
    detect_bearish_engulfing,
    detect_morning_star,
    detect_evening_star,
    detect_three_white_soldiers,
    detect_three_black_crows,
]


def detect_all_patterns(opens, highs, lows, closes, lookback=30) -> list[dict[str, Any]]:
    """
    Run all pattern detectors and return combined results.
    Returns list of patterns found, each with: index, pattern, label, direction, strength.
    """
    all_patterns = []
    seen_signatures = set()

    for detector in PATTERN_DETECTORS:
        try:
            results = detector(opens, highs, lows, closes, lookback)
            for p in results:
                # Deduplicate: same index + pattern type
                sig = (p['index'], p['pattern'])
                if sig not in seen_signatures:
                    seen_signatures.add(sig)
                    all_patterns.append(p)
        except Exception as e:
            print(f'[pattern_detector] Error in {detector.__name__}: {e}')
            continue

    # Sort by index (most recent last)
    all_patterns.sort(key=lambda x: x['index'])
    return all_patterns


def get_patterns_with_dates(opens, highs, lows, closes, dates, lookback=30) -> list[dict[str, Any]]:
    """
    Detect patterns and attach date labels.
    Returns patterns with date information, most recent first.
    """
    patterns = detect_all_patterns(opens, highs, lows, closes, lookback)

    result = []
    for p in patterns:
        idx = p['index']
        date_str = str(dates[idx])[:10] if idx < len(dates) else ''
        # Days ago from the last candle
        days_ago = len(closes) - 1 - idx if idx < len(closes) else 0

        result.append({
            'pattern': p['pattern'],
            'label': p['label'],
            'label_id': p['label_id'],
            'direction': p['direction'],
            'strength': p['strength'],
            'date': date_str,
            'days_ago': days_ago,
            'index': idx,
        })

    # Sort by most recent first
    result.sort(key=lambda x: (-x['index']))
    return result
