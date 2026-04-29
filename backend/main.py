"""
SwingAQ Scanner — FastAPI Backend
===================================
Entry point. Serves API endpoints + frontend static files.
Referensi: planning/API_SPEC.md
"""

from pathlib import Path
import json
import time
from datetime import datetime
import asyncio

from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from scanner import VALID_TIMEFRAMES
from stocks import get_all_tickers, get_ticker_display
from database import (
    Base,
    engine,
    SessionLocal,
    Signal,
    UserSetting,
    WatchlistItem,
    PortfolioPosition,
    get_db,
)
from scheduler import init_scheduler, scheduler

app = FastAPI(title="SwingAQ Scanner", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    # Initialize DB tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # Start background schedulers
    init_scheduler()

@app.on_event("shutdown")
def on_shutdown():
    scheduler.shutdown()

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
@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/timeframes")
async def timeframes():
    labels = {"1d": "Daily", "1h": "H1", "4h": "H4", "1wk": "Weekly", "1mo": "Monthly"}
    return {
        "timeframes": [
            {"value": tf, "label": labels.get(tf, tf)} for tf in VALID_TIMEFRAMES
        ]
    }


@app.get("/api/stocks")
async def stocks():
    tickers = get_all_tickers()
    return {"count": len(tickers), "tickers": tickers}


async def scan_all_db_generator(timeframe: str):
    db = SessionLocal()
    try:
        tickers = get_all_tickers()
        total = len(tickers)
        start_time = time.time()

        # Start event
        yield f"data: {json.dumps({'type': 'start', 'total': total, 'timeframe': timeframe, 'timestamp': datetime.now().isoformat(timespec='seconds')})}\n\n"

        signals_found = 0
        total_scanned = 0

        for i, ticker in enumerate(tickers):
            total_scanned += 1

            # Progress event
            yield f"data: {json.dumps({'type': 'progress', 'current': i + 1, 'total': total, 'ticker': ticker, 'percent': round((i + 1) / total * 100, 2)})}\n\n"

            # Fetch latest signal from DB
            signal = db.query(Signal).filter(
                Signal.ticker == ticker,
                Signal.timeframe == timeframe
            ).order_by(Signal.signal_date.desc()).first()

            if signal and signal.signal_type == 'buy':
                signals_found += 1
                result = {
                    "ticker": ticker,
                    "name": get_ticker_display(ticker),
                    "timeframe": timeframe,
                    "date": signal.signal_date.strftime('%Y-%m-%d %H:%M'),
                    "close": signal.close,
                    "magic_line": signal.magic_line,
                    "cci": signal.cci,
                    "stop_loss": signal.stop_loss,
                    "sl_pct": signal.sl_pct
                }
                yield f"data: {json.dumps({'type': 'result', 'data': result})}\n\n"

            # Small delay to yield control and allow SSE to flush
            await asyncio.sleep(0.001)

        duration = round(time.time() - start_time, 1)
        yield f"data: {json.dumps({'type': 'done', 'total_signals': signals_found, 'total_scanned': total_scanned, 'total_skipped': 0, 'duration_seconds': duration, 'timeframe': timeframe})}\n\n"

    finally:
        db.close()


@app.get("/api/scan")
async def scan(timeframe: str = "1d"):
    if timeframe not in VALID_TIMEFRAMES:
        raise HTTPException(400, f"Invalid timeframe. Valid: {VALID_TIMEFRAMES}")

    return StreamingResponse(
        scan_all_db_generator(timeframe),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/stocks/{ticker}")
def get_stock(ticker: str, db: Session = Depends(get_db)):
    """API endpoint for debugging specific stock data"""
    signals = db.query(Signal).filter(Signal.ticker == ticker).all()
    if not signals:
        return {"ticker": ticker, "message": "No signals found"}
        
    return {
        "ticker": ticker,
        "signals": [
            {
                "timeframe": s.timeframe,
                "status": s.status,
                "magic_line": s.magic_line,
                "updated_at": s.updated_at
            } for s in signals
        ]
    }


@app.get("/api/news")
def get_news(db: Session = Depends(get_db), limit: int = 20):
    """API endpoint to get latest market news"""
    from database import News
    news = db.query(News).order_by(News.published_at.desc()).limit(limit).all()
    return {
        "count": len(news),
        "data": [
            {
                "title": n.title,
                "link": n.link,
                "published_at": n.published_at.isoformat() if n.published_at else None,
                "source": n.source,
                "summary": n.summary
            } for n in news
        ]
    }


@app.get("/api/stocks/{ticker}/fundamental")
def get_fundamental(ticker: str, db: Session = Depends(get_db)):
    """API endpoint to get fundamental data for a specific stock"""
    from database import Fundamental
    
    # Optional: if client passes 'BBCA', we append '.JK'
    if not ticker.endswith('.JK'):
        ticker = f"{ticker}.JK"
        
    fundamental = db.query(Fundamental).filter(Fundamental.ticker == ticker).first()
    
    if not fundamental:
        return {"ticker": ticker, "message": "Fundamental data not found"}
        
    return {
        "ticker": ticker,
        "data": {
            "trailing_pe": fundamental.trailing_pe,
            "forward_pe": fundamental.forward_pe,
            "price_to_book": fundamental.price_to_book,
            "trailing_eps": fundamental.trailing_eps,
            "dividend_yield": fundamental.dividend_yield,
            "roe": fundamental.roe,
            "roa": fundamental.roa,
            "debt_to_equity": fundamental.debt_to_equity,
            "revenue": fundamental.revenue,
            "net_income": fundamental.net_income,
            "free_cashflow": fundamental.free_cashflow,
            "updated_at": fundamental.updated_at.isoformat() if fundamental.updated_at else None
        }
    }


@app.get("/api/stocks/{ticker}/technical")
def get_technical_summary_api(ticker: str, db: Session = Depends(get_db)):
    """API endpoint to get technical analysis summary (RSI, MACD, etc)"""
    from indicators_extended import get_ohlcv_dataframe, calculate_all_indicators, get_technical_summary
    
    if not ticker.endswith('.JK'):
        ticker = f"{ticker}.JK"
        
    df = get_ohlcv_dataframe(db, ticker, limit=300) # Need enough data for 200 SMA
    if df.empty:
        return {"ticker": ticker, "status": "no_data"}
        
    df_ind = calculate_all_indicators(df)
    summary = get_technical_summary(df_ind)
    
    return {
        "ticker": ticker,
        "technical": summary
    }


@app.get("/api/stocks/{ticker}/chart-data")
def get_chart_data(ticker: str, limit: int = 100, db: Session = Depends(get_db)):
    """API endpoint to get OHLCV and indicators for charting"""
    from indicators_extended import get_ohlcv_dataframe, calculate_all_indicators
    import numpy as np
    
    if not ticker.endswith('.JK'):
        ticker = f"{ticker}.JK"
        
    # We fetch more data to calculate indicators properly, then slice
    df = get_ohlcv_dataframe(db, ticker, limit=limit + 200)
    if df.empty:
        return {"ticker": ticker, "data": []}
        
    df_ind = calculate_all_indicators(df)
    
    # Slice to requested limit
    df_ind = df_ind.tail(limit)
    
    # Replace NaN with None for JSON serialization
    df_ind = df_ind.replace({np.nan: None})
    
    # Convert index to string
    df_ind.index = df_ind.index.strftime('%Y-%m-%d')
    
    # Reset index so date is a column
    df_ind = df_ind.reset_index()
    
    # Convert to dict records
    records = df_ind.to_dict('records')
    
    return {
        "ticker": ticker,
        "count": len(records),
        "data": records
    }


@app.get("/api/market-summary")
def get_market_summary(db: Session = Depends(get_db)):
    """Return market summary strictly from local DB (no live provider calls)."""
    from database import OHLCVDaily

    latest_row = db.query(OHLCVDaily).order_by(OHLCVDaily.date.desc()).first()
    if not latest_row:
        return {"symbol": "IHSG", "value": None, "change_pct": None, "source": "db", "updated_at": None}

    return {
        "symbol": "IHSG",
        "value": None,
        "change_pct": None,
        "source": "db",
        "updated_at": latest_row.date.isoformat() if latest_row.date else None,
    }


@app.get("/api/settings")
def get_settings(db: Session = Depends(get_db)):
    compact = db.query(UserSetting).filter(UserSetting.key == "compact_table_rows").first()
    auto_refresh = db.query(UserSetting).filter(UserSetting.key == "auto_refresh_screener").first()
    return {
        "compact_table_rows": compact.value == "true" if compact else False,
        "auto_refresh_screener": auto_refresh.value == "true" if auto_refresh else False,
    }


@app.put("/api/settings")
def update_settings(payload: SettingsPayload, db: Session = Depends(get_db)):
    updates = {
        "compact_table_rows": "true" if payload.compact_table_rows else "false",
        "auto_refresh_screener": "true" if payload.auto_refresh_screener else "false",
    }

    for key, value in updates.items():
        row = db.query(UserSetting).filter(UserSetting.key == key).first()
        if row:
            row.value = value
        else:
            db.add(UserSetting(key=key, value=value))

    db.commit()
    return {"ok": True, **payload.model_dump()}


@app.get("/api/watchlist")
def get_watchlist(db: Session = Depends(get_db)):
    rows = db.query(WatchlistItem).order_by(WatchlistItem.ticker.asc()).all()
    return {
        "count": len(rows),
        "data": [
            {
                "id": row.id,
                "ticker": row.ticker,
                "notes": row.notes,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ],
    }


@app.post("/api/watchlist")
def add_watchlist(payload: WatchlistPayload, db: Session = Depends(get_db)):
    ticker = payload.ticker.upper().strip()
    existing = db.query(WatchlistItem).filter(WatchlistItem.ticker == ticker).first()
    if existing:
        existing.notes = payload.notes
        db.commit()
        db.refresh(existing)
        return {"ok": True, "item": {"id": existing.id, "ticker": existing.ticker, "notes": existing.notes}}

    row = WatchlistItem(ticker=ticker, notes=payload.notes)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "item": {"id": row.id, "ticker": row.ticker, "notes": row.notes}}


@app.delete("/api/watchlist/{ticker}")
def delete_watchlist(ticker: str, db: Session = Depends(get_db)):
    row = db.query(WatchlistItem).filter(WatchlistItem.ticker == ticker.upper().strip()).first()
    if not row:
        raise HTTPException(404, "Watchlist item not found")
    db.delete(row)
    db.commit()
    return {"ok": True}


@app.get("/api/portfolio")
def get_portfolio(db: Session = Depends(get_db)):
    rows = db.query(PortfolioPosition).order_by(PortfolioPosition.ticker.asc()).all()
    return {
        "count": len(rows),
        "data": [
            {
                "id": row.id,
                "ticker": row.ticker,
                "lots": row.lots,
                "avg_price": row.avg_price,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ],
    }


@app.post("/api/portfolio")
def upsert_portfolio(payload: PortfolioPayload, db: Session = Depends(get_db)):
    ticker = payload.ticker.upper().strip()
    row = db.query(PortfolioPosition).filter(PortfolioPosition.ticker == ticker).first()
    if row:
        row.lots = payload.lots
        row.avg_price = payload.avg_price
        db.commit()
        db.refresh(row)
        return {"ok": True, "item": {"id": row.id, "ticker": row.ticker, "lots": row.lots, "avg_price": row.avg_price}}

    row = PortfolioPosition(ticker=ticker, lots=payload.lots, avg_price=payload.avg_price)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "item": {"id": row.id, "ticker": row.ticker, "lots": row.lots, "avg_price": row.avg_price}}


@app.delete("/api/portfolio/{ticker}")
def delete_portfolio(ticker: str, db: Session = Depends(get_db)):
    row = db.query(PortfolioPosition).filter(PortfolioPosition.ticker == ticker.upper().strip()).first()
    if not row:
        raise HTTPException(404, "Portfolio position not found")
    db.delete(row)
    db.commit()
    return {"ok": True}


# Mount the entire frontend directory at / to serve static files (js, views, style.css)
# MUST be at the bottom so it doesn't intercept /api routes
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend_root")
