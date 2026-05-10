"""
Screener Auto-Run Service — evaluates saved screeners against current market data
and triggers notifications (Telegram + browser push) when conditions match.

Scheduled: Mon-Fri 9:00-15:00 every 60 minutes.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

try:
    from database import SavedScreener, Stock, OHLCVDaily, Fundamental, get_db, UserSetting
except ModuleNotFoundError:
    from backend.database import SavedScreener, Stock, OHLCVDaily, Fundamental, get_db, UserSetting


# ─── Filter evaluation ───────────────────────────────────


def _eval_filter_condition(value: float | None, operator: str, target: float) -> bool:
    """Evaluate a single filter condition."""
    if value is None:
        return False
    ops = {
        'gt': lambda v, t: v > t,
        'gte': lambda v, t: v >= t,
        'lt': lambda v, t: v < t,
        'lte': lambda v, t: v <= t,
        'eq': lambda v, t: abs(v - t) < 0.001,
    }
    fn = ops.get(operator)
    if not fn:
        return False
    return fn(value, target)


def _get_stock_value(ticker: str, field: str, db_session) -> float | None:
    """Get a stock's value for a given filter field."""
    if field in ('close', 'volume', 'change', 'change_pct'):
        latest = (
            db_session.query(OHLCVDaily)
            .filter(OHLCVDaily.ticker == ticker)
            .order_by(OHLCVDaily.date.desc())
            .first()
        )
        if not latest:
            return None
        return getattr(latest, field, None)

    if field in ('trailing_pe', 'price_to_book', 'dividend_yield', 'roe', 'debt_to_equity', 'market_cap'):
        if field == 'market_cap':
            stock = db_session.query(Stock).filter(Stock.ticker == ticker).first()
            return stock.market_cap if stock else None
        fund = db_session.query(Fundamental).filter(Fundamental.ticker == ticker).first()
        return getattr(fund, field, None) if fund else None

    return None


def evaluate_screener(screener: SavedScreener, db_session) -> dict:
    """
    Evaluate a saved screener against current market data.
    Returns dict with matched tickers and count.
    """
    try:
        filters = json.loads(screener.filters_json or '{}')
    except (json.JSONDecodeError, TypeError):
        filters = {}

    if not filters:
        return {'tickers': [], 'count': 0}

    # Get all tickers with OHLCV data
    tickers = [
        r.ticker for r in db_session.query(OHLCVDaily.ticker)
        .distinct()
        .limit(500)
        .all()
    ]

    matched = []
    for ticker in tickers:
        match = True
        conditions = 0
        for field, condition in filters.items():
            if not isinstance(condition, dict):
                continue
            operator = condition.get('op', 'gt')
            target = condition.get('value')
            if target is None:
                continue
            conditions += 1
            value = _get_stock_value(ticker, field, db_session)
            if not _eval_filter_condition(value, operator, target):
                match = False
                break

        if match and conditions > 0:
            matched.append(ticker)

    return {'tickers': matched, 'count': len(matched)}


# ─── Notification ────────────────────────────────────────


def _send_telegram_notification(screener_name: str, matched_count: int, tickers: list[str]) -> None:
    """Send notification about screener match via Telegram."""
    from services.telegram_bot import send_telegram_message

    try:
        db = next(get_db())
        bot_token_row = db.query(UserSetting).filter(UserSetting.key == 'telegram_bot_token').first()
        chat_id_row = db.query(UserSetting).filter(UserSetting.key == 'telegram_chat_id').first()

        if not bot_token_row or not chat_id_row or not bot_token_row.value or not chat_id_row.value:
            db.close()
            return

        ticker_list = ', '.join(tickers[:10])
        if len(tickers) > 10:
            ticker_list += f' … +{len(tickers) - 10} lagi'

        text = (
            f"🔍 <b>Screener Match!</b>\n"
            f"📋 <b>{screener_name}</b>\n"
            f"🎯 {matched_count} saham cocok\n\n"
            f"<code>{ticker_list}</code>\n\n"
            f"—\nretailbijak.rich27.my.id"
        )

        result = send_telegram_message(
            chat_id=chat_id_row.value.strip(),
            text=text,
            bot_token=bot_token_row.value.strip(),
        )
        logger.info("Screener auto-run notification sent: %s", result.get('ok'))
        db.close()
    except Exception as e:
        logger.exception("Failed to send screener notification: %s", e)


# ─── Main runner ─────────────────────────────────────────


def run_screener_auto_check() -> dict:
    """Evaluate all active saved screeners and send notifications for new matches."""
    db = next(get_db())

    try:
        screeners = db.query(SavedScreener).filter(SavedScreener.active == 1).all()
        if not screeners:
            logger.info("No active saved screeners to evaluate")
            return {'ok': True, 'evaluated': 0, 'matches': 0}

        total_evaluated = 0
        total_matches = 0
        notified = 0

        for screener in screeners:
            result = evaluate_screener(screener, db)
            total_evaluated += 1

            if result['count'] > 0:
                total_matches += 1
                # Update match count
                screener.match_count = result['count']
                screener.updated_at = datetime.utcnow()

                # Send notification
                _send_telegram_notification(
                    screener_name=screener.name,
                    matched_count=result['count'],
                    tickers=result['tickers'],
                )
                notified += 1

        db.commit()
        logger.info(
            "Screener auto-check: %d screeners, %d matches, %d notified",
            total_evaluated, total_matches, notified,
        )
        return {
            'ok': True,
            'evaluated': total_evaluated,
            'matches': total_matches,
            'notified': notified,
        }

    except Exception as e:
        logger.exception("Screener auto-check failed: %s", e)
        db.rollback()
        return {'ok': False, 'error': str(e)}
    finally:
        db.close()
