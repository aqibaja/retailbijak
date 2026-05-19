"""
bandarmology.py — Logic analisis bandarmology untuk RetailBijak.

Semua fungsi murni (tidak ada DB session langsung), dipanggil dari endpoint.
Input: list of BrokerSummary rows atau dict, output: dict hasil analisis.
"""

from collections import defaultdict
from typing import List, Dict, Any, Optional

# ── Kode broker yang dikenal sebagai "broker bandar" ──────────────────────────
FOREIGN_BROKERS = {
    'AK': 'UBS Sekuritas',
    'YB': 'J.P. Morgan',
    'YP': 'Mirae Asset',
    'ZP': 'Maybank Sekuritas',
    'YU': 'CGS-CIMB',
    'KZ': 'CLSA',
    'CS': 'Credit Suisse',
    'DP': 'DBS Vickers',
    'GW': 'HSBC',
    'YJ': 'Korea Investment',
    'RX': 'Macquarie',
    'RB': 'Nikko Sekuritas',
    'TP': 'OCBC Sekuritas',
    'DR': 'RHB Sekuritas',
    'AH': 'Shinhan Sekuritas',
    'AI': 'UOB Kay Hian',
    'FS': 'Yuanta Sekuritas',
    'MG': 'Semesta Indovest',
    'XL': 'Mahakarya Artha',
    'XA': 'NH Korindo',
}

LOCAL_BIG_BROKERS = {
    'CC': 'Mandiri Sekuritas',
    'NI': 'BNI Sekuritas',
    'OD': 'BRI Danareksa',
    'SQ': 'BCA Sekuritas',
    'DX': 'Bahana Sekuritas',
    'AZ': 'Sucor Sekuritas',
    'GR': 'Panin Sekuritas',
    'LG': 'Trimegah Sekuritas',
    'DH': 'Sinarmas Sekuritas',
    'PD': 'Indo Premier',
    'KK': 'Phillip Sekuritas',
    'IF': 'Samuel Sekuritas',
    'BQ': 'Kiwoom Sekuritas',
    'EP': 'MNC Sekuritas',
    'RF': 'Buana Capital',
    'ZR': 'Bumiputera Sekuritas',
}

RETAIL_BROKERS = {
    'XC': 'Ajaib Sekuritas',
    'GA': 'BNC Sekuritas',
    'PO': 'Pilarmas Investindo',
    'OK': 'NET Sekuritas',
}

ALL_KNOWN_BROKERS = {**FOREIGN_BROKERS, **LOCAL_BIG_BROKERS, **RETAIL_BROKERS}

# Broker yang sering diasosiasikan dengan "bandar" (smart money)
BANDAR_BROKERS = {'AK', 'YB', 'YP', 'ZP', 'YU', 'KZ', 'CS', 'DP', 'GW', 'RX', 'CC', 'SQ', 'OD'}


def get_broker_name(code: str) -> str:
    """Kembalikan nama broker dari kode, fallback ke kode itu sendiri."""
    return ALL_KNOWN_BROKERS.get(code, code)


def get_broker_type(code: str) -> str:
    """Kembalikan tipe broker: 'foreign', 'local_big', 'retail', 'unknown'."""
    if code in FOREIGN_BROKERS:
        return 'foreign'
    if code in LOCAL_BIG_BROKERS:
        return 'local_big'
    if code in RETAIL_BROKERS:
        return 'retail'
    return 'unknown'


def rows_to_dicts(rows) -> List[Dict]:
    """Convert SQLAlchemy rows ke list of dict."""
    result = []
    for r in rows:
        result.append({
            'ticker': r.ticker,
            'date': r.date.isoformat() if hasattr(r.date, 'isoformat') else str(r.date),
            'broker_code': r.broker_code,
            'buy_volume': r.buy_volume or 0,
            'sell_volume': r.sell_volume or 0,
            'net_volume': r.net_volume or 0,
            'buy_value': r.buy_value or 0.0,
            'sell_value': r.sell_value or 0.0,
            'net_value': r.net_value or 0.0,
            'buy_freq': r.buy_freq,
            'sell_freq': r.sell_freq,
            'buy_avg': r.buy_avg,
            'sell_avg': r.sell_avg,
            'source': getattr(r, 'source', 'synthetic') or 'synthetic',
        })
    return result


