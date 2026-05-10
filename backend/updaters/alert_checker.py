"""
Alert Checker — evaluate active alerts against current OHLCV data.

Runs every 15 minutes during market hours via APScheduler.
Stores triggered alerts in the alert_triggers table.
Also sends Telegram notifications if configured.
"""
import logging
from datetime import datetime, timedelta

from database import Alert, AlertTrigger, OHLCVDaily, SessionLocal, UserSetting
logger = logging.getLogger(__name__)

# Prevent re-triggering the same alert within this window
COOLDOWN_MINUTES = 60


def _send_telegram_notification(ticker: str, alert_type: str, alert_value: float, current_value: float) -> None:
    """Send a Telegram alert notification if configured. Silently skip on failure."""
    try:
        try:
            from services.telegram_bot import send_telegram_message
        except ModuleNotFoundError:
            from backend.services.telegram_bot import send_telegram_message

        db = SessionLocal()
        try:
            chat_id = db.query(UserSetting).filter(UserSetting.key == 'telegram_chat_id').first()
            bot_token = db.query(UserSetting).filter(UserSetting.key == 'telegram_bot_token').first()
            if not chat_id or not chat_id.value or not bot_token or not bot_token.value:
                return  # Telegram not configured — silently skip
            chat_id_val = chat_id.value.strip()
            bot_token_val = bot_token.value.strip()

            # Build human-readable alert type
            type_labels = {
                'price_above': 'price_above',
                'price_below': 'price_below',
                'rsi_above': 'rsi_above',
                'rsi_below': 'rsi_below',
            }
            label = type_labels.get(alert_type, alert_type)

            text = (
                f"🔔 <b>ALERT: {ticker}</b>\n"
                f"Harga mencapai Rp {current_value:,.0f}\n"
                f"Target: Rp {alert_value:,.0f} ({label})\n"
                f"https://retailbijak.rich27.my.id/stock/{ticker}"
            )
            send_telegram_message(chat_id_val, text, bot_token=bot_token_val)
        finally:
            db.close()
    except Exception:
        logger.exception("Failed to send Telegram notification for %s alert", ticker)


def check_alerts() -> dict:
    """Evaluate all active alerts and store triggers."""
    db = SessionLocal()
    triggered = 0
    errors = 0
    try:
        alerts = db.query(Alert).filter(Alert.active == 1).all()
        if not alerts:
            logger.info("Alert checker: no active alerts to evaluate")
            return {"checked": 0, "triggered": 0, "errors": 0}

        # Group alerts by ticker for batch fetching
        from collections import defaultdict
        by_ticker = defaultdict(list)
        for a in alerts:
            by_ticker[a.ticker].append(a)

        cutoff = datetime.utcnow() - timedelta(minutes=COOLDOWN_MINUTES)

        def _rsi(closes, period=14):
            """Simple RSI calculation from close prices."""
            if len(closes) < period + 1:
                return None
            gains = []
            losses = []
            for i in range(1, len(closes)):
                diff = closes[i] - closes[i - 1]
                gains.append(max(diff, 0))
                losses.append(max(-diff, 0))
            avg_gain = sum(gains[:period]) / period
            avg_loss = sum(losses[:period]) / period
            for i in range(period, len(gains)):
                avg_gain = (avg_gain * (period - 1) + gains[i]) / period
                avg_loss = (avg_loss * (period - 1) + losses[i]) / period
            if avg_loss == 0:
                return 100.0
            rs = avg_gain / avg_loss
            return 100.0 - (100.0 / (1.0 + rs))

        for ticker, ticker_alerts in by_ticker.items():
            try:
                # Fetch latest 30 days of OHLCV for RSI calculation
                candles = db.query(OHLCVDaily).filter(
                    OHLCVDaily.ticker == ticker
                ).order_by(OHLCVDaily.date.desc()).limit(30).all()
                if not candles:
                    continue
                candles = list(reversed(candles))  # chronological order

                latest = candles[-1]
                current_price = float(latest.close) if latest.close else None
                if current_price is None:
                    continue

                # Compute RSI if needed
                rsi = None
                need_rsi = any(a.alert_type.startswith("rsi_") for a in ticker_alerts)
                if need_rsi and len(candles) >= 14:
                    closes = [float(c.close) for c in candles if c.close is not None]
                    if len(closes) >= 14:
                        rsi = _rsi(closes)

                for alert in ticker_alerts:
                    current_value = None
                    triggered_flag = False

                    if alert.alert_type == "price_above":
                        current_value = current_price
                        triggered_flag = current_price > alert.value
                    elif alert.alert_type == "price_below":
                        current_value = current_price
                        triggered_flag = current_price < alert.value
                    elif alert.alert_type == "rsi_above":
                        if rsi is not None:
                            current_value = round(rsi, 2)
                            triggered_flag = rsi > alert.value
                    elif alert.alert_type == "rsi_below":
                        if rsi is not None:
                            current_value = round(rsi, 2)
                            triggered_flag = rsi < alert.value

                    if triggered_flag and current_value is not None:
                        # Check cooldown: don't re-trigger if already triggered recently
                        recent = db.query(AlertTrigger).filter(
                            AlertTrigger.alert_id == alert.id,
                            AlertTrigger.triggered_at > cutoff
                        ).first()
                        if recent:
                            continue

                        trigger = AlertTrigger(
                            alert_id=alert.id,
                            ticker=ticker,
                            alert_type=alert.alert_type,
                            trigger_value=alert.value,
                            current_value=current_value,
                        )
                        db.add(trigger)
                        triggered += 1

                        # Send Telegram notification
                        _send_telegram_notification(
                            ticker=ticker,
                            alert_type=alert.alert_type,
                            alert_value=alert.value,
                            current_value=current_value,
                        )

            except Exception as exc:
                logger.warning("Alert check failed for %s: %s", ticker, exc)
                errors += 1

        db.commit()
        logger.info("Alert checker: %d active, %d triggered, %d errors", len(alerts), triggered, errors)
        return {"checked": len(alerts), "triggered": triggered, "errors": errors}
    except Exception:
        db.rollback()
        logger.exception("Alert checker failed")
        return {"checked": 0, "triggered": 0, "errors": 1}
    finally:
        db.close()
