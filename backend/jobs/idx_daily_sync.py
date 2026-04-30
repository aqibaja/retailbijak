from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy.dialects.sqlite import insert

try:
    from database import SessionLocal, Stock
    from services.idx_api_client import get_idx_client
    from services.idx_normalizer import normalize_stock_payload
    from stocks import get_all_tickers
except ModuleNotFoundError:
    from backend.database import SessionLocal, Stock
    from backend.services.idx_api_client import get_idx_client
    from backend.services.idx_normalizer import normalize_stock_payload
    from backend.stocks import get_all_tickers

logger = logging.getLogger(__name__)


def _upsert_stock_snapshot(db, row: dict):
    stmt = insert(Stock).values(
        ticker=row["ticker"],
        name=row.get("name") or row["ticker"],
        sector=row.get("sector"),
        industry=row.get("industry"),
        market_cap=row.get("market_cap"),
        updated_at=datetime.utcnow(),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["ticker"],
        set_={
            "name": stmt.excluded.name,
            "sector": stmt.excluded.sector,
            "industry": stmt.excluded.industry,
            "market_cap": stmt.excluded.market_cap,
            "updated_at": stmt.excluded.updated_at,
        },
    )
    db.execute(stmt)


def run_idx_daily_sync(tickers: list[str] | None = None) -> dict:
    if tickers is None:
        tickers = get_all_tickers()
    if not tickers:
        return {"ok": 0, "failed": 0, "synced_at": datetime.utcnow().isoformat(timespec="seconds")}

    client = get_idx_client()
    db = SessionLocal()
    ok = 0
    failed = 0

    try:
        for ticker in tickers:
            path_candidates = [
                f"/stocks/{ticker}",
                f"/api/stocks/{ticker}",
                f"/stock/{ticker}",
            ]
            resp = None
            for path in path_candidates:
                try:
                    resp = client.get_json(path)
                except ValueError:
                    resp = None
                    break
                if resp.ok and resp.data:
                    break
            if not resp or not resp.ok or not resp.data:
                failed += 1
                continue

            normalized = normalize_stock_payload(ticker, resp.data)
            _upsert_stock_snapshot(db, normalized)
            ok += 1

        db.commit()
        return {"ok": ok, "failed": failed, "synced_at": datetime.utcnow().isoformat(timespec="seconds")}
    except Exception:
        db.rollback()
        logger.exception("IDX daily sync failed")
        raise
    finally:
        db.close()
