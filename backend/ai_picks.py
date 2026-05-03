from __future__ import annotations

from typing import Any
import sqlite3
from pathlib import Path

try:
    from backend.services.openrouter_llm import build_ai_picks_llm_payload
except ModuleNotFoundError:
    from services.openrouter_llm import build_ai_picks_llm_payload

VALID_AI_PICK_MODES = {"swing", "defensive", "catalyst"}
MODE_WEIGHTS = {
    "swing": {
        "technical": 0.35,
        "liquidity": 0.25,
        "fundamental": 0.10,
        "catalyst": 0.10,
        "risk": 0.20,
    },
    "defensive": {
        "technical": 0.15,
        "liquidity": 0.20,
        "fundamental": 0.40,
        "catalyst": 0.05,
        "risk": 0.20,
    },
    "catalyst": {
        "technical": 0.20,
        "liquidity": 0.20,
        "fundamental": 0.05,
        "catalyst": 0.40,
        "risk": 0.15,
    },
}
FIT_LABELS = {
    "swing": "swing terkonfirmasi",
    "defensive": "defensif berkualitas",
    "catalyst": "kandidat katalis",
}
DB_PATH = Path('/opt/swingaq/backend/swingaq.db')


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))



def _factor_value(factors: dict[str, Any], key: str) -> float:
    return _clamp(float(factors.get(key, 0.0) or 0.0), 0.0, 1.0)



def normalize_ai_pick_mode(mode: str | None) -> str:
    safe_mode = (mode or "swing").strip().lower()
    return safe_mode if safe_mode in VALID_AI_PICK_MODES else "swing"



def label_confidence(score: float, factors: dict[str, Any]) -> int:
    base = float(score)
    confidence = base
    if _factor_value(factors, 'fundamental') < 0.25:
        confidence -= 10
    if _factor_value(factors, 'catalyst') < 0.20:
        confidence -= 6
    if _factor_value(factors, 'liquidity') < 0.25:
        confidence -= 8
    confidence -= _factor_value(factors, 'risk') * 20
    return int(round(_clamp(confidence, 35, 95)))



def reason_labels_from_factors(factors: dict[str, Any], mode: str) -> list[str]:
    safe_mode = normalize_ai_pick_mode(mode)
    labels: list[str] = []
    technical = _factor_value(factors, 'technical')
    liquidity = _factor_value(factors, 'liquidity')
    fundamental = _factor_value(factors, 'fundamental')
    catalyst = _factor_value(factors, 'catalyst')
    risk = _factor_value(factors, 'risk')
    volume_ratio = float(factors.get('volume_ratio', 0) or 0)

    mode_priorities = {
        'swing': [
            ((factors.get('trend_ok') or technical >= 0.7), 'tren di atas rata-rata 20 hari'),
            ((volume_ratio >= 1.2), 'volume dorong breakout tetap sehat'),
            ((factors.get('rr_ok') or risk <= 0.3), 'pullback masih memberi risk/reward rapih'),
            ((liquidity >= 0.6), 'likuiditas cukup tebal untuk swing trader'),
            ((catalyst >= 0.65 or factors.get('catalyst_ok')), 'sentimen ikut menguatkan momentum dekat entry'),
        ],
        'defensive': [
            ((factors.get('quality_ok') or fundamental >= 0.7), 'fundamental kuat menopang profil defensif'),
            ((risk <= 0.28), 'drawdown relatif jinak untuk posisi bertahap'),
            ((liquidity >= 0.55), 'likuiditas stabil untuk akumulasi tenang'),
            ((volume_ratio >= 1.0), 'arus volume tetap disiplin tanpa euforia'),
            ((factors.get('trend_ok') or technical >= 0.6), 'tren harga tetap rapi untuk entry defensif'),
        ],
        'catalyst': [
            ((catalyst >= 0.65 or factors.get('catalyst_ok')), 'katalis dekat berpotensi memicu re-rating'),
            ((volume_ratio >= 1.15), 'volume mulai mengonfirmasi respons pelaku pasar'),
            ((factors.get('trend_ok') or technical >= 0.62), 'harga sudah mulai sinkron dengan sentimen'),
            ((risk <= 0.35 or factors.get('rr_ok')), 'risk/reward masih logis jika katalis gagal lanjut'),
            ((liquidity >= 0.55), 'likuiditas memadai bila skenario katalis aktif'),
        ],
    }

    for ok, label in mode_priorities[safe_mode]:
        if ok and label not in labels:
            labels.append(label)
        if len(labels) == 3:
            return labels

    shared_fallbacks = [
        ((technical >= 0.65), 'struktur teknikal masih layak dipantau'),
        ((liquidity >= 0.6), 'likuiditas harian mendukung eksekusi'),
        ((fundamental >= 0.7), 'fundamental tetap memberi bantalan kualitas'),
        ((catalyst >= 0.65), 'sentimen berita belum sepenuhnya dingin'),
        ((risk <= 0.3), 'risiko relatif masih terkontrol'),
    ]
    for ok, label in shared_fallbacks:
        if ok and label not in labels:
            labels.append(label)
        if len(labels) == 3:
            return labels

    if not labels:
        fallback = {
            'swing': 'setup teknikal masih layak dipantau',
            'defensive': 'profil defensif masih terjaga',
            'catalyst': 'kandidat re-rating masih terbuka',
        }
        labels.append(fallback[safe_mode])

    return labels[:3]



