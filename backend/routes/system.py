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