def group_by_broker(rows: List[Dict]) -> Dict[str, List[Dict]]:
    """Group rows by broker_code, sorted by date asc."""
    grouped = defaultdict(list)
    for r in rows:
        grouped[r['broker_code']].append(r)
    # Sort each broker's rows by date
    for code in grouped:
        grouped[code].sort(key=lambda x: x['date'])
    return dict(grouped)


def group_by_date(rows: List[Dict]) -> Dict[str, List[Dict]]:
    """Group rows by date string."""
    grouped = defaultdict(list)
    for r in rows:
        date_key = r['date'][:10]  # YYYY-MM-DD
        grouped[date_key].append(r)
    return dict(grouped)


# ── Analisis Utama ─────────────────────────────────────────────────────────────

def calc_broker_streaks(rows: List[Dict]) -> List[Dict]:
    """
    Hitung streak net buy/sell berturut-turut per broker.
    Returns list of { broker_code, broker_name, broker_type,
                       streak_days, direction, total_net_volume, total_net_value,
                       is_bandar }
    sorted by abs(total_net_value) desc.
    """
    grouped = group_by_broker(rows)
    result = []

    for code, broker_rows in grouped.items():
        # Aggregate per date
        by_date = defaultdict(lambda: {'net_volume': 0, 'net_value': 0.0,
                                        'buy_volume': 0, 'sell_volume': 0,
                                        'buy_value': 0.0, 'sell_value': 0.0,
                                        'buy_freq': 0, 'sell_freq': 0,
                                        'buy_avg': None, 'sell_avg': None})
        for r in broker_rows:
            d = r['date'][:10]
            by_date[d]['net_volume'] += r['net_volume']
            by_date[d]['net_value'] += r['net_value']
            by_date[d]['buy_volume'] += r['buy_volume']
            by_date[d]['sell_volume'] += r['sell_volume']
            by_date[d]['buy_value'] += r['buy_value']
            by_date[d]['sell_value'] += r['sell_value']
            if r.get('buy_freq'):
                by_date[d]['buy_freq'] += r['buy_freq']
            if r.get('sell_freq'):
                by_date[d]['sell_freq'] += r['sell_freq']
            if r.get('buy_avg'):
                by_date[d]['buy_avg'] = r['buy_avg']
            if r.get('sell_avg'):
                by_date[d]['sell_avg'] = r['sell_avg']

        dates = sorted(by_date.keys())
        total_net_volume = sum(by_date[d]['net_volume'] for d in dates)
        total_net_value = sum(by_date[d]['net_value'] for d in dates)

        # Hitung streak dari hari terakhir ke belakang
        streak = 0
        direction = 'neutral'
        if dates:
            last_dir = 'buy' if by_date[dates[-1]]['net_volume'] > 0 else 'sell' if by_date[dates[-1]]['net_volume'] < 0 else 'neutral'
            direction = last_dir
            for d in reversed(dates):
                day_dir = 'buy' if by_date[d]['net_volume'] > 0 else 'sell' if by_date[d]['net_volume'] < 0 else 'neutral'
                if day_dir == last_dir and last_dir != 'neutral':
                    streak += 1
                else:
                    break

        result.append({
            'broker_code': code,
            'broker_name': get_broker_name(code),
            'broker_type': get_broker_type(code),
            'is_bandar': code in BANDAR_BROKERS,
            'streak_days': streak,
            'direction': direction,
            'total_net_volume': total_net_volume,
            'total_net_value': total_net_value,
            'daily': [
                {
                    'date': d,
                    'net_volume': by_date[d]['net_volume'],
                    'net_value': by_date[d]['net_value'],
                    'buy_volume': by_date[d]['buy_volume'],
                    'sell_volume': by_date[d]['sell_volume'],
                    'buy_value': by_date[d]['buy_value'],
                    'sell_value': by_date[d]['sell_value'],
                    'buy_freq': by_date[d]['buy_freq'],
                    'sell_freq': by_date[d]['sell_freq'],
                    'buy_avg': by_date[d]['buy_avg'],
                    'sell_avg': by_date[d]['sell_avg'],
                }
                for d in dates
            ],
        })

    # Sort by abs(total_net_value) desc
    result.sort(key=lambda x: abs(x['total_net_value']), reverse=True)
    return result


