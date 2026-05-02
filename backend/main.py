"""
SwingAQ Scanner — FastAPI Backend
===================================
Entry point. Serves API endpoints + frontend static files.
Referensi: planning/API_SPEC.md
"""

from pathlib import Path
import json
import time
from typing import Any
import pandas as pd
from collections import defaultdict
from datetime import datetime, date
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

VALID_TIMEFRAMES = ["1d", "1h", "4h", "1wk", "1mo"]
try:
    from stocks import get_all_tickers, get_ticker_display
except ModuleNotFoundError:
    from backend.stocks import get_all_tickers, get_ticker_display
try:
    from database import (
        Base,
        engine,
        SessionLocal,
        Signal,
        Stock,
        Fundamental,
        OHLCVDaily,
        BrokerSummary,
        UserSetting,
        WatchlistItem,
        PortfolioPosition,
        get_db,
    )
except ModuleNotFoundError:
    from backend.database import (
        Base,
        engine,
        SessionLocal,
        Signal,
        Stock,
        Fundamental,
        OHLCVDaily,
        BrokerSummary,
        UserSetting,
        WatchlistItem,
        PortfolioPosition,
        get_db,
    )
try:
    from indicators import compute_swingaq_signals
except ModuleNotFoundError:
    from backend.indicators import compute_swingaq_signals
try:
    from indicators_extended import get_ohlcv_dataframe
except ModuleNotFoundError:
    from backend.indicators_extended import get_ohlcv_dataframe
try:
    from scheduler import init_scheduler, scheduler
except ModuleNotFoundError:
    from backend.scheduler import init_scheduler, scheduler
try:
    from services.idx_api_client import get_idx_client, parse_idx_number
except ModuleNotFoundError:
    from backend.services.idx_api_client import get_idx_client, parse_idx_number
try:
    from services.idx_response_factory import ok as _resp_ok
except ModuleNotFoundError:
    from backend.services.idx_response_factory import ok as _resp_ok

try:
    from routes.user import router as user_router
    from routes.system import router as system_router
    from routes.reference import router as reference_router
    from routes.stocks import router as stock_router, _display_ticker, _company_name, _stock_row_from_static
    from routes.stock_detail import router as stock_detail_router, _ticker_base, _fallback_row_for_ticker
    from routes.market import router as market_router
    from routes.market_summary import router as market_summary_router
except ModuleNotFoundError:
    from backend.routes.user import router as user_router
    from backend.routes.system import router as system_router
    from backend.routes.reference import router as reference_router
    from backend.routes.stocks import router as stock_router, _display_ticker, _company_name, _stock_row_from_static
    from backend.routes.stock_detail import router as stock_detail_router, _ticker_base, _fallback_row_for_ticker
    from backend.routes.market import router as market_router
    from backend.routes.market_summary import router as market_summary_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    if not scheduler.running:
        init_scheduler()
    try:
        yield
    finally:
        if scheduler.running:
            scheduler.shutdown(wait=False)