def score_pick(factors: dict[str, Any], mode: str, market_tone: str | None = None) -> dict[str, Any]:
    safe_mode = normalize_ai_pick_mode(mode)
    weights = MODE_WEIGHTS[safe_mode]
    technical = _factor_value(factors, 'technical')
    liquidity = _factor_value(factors, 'liquidity')
    fundamental = _factor_value(factors, 'fundamental')
    catalyst = _factor_value(factors, 'catalyst')
    risk = _factor_value(factors, 'risk')

    raw_score = (
        technical * weights['technical']
        + liquidity * weights['liquidity']
        + fundamental * weights['fundamental']
        + catalyst * weights['catalyst']
        + (1 - risk) * weights['risk']
    ) * 100

    tone = str(market_tone or '').strip().lower()
    regime_bonus = 0.0
    if tone == 'bullish':
        if safe_mode == 'swing':
            regime_bonus += technical * 5 + max(0.0, liquidity - 0.5) * 2
        elif safe_mode == 'defensive':
            regime_bonus -= max(0.0, risk - 0.2) * 2
        elif safe_mode == 'catalyst':
            regime_bonus += catalyst * 3
    elif tone == 'defensive':
        if safe_mode == 'defensive':
            regime_bonus += fundamental * 5 + (1 - risk) * 3
        elif safe_mode == 'swing':
            regime_bonus -= max(0.0, technical - 0.55) * 3 + risk * 2
        elif safe_mode == 'catalyst':
            regime_bonus -= risk * 3

    score = round(_clamp(raw_score + regime_bonus, 0, 100), 1)
    return {
        'mode': safe_mode,
        'score': score,
        'confidence': label_confidence(score, factors),
        'fit_label': FIT_LABELS[safe_mode],
        'reason_labels': reason_labels_from_factors(factors, safe_mode),
    }



def _safe_ratio(a: float, b: float) -> float:
    if not b:
        return 0.0
    return a / b



def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn



def summarize_market_context() -> dict[str, Any]:
    with _connect() as conn:
        latest_date = conn.execute('SELECT MAX(date) AS latest_date FROM ohlcv_daily').fetchone()['latest_date']
        if not latest_date:
            return {'tone': 'unknown', 'breadth_label': 'data belum cukup', 'latest_date': None}

        row = conn.execute(
            '''
            WITH latest AS (
              SELECT
                ticker,
                date,
                close,
                LAG(close) OVER (PARTITION BY ticker ORDER BY date) AS prev_close
              FROM ohlcv_daily
            )
            SELECT
              SUM(CASE WHEN prev_close IS NOT NULL AND close > prev_close THEN 1 ELSE 0 END) AS adv,
              SUM(CASE WHEN prev_close IS NOT NULL AND close < prev_close THEN 1 ELSE 0 END) AS dec
            FROM latest
            WHERE date = ?
            ''',
            (latest_date,),
        ).fetchone()

    adv = int(row['adv'] or 0) if row else 0
    dec = int(row['dec'] or 0) if row else 0
    if adv > dec * 1.15:
        tone = 'bullish'
        breadth_label = 'breadth menguat'
    elif dec > adv * 1.15:
        tone = 'defensive'
        breadth_label = 'breadth melemah'
    else:
        tone = 'neutral'
        breadth_label = 'campuran'
    return {'tone': tone, 'breadth_label': breadth_label, 'latest_date': latest_date[:10] if latest_date else None}