def detect_phase(broker_streaks: List[Dict], min_days: int = 3) -> Dict:
    """
    Deteksi fase akumulasi/distribusi dari broker streaks.

    Logic:
    - Hitung total net_value dari broker bandar (is_bandar=True)
    - Jika net_value positif + ada streak buy >= min_days → AKUMULASI
    - Jika net_value negatif + ada streak sell >= min_days → DISTRIBUSI
    - Selainnya → NETRAL

    Returns: { phase, label_id, confidence, streak_days, dominant_brokers, description }
    """
    bandar_rows = [b for b in broker_streaks if b['is_bandar']]
    all_rows = broker_streaks

    if not all_rows:
        return {
            'phase': 'neutral',
            'label_id': 'neutral',
            'confidence': 0,
            'streak_days': 0,
            'dominant_brokers': [],
            'description': 'Tidak ada data broker.',
        }

    # Total net value semua broker
    total_net_value = sum(b['total_net_value'] for b in all_rows)
    bandar_net_value = sum(b['total_net_value'] for b in bandar_rows)

    # Broker dengan streak terpanjang
    buy_streaks = [b for b in all_rows if b['direction'] == 'buy' and b['streak_days'] >= min_days]
    sell_streaks = [b for b in all_rows if b['direction'] == 'sell' and b['streak_days'] >= min_days]

    max_buy_streak = max((b['streak_days'] for b in buy_streaks), default=0)
    max_sell_streak = max((b['streak_days'] for b in sell_streaks), default=0)

    # Dominant brokers (top 3 by abs net value)
    dominant = sorted(all_rows, key=lambda x: abs(x['total_net_value']), reverse=True)[:3]
    dominant_brokers = [
        {
            'code': b['broker_code'],
            'name': b['broker_name'],
            'type': b['broker_type'],
            'net_value': b['total_net_value'],
            'streak_days': b['streak_days'],
            'direction': b['direction'],
        }
        for b in dominant
    ]

    # Hitung confidence (0-100)
    # Faktor: streak length, bandar involvement, net value direction consistency
    def calc_confidence(streak, net_val, total_val):
        streak_score = min(streak / 5.0, 1.0) * 40  # max 40 poin dari streak
        bandar_score = min(abs(net_val) / max(abs(total_val), 1), 1.0) * 40  # max 40 poin dari bandar dominance
        consistency_score = 20 if (net_val > 0 and total_val > 0) or (net_val < 0 and total_val < 0) else 0
        return int(streak_score + bandar_score + consistency_score)

    # Tentukan fase
    if total_net_value > 0 and max_buy_streak >= min_days:
        confidence = calc_confidence(max_buy_streak, bandar_net_value, total_net_value)
        return {
            'phase': 'accumulation',
            'label_id': 'accumulation',
            'confidence': confidence,
            'streak_days': max_buy_streak,
            'dominant_brokers': dominant_brokers,
            'description': f'Broker dominan net buy {max_buy_streak} hari berturut-turut. Modal masuk secara konsisten.',
        }
    elif total_net_value < 0 and max_sell_streak >= min_days:
        confidence = calc_confidence(max_sell_streak, bandar_net_value, total_net_value)
        return {
            'phase': 'distribution',
            'label_id': 'distribution',
            'confidence': confidence,
            'streak_days': max_sell_streak,
            'dominant_brokers': dominant_brokers,
            'description': f'Broker dominan net sell {max_sell_streak} hari berturut-turut. Modal keluar secara konsisten.',
        }
    else:
        # Netral tapi ada sinyal lemah
        weak_phase = 'accumulation' if total_net_value > 0 else 'distribution' if total_net_value < 0 else 'neutral'
        weak_streak = max(max_buy_streak, max_sell_streak)
        return {
            'phase': 'neutral',
            'label_id': 'neutral',
            'confidence': min(weak_streak * 10, 40),
            'streak_days': weak_streak,
            'dominant_brokers': dominant_brokers,
            'description': 'Aktivitas broker tidak konsisten. Belum ada sinyal akumulasi/distribusi yang jelas.',
        }


