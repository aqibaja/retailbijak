from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from database import BrokerSummary, OHLCVDaily, Stock, UserSetting
from routes.shared_stocks_helpers import _company_name, _display_ticker
from routes.shared_sqlite_helpers import _sqlite_datetime_literal
def _latest_ohlcv_snapshot(db: Session) -> tuple[Any, list[OHLCVDaily]]:
    latest_date_row = db.query(OHLCVDaily.date).order_by(OHLCVDaily.date.desc()).first()
    if not latest_date_row or not latest_date_row[0]:
        return None, []
    latest_date = latest_date_row[0]
    rows = db.query(OHLCVDaily).filter(OHLCVDaily.date == latest_date).all()
    return latest_date, rows


def _latest_ohlcv_pairs(db: Session) -> tuple[Any, list[dict[str, Any]]]:
    latest_date, _ = _latest_ohlcv_snapshot(db)
    if not latest_date:
        return None, []

    sql = text("""
        WITH top2_dates AS (
            SELECT date FROM ohlcv_daily
            GROUP BY date ORDER BY date DESC LIMIT 2
        ),
        ranked AS (
            SELECT ticker, date, close, volume,
                   ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY date DESC) AS rn
            FROM ohlcv_daily
            WHERE date IN (SELECT date FROM top2_dates)
              AND close IS NOT NULL
        )
        SELECT
            a.ticker,
            a.close AS close_price,
            a.volume,
            b.close AS prev_close
        FROM ranked a
        LEFT JOIN ranked b ON b.ticker = a.ticker AND b.rn = 2
        WHERE a.rn = 1 AND b.close IS NOT NULL
    """)
    rows = db.execute(sql).mappings().all()
    return latest_date, rows


def _historical_close_offset(db: Session, ticker: str, offset: int) -> float | None:
    """Get close price N trading days before the most recent date for a ticker.

    Uses SQL ORDER BY date DESC LIMIT 1 OFFSET N to fetch the close
    price from N trading days ago.

    Args:
        db: SQLAlchemy session
        ticker: raw ticker symbol
        offset: number of trading days to look back (0 = latest, 5 = 1 week ago)

    Returns:
        close price as float, or None if not enough historical data
    """
    row = (
        db.query(OHLCVDaily.close)
        .filter(OHLCVDaily.ticker == ticker)
        .order_by(OHLCVDaily.date.desc())
        .offset(offset)
        .limit(1)
        .first()
    )
    return row[0] if row else None


def _batch_historical_closes(
    db: Session, tickers: list[str], offsets: list[int]
) -> dict[str, dict[int, float | None]]:
    """Batch fetch historical close prices at multiple offsets for many tickers.

    Uses a single bulk SQL query with ROW_NUMBER() to rank rows per ticker,
    then picks the rows at the requested offsets. O(1) queries regardless
    of ticker count.

    Args:
        db: SQLAlchemy session
        tickers: list of raw ticker symbols
        offsets: list of offsets (e.g. [5, 21])

    Returns:
        dict mapping ticker -> {offset: close_price or None}
    """
    if not tickers or not offsets:
        return {}

    max_offset = max(offsets)
    from sqlalchemy import bindparam
    sql = text("""
        SELECT ticker, close, rn
        FROM (
            SELECT ticker, close,
                   ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY date DESC) - 1 AS rn
            FROM ohlcv_daily
            WHERE ticker IN :tickers
        ) ranked
        WHERE rn <= :max_offset
    """).bindparams(bindparam('tickers', expanding=True))
    rows = db.execute(sql, {'tickers': list(tickers), 'max_offset': max_offset}).fetchall()

    # Build result dict
    raw: dict[str, dict[int, float | None]] = {t: {} for t in tickers}
    for ticker, close, rn in rows:
        raw[ticker][int(rn)] = close

    result: dict[str, dict[int, float | None]] = {}
    for ticker in tickers:
        ticker_closes: dict[int, float | None] = {}
        for off in offsets:
            ticker_closes[off] = raw[ticker].get(off)
        result[ticker] = ticker_closes
    return result


def _batch_historical_closes_date(
    db: Session, tickers: list[str], targets: dict[str, date]
) -> dict[str, dict[str, float | None]]:
    """Batch fetch close prices closest to target dates for many tickers.

    Uses one bulk query per target date (not per ticker), so O(len(targets))
    queries instead of O(len(tickers) * len(targets)).

    Args:
        db: SQLAlchemy session
        tickers: list of raw ticker symbols
        targets: dict mapping label -> target date (e.g. {'perf_3m': date_90_days_ago})

    Returns:
        dict mapping ticker -> {label: close_price or None}
    """
    if not tickers or not targets:
        return {}

    result: dict[str, dict[str, float | None]] = {t: {} for t in tickers}

    from sqlalchemy import bindparam
    for label, target_date in targets.items():
        td_str = target_date.isoformat() if hasattr(target_date, 'isoformat') else str(target_date)
        sql = text("""
            SELECT ticker, close
            FROM (
                SELECT ticker, close,
                       ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY date DESC) AS rn
                FROM ohlcv_daily
                WHERE ticker IN :tickers AND date <= :target_date
            ) ranked
            WHERE rn = 1
        """).bindparams(bindparam('tickers', expanding=True))
        rows = db.execute(sql, {'tickers': list(tickers), 'target_date': td_str}).fetchall()
        for ticker, close in rows:
            result[ticker][label] = close

    return result


