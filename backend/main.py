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
    from stocks import get_all_tickers, get_ticker_display
except ModuleNotFoundError:
    from backend.stocks import get_all_tickers, get_ticker_display
try:
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
except ModuleNotFoundError:
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
    from routes.news import router as news_router
    from routes.scanner_stream import router as scanner_stream_router
except ModuleNotFoundError:
    from backend.routes.user import router as user_router
    from backend.routes.system import router as system_router
    from backend.routes.reference import router as reference_router
    from backend.routes.stocks import router as stock_router, _display_ticker, _company_name, _stock_row_from_static
    from backend.routes.stock_detail import router as stock_detail_router, _ticker_base, _fallback_row_for_ticker
    from backend.routes.market import router as market_router
    from backend.routes.market_summary import router as market_summary_router
    from backend.routes.news import router as news_router
    from backend.routes.scanner_stream import router as scanner_stream_router


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




def _sqlite_datetime_literal(value):
    if value is None:
        return None
    if hasattr(value, "strftime"):
        return value.strftime("%Y-%m-%d %H:%M:%S.%f")
    return str(value)


# Mount the entire frontend directory at / to serve static files (js, views, style.css)
# MUST be at the bottom so it doesn't intercept /api routes
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend_root")
