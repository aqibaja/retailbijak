"""
SwingAQ Scanner — FastAPI Backend
===================================
Entry point. Serves API endpoints + frontend static files.
Referensi: planning/API_SPEC.md
"""

from pathlib import Path
import json
import time
from collections import defaultdict
from datetime import datetime
import asyncio

from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
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
        UserSetting,
        WatchlistItem,
        PortfolioPosition,
        get_db,
    )
try:
    from scheduler import init_scheduler, scheduler
except ModuleNotFoundError:
    from backend.scheduler import init_scheduler, scheduler

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

    # Avoid re-initializing scheduler in repeated app lifecycles (e.g. tests).
    if not scheduler.running:
        init_scheduler()


@app.on_event("shutdown")
def on_shutdown():
    if scheduler.running:
        scheduler.shutdown(wait=False)

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

def _display_ticker(t: str) -> str:
    return _ticker_base(t)

def _company_name(t: str) -> str:
    base = _display_ticker(t)
    return COMPANY_NAMES.get(base, get_ticker_display(base))

def _stock_row_from_static(t: str, i: int = 0) -> dict:
    base = _display_ticker(t)
    # deterministic, clearly data-universe derived fallback when price DB is empty
    return {"ticker": base, "name": _company_name(base), "sector": SECTOR_HINTS.get(base, "IDX Equity"), "price": None, "change_pct": None, "rank": i + 1}

def _search_rank(row_ticker: str, row_name: str | None, row_sector: str | None, query: str) -> tuple[int, int, int, int]:
    ticker = _display_ticker(row_ticker)
    name = (row_name or _company_name(row_ticker)).upper()
    sector = (row_sector or SECTOR_HINTS.get(ticker, "")).upper()
    q = query.strip().upper()
    if not q:
        return (0, 0, 0, 0)
    ticker_exact = 0 if ticker == q else 1
    ticker_prefix = 0 if ticker.startswith(q) else 1
    name_prefix = 0 if name.startswith(q) else 1
    name_contains = 0 if q in name else 1
    sector_match = 0 if q in sector else 1
    return (ticker_exact, ticker_prefix, name_prefix + name_contains, sector_match)


def _search_bucket(ticker: str, name: str, sector: str, query: str) -> str:
    q = query.strip().upper()
    t = ticker.upper()
    n = name.upper()
    s = sector.upper()
    if q and (t == q or t.startswith(q)):
        return "ticker"
    if q and n.startswith(q):
        return "company"
    if q and len(q) >= 4 and q in s:
        return "sector"
    return "company" if q and q in n else "ticker"


@app.get("/api/stocks/search")
def search_stocks(q: str = "", limit: int = 10, db: Session = Depends(get_db)):
    query = q.strip().upper()
    if not query:
        return {"count": 0, "data": [], "source": "empty"}

    rows = db.query(Stock).limit(2000).all()
    data = []
    if rows:
        for row in rows:
            ticker = _display_ticker(row.ticker)
            name = row.name or _company_name(row.ticker)
            sector = row.sector or SECTOR_HINTS.get(ticker, "")
            if query in ticker or query in name.upper() or (len(query) >= 4 and query in sector.upper()):
                data.append({
                    "ticker": ticker,
                    "name": name,
                    "sector": sector,
                    "source": "db",
                    "bucket": _search_bucket(ticker, name, sector, query),
                    "_rank": _search_rank(row.ticker, row.name, row.sector, query),
                })
    if not data:
        for i, ticker in enumerate(get_all_tickers()):
            base = _display_ticker(ticker)
            name = _company_name(base)
            sector = SECTOR_HINTS.get(base, "")
            if query in base or query in name.upper() or (len(query) >= 4 and query in sector.upper()):
                item = _stock_row_from_static(base, i)
                item["source"] = "idx_universe"
                item["bucket"] = _search_bucket(base, name, sector, query)
                item["_rank"] = _search_rank(base, name, sector, query)
                data.append(item)

    data.sort(key=lambda r: (r.get("_rank") or (9, 9, 9, 9), r.get("ticker") or ""))
    for item in data:
        item.pop("_rank", None)
    grouped = {"ticker": [], "company": [], "sector": []}
    for item in data:
        grouped[item.get("bucket", "company")].append(item)
    ordered = grouped["ticker"] + grouped["company"] + grouped["sector"]
    return {"count": len(ordered[:limit]), "data": ordered[:limit], "source": "db" if rows else "idx_universe", "groups": {k: len(v) for k, v in grouped.items()}}

@app.get("/api/top-movers")
def top_movers(limit: int = 10, db: Session = Depends(get_db)):
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

@app.get("/api/stocks/{ticker}")
def get_stock(ticker: str, db: Session = Depends(get_db)):
    base = _ticker_base(ticker)
    payload = _fallback_row_for_ticker(base, db)
    if not payload["price"] and not payload["signals"]:
        return {"ticker": base, "message": "No signals found", "data": payload}
    return {"ticker": base, "data": payload}


