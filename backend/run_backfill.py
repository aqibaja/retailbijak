#!/usr/bin/env python3
"""Run IDX backfill directly with progress output.

Usage: python run_backfill.py [max_days=125]
"""
import sys, json, time
from datetime import date, datetime
from database import SessionLocal
from sqlalchemy import text

max_days = int(sys.argv[1]) if len(sys.argv) > 1 else 125
print(f"\n{'='*50}")
print(f"BACKFILL: {max_days} trading days from IDX")
print(f"Started: {datetime.now().isoformat()}")
print(f"{'='*50}\n")

def store_progress(pct, phase, **kw):
    try:
        db = SessionLocal()
        val = json.dumps({"status":"running","progress_pct":pct,"phase":phase,**kw})
        db.execute(text("UPDATE user_settings SET value=:v WHERE key='backfill_progress'"), {"v": val})
        db.commit()
        db.close()
    except Exception as e:
        print(f"  [progress save error: {e}]")

store_progress(0, "stock_summary", total_days=max_days, started_at=datetime.utcnow().isoformat())

from jobs.idx_daily_sync import sync_idx_stock_summary

t0 = time.time()
result = sync_idx_stock_summary(
    target_date=date.today(),
    fallback_days=7,
    multi_day=True,
    max_days=max_days,
)
elapsed = time.time() - t0
ok = result.get("ok", 0)
total_days = result.get("total_days", 0)
failed = result.get("failed", 0)

print(f"\nPhase 1 done: {total_days} days, {ok} tickers, {failed} failed ({elapsed:.0f}s)")
store_progress(90, "securities_and_fundamentals", total_days=total_days, tickers=ok, failed=failed,
               data_date=result.get("data_date",""), completed_days=total_days)

from jobs.idx_daily_sync import sync_idx_securities_and_fundamentals
t1 = time.time()
meta = sync_idx_securities_and_fundamentals()
elapsed2 = time.time() - t1
print(f"Phase 2 done: {meta.get('ok',0)} OK, {meta.get('failed',0)} failed ({elapsed2:.0f}s)")

total_ok = ok + meta.get("ok", 0)
total_fail = failed + meta.get("failed", 0)

store_progress(100, "done", total_days=total_days, tickers=total_ok, failed=total_fail,
               completed_at=datetime.utcnow().isoformat(), data_date=result.get("data_date",""))

# Check OHLCV status
from database import SessionLocal as SL
db = SL()
total = db.execute(text("SELECT COUNT(*) FROM ohlcv_daily")).scalar()
max_t = db.execute(text("SELECT ticker, COUNT(*) FROM ohlcv_daily GROUP BY ticker ORDER BY COUNT(*) DESC LIMIT 1")).fetchone()
db.close()

print(f"\n{'='*50}")
print(f"FINISHED in {time.time()-t0:.0f}s total")
print(f"OHLCV rows: {total} | Max/ticker: {max_t[0]} = {max_t[1]}")
print(f"{'='*50}")
