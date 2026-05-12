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
    from updaters.financials_updater import update_financials
except Exception:
    def update_financials():
        logging.getLogger(__name__).info("financials updater unavailable; skipped")

try:
    from jobs.idx_daily_sync import run_idx_daily_sync
except Exception:
    try:
        from backend.jobs.idx_daily_sync import run_idx_daily_sync
    except Exception:
        def run_idx_daily_sync():
            logging.getLogger(__name__).info("IDX daily sync unavailable; skipped")
            return {"ok": 0, "failed": 0}

try:
    from updaters.price_updater import update_daily_ohlcv
except Exception:
    try:
        from backend.updaters.price_updater import update_daily_ohlcv
    except Exception:
        def update_daily_ohlcv():
            logging.getLogger(__name__).info("price updater unavailable; skipped")

try:
    from updaters.alert_checker import check_alerts
except Exception:
    try:
        from backend.updaters.alert_checker import check_alerts
    except Exception:
        def check_alerts():
            logging.getLogger(__name__).info("alert checker unavailable; skipped")

try:
    from updaters.calendar_updater import update_calendar_events
except Exception:
    try:
        from backend.updaters.calendar_updater import update_calendar_events
    except Exception:
        def update_calendar_events():
            logging.getLogger(__name__).info("calendar updater unavailable; skipped")


try:
    from ai_picks import generate_and_store_daily_ai_pick_report
except Exception:
    from backend.ai_picks import generate_and_store_daily_ai_pick_report

logger = logging.getLogger(__name__)

jkt_tz = pytz.timezone('Asia/Jakarta')

scheduler = BackgroundScheduler(timezone=jkt_tz)