def build_candidate_universe(limit_universe: int | None = None, mode: str = 'swing', min_bars: int = 30) -> list[dict[str, Any]]:
    safe_mode = normalize_ai_pick_mode(mode)
    limit = int(limit_universe or 50)
    query = '''
    WITH ranked AS (
      SELECT
        o.ticker,
        o.date,
        o.close,
        o.volume,
        LAG(o.close) OVER (PARTITION BY o.ticker ORDER BY o.date) AS prev_close,
        AVG(o.close) OVER (PARTITION BY o.ticker ORDER BY o.date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) AS sma20,
        AVG(o.volume) OVER (PARTITION BY o.ticker ORDER BY o.date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) AS avg_volume_20,
        ROW_NUMBER() OVER (PARTITION BY o.ticker ORDER BY o.date DESC) AS rn,
        COUNT(*) OVER (PARTITION BY o.ticker) AS bars_count
      FROM ohlcv_daily o
    )
    SELECT
      r.ticker,
      COALESCE(s.name, r.ticker) AS name,
      r.date,
      r.close,
      COALESCE(r.prev_close, r.close) AS prev_close,
      COALESCE(r.sma20, r.close) AS sma20,
      COALESCE(r.avg_volume_20, 0) AS avg_volume_20,
      COALESCE(r.volume, 0) AS volume,
      r.bars_count,
      COALESCE(f.roe, 0) AS roe,
      COALESCE(f.debt_to_equity, 0) AS debt_to_equity,
      COALESCE(f.dividend_yield, 0) AS dividend_yield,
      COALESCE(f.price_to_book, 0) AS price_to_book,
      (
        SELECT COUNT(*) FROM news n
        WHERE UPPER(n.title || ' ' || COALESCE(n.summary, '')) LIKE '%' || UPPER(r.ticker) || '%'
      ) AS catalyst_hits
    FROM ranked r
    LEFT JOIN stocks s ON s.ticker = r.ticker
    LEFT JOIN fundamentals f ON f.ticker = r.ticker
    WHERE r.rn = 1 AND r.bars_count >= ?
    ORDER BY r.avg_volume_20 DESC, r.close DESC
    LIMIT ?
    '''
    with _connect() as conn:
        rows = conn.execute(query, (int(min_bars), limit)).fetchall()

    candidates: list[dict[str, Any]] = []
    for row in rows:
        latest_close = float(row['close'] or 0)
        prev_close = float(row['prev_close'] or latest_close)
        sma20 = float(row['sma20'] or latest_close)
        avg_volume_20 = float(row['avg_volume_20'] or 0)
        volume = float(row['volume'] or 0)
        volume_ratio = _safe_ratio(volume, avg_volume_20) if avg_volume_20 else 0.0
        change_pct = _safe_ratio(latest_close - prev_close, prev_close) if prev_close else 0.0
        distance_from_sma20 = _safe_ratio(latest_close - sma20, sma20) if sma20 else 0.0
        roe = float(row['roe'] or 0)
        debt_to_equity = float(row['debt_to_equity'] or 0)
        dividend_yield = float(row['dividend_yield'] or 0)
        price_to_book = float(row['price_to_book'] or 0)
        catalyst_hits = int(row['catalyst_hits'] or 0)

        factors = {
            'technical': _clamp(0.5 + distance_from_sma20 * 4 + change_pct * 3, 0.0, 1.0),
            'liquidity': _clamp(avg_volume_20 / 2_000_000, 0.0, 1.0),
            'fundamental': _clamp((roe / 20.0) + dividend_yield * 4 + max(0.0, 1 - (price_to_book / 8.0)), 0.0, 1.0),
            'catalyst': _clamp(catalyst_hits / 3.0, 0.0, 1.0),
            'risk': _clamp(abs(distance_from_sma20) * 2 + max(0.0, debt_to_equity / 3.0) + max(0.0, 1.0 - min(volume_ratio, 1.0)), 0.0, 1.0),
            'volume_ratio': round(volume_ratio, 2),
            'trend_ok': latest_close >= sma20,
            'rr_ok': abs(distance_from_sma20) <= 0.12,
            'quality_ok': roe >= 12 and debt_to_equity <= 1.5,
            'catalyst_ok': catalyst_hits > 0,
        }
        candidates.append(
            {
                'ticker': row['ticker'],
                'name': row['name'],
                'latest_date': row['date'],
                'latest_close': latest_close,
                'prev_close': prev_close,
                'avg_volume_20': avg_volume_20,
                'bars_count': int(row['bars_count'] or 0),
                'mode': safe_mode,
                'factors': factors,
            }
        )
    return candidates



