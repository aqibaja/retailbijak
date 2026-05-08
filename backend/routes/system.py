from __future__ import annotations

import json
import logging
import threading
from datetime import date, datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

try:
    from scheduler import scheduler
except ModuleNotFoundError:
    from backend.scheduler import scheduler

try:
    from database import UserSetting, get_db
except ModuleNotFoundError:
    from backend.database import UserSetting, get_db

try:
    from jobs.idx_daily_sync import sync_idx_stock_summary, sync_idx_securities_and_fundamentals
except ModuleNotFoundError:
    from backend.jobs.idx_daily_sync import sync_idx_stock_summary, sync_idx_securities_and_fundamentals

try:
    from stocks import get_all_tickers
except ModuleNotFoundError:
    from backend.stocks import get_all_tickers

logger = logging.getLogger(__name__)
router = APIRouter()


def _store_progress(db: Session, key: str, value: dict):
    row = db.query(UserSetting).filter(UserSetting.key == key).first()
    if row:
        row.value = json.dumps(value)
    else:
        db.add(UserSetting(key=key, value=json.dumps(value)))
    db.commit()


def _get_progress(key: str, db: Session) -> dict:
    row = db.query(UserSetting).filter(UserSetting.key == key).first()
    if row and row.value:
        try:
            return json.loads(row.value)
        except (json.JSONDecodeError, TypeError):
            pass
    return {}


# ─── Backfill Runner ──────────────────────────────
_backfill_thread: threading.Thread | None = None


def _run_backfill(max_days: int = 250, progress_key: str = "backfill_progress"):
    """Run full IDX sync in a background thread with progress tracking."""
    import time as _time
    global _backfill_thread
    db = None
    try:
        try:
            from database import SessionLocal
        except ModuleNotFoundError:
            from backend.database import SessionLocal
        db = SessionLocal()

        _store_progress(db, progress_key, {
            "status": "running", "progress_pct": 0,
            "phase": "stock_summary", "total_days": 0,
            "completed_days": 0, "tickers": 0, "failed": 0,
            "started_at": datetime.utcnow().isoformat(timespec="seconds"),
        })
        db.close()
        db = None

        # Phase 1: Multi-day stock summary sync with progress callback
        today = date.today()

        def _on_multi_progress(fetched, attempted):
            nonlocal last_progress_update, db_local
            pct = min(90, int((fetched / max_days) * 90))
            now = _time.time()
            if now - last_progress_update < 5:
                return  # update max every 5s to avoid DB spam
            last_progress_update = now
            try:
                if db_local is None:
                    from database import SessionLocal as _SL
                    db_local = _SL()
                _store_progress(db_local, progress_key, {
                    "status": "running", "progress_pct": pct,
                    "phase": "stock_summary",
                    "total_days": max_days,
                    "completed_days": fetched,
                    "attempted_days": attempted,
                    "tickers": 0, "failed": 0,
                    "started_at": started_at,
                })
                db_local.close()
                db_local = None
            except Exception:
                pass

        db_local = None
        last_progress_update = 0.0
        started_at = datetime.utcnow().isoformat(timespec="seconds")

        from jobs.idx_daily_sync import sync_idx_stock_summary as _sync_stock
        result = _sync_stock(
            target_date=today,
            fallback_days=7,
            multi_day=True,
            max_days=max_days,
            progress_cb=_on_multi_progress,
        )
        total_days = result.get("total_days", 0)
        tickers = result.get("ok", 0)
        failed = result.get("failed", 0)

        db = SessionLocal()
        _store_progress(db, progress_key, {
            "status": "running", "progress_pct": 90,
            "phase": "securities_and_fundamentals",
            "total_days": total_days,
            "completed_days": total_days,
            "tickers": tickers,
            "failed": failed,
            "data_date": result.get("data_date", ""),
            "started_at": started_at,
        })
        db.close()
        db = None

        # Phase 2: Securities & fundamentals sync
        from jobs.idx_daily_sync import sync_idx_securities_and_fundamentals as _sync_sec
        meta = _sync_sec()
        tickers += meta.get("ok", 0)
        failed += meta.get("failed", 0)

        db = SessionLocal()
        _store_progress(db, progress_key, {
            "status": "completed",
            "progress_pct": 100,
            "phase": "done",
            "total_days": total_days,
            "completed_days": total_days,
            "tickers": tickers,
            "failed": failed,
            "data_date": result.get("data_date", ""),
            "completed_at": datetime.utcnow().isoformat(timespec="seconds"),
        })
    except Exception as exc:
        logger.exception("Backfill failed")
        # Ensure we report failure even if db was closed during execution
        try:
            from database import SessionLocal as _SL
            _edb = _SL()
            _store_progress(_edb, progress_key, {
                "status": "failed",
                "error": str(exc),
                "progress_pct": 0,
                "completed_at": datetime.utcnow().isoformat(timespec="seconds"),
            })
            _edb.close()
        except Exception:
            pass
    finally:
        _backfill_thread = None


