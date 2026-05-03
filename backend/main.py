"""
SwingAQ Scanner — FastAPI Backend
===================================
Entry point. Serves API endpoints + frontend static files.
Referensi: planning/API_SPEC.md
"""

from pathlib import Path
from typing import Any
from collections import defaultdict
from datetime import datetime, date
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
    from backend.ai_picks import build_ai_picks_payload, get_latest_ai_pick_report, generate_and_store_daily_ai_pick_report
except ModuleNotFoundError:
    from ai_picks import build_ai_picks_payload, get_latest_ai_pick_report, generate_and_store_daily_ai_pick_report
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


@app.get("/api/ai-picks")
def get_ai_picks(mode: str = "swing", limit: int = 5, llm: bool = False, refresh: bool = False, db: Session = Depends(get_db)):
    safe_limit = max(0, min(int(limit or 0), 20))
    if safe_limit == 0:
        payload = build_ai_picks_payload(mode=mode, limit=0)
    elif refresh:
        payload = generate_and_store_daily_ai_pick_report(mode=mode, limit=safe_limit or 5, db=db)
    else:
        payload = get_latest_ai_pick_report(mode=mode, db=db) or build_ai_picks_payload(mode=mode, limit=safe_limit)
    if llm:
        try:
            from backend import ai_picks as ai_picks_module
        except ModuleNotFoundError:
            import ai_picks as ai_picks_module

        try:
            payload['llm'] = ai_picks_module.build_ai_picks_llm_payload(
                mode=payload.get('mode') or mode,
                picks=payload.get('data') or [],
                market_context=payload.get('market_context') or {},
                db=db,
            )
        except TypeError:
            payload['llm'] = ai_picks_module.build_ai_picks_llm_payload(
                mode=payload.get('mode') or mode,
                picks=payload.get('data') or [],
                market_context=payload.get('market_context') or {},
            )
    else:
        payload.pop('llm', None)
    return payload


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


# Mount the entire frontend directory at / to serve static files (js, views, style.css)
# MUST be at the bottom so it doesn't intercept /api routes
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend_root")