@app.get("/api/stocks/{ticker}/analysis")
def get_stock_analysis(ticker: str, db: Session = Depends(get_db)):
    try:
        from backend.services.scanner_engine import analyze_stock
    except ModuleNotFoundError:
        from services.scanner_engine import analyze_stock
    row = _fallback_row_for_ticker(ticker, db)
    analysis = analyze_stock({
        "ticker": row["ticker"],
        "name": row["name"],
        "price": row["price"] or 0,
        "per": row["per"],
        "pbv": row["pbv"],
        "roe": row["roe"],
        "roa": row["roa"],
        "market_cap": row["market_cap"],
        "dividend_yield": row["dividend_yield"],
        "volume_spike": 1,
        "trend_score": 50,
        "liquidity_score": 50,
        "volatility_score": 50,
        "breakout": False,
    })
    return {"ticker": row["ticker"], "status": "ok", "data": analysis}


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

    fallback = [
        {"title": "IHSG dan saham big cap jadi fokus investor hari ini", "link": "#market", "published_at": datetime.utcnow().isoformat(), "source": "RetailBijak", "summary": "Market brief internal berbasis universe IDX."},
        {"title": "Perbankan, energi, dan teknologi masuk radar rotasi sektor", "link": "#screener", "published_at": datetime.utcnow().isoformat(), "source": "RetailBijak", "summary": "Gunakan scanner untuk validasi momentum dan risiko."},
        {"title": "Disiplin entry: tunggu volume dan konfirmasi trend sebelum agresif", "link": "#dashboard", "published_at": datetime.utcnow().isoformat(), "source": "RetailBijak", "summary": "Risk note untuk retail trader."},
    ]
    data = [{"title": n.title, "link": n.link, "published_at": n.published_at.isoformat() if n.published_at else None, "source": n.source, "summary": n.summary} for n in news]
    if not data:
        data = fallback[:limit]
    return {"count": len(data), "data": data, "source": "db" if news else "fallback"}

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
    try:
        from indicators_extended import get_ohlcv_dataframe, calculate_all_indicators, get_technical_summary, empty_technical_summary
    except ModuleNotFoundError as exc:
        empty = {
            "status": "no_data",
            "summary": f"Technical engine unavailable: {exc}",
            "rating": "NO DATA",
            "score": 50,
            "indicators": {
                "rsi": {"value": None, "status": "Insufficient"},
                "macd": {"macd_line": None, "signal": None, "histogram": None, "status": "Insufficient"},
                "trend": {"sma_5": None, "sma_10": None, "sma_20": None, "sma_50": None, "sma_200": None, "ema_20": None, "status": "Insufficient"},
                "bollinger_bands": {"upper": None, "middle": None, "lower": None},
                "stochastic": {"k": None, "d": None, "status": "Insufficient"},
                "atr": {"value": None, "status": "Insufficient"},
                "volume": {"latest": None, "avg_20": None, "ratio": None, "status": "Insufficient"},
                "support_resistance": {"support_20d": None, "resistance_20d": None},
            },
        }
        return {"ticker": ticker if ticker.endswith('.JK') else f"{ticker}.JK", "status": "no_data", "technical": empty, "message": str(exc)}
    
    if not ticker.endswith('.JK'):
        ticker = f"{ticker}.JK"
        
    df = get_ohlcv_dataframe(db, ticker, limit=300) # Need enough data for 200 SMA
    if df.empty:
        return {"ticker": ticker, "status": "no_data", "technical": empty_technical_summary()}
        
    df_ind = calculate_all_indicators(df)
    summary = get_technical_summary(df_ind)
    
    return {
        "ticker": ticker,
        "technical": summary
    }


@app.get("/api/stocks/{ticker}/chart-data")
def get_chart_data(ticker: str, limit: int = 100, db: Session = Depends(get_db)):
    """API endpoint to get OHLCV and indicators for charting"""
    try:
        from indicators_extended import get_ohlcv_dataframe, calculate_all_indicators
        import numpy as np
    except ModuleNotFoundError as exc:
        return {"ticker": ticker if ticker.endswith('.JK') else f"{ticker}.JK", "data": [], "status": "no_data", "message": str(exc)}
    
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


@app.get("/api/ihsg-chart")
def get_ihsg_chart(period: str = "1M", db: Session = Depends(get_db)):
    """Return IHSG chart time-series from locally stored IDX data."""
    valid_periods = ["1D", "1W", "1M", "1Q", "1Y"]
    if period not in valid_periods:
        period = "1M"
    key = f"idx_ihsg_chart_{period}"
    setting = db.query(UserSetting).filter(UserSetting.key == key).first()
    if setting and setting.value:
        try:
            data = json.loads(setting.value)
            chart_data = data.get("ChartData", [])
            # Convert epoch ms to ISO dates and extract close prices
            points = []
            for pt in chart_data:
                ts = pt.get("Date", 0)
                if ts:
                    dt = datetime.fromtimestamp(ts / 1000)
                    points.append({
                        "date": dt.strftime("%Y-%m-%d"),
                        "value": pt.get("Close"),
                    })
            return {
                "period": period,
                "index_code": data.get("IndexCode", "COMPOSITE"),
                "open_price": data.get("OpenPrice"),
                "max_price": data.get("MaxPrice"),
                "min_price": data.get("MinPrice"),
                "count": len(points),
                "data": points,
                "source": "idx_cached",
            }
        except (json.JSONDecodeError, KeyError):
            pass
    return {"period": period, "count": 0, "data": [], "source": "idx_cached", "message": "No cached data. Run daily sync first."}


