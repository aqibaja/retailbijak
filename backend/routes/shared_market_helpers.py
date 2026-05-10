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

    latest_date_sql = _sqlite_datetime_literal(latest_date)
    sql = text("""
        WITH latest_rows AS (
            SELECT ticker, date, close, volume
            FROM ohlcv_daily
            WHERE date = :latest_date
        ),
        previous_rows AS (
            SELECT curr.ticker AS ticker, MAX(prev.date) AS prev_date
            FROM latest_rows curr
            JOIN ohlcv_daily prev
              ON prev.ticker = curr.ticker
             AND prev.date < :latest_date
            GROUP BY curr.ticker
        )
        SELECT curr.ticker, curr.close AS close_price, curr.volume AS volume, prev.close AS prev_close
        FROM latest_rows curr
        JOIN previous_rows picked ON picked.ticker = curr.ticker
        JOIN ohlcv_daily prev
          ON prev.ticker = picked.ticker
         AND prev.date = picked.prev_date
        WHERE prev.close IS NOT NULL AND curr.close IS NOT NULL
    """)
    return latest_date, db.execute(sql, {'latest_date': latest_date_sql}).mappings().all()


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

    For each ticker, runs a single query to get closes at the specified
    offsets (trading days ago). More efficient than calling
    _historical_close_offset individually for each ticker/offset combo.

    Args:
        db: SQLAlchemy session
        tickers: list of raw ticker symbols
        offsets: list of offsets (e.g. [5, 21, 63, 126])

    Returns:
        dict mapping ticker -> {offset: close_price or None}
    """
    if not tickers or not offsets:
        return {}

    max_offset = max(offsets)
    # Fetch the most recent (max_offset + 1) closes for each ticker
    # to avoid N+1 queries per ticker per offset
    result: dict[str, dict[int, float | None]] = {}
    for ticker in tickers:
        rows = (
            db.query(OHLCVDaily.close)
            .filter(OHLCVDaily.ticker == ticker)
            .order_by(OHLCVDaily.date.desc())
            .limit(max_offset + 1)
            .all()
        )
        closes = [r[0] for r in rows]
        ticker_closes: dict[int, float | None] = {}
        for off in offsets:
            ticker_closes[off] = closes[off] if len(closes) > off else None
        result[ticker] = ticker_closes
    return result


def _batch_historical_closes_date(
    db: Session, tickers: list[str], targets: dict[str, date]
) -> dict[str, dict[str, float | None]]:
    """Batch fetch close prices closest to target dates for many tickers.

    For each ticker and target date label, finds the close price on the
    most recent trading day on or before the target date. This is more
    robust than offset-based lookups for stocks with limited history.

    Args:
        db: SQLAlchemy session
        tickers: list of raw ticker symbols
        targets: dict mapping label -> target date (e.g. {'perf_3m': date_90_days_ago})

    Returns:
        dict mapping ticker -> {label: close_price or None}
    """
    if not tickers or not targets:
        return {}

    result: dict[str, dict[str, float | None]] = {}
    for ticker in tickers:
        ticker_closes: dict[str, float | None] = {}
        for label, target_date in targets.items():
            row = (
                db.query(OHLCVDaily.close)
                .filter(OHLCVDaily.ticker == ticker, OHLCVDaily.date <= target_date)
                .order_by(OHLCVDaily.date.desc())
                .limit(1)
                .first()
            )
            ticker_closes[label] = row[0] if row else None
        result[ticker] = ticker_closes
    return result


def _top_mover_rows(db: Session) -> tuple[Any, list[dict[str, Any]]]:
    latest_date, pairs = _latest_ohlcv_pairs(db)
    if not latest_date or not pairs:
        return latest_date, []

    stocks = {row.ticker: row.name for row in db.query(Stock).all()}

    # Batch-fetch historical closes for multi-timeframe performance
    # Use offset-based lookups for short timeframes (1w, 1m)
    ticker_offsets = [5, 21]
    tickers_raw = [row['ticker'] for row in pairs]
    historical_closes = _batch_historical_closes(db, tickers_raw, ticker_offsets)

    # Use date-based lookups for longer timeframes (3m, 6m)
    # More robust for stocks with limited trading-day history
    date_targets = {
        'perf_3m': latest_date - timedelta(days=90),
        'perf_6m': latest_date - timedelta(days=180),
    }
    date_closes = _batch_historical_closes_date(db, tickers_raw, date_targets)

    rows = []
    for row in pairs:
        prev_close = row['prev_close']
        if not prev_close:
            continue
        change_pct = ((row['close_price'] - prev_close) / prev_close) * 100
        ticker = _display_ticker(row['ticker'])
        ticker_raw = row['ticker']
        close_latest = row['close_price']

        closes = historical_closes.get(ticker_raw, {})
        date_closes_for_ticker = date_closes.get(ticker_raw, {})

        # Compute multi-timeframe performance
        def _perf(close_old: float | None) -> float | None:
            if close_old is not None and close_old != 0:
                return round(((close_latest - close_old) / close_old) * 100, 2)
            return None

        item: dict[str, Any] = {
            'ticker': ticker,
            'name': stocks.get(ticker) or _company_name(row['ticker']),
            'price': close_latest,
            'change_pct': round(change_pct, 2),
            'volume': row.get('volume'),
            'date': latest_date.isoformat() if hasattr(latest_date, 'isoformat') else str(latest_date),
            'source': 'db',
            'perf_1w': _perf(closes.get(5)),
            'perf_1m': _perf(closes.get(21)),
            'perf_3m': _perf(date_closes_for_ticker.get('perf_3m')),
            'perf_6m': _perf(date_closes_for_ticker.get('perf_6m')),
        }
        rows.append(item)
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
