import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz

try:
    from updaters.signal_updater import update_signals
except Exception:
    def update_signals():
        logging.getLogger(__name__).info("signal updater unavailable; skipped")

try:
    from updaters.news_updater import update_news
except Exception:
    def update_news():
        logging.getLogger(__name__).info("news updater unavailable; skipped")

try:
    from updaters.fundamental_updater import update_fundamentals
except Exception:
    def update_fundamentals():
        logging.getLogger(__name__).info("fundamental updater unavailable; skipped")

try:
    from jobs.idx_daily_sync import run_idx_daily_sync
except Exception:
    try:
        from backend.jobs.idx_daily_sync import run_idx_daily_sync
    except Exception:
        def run_idx_daily_sync():
            logging.getLogger(__name__).info("IDX daily sync unavailable; skipped")
            return {"ok": 0, "failed": 0}

logger = logging.getLogger(__name__)

jkt_tz = pytz.timezone('Asia/Jakarta')

scheduler = BackgroundScheduler(timezone=jkt_tz)

def init_scheduler():
    """Configure and start the background scheduler."""
    logger.info("Initializing APScheduler...")
    scheduler.add_job(update_signals, trigger=CronTrigger(day_of_week='mon-fri', hour='9-16', minute='*/30', timezone=jkt_tz), id="intraday_signal_update", replace_existing=True)
    scheduler.add_job(update_news, trigger=CronTrigger(hour='7-20', minute='*/30', timezone=jkt_tz), id="news_update", replace_existing=True)
    scheduler.add_job(update_fundamentals, trigger=CronTrigger(hour=2, minute=0, timezone=jkt_tz), id="fundamental_update", replace_existing=True)
    scheduler.add_job(run_idx_daily_sync, trigger=CronTrigger(hour=3, minute=0, timezone=jkt_tz), id="idx_daily_sync", replace_existing=True)
    if not scheduler.running:
        scheduler.start()
    logger.info("APScheduler started successfully.")
    return scheduler
