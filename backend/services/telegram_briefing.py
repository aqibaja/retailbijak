"""
Telegram Daily Briefing — auto-send market briefing via Telegram Bot.
Reads latest MarketBriefing from DB, sends formatted message.
Scheduled: Mon-Fri 17:00 WIB (after briefing generation at 16:30).
"""
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

try:
    from database import MarketBriefing, get_db
except ModuleNotFoundError:
    from backend.database import MarketBriefing, get_db


def _get_bot_token(db_session) -> str | None:
    try:
        from database import UserSetting
    except ModuleNotFoundError:
        from backend.database import UserSetting
    row = db_session.query(UserSetting).filter(UserSetting.key == 'telegram_bot_token').first()
    if not row or not row.value:
        return None
    return row.value.strip()


def _get_chat_id(db_session) -> str | None:
    try:
        from database import UserSetting
    except ModuleNotFoundError:
        from backend.database import UserSetting
    row = db_session.query(UserSetting).filter(UserSetting.key == 'telegram_chat_id').first()
    if not row or not row.value:
        return None
    return row.value.strip()


def send_daily_briefing(db_session=None) -> dict:
    """Send latest market briefing via Telegram. Returns dict with ok/error."""
    from services.telegram_bot import send_telegram_message

    if db_session is None:
        db_session = next(get_db())

    # Get latest briefing
    latest = (
        db_session.query(MarketBriefing)
        .order_by(MarketBriefing.generated_at.desc())
        .first()
    )
    if not latest or not latest.content:
        logger.warning("No market briefing found to send via Telegram")
        return {'ok': False, 'error': 'No briefing available'}

    # Format message
    sentiment_emoji = {
        'bullish': '🟢',
        'bearish': '🔴',
        'neutral': '⚪',
    }
    sentiment = latest.sentiment or 'neutral'
    emoji = sentiment_emoji.get(sentiment, '⚪')

    header = f"📊 <b>Daily Market Briefing</b>\n"
    header += f"📅 <i>{latest.trading_date}</i>\n"
    header += f"{emoji} Sentimen: <b>{sentiment.upper()}</b>\n\n"

    body = latest.content[:3500]  # Leave room for header/footer

    footer = "\n\n—"
    footer += "\n🔗 retailbijak.rich27.my.id"

    full_text = header + body + footer

    # Truncate to Telegram's 4096 char limit
    if len(full_text) > 4096:
        full_text = full_text[:4090] + '\n\n...'

    # Send
    bot_token = _get_bot_token(db_session)
    chat_id = _get_chat_id(db_session)

    if not bot_token or not chat_id:
        logger.warning("Telegram not configured — cannot send briefing")
        return {'ok': False, 'error': 'Telegram not configured'}

    result = send_telegram_message(
        chat_id=chat_id,
        text=full_text,
        bot_token=bot_token,
    )

    if result.get('ok'):
        logger.info("Daily briefing sent via Telegram for %s", latest.trading_date)
    else:
        logger.warning("Failed to send briefing via Telegram: %s", result.get('error'))

    return result


def run_briefing_job():
    """Wrapper for APScheduler — creates its own DB session."""
    try:
        from database import get_db as _get_db_ctx
        db = next(_get_db_ctx())
        result = send_daily_briefing(db_session=db)
        db.close()
        logger.info("Telegram briefing job result: %s", result.get('ok'))
    except Exception as e:
        logger.exception("Telegram briefing job failed: %s", e)