def _top_mover_rows(db: Session, top_n: int = 20) -> tuple[Any, list[dict[str, Any]]]:
    """Return top movers with multi-timeframe performance.

    Two-phase approach for performance:
    1. Compute change_pct for all tickers (fast — uses _latest_ohlcv_pairs)
    2. Fetch historical closes only for top_n gainers + top_n losers
    """
    latest_date, pairs = _latest_ohlcv_pairs(db)
    if not latest_date or not pairs:
        return latest_date, []

    stocks = {row.ticker: row.name for row in db.query(Stock).all()}

    # Phase 1: compute change_pct for all tickers cheaply
    candidates = []
    for row in pairs:
        prev_close = row['prev_close']
        if not prev_close:
            continue
        change_pct = ((row['close_price'] - prev_close) / prev_close) * 100
        candidates.append({
            'ticker_raw': row['ticker'],
            'ticker': _display_ticker(row['ticker']),
            'close_price': row['close_price'],
            'volume': row.get('volume'),
            'change_pct': round(change_pct, 2),
        })

    # Phase 2: pick top_n gainers + top_n losers only
    candidates.sort(key=lambda x: x['change_pct'], reverse=True)
    top_tickers_raw = [c['ticker_raw'] for c in candidates[:top_n]]
    bottom_tickers_raw = [c['ticker_raw'] for c in candidates[-top_n:]]
    selected_raw = list(dict.fromkeys(top_tickers_raw + bottom_tickers_raw))  # dedup, preserve order

    # Fetch historical closes only for selected tickers
    historical_closes = _batch_historical_closes(db, selected_raw, [5, 21])
    date_targets = {
        'perf_3m': latest_date - timedelta(days=90),
        'perf_6m': latest_date - timedelta(days=180),
    }
    date_closes = _batch_historical_closes_date(db, selected_raw, date_targets)

    rows = []
    for c in candidates:
        ticker_raw = c['ticker_raw']
        if ticker_raw not in selected_raw:
            continue
        close_latest = c['close_price']
        closes = historical_closes.get(ticker_raw, {})
        date_closes_for_ticker = date_closes.get(ticker_raw, {})

        def _perf(close_old: float | None) -> float | None:
            if close_old is not None and close_old != 0:
                return round(((close_latest - close_old) / close_old) * 100, 2)
            return None

        rows.append({
            'ticker': c['ticker'],
            'name': stocks.get(c['ticker']) or stocks.get(ticker_raw) or _company_name(ticker_raw),
            'price': close_latest,
            'change_pct': c['change_pct'],
            'volume': c['volume'],
            'date': latest_date.isoformat() if hasattr(latest_date, 'isoformat') else str(latest_date),
            'source': 'db',
            'perf_1w': _perf(closes.get(5)),
            'perf_1m': _perf(closes.get(21)),
            'perf_3m': _perf(date_closes_for_ticker.get('perf_3m')),
            'perf_6m': _perf(date_closes_for_ticker.get('perf_6m')),
        })
    return latest_date, rows


def _derived_broker_activity_rows(db: Session) -> tuple[Any, list[dict[str, Any]]]:
    latest_date, pairs = _latest_ohlcv_pairs(db)
    if not latest_date or not pairs:
        return latest_date, []

    rows = []
    for index, row in enumerate(sorted(pairs, key=lambda item: float(item.get('volume') or 0), reverse=True)):
        close_price = float(row.get('close_price') or 0)
        volume = float(row.get('volume') or 0)
        prev_close = float(row.get('prev_close') or 0)
        if close_price <= 0 or volume <= 0:
            continue
        net_ratio = 0.08 if close_price >= prev_close else -0.08
        gross_value = close_price * volume
        net_value = round(gross_value * net_ratio, 2)
        buy_value = round((gross_value / 2) + max(net_value, 0), 2)
        sell_value = round(gross_value - buy_value, 2)
        rows.append({
            'ticker': _display_ticker(row['ticker']),
            'broker_code': f'DRV{index + 1:02d}',
            'buy_volume': int(volume * (0.54 if net_value >= 0 else 0.46)),
            'sell_volume': int(volume * (0.46 if net_value >= 0 else 0.54)),
            'net_volume': int(volume * (0.08 if net_value >= 0 else -0.08)),
            'buy_value': buy_value,
            'sell_value': sell_value,
            'net_value': net_value,
            'date': latest_date.isoformat() if hasattr(latest_date, 'isoformat') else str(latest_date),
            'source': 'derived',
        })
    return latest_date, rows