@app.get("/api/market-summary")
def get_market_summary(db: Session = Depends(get_db)):
    """Return market summary strictly from local DB (no live provider calls)."""
    try:
        from database import OHLCVDaily
    except ModuleNotFoundError:
        from backend.database import OHLCVDaily

    setting = db.query(UserSetting).filter(UserSetting.key == "idx_market_summary").first()
    if setting and setting.value:
        try:
            payload = json.loads(setting.value)
            close = payload.get("close")
            previous = payload.get("previous") or payload.get("open")
            change_pct = payload.get("percent")
            if change_pct is None and close and previous:
                change_pct = ((float(close) - float(previous)) / float(previous)) * 100
            data_date = payload.get("date")
            return {
                "symbol": "IHSG",
                "value": round(float(close), 2) if close is not None else None,
                "open": round(float(previous), 2) if previous is not None else None,
                "high": round(float(payload.get("high")), 2) if payload.get("high") is not None else None,
                "low": round(float(payload.get("low")), 2) if payload.get("low") is not None else None,
                "change": round(float(payload.get("change")), 2) if payload.get("change") is not None else None,
                "change_pct": round(float(change_pct), 2) if change_pct is not None else None,
                "source": "idx_index_summary",
                "updated_at": data_date,
                "data_date": data_date,
                "data_label": f"Data IDX tanggal {data_date}" if data_date else None,
                "status": "ok",
                "coverage": db.query(OHLCVDaily).filter(OHLCVDaily.date == datetime.fromisoformat(data_date) if data_date else True).count() if data_date else 0,
            }
        except Exception:
            pass

    latest_row = db.query(OHLCVDaily).order_by(OHLCVDaily.date.desc()).first()
    if not latest_row:
        return {
            "symbol": "IHSG",
            "value": None,
            "change_pct": None,
            "source": "db",
            "updated_at": None,
            "status": "no_data",
        }

    latest_date = latest_row.date
    latest_rows = db.query(OHLCVDaily).filter(OHLCVDaily.date == latest_date).all()
    if not latest_rows:
        return {
            "symbol": "IHSG",
            "value": None,
            "change_pct": None,
            "source": "db",
            "updated_at": latest_date.isoformat() if latest_date else None,
            "status": "no_data",
        }

    current_closes = [row.close for row in latest_rows if row.close is not None and row.close > 0]
    if not current_closes:
        return {
            "symbol": "IHSG",
            "value": None,
            "change_pct": None,
            "source": "db",
            "updated_at": latest_date.isoformat() if latest_date else None,
            "status": "no_data",
        }

    value = sum(current_closes) / len(current_closes)

    prev_row = db.query(OHLCVDaily).filter(OHLCVDaily.date < latest_date).order_by(OHLCVDaily.date.desc()).first()
    change_pct = None
    if prev_row:
        prev_date = prev_row.date
        prev_rows = db.query(OHLCVDaily).filter(OHLCVDaily.date == prev_date).all()
        prev_closes = [row.close for row in prev_rows if row.close is not None and row.close > 0]
        if prev_closes:
            prev_value = sum(prev_closes) / len(prev_closes)
            if prev_value > 0:
                change_pct = ((value - prev_value) / prev_value) * 100

    data_date = latest_date.date().isoformat() if latest_date else None
    return {
        "symbol": "IDX Composite (Proxy)",
        "value": round(value, 2),
        "change_pct": round(change_pct, 2) if change_pct is not None else None,
        "source": "db",
        "updated_at": latest_date.isoformat() if latest_date else None,
        "data_date": data_date,
        "data_label": f"Data IDX tanggal {data_date}" if data_date else None,
        "status": "ok",
        "coverage": len(latest_rows),
    }


@app.get("/api/sector-summary")
def get_sector_summary(db: Session = Depends(get_db)):
    rows = db.query(Stock).all()
    buckets = defaultdict(lambda: {"count": 0, "market_cap": 0.0})
    for row in rows:
        sector = row.sector or "Unknown"
        buckets[sector]["count"] += 1
        buckets[sector]["market_cap"] += float(row.market_cap or 0)
    if not rows:
        return {"count": 0, "data": [{"sector": "Banking", "count": 0, "market_cap": 0}, {"sector": "Consumer", "count": 0, "market_cap": 0}, {"sector": "Energy", "count": 0, "market_cap": 0}]}
    data = [{"sector": sector, "count": val["count"], "market_cap": round(val["market_cap"], 2)} for sector, val in sorted(buckets.items(), key=lambda item: item[1]["count"], reverse=True)]
    return {"count": len(data), "data": data}


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
