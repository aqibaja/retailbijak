"""
SwingAQ Scanner — FastAPI Backend
===================================
Entry point. Serves API endpoints + frontend static files.
Referensi: planning/API_SPEC.md
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.resolve()))

from typing import Any
from collections import defaultdict
from datetime import datetime, date, timedelta
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, Request
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
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
    from backend.routes.scanner import router as scanner_router
    from backend.routes.signals import router as signals_router
    from backend.routes.calendar import router as calendar_router
    from backend.routes.index_constituents import router as index_constituents_router
    from backend.routes.comments import router as comments_router
    from backend.routes.auth import router as auth_router
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
    from routes.scanner import router as scanner_router
    from routes.signals import router as signals_router
    from routes.sectors import router as sectors_router
    from routes.calendar import router as calendar_router
    from routes.index_constituents import router as index_constituents_router
    from routes.comments import router as comments_router
    from routes.auth import router as auth_router
try:
    from backend.routes.macro import router as macro_router
except ModuleNotFoundError:
    from routes.macro import router as macro_router

try:
    from backend.routes.portfolio import router as portfolio_router
except ModuleNotFoundError:
    from routes.portfolio import router as portfolio_router

try:
    from backend.routes.drawings import router as drawings_router
except ModuleNotFoundError:
    from routes.drawings import router as drawings_router

try:
    from backend.routes.seed import router as seed_router
except ModuleNotFoundError:
    from routes.seed import router as seed_router


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
app.include_router(scanner_router)
app.include_router(signals_router)
app.include_router(sectors_router)
app.include_router(calendar_router)
app.include_router(index_constituents_router)
app.include_router(comments_router)
app.include_router(auth_router)
app.include_router(macro_router)
app.include_router(portfolio_router)
app.include_router(drawings_router)
app.include_router(seed_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_cache_headers(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path

    # Cache static files for 24 hours
    if any(path.endswith(ext) for ext in ('.css', '.js', '.woff2', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp')):
        if path.endswith('.html') or path == '/' or path == '':
            response.headers['Cache-Control'] = 'no-cache'
        else:
            response.headers['Cache-Control'] = 'public, max-age=86400'
    # Cache static-like API endpoints
    elif path.startswith('/api/stocks') and request.method == 'GET':
        response.headers['Cache-Control'] = 'public, max-age=30'
    elif path.startswith('/api/sectors') or path.startswith('/api/industries'):
        response.headers['Cache-Control'] = 'public, max-age=300'  # 5 min
    elif path.startswith('/api/timeframes'):
        response.headers['Cache-Control'] = 'public, max-age=3600'  # 1 hour
    elif path.startswith('/api/health'):
        response.headers['Cache-Control'] = 'no-cache'

    return response


FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


# --- Static files ---
# Root / and SPA fallback are handled by StaticFiles(html=True) below.


@app.get("/api/ai-picks")
def get_ai_picks(mode: str = "swing", limit: int = 5, db: Session = Depends(get_db)):
    safe_limit = max(0, min(int(limit or 0), 20))
    if safe_limit == 0:
        return build_ai_picks_fallback_payload(mode=mode, trading_date=_current_jakarta_trading_date())
    report = get_latest_ai_pick_report(mode=mode, db=db)
    # Jika report ada tapi data kosong (fallback/no_data): rebuild ulang
    if report is not None:
        data = report.get('data') or []
        source = report.get('source') or ''
        if len(data) == 0 and source in ('no_data', 'db'):
            report = None  # Treat as no report — force rebuild
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


# --- SEO Routes ---


@app.get('/robots.txt', include_in_schema=False)
def robots_txt():
    return Response(
        content="User-agent: *\nAllow: /\nSitemap: https://retailbijak.rich27.my.id/sitemap.xml\n",
        media_type='text/plain',
    )


@app.get('/sitemap.xml', include_in_schema=False)
def sitemap_xml():
    """Dynamic XML sitemap with all ticker detail pages + static pages."""
    try:
        from stocks import get_all_tickers
    except ModuleNotFoundError:
        from backend.stocks import get_all_tickers

    from datetime import date

    today = date.today().isoformat()
    base_url = "https://retailbijak.rich27.my.id"

    static_pages = [
        ('', '1.0', 'daily'),
        ('screener', '0.9', 'daily'),
        ('market', '0.8', 'daily'),
        ('portfolio', '0.6', 'weekly'),
        ('news', '0.7', 'daily'),
        ('settings', '0.3', 'monthly'),
        ('help', '0.4', 'monthly'),
    ]

    urls = []
    for path, priority, changefreq in static_pages:
        urls.append(f'''  <url>
    <loc>{base_url}/{path}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>{changefreq}</changefreq>
    <priority>{priority}</priority>
  </url>''')

    # Add ticker detail pages (top 200 tickers for SEO sanity)
    try:
        tickers = get_all_tickers()
        display_tickers = [t.replace('.JK', '') for t in tickers if t][:200]
        for ticker in display_tickers:
            urls.append(f'''  <url>
    <loc>{base_url}/stock/{ticker}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>''')
    except Exception:
        pass

    xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{chr(10).join(urls)}
</urlset>'''
    return Response(content=xml, media_type='application/xml')


# Mount the entire frontend directory at / to serve static files (js, views, style.css)
# html=True serves index.html for / and for any unmatched paths (SPA fallback)
# MUST be at the bottom so it doesn't intercept /api routes
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend_root")