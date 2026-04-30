from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy.dialects.sqlite import insert

try:
    from database import Fundamental, OHLCVDaily, SessionLocal, Stock
    from services.idx_api_client import get_idx_client, parse_idx_number
    from services.idx_normalizer import normalize_stock_payload
    from stocks import get_all_tickers
except ModuleNotFoundError:
    from backend.database import Fundamental, OHLCVDaily, SessionLocal, Stock
    from backend.services.idx_api_client import get_idx_client, parse_idx_number
    from backend.services.idx_normalizer import normalize_stock_payload
    from backend.stocks import get_all_tickers

logger = logging.getLogger(__name__)


def _parse_date(value: Any, fallback: date | None = None) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())
    if isinstance(value, str) and value:
        for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%Y%m%d"):
            try:
                return datetime.strptime(value[:19] if "T" in value else value[:10], fmt)
            except ValueError:
                continue
    return datetime.combine(fallback or date.today(), datetime.min.time())


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


def _upsert_ohlcv(db, ticker: str, row: dict[str, Any], target_date: date) -> None:
    trade_date = _parse_date(row.get("Date"), target_date)
    stmt = insert(OHLCVDaily).values(
        ticker=ticker,
        date=trade_date,
        open=parse_idx_number(row.get("OpenPrice")),
        high=parse_idx_number(row.get("High")),
        low=parse_idx_number(row.get("Low")),
        close=parse_idx_number(row.get("Close")),
        volume=int(parse_idx_number(row.get("Volume")) or 0),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["ticker", "date"],
        set_={
            "open": stmt.excluded.open,
            "high": stmt.excluded.high,
            "low": stmt.excluded.low,
            "close": stmt.excluded.close,
            "volume": stmt.excluded.volume,
        },
    )
    db.execute(stmt)


def _upsert_fundamental_from_screener(db, row: dict[str, Any]) -> bool:
    ticker = (row.get("stockCode") or row.get("Code") or "").upper().replace(".JK", "")
    if not ticker:
        return False
    stmt = insert(Fundamental).values(
        ticker=ticker,
        trailing_pe=parse_idx_number(row.get("per")),
        price_to_book=parse_idx_number(row.get("pbv")),
        roe=parse_idx_number(row.get("roe")),
        roa=parse_idx_number(row.get("roa")),
        debt_to_equity=parse_idx_number(row.get("der")),
        revenue=parse_idx_number(row.get("tRevenue")),
        updated_at=datetime.utcnow(),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["ticker"],
        set_={
            "trailing_pe": stmt.excluded.trailing_pe,
            "price_to_book": stmt.excluded.price_to_book,
            "roe": stmt.excluded.roe,
            "roa": stmt.excluded.roa,
            "debt_to_equity": stmt.excluded.debt_to_equity,
            "revenue": stmt.excluded.revenue,
            "updated_at": stmt.excluded.updated_at,
        },
    )
    db.execute(stmt)
    return True


def _candidate_dates(target_date: date, fallback_days: int) -> list[date]:
    return [target_date - timedelta(days=offset) for offset in range(max(fallback_days, 0) + 1)]


def sync_idx_stock_summary(client=None, target_date: date | None = None, fallback_days: int = 7) -> dict:
    client = client or get_idx_client()
    target_date = target_date or date.today()
    rows: list[dict[str, Any]] = []
    data_date = target_date
    for candidate in _candidate_dates(target_date, fallback_days):
        rows = client.get_stock_summary(candidate)
        if rows:
            data_date = candidate
            break
    db = SessionLocal()
    ok = 0
    failed = 0
    try:
        for row in rows:
            ticker = (row.get("StockCode") or "").upper().replace(".JK", "")
            if not ticker:
                failed += 1
                continue
            _upsert_stock_snapshot(
                db,
                {
                    "ticker": ticker,
                    "name": row.get("StockName") or ticker,
                    "sector": row.get("Sector"),
                    "industry": row.get("Industry"),
                    "market_cap": parse_idx_number(row.get("MarketCapital")),
                },
            )
            _upsert_ohlcv(db, ticker, row, data_date)
            ok += 1
        db.commit()
        return {
            "ok": ok,
            "failed": failed,
            "data_date": data_date.isoformat(),
            "target_date": target_date.isoformat(),
            "synced_at": datetime.utcnow().isoformat(timespec="seconds"),
        }
    except Exception:
        db.rollback()
        logger.exception("IDX stock summary sync failed")
        raise
    finally:
        db.close()


def sync_idx_securities_and_fundamentals(client=None) -> dict:
    client = client or get_idx_client()
    db = SessionLocal()
    ok = 0
    failed = 0
    try:
        securities = client.get_securities_stock()
        for row in securities:
            ticker = (row.get("Code") or "").upper().replace(".JK", "")
            if not ticker:
                failed += 1
                continue
            _upsert_stock_snapshot(
                db,
                {
                    "ticker": ticker,
                    "name": row.get("Name") or ticker,
                    "sector": row.get("Sector"),
                    "industry": row.get("SubSector") or row.get("Industry"),
                    "market_cap": parse_idx_number(row.get("MarketCapital")),
                },
            )
            ok += 1
        for row in client.get_stock_screener():
            ticker = (row.get("stockCode") or row.get("Code") or "").upper().replace(".JK", "")
            if ticker:
                _upsert_stock_snapshot(
                    db,
                    {
                        "ticker": ticker,
                        "name": row.get("companyName") or ticker,
                        "sector": row.get("sector"),
                        "industry": row.get("industry") or row.get("subIndustry"),
                        "market_cap": parse_idx_number(row.get("marketCapital")),
                    },
                )
                _upsert_fundamental_from_screener(db, row)
        db.commit()
        return {"ok": ok, "failed": failed, "synced_at": datetime.utcnow().isoformat(timespec="seconds")}
    except Exception:
        db.rollback()
        logger.exception("IDX securities/fundamentals sync failed")
        raise
    finally:
        db.close()


def run_idx_daily_sync(tickers: list[str] | None = None) -> dict:
    # New bulk path: IDX website provides full exchange summary per date, so do
    # one scheduled provider call batch, then UI reads local DB/cache only.
    if tickers is None:
        summary = sync_idx_stock_summary()
        meta = sync_idx_securities_and_fundamentals()
        return {
            "ok": summary["ok"],
            "failed": summary["failed"] + meta["failed"],
            "synced_at": datetime.utcnow().isoformat(timespec="seconds"),
            "source": "idx_website",
            "data_date": summary.get("data_date"),
            "target_date": summary.get("target_date"),
            "meta_ok": meta["ok"],
        }

    if not tickers:
        return {"ok": 0, "failed": 0, "synced_at": datetime.utcnow().isoformat(timespec="seconds")}

    # Backward-compatible per-ticker path for old tests/custom adapters.
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
