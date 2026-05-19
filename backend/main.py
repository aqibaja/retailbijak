"""
SwingAQ Scanner — FastAPI Backend
===================================
Entry point. Serves API endpoints + frontend static files.
Referensi: planning/API_SPEC.md
"""

from pathlib import Path
from typing import Any
from collections import defaultdict
from datetime import datetime, date, timedelta
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

VALID_TIMEFRAMES = ["1d", "1h", "4h", "1wk", "1mo"]
try:
    from backend.stocks import get_all_tickers, get_ticker_display
except ModuleNotFoundError:
    from stocks import get_all_tickers, get_ticker_display
try:
    from backend.database import (
        Base,
        engine,
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
    from database import (
        Base,
        engine,
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
    from backend.scheduler import init_scheduler, scheduler
except ModuleNotFoundError:
    from scheduler import init_scheduler, scheduler
try:
    from backend.ai_picks import get_latest_ai_pick_report, build_ai_picks_payload, build_ai_picks_fallback_payload, _current_jakarta_trading_date, generate_and_store_daily_ai_pick_report
except ModuleNotFoundError:
    from ai_picks import get_latest_ai_pick_report, build_ai_picks_payload, build_ai_picks_fallback_payload, _current_jakarta_trading_date, generate_and_store_daily_ai_pick_report
try:
    from backend.services.idx_api_client import get_idx_client, parse_idx_number
except ModuleNotFoundError:
    from services.idx_api_client import get_idx_client, parse_idx_number
try:
    from backend.services.idx_response_factory import ok as _resp_ok
except ModuleNotFoundError:
    from services.idx_response_factory import ok as _resp_ok

try:
    from backend.routes.user import router as user_router
    from backend.routes.system import router as system_router
    from backend.routes.reference import router as reference_router
    from backend.routes.stocks import router as stock_router, _display_ticker, _company_name, _stock_row_from_static
    from backend.routes.stock_detail import router as stock_detail_router
    from backend.routes.market import router as market_router
    from backend.routes.market_summary import router as market_summary_router
    from backend.routes.news import router as news_router
    from backend.routes.scanner_stream import router as scanner_stream_router
    from backend.routes.sectors import router as sectors_router
except ModuleNotFoundError:
    from routes.user import router as user_router
    from routes.system import router as system_router
    from routes.reference import router as reference_router
    from routes.stocks import router as stock_router, _display_ticker, _company_name, _stock_row_from_static
    from routes.stock_detail import router as stock_detail_router
    from routes.market import router as market_router
    from routes.market_summary import router as market_summary_router
    from routes.news import router as news_router
    from routes.scanner_stream import router as scanner_stream_router
    from routes.sectors import router as sectors_router


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
app.include_router(news_router)
app.include_router(scanner_stream_router)
app.include_router(sectors_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


# --- Cache Control Middleware ---
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

class CacheControlMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        path = request.url.path
        
        # No cache for HTML (SPA shell)
        if path.endswith('.html') or path == '/':
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        # Short cache for versioned assets (CSS, JS with ?v=)
        elif '?v=' in str(request.url):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        # API: no cache
        elif path.startswith('/api/'):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        
        return response

app.add_middleware(CacheControlMiddleware)

# --- Static files ---
# Root / and SPA fallback are handled by StaticFiles(html=True) below.


@app.get("/api/ai-picks")
def get_ai_picks(mode: str = "swing", limit: int = 5, db: Session = Depends(get_db)):
    safe_limit = max(0, min(int(limit or 0), 20))
    if safe_limit == 0:
        return build_ai_picks_fallback_payload(mode=mode, trading_date=_current_jakarta_trading_date())
    report = get_latest_ai_pick_report(mode=mode, db=db)
    if report is None:
        return build_ai_picks_payload(mode=mode, limit=safe_limit)
    # Stale check: rebuild jika report > 4 jam
    gen_at = report.get('generated_at')
    if gen_at:
        try:
            gen_dt = datetime.fromisoformat(gen_at)
            if datetime.utcnow() - gen_dt > timedelta(hours=4):
                return generate_and_store_daily_ai_pick_report(mode=mode, limit=safe_limit, db=db)
        except (ValueError, TypeError):
            pass
    return report


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


try:
    from routes.shared_sqlite_helpers import _sqlite_datetime_literal
except ModuleNotFoundError:
    from backend.routes.shared_sqlite_helpers import _sqlite_datetime_literal

try:
    from bandarmology import full_analysis, rows_to_dicts, calc_broker_streaks, detect_phase, calc_foreign_domestic_flow, calc_volume_spike, calc_broker_concentration
except ModuleNotFoundError:
    from backend.bandarmology import full_analysis, rows_to_dicts, calc_broker_streaks, detect_phase, calc_foreign_domestic_flow, calc_volume_spike, calc_broker_concentration

try:
    from updaters.indexalpha_updater import fetch_single_ticker, check_quota
except ModuleNotFoundError:
    from backend.updaters.indexalpha_updater import fetch_single_ticker, check_quota


# ── Bandarmology Endpoints ────────────────────────────────────────────────────

@app.get("/api/stocks/{ticker}/broker-summary")
def get_broker_summary(ticker: str, days: int = 7, db: Session = Depends(get_db)):
    """Broker summary per ticker, multi-hari dari DB."""
    ticker = ticker.upper()
    from_dt = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(BrokerSummary)
        .filter(BrokerSummary.ticker == ticker, BrokerSummary.date >= from_dt)
        .order_by(BrokerSummary.date.desc(), BrokerSummary.net_value.desc())
        .all()
    )
    data = rows_to_dicts(rows)
    has_real = any(r.get("source") == "real" for r in data)
    last_updated = data[0]["date"] if data else None
    return {
        "ticker": ticker,
        "source": "real" if has_real else "synthetic",
        "last_updated": last_updated,
        "count": len(data),
        "data": data,
    }


@app.get("/api/stocks/{ticker}/bandarmology")
def get_bandarmology(ticker: str, days: int = 7, db: Session = Depends(get_db)):
    """Analisis bandarmology lengkap untuk satu ticker."""
    ticker = ticker.upper()
    from_dt = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(BrokerSummary)
        .filter(BrokerSummary.ticker == ticker, BrokerSummary.date >= from_dt)
        .order_by(BrokerSummary.date.asc())
        .all()
    )
    data = rows_to_dicts(rows)
    result = full_analysis(ticker, data, db=db)
    return result


@app.get("/api/bandarmology/screener")
def bandarmology_screener(
    phase: str = "all",       # all | accumulation | distribution | neutral
    min_spike: float = 0.0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Screener: daftar saham berdasarkan fase bandarmology."""
    from sqlalchemy import func as sqlfunc

    limit = max(1, min(int(limit), 100))

    # Ambil semua ticker yang punya broker_summary
    from_dt = datetime.utcnow() - timedelta(days=7)
    tickers_with_data = (
        db.query(BrokerSummary.ticker)
        .filter(BrokerSummary.date >= from_dt)
        .distinct()
        .all()
    )
    tickers = [t[0] for t in tickers_with_data]

    results = []
    for tkr in tickers:
        rows = (
            db.query(BrokerSummary)
            .filter(BrokerSummary.ticker == tkr, BrokerSummary.date >= from_dt)
            .order_by(BrokerSummary.date.asc())
            .all()
        )
        data = rows_to_dicts(rows)
        if not data:
            continue

        streaks = calc_broker_streaks(data)
        ph = detect_phase(streaks)
        flow = calc_foreign_domestic_flow(data)
        spike = calc_volume_spike(tkr, db)
        has_real = any(r.get("source") == "real" for r in data)

        # Filter by phase
        if phase != "all" and ph["phase"] != phase:
            continue

        # Filter by volume spike
        spike_ratio = spike.get("spike_ratio", 1.0) if spike else 1.0
        if spike_ratio < min_spike:
            continue

        # Get stock name
        stock = db.query(Stock).filter(Stock.ticker == tkr).first()
        name = stock.name if stock else tkr

        # Latest price
        latest_ohlcv = (
            db.query(OHLCVDaily)
            .filter(OHLCVDaily.ticker == tkr)
            .order_by(OHLCVDaily.date.desc())
            .first()
        )
        last_price = latest_ohlcv.close if latest_ohlcv else None
        prev_ohlcv = (
            db.query(OHLCVDaily)
            .filter(OHLCVDaily.ticker == tkr)
            .order_by(OHLCVDaily.date.desc())
            .offset(1)
            .first()
        )
        change_pct = None
        if latest_ohlcv and prev_ohlcv and prev_ohlcv.close:
            change_pct = round((latest_ohlcv.close - prev_ohlcv.close) / prev_ohlcv.close * 100, 2)

        top_broker = streaks[0] if streaks else None

        results.append({
            "ticker": tkr,
            "name": name,
            "phase": ph["phase"],
            "phase_confidence": ph["confidence"],
            "phase_streak_days": ph["streak_days"],
            "phase_description": ph["description"],
            "foreign_net_value": flow["foreign_net_value"],
            "foreign_direction": flow["foreign_direction"],
            "domestic_net_value": flow["domestic_net_value"],
            "confluence": flow["confluence"],
            "confluence_type": flow["confluence_type"],
            "volume_spike_ratio": spike_ratio,
            "volume_spike_level": spike.get("level", "normal") if spike else "normal",
            "top_broker_code": top_broker["broker_code"] if top_broker else None,
            "top_broker_name": top_broker["broker_name"] if top_broker else None,
            "top_broker_net_value": top_broker["total_net_value"] if top_broker else None,
            "last_price": last_price,
            "change_pct": change_pct,
            "source": "real" if has_real else "synthetic",
        })

    # Sort: accumulation first by confidence, then distribution, then neutral
    phase_order = {"accumulation": 0, "distribution": 1, "neutral": 2}
    results.sort(key=lambda x: (phase_order.get(x["phase"], 3), -x["phase_confidence"]))

    return {
        "count": len(results),
        "phase_filter": phase,
        "data": results[:limit],
    }


@app.post("/api/bandarmology/fetch")
def trigger_bandarmology_fetch(payload: dict, db: Session = Depends(get_db)):
    """Manual trigger fetch satu ticker dari IndexAlpha API."""
    ticker = str(payload.get("ticker", "")).upper()
    days_back = int(payload.get("days_back", 7))
    if not ticker:
        return {"status": "error", "error": "ticker required"}
    result = fetch_single_ticker(ticker, days_back=days_back)
    return result


@app.get("/api/bandarmology/quota")
def get_bandarmology_quota():
    """Cek sisa quota IndexAlpha API."""
    return check_quota()


# Mount the entire frontend directory at / to serve static files (js, views, style.css)
# html=True serves index.html for / and for any unmatched paths (SPA fallback)
# MUST be at the bottom so it doesn't intercept /api routes
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend_root")