@router.post("/api/system/backfill")
def trigger_backfill(max_days: int = 250):
    """Trigger one-time backfill from IDX website in background thread."""
    global _backfill_thread
    if _backfill_thread and _backfill_thread.is_alive():
        return {"ok": False, "message": "Backfill already running. Check /api/system/backfill-progress"}
    _backfill_thread = threading.Thread(
        target=_run_backfill,
        args=(max_days,),
        daemon=True,
    )
    _backfill_thread.start()
    return {
        "ok": True,
        "message": f"Backfill started (max_days={max_days}). Check /api/system/backfill-progress for progress.",
    }


@router.get("/api/system/backfill-progress")
def get_backfill_progress(db: Session = Depends(get_db)):
    """Get current backfill progress from UserSetting."""
    progress = _get_progress("backfill_progress", db)
    return {"ok": True, "progress": progress}


@router.get('/api/health')
def health():
    return {'status': 'ok', 'version': '1.0.0'}

@router.post('/api/admin/classify-sectors')
def trigger_sector_classification(db: Session = Depends(get_db)):
    """Manually trigger sector classification for unclassified stocks."""
    try:
        from updaters.sector_classifier import classify_all_missing
        result = classify_all_missing()
        return {'ok': True, 'result': result}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


@router.post('/api/admin/classify-industries')
def trigger_industry_classification():
    """Manually trigger industry classification for stocks with sector but no industry."""
    try:
        from updaters.sector_classifier import classify_industries
        result = classify_industries()
        return {'ok': True, 'result': result}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


@router.post('/api/admin/seed-news')
def trigger_seed_news(limit: int = 20, db: Session = Depends(get_db)):
    """Manually seed synthetic news from stock price movements (top movers, volume leaders).

    Generates realistic Indonesian market news articles based on actual
    OHLCV data in the database. Useful when RSS feeds have failed or
    you want to ensure the news page has fresh content.
    """
    try:
        try:
            from updaters.news_updater import seed_synthetic_news
        except ModuleNotFoundError:
            from backend.updaters.news_updater import seed_synthetic_news
        items = seed_synthetic_news(db=db, limit=limit)
        return {
            'ok': True,
            'message': f'Seeded {len(items)} synthetic news items from stock data',
            'count': len(items),
        }
    except Exception as e:
        return {'ok': False, 'error': str(e)}


@router.get('/api/system/ohclv-status')
def get_ohlcv_status(db: Session = Depends(get_db)):
    """Get OHLCV data quality summary."""
    from sqlalchemy import text
    try:
        from database import OHLCVDaily
    except ModuleNotFoundError:
        from backend.database import OHLCVDaily

    total = db.query(OHLCVDaily).count()
    tickers = db.execute(text("SELECT COUNT(DISTINCT ticker) FROM ohlcv_daily")).scalar() or 0
    date_range = db.execute(text("SELECT MIN(date), MAX(date) FROM ohlcv_daily")).fetchone()
    # Ticker with least and most data
    min_row = db.execute(text("SELECT ticker, COUNT(*) as cnt FROM ohlcv_daily GROUP BY ticker ORDER BY cnt ASC LIMIT 1")).fetchone()
    max_row = db.execute(text("SELECT ticker, COUNT(*) as cnt FROM ohlcv_daily GROUP BY ticker ORDER BY cnt DESC LIMIT 1")).fetchone()
    return {
        "total_rows": total,
        "unique_tickers": tickers,
        "date_min": str(date_range[0])[:10] if date_range[0] else None,
        "date_max": str(date_range[1])[:10] if date_range[1] else None,
        "min_per_ticker": min_row[1] if min_row else 0,
        "max_per_ticker": max_row[1] if max_row else 0,
    }


