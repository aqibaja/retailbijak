"""
indexalpha_updater.py — Fetch broker summary dari IndexAlpha API.

Strategi hemat quota (5 req/hari trial):
- Fetch investor=all untuk N ticker prioritas
- 1 request = 1 ticker, date range 7 hari ke belakang
- Simpan ke DB dengan source='real', replace data synthetic
- Scheduler jalan jam 19:30 WIB (setelah IndexAlpha update jam 19:00)

Priority ticker selection:
1. Ticker di watchlist user
2. Ticker dengan volume spike tertinggi (dari ohlcv_daily)
3. Fallback: ticker paling aktif
"""

import logging
import os
import requests
from datetime import datetime, timedelta, timezone
from collections import defaultdict

logger = logging.getLogger(__name__)

INDEXALPHA_BASE = "https://api.indexalpha.id"
INDEXALPHA_API_KEY = os.getenv("INDEXALPHA_API_KEY", "ia_live_J5A9Vmszl6D36lUWfcd7ooof")

# Broker type mapping untuk synthetic fallback
FOREIGN_BROKER_CODES = {
    'AK', 'YB', 'YP', 'ZP', 'YU', 'KZ', 'CS', 'DP', 'GW',
    'YJ', 'RX', 'RB', 'TP', 'DR', 'AH', 'AI', 'FS', 'MG', 'XL', 'XA',
}


def _headers() -> dict:
    return {
        "accept": "application/json",
        "Authorization": f"Bearer {INDEXALPHA_API_KEY}",
    }