def calc_foreign_domestic_flow(rows: List[Dict]) -> Dict:
    """
    Hitung foreign vs domestic flow dari rows.
    Asumsi: rows sudah difilter per investor type, atau gunakan broker_type.

    Returns: { foreign_net_value, domestic_net_value, foreign_net_volume,
                domestic_net_volume, direction, confluence, description }
    """
    foreign_net_value = 0.0
    foreign_net_volume = 0
    domestic_net_value = 0.0
    domestic_net_volume = 0

    for r in rows:
        code = r['broker_code']
        btype = get_broker_type(code)
        if btype == 'foreign':
            foreign_net_value += r['net_value']
            foreign_net_volume += r['net_volume']
        else:
            domestic_net_value += r['net_value']
            domestic_net_volume += r['net_volume']

    foreign_dir = 'inflow' if foreign_net_value > 0 else 'outflow' if foreign_net_value < 0 else 'neutral'
    domestic_dir = 'inflow' if domestic_net_value > 0 else 'outflow' if domestic_net_value < 0 else 'neutral'

    # Confluence: asing dan lokal searah
    confluence = (foreign_dir == domestic_dir) and foreign_dir != 'neutral'
    confluence_type = 'bullish' if confluence and foreign_dir == 'inflow' else \
                      'bearish' if confluence and foreign_dir == 'outflow' else \
                      'divergence'

    if confluence_type == 'bullish':
        description = 'Asing & lokal sama-sama net buy — sinyal bullish kuat.'
    elif confluence_type == 'bearish':
        description = 'Asing & lokal sama-sama net sell — sinyal bearish kuat.'
    else:
        description = 'Asing dan lokal bergerak berlawanan — perlu hati-hati.'

    return {
        'foreign_net_value': foreign_net_value,
        'foreign_net_volume': foreign_net_volume,
        'foreign_direction': foreign_dir,
        'domestic_net_value': domestic_net_value,
        'domestic_net_volume': domestic_net_volume,
        'domestic_direction': domestic_dir,
        'confluence': confluence,
        'confluence_type': confluence_type,
        'description': description,
    }


def calc_volume_spike(ticker: str, db) -> Dict:
    """
    Bandingkan volume terbaru vs MA20 dari ohlcv_daily.
    Returns: { latest_volume, ma20_volume, spike_ratio, level, description }
    """
    try:
        from database import OHLCVDaily
        from sqlalchemy import desc

        rows = (
            db.query(OHLCVDaily)
            .filter(OHLCVDaily.ticker == ticker)
            .order_by(desc(OHLCVDaily.date))
            .limit(21)
            .all()
        )

        if not rows:
            return {'latest_volume': 0, 'ma20_volume': 0, 'spike_ratio': 1.0, 'level': 'normal', 'description': 'Tidak ada data volume.'}

        latest_volume = rows[0].volume or 0
        past_volumes = [r.volume for r in rows[1:] if r.volume]
        ma20 = sum(past_volumes) / len(past_volumes) if past_volumes else latest_volume

        spike_ratio = round(latest_volume / ma20, 2) if ma20 > 0 else 1.0

        if spike_ratio >= 5.0:
            level = 'extreme'
            description = f'Volume {spike_ratio}x rata-rata — aktivitas bandar sangat tinggi!'
        elif spike_ratio >= 2.0:
            level = 'alert'
            description = f'Volume {spike_ratio}x rata-rata — perhatikan pergerakan bandar.'
        elif spike_ratio >= 1.5:
            level = 'watch'
            description = f'Volume {spike_ratio}x rata-rata — sedikit di atas normal.'
        else:
            level = 'normal'
            description = f'Volume {spike_ratio}x rata-rata — aktivitas normal.'

        return {
            'latest_volume': latest_volume,
            'ma20_volume': int(ma20),
            'spike_ratio': spike_ratio,
            'level': level,
            'description': description,
        }
    except Exception as e:
        return {'latest_volume': 0, 'ma20_volume': 0, 'spike_ratio': 1.0, 'level': 'normal', 'description': str(e)}