def init_scheduler():
    """Configure and start the background scheduler."""
    logger.info("Initializing APScheduler...")
    # ─── OHLCV — Mon-Fri 09:05 & 16:05 WIB ───
    scheduler.add_job(update_daily_ohlcv, trigger=CronTrigger(day_of_week='mon-fri', hour='9,16', minute=5, timezone=jkt_tz), id="ohlcv_daily_update", replace_existing=True)
    logger.info("Registered ohlcv_daily_update job (Mon-Fri 09:05 & 16:05 WIB)")
    scheduler.add_job(update_signals, trigger=CronTrigger(day_of_week='mon-fri', hour='9-16', minute='*/30', timezone=jkt_tz), id="intraday_signal_update", replace_existing=True)
    scheduler.add_job(update_news, trigger=CronTrigger(hour='7-20', minute='*/30', timezone=jkt_tz), id="news_update", replace_existing=True)
    # ─── FUNDAMENTAL & FINANCIAL — DISABLED (yfinance rate-limited untuk IDX) ───
    # Gunakan IDX website sebagai gantinya via idx_daily_sync.py (18:00 WIB)
    # scheduler.add_job(update_fundamentals, ...)
    # scheduler.add_job(update_financials, ...)
    scheduler.add_job(generate_and_store_daily_ai_pick_report, trigger=CronTrigger(day_of_week='mon-fri', hour='8,12', minute=0, timezone=jkt_tz), id="daily_ai_picks_swing", replace_existing=True, kwargs={'mode': 'swing'})
    scheduler.add_job(generate_and_store_daily_ai_pick_report, trigger=CronTrigger(day_of_week='mon-fri', hour='8,12', minute=0, timezone=jkt_tz), id="daily_ai_picks_defensive", replace_existing=True, kwargs={'mode': 'defensive'})
    scheduler.add_job(generate_and_store_daily_ai_pick_report, trigger=CronTrigger(day_of_week='mon-fri', hour='8,12', minute=0, timezone=jkt_tz), id="daily_ai_picks_catalyst", replace_existing=True, kwargs={'mode': 'catalyst'})
    scheduler.add_job(check_alerts, trigger=CronTrigger(day_of_week='mon-fri', hour='9-15', minute='*/15', timezone=jkt_tz), id="alert_checker", replace_existing=True)
    # Sector classifier — daily 03:00 (update missing sector/industry data)
    try:
        from updaters.sector_classifier import classify_all_missing, classify_industries
        scheduler.add_job(classify_all_missing, trigger=CronTrigger(hour=3, minute=0, timezone=jkt_tz), id="sector_classifier", replace_existing=True)
        scheduler.add_job(classify_industries, trigger=CronTrigger(hour=3, minute=5, timezone=jkt_tz), id="industry_classifier", replace_existing=True)
        logger.info("Registered sector_classifier job (daily 03:00 WIB) and industry_classifier (03:05 WIB)")
    except Exception as e:
        logger.warning(f"Could not register sector_classifier: {e}")
    # ─── CALENDAR — DISABLED (yfinance rate-limited) ───
    # scheduler.add_job(update_calendar_events, ...)
    # Macro data seed — daily 04:05 (only seeds if empty)
    try:
        from updaters.macro_updater import seed_macro_data
        from database import get_db as _get_db
        def _seed_macro_job():
            try:
                db = next(_get_db())
                seed_macro_data(db)
                db.close()
            except Exception as e:
                logger.error(f"Macro data seed failed: {e}")
        scheduler.add_job(_seed_macro_job, trigger=CronTrigger(hour=4, minute=5, timezone=jkt_tz), id='macro_data_seed', replace_existing=True)
        logger.info("Registered macro_data_seed job (daily 04:05 WIB)")
    except Exception as e:
        logger.warning(f"Could not register macro_data_seed: {e}")
    # Index constituent seed — weekly refresh (Sunday 04:30)
    try:
        from updaters.idx_index_updater import seed_index_constituents
        scheduler.add_job(seed_index_constituents, trigger=CronTrigger(day_of_week='sun', hour=4, minute=30, timezone=jkt_tz), id='index_constituent_seed', replace_existing=True)
        logger.info("Registered index_constituent_seed job (Sun 04:30 WIB)")
    except Exception as e:
        logger.warning(f"Could not register index_constituent_seed: {e}")
    # Corporate actions seed — daily 05:00
    try:
        from updaters.corporate_actions_updater import seed_corporate_actions
        from database import SessionLocal as _SL
        def _run_corporate_actions_seed():
            _db = _SL()
            try: seed_corporate_actions(_db)
            finally: _db.close()
        scheduler.add_job(_run_corporate_actions_seed, trigger=CronTrigger(hour=5, minute=0, timezone=jkt_tz), id='corporate_actions_seed', replace_existing=True)
        logger.info("Registered corporate_actions_seed job (daily 05:00 WIB)")
    except Exception as e:
        logger.warning(f"Could not register corporate_actions_seed: {e}")
    # BrokerSummary seed — daily 05:30
    try:
        from updaters.broker_summary_updater import update_broker_summary
        scheduler.add_job(update_broker_summary, trigger=CronTrigger(hour=5, minute=30, timezone=jkt_tz), id='broker_summary_seed', replace_existing=True)
        logger.info("Registered broker_summary_seed job (daily 05:30 WIB)")
    except Exception as e:
        logger.warning(f"Could not register broker_summary_seed: {e}")
    # Market briefing — every trading day 16:30 WIB (after market close)
    try:
        from services.market_briefing import generate_briefing
        from database import get_db
        def run_briefing():
            try:
                db = next(get_db())
                generate_briefing(db, force=True)
                db.close()
            except Exception as e:
                logger.error(f"Market briefing failed: {e}")
        scheduler.add_job(run_briefing, trigger=CronTrigger(day_of_week='mon-fri', hour=16, minute=30, timezone=jkt_tz), id='market_briefing', replace_existing=True)
        logger.info("Registered market_briefing job (Mon-Fri 16:30 WIB)")
    except Exception as e:
        logger.warning(f"Could not register market_briefing: {e}")
    def _idx_daily_sync_job():
        """Wrapper: single-day only (multi_day=False) agar tidak hang saat scheduled run."""
        try:
            from jobs.idx_daily_sync import sync_idx_stock_summary, sync_idx_securities_and_fundamentals, sync_idx_index_chart
            summary = sync_idx_stock_summary(multi_day=False)
            meta = sync_idx_securities_and_fundamentals()
            chart = sync_idx_index_chart()
            logger.info("IDX daily sync done: ok=%s failed=%s date=%s", summary.get('ok'), summary.get('failed'), summary.get('data_date'))
        except Exception as e:
            logger.error("IDX daily sync failed: %s", e)
    scheduler.add_job(_idx_daily_sync_job, trigger=CronTrigger(hour=6, minute=0, timezone=jkt_tz), id="idx_daily_sync", replace_existing=True)
    # yfinance_daily_sync sudah disabled — OHLCV dari IDX via idx_daily_sync (06:00 WIB)
    # Telegram daily briefing — Mon-Fri 17:00 WIB (after market briefing at 16:30)
    try:
        from services.telegram_briefing import run_briefing_job as _tg_briefing
        scheduler.add_job(_tg_briefing, trigger=CronTrigger(day_of_week='mon-fri', hour=17, minute=0, timezone=jkt_tz), id='telegram_daily_briefing', replace_existing=True)
        logger.info("Registered telegram_daily_briefing job (Mon-Fri 17:00 WIB)")
    except Exception as e:
        logger.warning("Could not register telegram_daily_briefing: %s", e)
    # Email daily briefing — Mon-Fri 17:05 WIB (after Telegram briefing)
    try:
        from services.email_briefing import run_email_briefing_job as _email_briefing
        scheduler.add_job(_email_briefing, trigger=CronTrigger(day_of_week='mon-fri', hour=17, minute=5, timezone=jkt_tz), id='email_daily_briefing', replace_existing=True)
        logger.info("Registered email_daily_briefing job (Mon-Fri 17:05 WIB)")
    except Exception as e:
        logger.warning("Could not register email_daily_briefing: %s", e)
    # Screener auto-run — Mon-Fri 9:00-15:00 every 60 min
    try:
        from services.screener_auto_run import run_screener_auto_check as _screener_auto
        scheduler.add_job(_screener_auto, trigger=CronTrigger(day_of_week='mon-fri', hour='9-15', minute=0, timezone=jkt_tz), id='screener_auto_run', replace_existing=True)
        logger.info("Registered screener_auto_run job (Mon-Fri 9:00-15:00 hourly)")
    except Exception as e:
        logger.warning("Could not register screener_auto_run: %s", e)
    if not scheduler.running:
        scheduler.start()
    logger.info("APScheduler started successfully.")
    return scheduler