def fetch_broker_summary(ticker: str, from_date: str, to_date: str, investor: str = "all") -> list:
    """
    Fetch broker summary dari IndexAlpha API.
    Returns list of broker dicts, atau [] jika error.
    """
    url = f"{INDEXALPHA_BASE}/stocks/broker-summary"
    params = {
        "ticker": ticker,
        "from": from_date,
        "to": to_date,
        "investor": investor,
    }
    try:
        resp = requests.get(url, headers=_headers(), params=params, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            return data.get("data", [])
        elif resp.status_code == 429:
            logger.warning(f"IndexAlpha rate limit hit for {ticker}")
            return []
        elif resp.status_code == 401:
            logger.error("IndexAlpha API key invalid or expired")
            return []
        else:
            logger.error(f"IndexAlpha error {resp.status_code} for {ticker}: {resp.text[:200]}")
            return []
    except Exception as e:
        logger.error(f"IndexAlpha fetch failed for {ticker}: {e}")
        return []


def check_quota() -> dict:
    """
    Cek sisa quota dari IndexAlpha /usage endpoint.
    Returns: { used, limit, remaining, plan } atau error dict.
    """
    url = f"{INDEXALPHA_BASE}/usage"
    try:
        resp = requests.get(url, headers=_headers(), timeout=10)
        if resp.status_code == 200:
            return resp.json()
        return {"error": f"HTTP {resp.status_code}", "used": -1, "limit": -1, "remaining": -1}
    except Exception as e:
        return {"error": str(e), "used": -1, "limit": -1, "remaining": -1}


def get_priority_tickers(db, n: int = 5) -> list:
    """
    Pilih N ticker prioritas untuk di-fetch hari ini.
    Urutan prioritas:
    1. Ticker di watchlist user
    2. Ticker dengan volume spike tertinggi (volume terbaru / MA20)
    3. Fallback: ticker paling aktif by volume
    """
    try:
        from database import WatchlistItem, OHLCVDaily
        from sqlalchemy import desc, func, text

        tickers = []
        seen = set()

        # 1. Watchlist user
        watchlist = db.query(WatchlistItem).limit(n).all()
        for w in watchlist:
            if w.ticker not in seen:
                tickers.append(w.ticker)
                seen.add(w.ticker)

        if len(tickers) >= n:
            return tickers[:n]

        # 2. Volume spike: ambil ticker dengan spike ratio tertinggi
        # Ambil volume terbaru per ticker
        latest_date_row = db.execute(
            text("SELECT date FROM ohlcv_daily ORDER BY date DESC LIMIT 1")
        ).fetchone()

        if latest_date_row:
            latest_date = latest_date_row[0]
            # Volume terbaru
            latest_vols = db.execute(
                text("SELECT ticker, volume FROM ohlcv_daily WHERE date = :d ORDER BY volume DESC LIMIT 50"),
                {"d": latest_date}
            ).fetchall()

            # MA20 per ticker
            spike_candidates = []
            for ticker, vol in latest_vols:
                if ticker in seen or not vol:
                    continue
                ma_row = db.execute(
                    text("""
                        SELECT AVG(volume) FROM (
                            SELECT volume FROM ohlcv_daily
                            WHERE ticker = :t AND date < :d AND volume IS NOT NULL
                            ORDER BY date DESC LIMIT 20
                        )
                    """),
                    {"t": ticker, "d": latest_date}
                ).fetchone()
                ma20 = ma_row[0] if ma_row and ma_row[0] else vol
                spike_ratio = vol / ma20 if ma20 > 0 else 1.0
                spike_candidates.append((ticker, spike_ratio))

            # Sort by spike ratio desc
            spike_candidates.sort(key=lambda x: x[1], reverse=True)
            for ticker, _ in spike_candidates:
                if ticker not in seen and len(tickers) < n:
                    tickers.append(ticker)
                    seen.add(ticker)

        if len(tickers) >= n:
            return tickers[:n]

        # 3. Fallback: ticker paling aktif by total volume
        active = db.execute(
            text("SELECT ticker, SUM(volume) as tv FROM ohlcv_daily GROUP BY ticker ORDER BY tv DESC LIMIT 20")
        ).fetchall()
        for ticker, _ in active:
            if ticker not in seen and len(tickers) < n:
                tickers.append(ticker)
                seen.add(ticker)

        return tickers[:n]

    except Exception as e:
        logger.error(f"get_priority_tickers failed: {e}")
        return []


def upsert_broker_rows(db, ticker: str, date_str: str, api_rows: list, investor_type: str = "all"):
    """
    Upsert broker summary rows ke DB dari response IndexAlpha API.
    Hapus data synthetic untuk ticker+date ini, insert data real.
    """
    from database import BrokerSummary

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d")

        # Hapus data lama untuk ticker+date ini
        db.query(BrokerSummary).filter(
            BrokerSummary.ticker == ticker,
            BrokerSummary.date == target_date,
        ).delete()

        # Insert data baru
        for row in api_rows:
            code = row.get("code", "")
            if not code:
                continue

            record = BrokerSummary(
                ticker=ticker,
                date=target_date,
                broker_code=code,
                buy_volume=int(row.get("buy_volume", 0) or 0),
                sell_volume=int(row.get("sell_volume", 0) or 0),
                net_volume=int(row.get("buy_volume", 0) or 0) - int(row.get("sell_volume", 0) or 0),
                buy_value=float(row.get("buy_value", 0) or 0),
                sell_value=float(row.get("sell_value", 0) or 0),
                net_value=float(row.get("buy_value", 0) or 0) - float(row.get("sell_value", 0) or 0),
                buy_freq=int(row.get("buy_freq", 0) or 0),
                sell_freq=int(row.get("sell_freq", 0) or 0),
                buy_avg=float(row.get("buy_avg", 0) or 0) or None,
                sell_avg=float(row.get("sell_avg", 0) or 0) or None,
                source="real",
            )
            db.add(record)

        db.commit()
        return len(api_rows)

    except Exception as e:
        db.rollback()
        logger.error(f"upsert_broker_rows failed for {ticker} {date_str}: {e}")
        return 0


def update_indexalpha_data(n_tickers: int = 5, days_back: int = 7) -> dict:
    """
    Main scheduler function. Dipanggil jam 19:30 WIB setiap hari kerja.

    1. Cek quota
    2. Ambil priority tickers
    3. Fetch broker summary per ticker (date range days_back hari)
    4. Upsert ke DB
    5. Return summary
    """
    try:
        from database import SessionLocal
    except ModuleNotFoundError:
        from backend.database import SessionLocal

    db = SessionLocal()
    summary = {
        "status": "ok",
        "tickers_fetched": [],
        "tickers_failed": [],
        "total_records": 0,
        "quota": {},
        "timestamp": datetime.now().isoformat(),
    }

    try:
        # Cek quota dulu
        quota = check_quota()
        summary["quota"] = quota
        remaining = quota.get("remaining", -1)

        if remaining == 0:
            logger.warning("IndexAlpha quota exhausted, skipping fetch")
            summary["status"] = "quota_exhausted"
            return summary

        # Sesuaikan n_tickers dengan sisa quota
        if remaining > 0:
            n_tickers = min(n_tickers, remaining)

        # Ambil priority tickers
        tickers = get_priority_tickers(db, n=n_tickers)
        if not tickers:
            logger.warning("No priority tickers found")
            summary["status"] = "no_tickers"
            return summary

        logger.info(f"IndexAlpha fetch: {tickers} ({days_back} days back)")

        # Date range
        today = datetime.now(timezone.utc).date()
        from_date = (today - timedelta(days=days_back)).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")

        for ticker in tickers:
            try:
                rows = fetch_broker_summary(ticker, from_date, to_date, investor="all")
                if not rows:
                    logger.warning(f"No data from IndexAlpha for {ticker}")
                    summary["tickers_failed"].append(ticker)
                    continue

                # Group rows by date
                by_date = defaultdict(list)
                for row in rows:
                    # IndexAlpha mungkin return date field — cek strukturnya
                    # Jika tidak ada date field, gunakan today
                    row_date = row.get("date", to_date)
                    if hasattr(row_date, "strftime"):
                        row_date = row_date.strftime("%Y-%m-%d")
                    by_date[str(row_date)[:10]].append(row)

                total_saved = 0
                if by_date:
                    for date_str, date_rows in by_date.items():
                        saved = upsert_broker_rows(db, ticker, date_str, date_rows)
                        total_saved += saved
                else:
                    # Semua rows untuk to_date
                    total_saved = upsert_broker_rows(db, ticker, to_date, rows)

                summary["tickers_fetched"].append(ticker)
                summary["total_records"] += total_saved
                logger.info(f"IndexAlpha: {ticker} → {total_saved} records saved")

            except Exception as e:
                logger.error(f"IndexAlpha fetch error for {ticker}: {e}")
                summary["tickers_failed"].append(ticker)

        if summary["tickers_failed"] and not summary["tickers_fetched"]:
            summary["status"] = "all_failed"
        elif summary["tickers_failed"]:
            summary["status"] = "partial"

        return summary

    except Exception as e:
        logger.error(f"update_indexalpha_data failed: {e}")
        summary["status"] = "error"
        summary["error"] = str(e)
        return summary
    finally:
        db.close()


def fetch_single_ticker(ticker: str, days_back: int = 7) -> dict:
    """
    Fetch satu ticker on-demand (untuk endpoint manual trigger).
    Returns summary dict.
    """
    try:
        from database import SessionLocal
    except ModuleNotFoundError:
        from backend.database import SessionLocal

    db = SessionLocal()
    try:
        today = datetime.now(timezone.utc).date()
        from_date = (today - timedelta(days=days_back)).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")

        rows = fetch_broker_summary(ticker, from_date, to_date, investor="all")
        if not rows:
            return {"status": "no_data", "ticker": ticker, "records_saved": 0}

        by_date = defaultdict(list)
        for row in rows:
            row_date = row.get("date", to_date)
            if hasattr(row_date, "strftime"):
                row_date = row_date.strftime("%Y-%m-%d")
            by_date[str(row_date)[:10]].append(row)

        total_saved = 0
        if by_date:
            for date_str, date_rows in by_date.items():
                saved = upsert_broker_rows(db, ticker, date_str, date_rows)
                total_saved += saved
        else:
            total_saved = upsert_broker_rows(db, ticker, to_date, rows)

        quota = check_quota()
        return {
            "status": "ok",
            "ticker": ticker,
            "records_saved": total_saved,
            "quota_remaining": quota.get("remaining", -1),
        }
    except Exception as e:
        return {"status": "error", "ticker": ticker, "error": str(e), "records_saved": 0}
    finally:
        db.close()