def calc_broker_concentration(rows: List[Dict]) -> Dict:
    """
    Hitung seberapa terkonsentrasi volume di top-3 broker.
    Returns: { top3_pct, total_volume, top3_volume, is_concentrated, description }
    """
    by_broker = defaultdict(int)
    for r in rows:
        by_broker[r['broker_code']] += abs(r['net_volume'])

    if not by_broker:
        return {'top3_pct': 0, 'total_volume': 0, 'top3_volume': 0, 'is_concentrated': False, 'description': 'Tidak ada data.'}

    sorted_brokers = sorted(by_broker.items(), key=lambda x: x[1], reverse=True)
    total_volume = sum(v for _, v in sorted_brokers)
    top3_volume = sum(v for _, v in sorted_brokers[:3])
    top3_pct = round(top3_volume / total_volume * 100, 1) if total_volume > 0 else 0

    is_concentrated = top3_pct >= 60

    if top3_pct >= 80:
        description = f'Top 3 broker menguasai {top3_pct}% volume — sangat terkonsentrasi, jejak bandar jelas.'
    elif top3_pct >= 60:
        description = f'Top 3 broker menguasai {top3_pct}% volume — terkonsentrasi, kemungkinan ada bandar aktif.'
    else:
        description = f'Top 3 broker menguasai {top3_pct}% volume — tersebar, pasar lebih natural.'

    return {
        'top3_pct': top3_pct,
        'total_volume': total_volume,
        'top3_volume': top3_volume,
        'is_concentrated': is_concentrated,
        'description': description,
        'top_brokers': [{'code': c, 'volume': v, 'name': get_broker_name(c)} for c, v in sorted_brokers[:5]],
    }


def full_analysis(ticker: str, rows: List[Dict], db=None) -> Dict:
    """
    Jalankan semua analisis bandarmology untuk satu ticker.
    Returns dict lengkap siap di-serialize ke JSON.
    """
    if not rows:
        return {
            'ticker': ticker,
            'has_data': False,
            'source': 'none',
            'phase': {'phase': 'neutral', 'label_id': 'neutral', 'confidence': 0, 'streak_days': 0, 'dominant_brokers': [], 'description': 'Tidak ada data broker summary.'},
            'foreign_domestic_flow': None,
            'volume_spike': None,
            'broker_concentration': None,
            'broker_streaks': [],
            'top_brokers': [],
        }

    source = rows[0].get('source', 'synthetic') if rows else 'synthetic'
    has_real = any(r.get('source') == 'real' for r in rows)

    broker_streaks = calc_broker_streaks(rows)
    phase = detect_phase(broker_streaks)
    flow = calc_foreign_domestic_flow(rows)
    concentration = calc_broker_concentration(rows)
    spike = calc_volume_spike(ticker, db) if db else None

    return {
        'ticker': ticker,
        'has_data': True,
        'source': 'real' if has_real else 'synthetic',
        'phase': phase,
        'foreign_domestic_flow': flow,
        'volume_spike': spike,
        'broker_concentration': concentration,
        'broker_streaks': broker_streaks[:10],  # top 10
        'top_brokers': broker_streaks[:10],
    }
