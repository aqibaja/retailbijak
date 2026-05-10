"""
Email Daily Briefing — send market briefing via SMTP email.
Reads SMTP settings from UserSetting table, sends formatted HTML email.
Scheduled: Mon-Fri 17:05 WIB (after Telegram briefing at 17:00).
"""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

try:
    from database import MarketBriefing, get_db, UserSetting
except ModuleNotFoundError:
    from backend.database import MarketBriefing, get_db, UserSetting


# ─── SMTP Settings helpers ───────────────────────────────


def _get_setting(db_session, key: str) -> str | None:
    row = db_session.query(UserSetting).filter(UserSetting.key == key).first()
    if not row or not row.value:
        return None
    return row.value.strip()


def get_smtp_config(db_session) -> dict:
    """Return SMTP configuration from UserSetting."""
    return {
        'smtp_server': _get_setting(db_session, 'smtp_server'),
        'smtp_port': _get_setting(db_session, 'smtp_port'),
        'smtp_email': _get_setting(db_session, 'smtp_email'),
        'smtp_password': _get_setting(db_session, 'smtp_password'),
        'smtp_configured': all([
            _get_setting(db_session, 'smtp_server'),
            _get_setting(db_session, 'smtp_port'),
            _get_setting(db_session, 'smtp_email'),
            _get_setting(db_session, 'smtp_password'),
        ]),
    }


def save_smtp_config(db_session, server: str, port: str, email: str, password: str) -> dict:
    """Save SMTP config to UserSetting table."""
    for key, value in [
        ('smtp_server', server),
        ('smtp_port', port),
        ('smtp_email', email),
        ('smtp_password', password),
    ]:
        existing = db_session.query(UserSetting).filter(UserSetting.key == key).first()
        if existing:
            existing.value = value.strip()
        else:
            db_session.add(UserSetting(key=key, value=value.strip()))
        existing.updated_at = datetime.utcnow()
    db_session.commit()
    return get_smtp_config(db_session)


def test_smtp_connection(db_session=None) -> dict:
    """Test SMTP connection by attempting to connect."""
    if db_session is None:
        db_session = next(get_db())

    config = get_smtp_config(db_session)
    if not config['smtp_configured']:
        return {'ok': False, 'error': 'SMTP not fully configured'}

    try:
        port = int(config['smtp_port'])
        if port == 465:
            server = smtplib.SMTP_SSL(config['smtp_server'], port, timeout=10)
        else:
            server = smtplib.SMTP(config['smtp_server'], port, timeout=10)
            server.starttls()
        server.login(config['smtp_email'], config['smtp_password'])
        server.quit()
        return {'ok': True, 'message': 'SMTP connection successful'}
    except smtplib.SMTPAuthenticationError:
        return {'ok': False, 'error': 'SMTP authentication failed — check email/password'}
    except smtplib.SMTPException as e:
        return {'ok': False, 'error': f'SMTP error: {e}'}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


# ─── Briefing email builder ──────────────────────────────


def _build_html_briefing(briefing) -> str:
    """Build HTML email from MarketBriefing record."""
    sentiment = briefing.sentiment or 'neutral'
    sentiment_color = {
        'bullish': '#22c55e',
        'bearish': '#ef4444',
        'neutral': '#a0a0a0',
    }.get(sentiment, '#a0a0a0')
    sentiment_label = sentiment.upper()

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f0f0f;color:#e0e0e0;padding:20px;margin:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto">
    <tr><td style="padding:20px 0;text-align:center">
      <h1 style="font-size:22px;margin:0">📊 Daily Market Briefing</h1>
      <p style="font-size:13px;color:#888;margin:4px 0">{briefing.trading_date}</p>
      <span style="display:inline-block;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;color:{sentiment_color};border:1px solid {sentiment_color}">{sentiment_label}</span>
    </td></tr>
    <tr><td style="padding:10px 0;line-height:1.6;font-size:14px;color:#ccc">
      {briefing.content}
    </td></tr>
    <tr><td style="padding:20px 0;text-align:center;font-size:12px;color:#666;border-top:1px solid #333">
      <p>RetailBijak — IDX Stock Intelligence</p>
      <p><a href="https://retailbijak.rich27.my.id" style="color:#6366f1;text-decoration:none">retailbijak.rich27.my.id</a></p>
    </td></tr>
  </table>
</body>
</html>"""


def _build_text_briefing(briefing) -> str:
    """Build plain-text fallback from MarketBriefing record."""
    sentiment = briefing.sentiment or 'neutral'
    lines = [
        f"📊 DAILY MARKET BRIEFING",
        f"📅 {briefing.trading_date}",
        f"Sentimen: {sentiment.upper()}",
        "",
        briefing.content or '',
        "",
        "--",
        "RetailBijak — IDX Stock Intelligence",
        "https://retailbijak.rich27.my.id",
    ]
    return '\n'.join(lines)


# ─── Send briefing email ─────────────────────────────────


def send_briefing_email(db_session=None) -> dict:
    """Send latest market briefing as email via SMTP."""
    if db_session is None:
        db_session = next(get_db())

    # Get SMTP config
    config = get_smtp_config(db_session)
    if not config['smtp_configured']:
        logger.warning("SMTP not configured — cannot send briefing email")
        return {'ok': False, 'error': 'SMTP not configured'}

    # Get latest briefing
    latest = (
        db_session.query(MarketBriefing)
        .order_by(MarketBriefing.generated_at.desc())
        .first()
    )
    if not latest or not latest.content:
        logger.warning("No market briefing found to send via email")
        return {'ok': False, 'error': 'No briefing available'}

    # Build message
    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"📊 Daily Market Briefing — {latest.trading_date}"
    msg['From'] = config['smtp_email']
    msg['To'] = config['smtp_email']  # Send to self

    text_part = MIMEText(_build_text_briefing(latest), 'plain', 'utf-8')
    html_part = MIMEText(_build_html_briefing(latest), 'html', 'utf-8')
    msg.attach(text_part)
    msg.attach(html_part)

    # Send
    try:
        port = int(config['smtp_port'])
        if port == 465:
            server = smtplib.SMTP_SSL(config['smtp_server'], port, timeout=15)
        else:
            server = smtplib.SMTP(config['smtp_server'], port, timeout=15)
            server.starttls()

        server.login(config['smtp_email'], config['smtp_password'])
        server.send_message(msg)
        server.quit()

        logger.info("Briefing email sent successfully for %s", latest.trading_date)
        return {'ok': True, 'message': 'Email sent successfully'}
    except smtplib.SMTPAuthenticationError:
        return {'ok': False, 'error': 'SMTP authentication failed'}
    except smtplib.SMTPException as e:
        return {'ok': False, 'error': f'SMTP error: {e}'}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


def run_email_briefing_job():
    """Wrapper for APScheduler — creates its own DB session."""
    try:
        from database import get_db as _get_db_ctx
        db = next(_get_db_ctx())
        result = send_briefing_email(db_session=db)
        db.close()
        logger.info("Email briefing job result: %s", result.get('ok'))
    except Exception as e:
        logger.exception("Email briefing job failed: %s", e)