@router.get('/api/scheduler-health')
def scheduler_health():
    jobs = []
    try:
        for job in scheduler.get_jobs():
            next_run = job.next_run_time.isoformat() if job.next_run_time else None
            jobs.append({
                'id': job.id,
                'name': job.name,
                'next_run_time': next_run,
                'trigger': str(job.trigger),
            })
        return {'status': 'ok', 'source': 'apscheduler', 'count': len(jobs), 'data': jobs}
    except Exception as exc:
        return {'status': 'error', 'source': 'apscheduler', 'count': 0, 'data': [], 'error': str(exc)}


@router.get('/api/scheduler-jobs')
def scheduler_jobs():
    try:
        return {'status': 'ok', 'source': 'apscheduler', 'count': len(scheduler.get_jobs()), 'data': [j.id for j in scheduler.get_jobs()]}
    except Exception as exc:
        return {'status': 'error', 'source': 'apscheduler', 'count': 0, 'data': [], 'error': str(exc)}


# ─── Data Freshness ──────────────────────────────

@router.get('/api/system/freshness')
def get_system_freshness(db: Session = Depends(get_db)):
    """Return last-updated timestamp for each data table."""
    from sqlalchemy import text
    from datetime import timezone

    queries = {
        'stocks': "SELECT MAX(updated_at) FROM stocks",
        'ohlcv_daily': "SELECT MAX(date) FROM ohlcv_daily",
        'signals': "SELECT MAX(signal_date) FROM signals",
        'fundamentals': "SELECT MAX(updated_at) FROM fundamentals",
        'financials': "SELECT MAX(period) FROM financials",
        'news': "SELECT MAX(published_at) FROM news",
        'broker_summary': "SELECT MAX(updated_at) FROM broker_summary",
        'ai_pick_reports': "SELECT MAX(generated_at) FROM ai_pick_reports",
        'watchlist_items': "SELECT MAX(updated_at) FROM watchlist_items",
        'portfolio_positions': "SELECT MAX(updated_at) FROM portfolio_positions",
    }

    result = {}
    for table, sql in queries.items():
        try:
            row = db.execute(text(sql)).fetchone()
            val = row[0]
            if val is not None:
                if hasattr(val, 'isoformat'):
                    val = val.isoformat(timespec='seconds')
                elif hasattr(val, 'strftime'):
                    val = val.strftime('%Y-%m-%d')
                else:
                    val = str(val)[:19]
            result[table] = val or None
        except Exception as e:
            result[table] = None
            logger.warning(f"Freshness query failed for {table}: {e}")

    # Calculate human-readable summary
    now = datetime.utcnow()
    labels = {}
    for table, ts in result.items():
        if ts is None:
            labels[table] = 'tidak tersedia'
            continue
        try:
            dt = datetime.fromisoformat(ts) if isinstance(ts, str) else ts
            diff = now - dt
            mins = int(diff.total_seconds() / 60)
            if mins < 1:
                labels[table] = 'baru saja'
            elif mins < 60:
                labels[table] = f'{mins} menit lalu'
            elif mins < 1440:
                labels[table] = f'{mins // 60} jam lalu'
            else:
                labels[table] = f'{mins // 1440} hari lalu'
        except Exception:
            labels[table] = ts

    return {
        'status': 'ok',
        'data': result,
        'labels': labels,
        'generated_at': now.isoformat(timespec='seconds'),
    }
