"""
Telegram Bot Service — send alert messages via Telegram Bot API.

Bot token and chat ID are stored in the UserSetting table (key-value).
Rate-limited to max 20 messages/minute per Telegram API limits.
"""
import logging
from datetime import datetime, timedelta

try:
    import httpx
except ImportError:
    httpx = None

logger = logging.getLogger(__name__)

# ─── Rate Limiting ─────────────────────────────────────
_last_message_times: list[datetime] = []
MAX_MESSAGES_PER_MINUTE = 20


def _check_rate_limit() -> bool:
    """Return True if we can send, False if rate-limited."""
    global _last_message_times
    now = datetime.utcnow()
    cutoff = now - timedelta(minutes=1)
    # Prune old entries
    _last_message_times = [t for t in _last_message_times if t > cutoff]
    if len(_last_message_times) >= MAX_MESSAGES_PER_MINUTE:
        logger.warning("Telegram rate limit reached (%d/min)", MAX_MESSAGES_PER_MINUTE)
        return False
    _last_message_times.append(now)
    return True


def _get_bot_token(db_session) -> str | None:
    """Retrieve Telegram bot token from UserSetting."""
    try:
        from database import UserSetting
    except ModuleNotFoundError:
        from backend.database import UserSetting
    row = db_session.query(UserSetting).filter(UserSetting.key == 'telegram_bot_token').first()
    if not row or not row.value:
        return None
    return row.value.strip()


def _get_chat_id(db_session) -> str | None:
    """Retrieve Telegram chat ID from UserSetting."""
    try:
        from database import UserSetting
    except ModuleNotFoundError:
        from backend.database import UserSetting
    row = db_session.query(UserSetting).filter(UserSetting.key == 'telegram_chat_id').first()
    if not row or not row.value:
        return None
    return row.value.strip()


def get_telegram_config(db_session) -> dict:
    """Return current Telegram configuration status."""
    token = _get_bot_token(db_session)
    chat_id = _get_chat_id(db_session)
    return {
        'telegram_configured': bool(token and chat_id),
        'telegram_has_bot_token': bool(token),
        'telegram_has_chat_id': bool(chat_id),
        'telegram_bot_token_masked': _mask_secret(token) if token else '',
        'telegram_chat_id_masked': _mask_secret(chat_id) if chat_id else '',
    }


def _mask_secret(value: str | None) -> str:
    """Mask a secret string for safe display."""
    value = (value or '').strip()
    if not value:
        return ''
    if len(value) <= 6:
        return value[:2] + '••••'
    return value[:4] + '••••' + value[-4:]


def send_telegram_message(
    chat_id: str,
    text: str,
    bot_token: str | None = None,
    db_session=None,
) -> dict:
    """
    Send a text message via Telegram Bot API.

    Args:
        chat_id: Telegram chat ID (string, can be numeric or @username)
        text: Message text (max 4096 chars, Telegram will truncate)
        bot_token: If provided, use this instead of fetching from DB
        db_session: Required if bot_token is not provided

    Returns:
        dict with 'ok' (bool) and 'message' (str) / 'error' (str)
    """
    if httpx is None:
        return {'ok': False, 'error': 'httpx library not installed'}

    if not bot_token:
        if db_session is None:
            return {'ok': False, 'error': 'No bot_token or db_session provided'}
        bot_token = _get_bot_token(db_session)
        if not bot_token:
            return {'ok': False, 'error': 'Telegram bot token not configured'}

    # Rate limit check
    if not _check_rate_limit():
        return {'ok': False, 'error': 'Rate limited (max 20/min). Try again later.'}

    if not chat_id or not chat_id.strip():
        return {'ok': False, 'error': 'Chat ID is required'}

    # Telegram API: max 4096 chars per message
    if len(text) > 4096:
        text = text[:4093] + '...'

    try:
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {
            'chat_id': chat_id.strip(),
            'text': text,
            'parse_mode': 'HTML',
            'disable_web_page_preview': True,
        }
        response = httpx.post(url, json=payload, timeout=10.0)
        data = response.json()

        if data.get('ok'):
            logger.info("Telegram message sent to chat_id=%s", chat_id)
            return {'ok': True, 'message': 'Message sent successfully'}
        else:
            error_desc = data.get('description', 'Unknown error')
            logger.warning("Telegram API error for chat_id=%s: %s", chat_id, error_desc)
            return {'ok': False, 'error': error_desc}
    except httpx.TimeoutException:
        logger.warning("Telegram API timeout for chat_id=%s", chat_id)
        return {'ok': False, 'error': 'Request timed out'}
    except httpx.NetworkError as e:
        logger.warning("Telegram network error: %s", e)
        return {'ok': False, 'error': f'Network error: {e}'}
    except Exception as e:
        logger.exception("Unexpected error sending Telegram message")
        return {'ok': False, 'error': str(e)}


def test_telegram_connection(chat_id: str, bot_token: str | None = None, db_session=None) -> dict:
    """
    Test Telegram connection by sending a test message.

    Args:
        chat_id: Telegram chat ID to test
        bot_token: Optional, if not provided fetch from DB
        db_session: Required if bot_token is not provided

    Returns:
        dict with 'ok' (bool) and 'message' (str) or 'error' (str)
    """
    return send_telegram_message(
        chat_id=chat_id,
        text="🧪 <b>Test Connection</b>\nRetailBijak Telegram bot is working correctly! ✅",
        bot_token=bot_token,
        db_session=db_session,
    )