app = FastAPI(title="SwingAQ Scanner", version="1.0.0", lifespan=lifespan)
app.include_router(user_router)
app.include_router(system_router)
app.include_router(reference_router)
app.include_router(stock_router)
app.include_router(stock_detail_router)
app.include_router(market_router)
app.include_router(market_summary_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


# --- Static files ---
# Serve index.html at root
@app.get("/")
async def root():
    return FileResponse(str(FRONTEND_DIR / "index.html"))


class SettingsPayload(BaseModel):
    compact_table_rows: bool = False
    auto_refresh_screener: bool = False


class WatchlistPayload(BaseModel):
    ticker: str = Field(min_length=1)
    notes: str = ""


class PortfolioPayload(BaseModel):
    ticker: str = Field(min_length=1)
    lots: int = Field(gt=0)
    avg_price: float = Field(gt=0)


# --- API ---
async def scan_all_db_generator(timeframe: str, rule: str | None = None):
    db = SessionLocal()
    try:
        tickers = get_all_tickers()
        total = len(tickers)
        start_time = time.time()
        yield f"data: {json.dumps({'type': 'start', 'total': total, 'timeframe': timeframe, 'rule': 'SwingAQ (PineScript)', 'timestamp': datetime.now().isoformat(timespec='seconds')})}\n\n"

        signals_found = 0
        total_scanned = 0
        total_skipped = 0

        for i, ticker in enumerate(tickers):
            total_scanned += 1
            yield f"data: {json.dumps({'type': 'progress', 'current': i + 1, 'total': total, 'ticker': ticker, 'percent': round((i + 1) / total * 100, 2), 'rule': 'SwingAQ'})}\n\n"

            df = get_ohlcv_dataframe(db, ticker, limit=100)
            if df.empty or len(df) < 20:
                total_skipped += 1
                await asyncio.sleep(0.001)
                continue

            # Rename columns to match indicators.py expected case ['Open', 'High', 'Low', 'Close', 'Volume']
            df.columns = [c.capitalize() for c in df.columns]
            
            df_sig = compute_swingaq_signals(df)
            latest = df_sig.iloc[-1]
            
            # Check for buy signal only
            signal_type = None
            if latest['buy_signal']: 
                signal_type = 'BUY'
            
            if signal_type:
                close = float(latest['Close'])
                sl = float(latest['sl']) if not pd.isna(latest['sl']) else close * 0.95
                
                result = {
                    'ticker': ticker,
                    'name': get_ticker_display(ticker),
                    'timeframe': timeframe,
                    'rule': 'SwingAQ (PineScript)',
                    'reason': f"Signal {signal_type} Detected",
                    'date': latest.name.strftime('%Y-%m-%d'),
                    'close': round(close, 2),
                    'entry': round(close, 2),
                    'target': round(close * 1.05, 2),
                    'stop_loss': round(sl, 2),
                    'sl_pct': round((1 - sl/close) * 100, 2) if close else 0,
                    'magic_line': round(float(latest['magic_line']), 2),
                    'cci': round(float(latest['cci']), 2),
                    'volume_spike': round(float(latest.get('volume_spike', 0)), 2),
                    'signal': signal_type
                }
                signals_found += 1
                yield f"data: {json.dumps({'type': 'result', 'data': result})}\n\n"
            
            await asyncio.sleep(0.001)

        duration = round(time.time() - start_time, 1)
        yield f"data: {json.dumps({'type': 'done', 'total_signals': signals_found, 'total_scanned': total_scanned, 'total_skipped': total_skipped, 'duration_seconds': duration, 'timeframe': timeframe, 'rule': 'SwingAQ (PineScript)'})}\n\n"
    finally:
        db.close()


@app.get("/api/scan")
async def scan(timeframe: str = "1d", rule: str | None = None):
    if timeframe not in VALID_TIMEFRAMES:
        raise HTTPException(400, f"Invalid timeframe. Valid: {VALID_TIMEFRAMES}")

    return StreamingResponse(
        scan_all_db_generator(timeframe, rule=rule),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _ticker_base(ticker: str) -> str:
    return ticker.upper().replace('.JK', '').strip()


def _fallback_row_for_ticker(ticker: str, db: Session) -> dict:
    base = _ticker_base(ticker)
    stock = db.query(Stock).filter(Stock.ticker == base).first()
    fundamental = db.query(Fundamental).filter(Fundamental.ticker == f"{base}.JK").first()
    latest_ohlcv = (
        db.query(OHLCVDaily)
        .filter(OHLCVDaily.ticker == base)
        .order_by(OHLCVDaily.date.desc())
        .first()
    )
    latest_signal = (
        db.query(Signal)
        .filter(Signal.ticker == base)
        .order_by(Signal.signal_date.desc())
        .first()
    )
    return {
        "ticker": base,
        "name": stock.name if stock and stock.name else base,
        "sector": stock.sector if stock else None,
        "industry": stock.industry if stock else None,
        "price": latest_ohlcv.close if latest_ohlcv else None,
        "change_pct": None,
        "market_cap": stock.market_cap if stock else None,
        "per": fundamental.trailing_pe if fundamental else None,
        "pbv": fundamental.price_to_book if fundamental else None,
        "roe": fundamental.roe if fundamental else None,
        "roa": fundamental.roa if fundamental else None,
        "dividend_yield": fundamental.dividend_yield if fundamental else None,
        "signals": [{"timeframe": latest_signal.timeframe, "signal_type": latest_signal.signal_type}] if latest_signal else [],
    }



COMPANY_NAMES = {
    "GOTO": "GoTo Gojek Tokopedia Tbk.", "BBCA": "Bank Central Asia Tbk.", "BMRI": "Bank Mandiri Tbk.",
    "BBRI": "Bank Rakyat Indonesia Tbk.", "TLKM": "Telkom Indonesia Tbk.", "ASII": "Astra International Tbk.",
    "BRPT": "Barito Pacific Tbk.", "ADRO": "Adaro Energy Indonesia Tbk.", "ANTM": "Aneka Tambang Tbk.", "UNVR": "Unilever Indonesia Tbk.",
    "AMMN": "Amman Mineral Internasional Tbk.", "BREN": "Barito Renewables Energy Tbk.", "BUMI": "Bumi Resources Tbk.",
}
SECTOR_HINTS = {
    "BBCA":"Financials", "BMRI":"Financials", "BBRI":"Financials", "TLKM":"Infrastructure", "GOTO":"Technology",
    "ASII":"Industrials", "BRPT":"Basic Materials", "ADRO":"Energy", "ANTM":"Basic Materials", "UNVR":"Consumer Non-Cyclicals",
    "AMMN":"Basic Materials", "BREN":"Energy", "BUMI":"Energy",
}

def _legacy_top_movers_snapshot(limit: int = 10, db: Session = Depends(get_db)):
    latest = db.query(OHLCVDaily).order_by(OHLCVDaily.date.desc()).first()
    movers = []
    if latest:
        latest_date = latest.date
        rows = db.query(OHLCVDaily).filter(OHLCVDaily.date == latest_date).limit(500).all()
        for row in rows:
            prev = db.query(OHLCVDaily).filter(OHLCVDaily.ticker == row.ticker, OHLCVDaily.date < latest_date).order_by(OHLCVDaily.date.desc()).first()
            chg = ((row.close - prev.close) / prev.close * 100) if prev and prev.close else 0
            stock = db.query(Stock).filter(Stock.ticker == _display_ticker(row.ticker)).first()
            movers.append({"ticker": _display_ticker(row.ticker), "name": stock.name if stock and stock.name else _company_name(row.ticker), "price": row.close, "change_pct": round(chg, 2), "volume": row.volume, "source": "db"})
        movers.sort(key=lambda r: abs(r.get("change_pct") or 0), reverse=True)
    if not movers:
        preferred = ["GOTO", "BRPT", "BBCA", "BMRI", "TLKM", "AMMN", "BREN", "ASII", "ANTM", "ADRO"]
        movers = [{**_stock_row_from_static(t, i), "source": "idx_universe"} for i, t in enumerate(preferred)]
    return {"count": len(movers[:limit]), "data": movers[:limit], "source": movers[0].get("source") if movers else "none"}


@app.get("/api/news")
def get_news(db: Session = Depends(get_db), limit: int = 20):
    """Get latest market news from DB; opportunistically refresh RSS if DB is empty."""
    try:
        from database import News
    except ModuleNotFoundError:
        from backend.database import News

    news = db.query(News).order_by(News.published_at.desc()).limit(limit).all()
    if not news:
        try:
            try:
                from updaters.news_updater import update_news
            except ModuleNotFoundError:
                from backend.updaters.news_updater import update_news
            update_news()
            news = db.query(News).order_by(News.published_at.desc()).limit(limit).all()
        except Exception:
            news = []

    data = [{"title": n.title, "link": n.link, "published_at": n.published_at.isoformat() if n.published_at else None, "source": n.source, "summary": n.summary} for n in news]
    return {"count": len(data), "data": data, "source": "db" if news else "no_data"}


_corporate_actions_cache: dict[str, Any] = {"data": None, "ts": 0}


@app.get("/api/corporate-actions")
def get_corporate_actions(year: int | None = None, month: int | None = None, limit: int = 30):
    """Corporate actions: listings (new/warrants), dividends — live from IDX DigitalStatistic.

    Uses only working IDX endpoints:
    - LINK_LISTING via GetApiDataPaginated (listing/warrant data, last 3 months)
    - LINK_DIVIDEND via GetApiData (dividend announcements)
    Suspension endpoint (GetSuspension) returns 503 — wrapped in try/except.
    Results cached for 5 min to avoid IDX rate-limit.
    """
    import time as _time
    now = _time.time()
    if _corporate_actions_cache["data"] and (now - _corporate_actions_cache["ts"]) < 300:
        return _corporate_actions_cache["data"]

    client = get_idx_client()
    year = year or datetime.utcnow().year
    month = month or datetime.utcnow().month
    actions: list[dict[str, Any]] = []

    # --- Listing / Warrant data (last 3 months cumulative) ---
    try:
        for m_offset in range(3):
            m = month - m_offset
            y = year
            if m < 1:
                m += 12
                y -= 1
            listing = client.get_json(
                f"/primary/DigitalStatistic/GetApiDataPaginated?"
                f"urlName=LINK_LISTING&periodYear={y}&periodMonth={m}"
                f"&periodType=monthly&isPrint=False&cumulative=true"
                f"&pageSize={limit}&pageNumber=1"
            )
            if listing.ok and isinstance(listing.data, dict):
                rows = listing.data.get("data") or []
                if isinstance(rows, list):
                    for item in rows:
                        actions.append({
                            "type": "listing",
                            "title": item.get("issuerName") or item.get("code"),
                            "code": item.get("code"),
                            "date": item.get("StartDate"),
                            "end_date": item.get("LastDate"),
                            "shares": item.get("NumOfShares"),
                            "source": "idx_listing",
                        })
    except Exception:
        pass

    # --- Dividend data (IDX DigitalStatistic) ---
    try:
        dividend = client.get_json(
            "/primary/DigitalStatistic/GetApiData?urlName=LINK_DIVIDEND"
        )
        if dividend.ok and isinstance(dividend.data, dict):
            rows = dividend.data.get("data") or []
            if isinstance(rows, list):
                for item in rows:
                    actions.append({
                        "type": "dividend",
                        "title": item.get("name") or item.get("code"),
                        "code": item.get("code"),
                        "cash_dividend": item.get("cashDividend"),
                        "cum_dividend": item.get("cumDividend"),
                        "ex_dividend": item.get("exDividend"),
                        "record_date": item.get("recordDate"),
                        "payment_date": item.get("paymentDate"),
                        "date": item.get("cumDividend") or item.get("exDividend"),
                        "source": "idx_dividend",
                    })
    except Exception:
        pass

    # --- Suspension (wrapped — IDX often returns 503) ---
    try:
        suspension = client.get_json(
            "/primary/ListedCompany/GetSuspension?resultCount=10"
        )
        if suspension.ok and isinstance(suspension.data, dict):
            rows = suspension.data.get("results") or suspension.data.get("data") or []
            if isinstance(rows, list):
                for item in rows:
                    actions.append({
                        "type": "suspension",
                        "title": item.get("code") or item.get("companyName"),
                        "code": item.get("code"),
                        "date": item.get("date") or item.get("startDate"),
                        "source": "idx_suspension",
                    })
    except Exception:
        pass

    # Deduplicate by (type, code)
    seen = set()
    unique: list[dict[str, Any]] = []
    for a in actions:
        key = (a.get("type"), a.get("code"))
        if key not in seen:
            seen.add(key)
            unique.append(a)

    result = _resp_ok(unique[:limit], source="idx_corporate_live", count=len(unique[:limit]))
    _corporate_actions_cache["data"] = result
    _corporate_actions_cache["ts"] = now
    return result


@app.get("/api/company-announcements")
def get_company_announcements(companyCode: str = "", limit: int = 20):
    client = get_idx_client()
    resp = client.get_json(f"/primary/ListedCompany/GetAnnouncement?kodeEmiten={companyCode}&indexFrom=0&pageSize={limit}&dateFrom=&dateTo=&lang=id")
    rows = []
    if resp.ok and isinstance(resp.data, dict) and isinstance(resp.data.get("Replies"), list):
        for item in resp.data["Replies"][:limit]:
            p = item.get("pengumuman", {})
            announcement_id = p.get("IdPengumuman") or p.get("PengumumanId") or p.get("id") or p.get("Id")
            attachment = p.get("AttachmentUrl") or p.get("Url") or p.get("Link") or p.get("Lampiran")
            if attachment and isinstance(attachment, str) and attachment.startswith('//'):
                attachment = f"https:{attachment}"
            idx_link = attachment
            if not idx_link and announcement_id:
                idx_link = f"https://www.idx.co.id/id/perusahaan-tercatat/keterbukaan-informasi/?id={announcement_id}"
            if not idx_link:
                code = (p.get("Kode_Emiten") or "").strip().upper()
                idx_link = f"https://www.idx.co.id/id/perusahaan-tercatat/keterbukaan-informasi/?kodeEmiten={code}" if code else "https://www.idx.co.id/id/perusahaan-tercatat/keterbukaan-informasi/"
            rows.append({
                "code": (p.get("Kode_Emiten") or "").strip(),
                "title": p.get("JudulPengumuman") or p.get("PerihalPengumuman") or p.get("JenisPengumuman") or "Announcement",
                "subject": p.get("PerihalPengumuman") or p.get("JenisPengumuman"),
                "date": p.get("TglPengumuman") or p.get("CreatedDate"),
                "type": p.get("JenisPengumuman"),
                "link": idx_link,
                "source": "idx_announcement",
            })
    return {"count": len(rows), "data": rows, "source": "idx_announcement" if rows else "no_data"}


def _sqlite_datetime_literal(value):
    if value is None:
        return None
    if hasattr(value, "strftime"):
        return value.strftime("%Y-%m-%d %H:%M:%S.%f")
    return str(value)


# Mount the entire frontend directory at / to serve static files (js, views, style.css)
# MUST be at the bottom so it doesn't intercept /api routes
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend_root")