def compose_pick_payload(candidate: dict[str, Any], rank: int, mode: str, market_tone: str | None = None) -> dict[str, Any]:
    scored = score_pick(candidate['factors'], mode, market_tone=market_tone)
    latest_close = float(candidate['latest_close'])
    prev_close = float(candidate['prev_close'] or latest_close)
    change_pct = _safe_ratio(latest_close - prev_close, prev_close) * 100 if prev_close else 0.0
    volume_ratio = float(candidate['factors'].get('volume_ratio') or 0.0)
    risk_buffer = max(latest_close * 0.04, 1)
    reward_buffer = max(latest_close * 0.08, 1)
    factor_scores = {
        'technical': round(_factor_value(candidate['factors'], 'technical'), 3),
        'liquidity': round(_factor_value(candidate['factors'], 'liquidity'), 3),
        'fundamental': round(_factor_value(candidate['factors'], 'fundamental'), 3),
        'catalyst': round(_factor_value(candidate['factors'], 'catalyst'), 3),
        'risk': round(_factor_value(candidate['factors'], 'risk'), 3),
    }
    safe_mode = normalize_ai_pick_mode(mode)
    comparison_points = {
        'headline': {
            'swing': 'momentum teknikal paling siap dieksekusi',
            'defensive': 'profil kualitas paling tahan goyangan',
            'catalyst': 'pemicu sentimen paling dekat ke harga',
        }[safe_mode],
        'technical_label': 'tren di atas SMA20' if candidate['factors'].get('trend_ok') else 'tren belum rapi',
        'liquidity_label': 'volume di atas rata-rata' if volume_ratio >= 1.0 else 'volume belum meyakinkan',
        'fundamental_label': 'ROE/debt profile sehat' if candidate['factors'].get('quality_ok') else 'fundamental netral',
        'catalyst_label': 'ada mention katalis/news' if candidate['factors'].get('catalyst_ok') else 'katalis eksplisit tipis',
        'risk_label': 'risiko relatif jinak' if factor_scores['risk'] <= 0.3 else 'invalidasi perlu disiplin ketat',
        'timing_label': 'timing entry masih enak dicicil' if candidate['factors'].get('rr_ok') else 'lebih aman tunggu pullback rapih',
    }
    return {
        'ticker': candidate['ticker'],
        'name': candidate['name'],
        'rank': rank,
        'score': scored['score'],
        'confidence': scored['confidence'],
        'horizon': safe_mode,
        'fit_label': scored['fit_label'],
        'reason_codes': [label.lower().replace('/', '_').replace(' ', '_') for label in scored['reason_labels']],
        'reason_labels': scored['reason_labels'],
        'risk_note': 'perlu disiplin pada area invalidasi' if candidate['factors']['risk'] > 0.55 else 'struktur risiko masih relatif terjaga',
        'entry_style': 'tunggu pullback' if candidate['factors']['technical'] > 0.6 else 'boleh cicil bertahap',
        'entry_zone': round(latest_close),
        'invalidation': round(max(0, latest_close - risk_buffer)),
        'target_zone': round(latest_close + reward_buffer),
        'latest_close': round(latest_close, 2),
        'change_pct': round(change_pct, 2),
        'volume_ratio': round(volume_ratio, 2),
        'bars_count': int(candidate['bars_count'] or 0),
        'factor_scores': factor_scores,
        'comparison_points': comparison_points,
        'catalyst': {
            'available': bool(candidate['factors'].get('catalyst_ok')),
            'label': 'pengumuman emiten tersedia' if candidate['factors'].get('catalyst_ok') else 'katalis eksplisit belum dominan',
        },
        'source': 'derived',
    }



def build_ai_picks_payload(mode: str | None = 'swing', limit: int = 5) -> dict[str, Any]:
    safe_mode = normalize_ai_pick_mode(mode)
    market_context = summarize_market_context()
    candidates = build_candidate_universe(limit_universe=max(int(limit or 5) * 4, 12), mode=safe_mode)
    if not candidates:
        return build_ai_picks_fallback_payload(safe_mode)

    ranked = sorted(
        candidates,
        key=lambda item: score_pick(item['factors'], safe_mode, market_tone=market_context.get('tone'))['score'],
        reverse=True,
    )
    picks = [
        compose_pick_payload(candidate, idx + 1, safe_mode, market_tone=market_context.get('tone'))
        for idx, candidate in enumerate(ranked[: max(0, int(limit or 0))])
    ]
    return {
        'mode': safe_mode,
        'updated_at': candidates[0]['latest_date'],
        'source': 'derived',
        'market_context': market_context,
        'summary': {
            'candidates_analyzed': len(candidates),
            'eligible_count': len(ranked),
            'featured_ticker': picks[0]['ticker'] if picks else None,
        },
        'data': picks,
    }



def build_ai_picks_fallback_payload(mode: str | None = 'swing') -> dict[str, Any]:
    safe_mode = normalize_ai_pick_mode(mode)
    return {
        'mode': safe_mode,
        'updated_at': None,
        'source': 'no_data',
        'market_context': {
            'tone': 'unknown',
            'breadth_label': 'data belum cukup',
            'latest_date': None,
        },
        'summary': {
            'candidates_analyzed': 0,
            'eligible_count': 0,
            'featured_ticker': None,
        },
        'data': [],
    }
