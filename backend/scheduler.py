import logging
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz

from updaters.price_updater import update_daily_ohlcv
from updaters.signal_updater import update_signals
from updaters.news_updater import update_news
from updaters.fundamental_updater import update_fundamentals

logger = logging.getLogger(__name__)

# JKT Timezone
jkt_tz = pytz.timezone('Asia/Jakarta')

scheduler = BackgroundScheduler(timezone=jkt_tz)

def init_scheduler():
    """Configure and start the background scheduler."""
    logger.info("Initializing APScheduler...")
    
    # Run OHLCV updates every 30 minutes during market hours (Mon-Fri)
    scheduler.add_job(
        update_daily_ohlcv,
        trigger=CronTrigger(day_of_week='mon-fri', hour='9-16', minute='*/30', timezone=jkt_tz),
        id="intraday_ohlcv_update",
        replace_existing=True
    )
    
    # Run signal calculation every 30 minutes during market hours
    # Market hours: 09:00 - 16:00
    scheduler.add_job(
        update_signals,
        trigger=CronTrigger(day_of_week='mon-fri', hour='9-16', minute='*/30', timezone=jkt_tz),
        id="intraday_signal_update",
        replace_existing=True
    )
    
    # Fetch news every 30 minutes from 07:00 to 20:00 every day
    scheduler.add_job(
        update_news,
        trigger=CronTrigger(hour='7-20', minute='*/30', timezone=jkt_tz),
        id="news_update",
        replace_existing=True
    )
    
    # Update fundamental data daily at 02:00 AM
    scheduler.add_job(
        update_fundamentals,
        trigger=CronTrigger(hour=2, minute=0, timezone=jkt_tz),
        id="fundamental_update",
        replace_existing=True
    )
    
    scheduler.start()

    # Ensure data is refreshed immediately when service starts during market hours.
    now = datetime.now(jkt_tz)
    if now.weekday() < 5 and 9 <= now.hour <= 16:
        logger.info("Queueing immediate OHLCV refresh on startup (market hours).")
        scheduler.add_job(
            update_daily_ohlcv,
            id="startup_ohlcv_refresh",
            replace_existing=True,
            next_run_time=now,
        )

    logger.info("APScheduler started successfully.")
    return scheduler
