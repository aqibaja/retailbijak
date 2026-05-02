from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

try:
    from database import BrokerSummary, OHLCVDaily, Stock, UserSetting
    from stocks import get_ticker_display
except ModuleNotFoundError:
    from backend.database import BrokerSummary, OHLCVDaily, Stock, UserSetting
    from backend.stocks import get_ticker_display

try:
    from routes.shared_stocks_helpers import _company_name
except ModuleNotFoundError:
    from backend.routes.shared_stocks_helpers import _company_name

try:
    from routes.shared_sqlite_helpers import _sqlite_datetime_literal
except ModuleNotFoundError:
    from backend.routes.shared_sqlite_helpers import _sqlite_datetime_literal


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


def _top_mover_rows(db: Session) -> tuple[Any, list[dict[str, Any]]]:
    latest_date, pairs = _latest_ohlcv_pairs(db)
    if not latest_date or not pairs:
        return latest_date, []

    stocks = {row.ticker: row.name for row in db.query(Stock).all()}
    rows = []
    for row in pairs:
        prev_close = row['prev_close']
        if not prev_close:
            continue
        change_pct = ((row['close_price'] - prev_close) / prev_close) * 100
        ticker = get_ticker_display(row['ticker'])
        rows.append({
            'ticker': ticker,
            'name': stocks.get(ticker) or _company_name(row['ticker']),
            'price': row['close_price'],
            'change_pct': round(change_pct, 2),
            'volume': row.get('volume'),
            'date': latest_date.isoformat() if hasattr(latest_date, 'isoformat') else str(latest_date),
            'source': 'db',
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
            'ticker': get_ticker_display(row['ticker']),
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
