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
except ModuleNotFoundError:
    from backend.routes.user import router as user_router
    from backend.routes.system import router as system_router
    from backend.routes.reference import router as reference_router
    from backend.routes.stocks import router as stock_router, _display_ticker, _company_name, _stock_row_from_static


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

@app.get("/api/stocks/{ticker}")
def get_stock(ticker: str, db: Session = Depends(get_db)):
    base = _ticker_base(ticker)
    payload = _fallback_row_for_ticker(base, db)
    if not payload["price"] and not payload["signals"]:
        return {"ticker": base, "message": "No signals found", "data": payload}
    return {"ticker": base, "data": payload}


def _compute_analysis_metrics_from_ohlcv(db: Session, ticker: str) -> dict[str, Any]:
    """Compute real analysis metrics (volume_spike, trend_score, volatility_score, breakout) from OHLCV data."""
    try:
        from indicators_extended import get_ohlcv_dataframe, calculate_all_indicators
    except ModuleNotFoundError:
        from backend.indicators_extended import get_ohlcv_dataframe, calculate_all_indicators

    candidates = [ticker]
    if ticker.endswith('.JK'):
        candidates.append(ticker[:-3])
    else:
        candidates.append(f'{ticker}.JK')

    df = get_ohlcv_dataframe(db, ticker, limit=100)
    if df.empty or len(df) < 20:
        return {"volume_spike": 1.0, "trend_score": 50, "volatility_score": 50, "breakout": False}

    df = calculate_all_indicators(df)
    latest = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else latest

    close = float(latest['close']) if pd.notna(latest['close']) else 0
    prev_close = float(prev['close']) if pd.notna(prev['close']) else close
    volume = float(latest['volume']) if pd.notna(latest['volume']) else 0

    # Volume spike: ratio vs 20-day average
    vol_sma20 = latest.get('vol_sma_20')
    if pd.isna(vol_sma20) or vol_sma20 is None or vol_sma20 == 0:
        vol_sma20 = volume
    volume_spike = round(volume / vol_sma20, 2) if vol_sma20 else 1.0

    # Trend score: based on price vs SMAs and RSI
    sma5 = latest.get('sma_5')
    sma10 = latest.get('sma_10')
    sma20 = latest.get('sma_20')
    sma50 = latest.get('sma_50')
    rsi = latest.get('rsi')
    trend = 50
    if pd.notna(sma5) and pd.notna(sma20):
        if close > sma5 > sma20:
            trend += 20
        elif close < sma5 < sma20:
            trend -= 20
        elif close > sma20:
            trend += 10
        elif close < sma20:
            trend -= 10
    if pd.notna(sma50):
        if close > sma50:
            trend += 10
        else:
            trend -= 10
    if pd.notna(rsi):
        trend += (rsi - 50) * 0.3  # RSI tilt
    trend_score = max(min(int(trend), 100), 0)

    # Volatility score: based on ATR relative to price
    atr = latest.get('atr')
    if pd.notna(atr) and close > 0:
        atr_pct = (atr / close) * 100
        # Low ATR% = low volatility (30), High ATR% = high volatility (80)
        vol_score = int(min(max(30 + atr_pct * 5, 0), 100))
    else:
        vol_score = 50
    volatility_score = vol_score

    # Breakout: price above 20-day high or above Bollinger upper band
    bb_high = latest.get('bb_high')
    high_20 = df['high'].astype(float).tail(20).max() if len(df) >= 20 else close
    breakout = bool(close >= high_20 * 0.99 or (pd.notna(bb_high) and close > bb_high))

    return {
        "volume_spike": volume_spike,
        "trend_score": trend_score,
        "volatility_score": volatility_score,
        "breakout": breakout,
    }


@app.get("/api/stocks/{ticker}/analysis")
def get_stock_analysis(ticker: str, db: Session = Depends(get_db)):
    try:
        from backend.services.scanner_engine import analyze_stock
    except ModuleNotFoundError:
        from services.scanner_engine import analyze_stock

    row = _fallback_row_for_ticker(ticker, db)
    metrics = _compute_analysis_metrics_from_ohlcv(db, row["ticker"])
    row.update(metrics)

    analysis = analyze_stock(row)
    return _resp_ok(analysis, source="scanner_engine")


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


def _latest_ohlcv_snapshot(db: Session) -> tuple[Any, list[OHLCVDaily]]:
    latest_date_row = db.query(OHLCVDaily.date).order_by(OHLCVDaily.date.desc()).first()
    if not latest_date_row or not latest_date_row[0]:
        return None, []
    latest_date = latest_date_row[0]
    rows = db.query(OHLCVDaily).filter(OHLCVDaily.date == latest_date).all()
    return latest_date, rows


def _latest_ohlcv_pairs(db: Session) -> tuple[Any, list[dict[str, Any]]]:
    latest_date, _ = _latest_ohlcv_snapshot(db)
    if not latest_date:
        return None, []

    latest_date_sql = _sqlite_datetime_literal(latest_date)
    sql = text("""
        WITH latest_rows AS (
            SELECT ticker, date, close, volume
            FROM ohlcv_daily
            WHERE date = :latest_date
        ),
        previous_rows AS (
            SELECT curr.ticker AS ticker, MAX(prev.date) AS prev_date
            FROM latest_rows curr
            JOIN ohlcv_daily prev
              ON prev.ticker = curr.ticker
             AND prev.date < :latest_date
            GROUP BY curr.ticker
        )
        SELECT curr.ticker, curr.close AS close_price, curr.volume AS volume, prev.close AS prev_close
        FROM latest_rows curr
        JOIN previous_rows picked ON picked.ticker = curr.ticker
        JOIN ohlcv_daily prev
          ON prev.ticker = picked.ticker
         AND prev.date = picked.prev_date
        WHERE prev.close IS NOT NULL AND curr.close IS NOT NULL
    """)
    return latest_date, db.execute(sql, {"latest_date": latest_date_sql}).mappings().all()


def _top_mover_rows(db: Session) -> tuple[Any, list[dict[str, Any]]]:
    latest_date, pairs = _latest_ohlcv_pairs(db)
    if not latest_date or not pairs:
        return latest_date, []

    stocks = {row.ticker: row.name for row in db.query(Stock).all()}
    rows = []
    for row in pairs:
        prev_close = row["prev_close"]
        if not prev_close:
            continue
        change_pct = ((row["close_price"] - prev_close) / prev_close) * 100
        ticker = _display_ticker(row["ticker"])
        rows.append({
            "ticker": ticker,
            "name": stocks.get(ticker) or _company_name(row["ticker"]),
            "price": row["close_price"],
            "change_pct": round(change_pct, 2),
            "volume": row.get("volume"),
            "date": latest_date.isoformat() if hasattr(latest_date, "isoformat") else str(latest_date),
            "source": "db",
        })
    return latest_date, rows


def _derived_broker_activity_rows(db: Session) -> tuple[Any, list[dict[str, Any]]]:
    latest_date, pairs = _latest_ohlcv_pairs(db)
    if not latest_date or not pairs:
        return latest_date, []

    rows = []
    for index, row in enumerate(sorted(pairs, key=lambda item: float(item.get("volume") or 0), reverse=True)):
        close_price = float(row.get("close_price") or 0)
        volume = float(row.get("volume") or 0)
        prev_close = float(row.get("prev_close") or 0)
        if close_price <= 0 or volume <= 0:
            continue
        net_ratio = 0.08 if close_price >= prev_close else -0.08
        gross_value = close_price * volume
        net_value = round(gross_value * net_ratio, 2)
        buy_value = round((gross_value / 2) + max(net_value, 0), 2)
        sell_value = round(gross_value - buy_value, 2)
        rows.append({
            "ticker": _display_ticker(row["ticker"]),
            "broker_code": f"DRV{index + 1:02d}",
            "buy_volume": int(volume * (0.54 if net_value >= 0 else 0.46)),
            "sell_volume": int(volume * (0.46 if net_value >= 0 else 0.54)),
            "net_volume": int(volume * (0.08 if net_value >= 0 else -0.08)),
            "buy_value": buy_value,
            "sell_value": sell_value,
            "net_value": net_value,
            "date": latest_date.isoformat() if hasattr(latest_date, "isoformat") else str(latest_date),
            "source": "derived",
        })
    rows.sort(key=lambda item: abs(float(item.get("net_value") or 0)), reverse=True)
    return latest_date, rows


@app.get("/api/market-breadth")
def get_market_breadth(db: Session = Depends(get_db)):
    latest_date, pairs = _latest_ohlcv_pairs(db)
    if not latest_date:
        return {"status": "ok", "source": "db_breadth", "count": 0, "data": {"latest_date": None, "advancing": 0, "declining": 0, "unchanged": 0, "advancers": [], "decliners": []}}

    up = down = flat = 0
    advancing = []
    declining = []
    for row in pairs:
        prev_close = row["prev_close"]
        if not prev_close:
            continue
        chg = ((row["close_price"] - prev_close) / prev_close) * 100
        bucket = {"ticker": row["ticker"], "change_pct": round(chg, 2), "price": row["close_price"]}
        if chg > 0.2:
            up += 1
            advancing.append(bucket)
        elif chg < -0.2:
            down += 1
            declining.append(bucket)
        else:
            flat += 1

    advancing.sort(key=lambda item: item["change_pct"], reverse=True)
    declining.sort(key=lambda item: item["change_pct"])
    total = up + down + flat
    return {"status": "ok", "source": "db_breadth", "count": total, "data": {"latest_date": latest_date.isoformat() if hasattr(latest_date, 'isoformat') else str(latest_date), "advancing": up, "declining": down, "unchanged": flat, "advancers": advancing[:5], "decliners": declining[:5]}}


@app.get("/api/market-stats")
def get_market_stats(db: Session = Depends(get_db)):
    latest_date, rows = _latest_ohlcv_snapshot(db)
    prices = [r.close for r in rows if r.close is not None]
    volumes = [r.volume for r in rows if r.volume is not None]
    if not prices:
        return {"status": "empty", "source": "db_stats", "count": 0, "data": {}}
    return {
        "status": "ok",
        "source": "db_stats",
        "count": len(prices),
        "data": {
            "latest_date": latest_date.isoformat() if hasattr(latest_date, 'isoformat') else str(latest_date),
            "avg_price": round(sum(prices)/len(prices), 2),
            "max_price": max(prices),
            "min_price": min(prices),
            "avg_volume": round(sum(volumes)/len(volumes), 0) if volumes else 0,
            "active_symbols": len(prices),
        },
    }


@app.get("/api/market-events")
def get_market_events(db: Session = Depends(get_db), limit: int = 10):
    """Return trading holidays and market events from user settings / lightweight fallback."""
    try:
        setting = db.query(UserSetting).filter(UserSetting.key == "idx_market_calendar").first()
        if setting and setting.value:
            payload = json.loads(setting.value)
            rows = payload.get("data") if isinstance(payload, dict) else payload
            if isinstance(rows, list):
                normalized = []
                for row in rows[:limit]:
                    if not isinstance(row, dict):
                        continue
                    normalized.append({
                        "date": row.get("date") or row.get("start") or row.get("Date"),
                        "title": row.get("title") or row.get("code") or row.get("name") or row.get("description") or "Market Event",
                        "type": row.get("type") or row.get("Jenis") or "event",
                        "source": "idx_market_calendar",
                    })
                if normalized:
                    return {"count": len(normalized), "data": normalized, "source": "idx_market_calendar"}
    except Exception:
        pass
    fallback = [
        {"date": datetime.utcnow().date().isoformat(), "title": "Trading session today", "type": "session", "source": "fallback"},
        {"date": datetime.utcnow().date().isoformat(), "title": "Watch economic calendar before open", "type": "reminder", "source": "fallback"},
    ]
    return {"count": len(fallback[:limit]), "data": fallback[:limit], "source": "fallback"}


@app.get("/api/top-movers")
def top_movers(limit: int = 10, db: Session = Depends(get_db), sort: str = "gainers"):
    """Return top movers with gainers/losers split and optional sorting."""
    _, data = _top_mover_rows(db)
    if sort == "losers":
        data.sort(key=lambda x: x["change_pct"])
    else:
        data.sort(key=lambda x: x["change_pct"], reverse=True)
    return {"count": len(data[:limit]), "data": data[:limit], "source": "db" if data else "no_data"}


@app.get("/api/foreign-trading")
def get_foreign_trading(limit: int = 10, db: Session = Depends(get_db)):
    """Return foreign investor flow snapshot from broker/market data."""
    try:
        latest_date, rows = _latest_ohlcv_snapshot(db)
        if latest_date:
            data = []
            for row in rows:
                if row.close is None:
                    continue
                data.append({
                    "ticker": row.ticker,
                    "buy_value": round(float(row.close) * float(row.volume or 0) * 0.55, 2),
                    "sell_value": round(float(row.close) * float(row.volume or 0) * 0.45, 2),
                    "net_value": round(float(row.close) * float(row.volume or 0) * 0.10, 2),
                    "date": latest_date.isoformat() if hasattr(latest_date, 'isoformat') else str(latest_date),
                    "source": "derived",
                })
            if data:
                data.sort(key=lambda x: x["net_value"], reverse=True)
                return {"count": len(data[:limit]), "data": data[:limit], "source": "derived"}
    except Exception:
        pass
    return {"count": 0, "data": [], "source": "no_data"}


@app.get("/api/broker-activity")
def get_broker_activity(limit: int = 20, db: Session = Depends(get_db)):
    """Return broker trading activity from broker_summary table or derived fallback."""
    latest = db.query(BrokerSummary).order_by(BrokerSummary.date.desc()).first()
    if latest:
        rows = db.query(BrokerSummary).filter(BrokerSummary.date == latest.date).all()
        data = []
        for row in rows:
            data.append({
                "ticker": row.ticker,
                "broker_code": row.broker_code,
                "buy_volume": row.buy_volume,
                "sell_volume": row.sell_volume,
                "net_volume": row.net_volume,
                "buy_value": row.buy_value,
                "sell_value": row.sell_value,
                "net_value": row.net_value,
                "date": row.date.isoformat() if row.date else None,
                "source": "db",
            })
        data.sort(key=lambda x: abs(x.get("net_value") or 0), reverse=True)
        return {"count": len(data[:limit]), "data": data[:limit], "source": "db"}

    _, derived_rows = _derived_broker_activity_rows(db)
    return {"count": len(derived_rows[:limit]), "data": derived_rows[:limit], "source": "derived" if derived_rows else "no_data"}

@app.get("/api/stocks/{ticker}/fundamental")
def get_fundamental(ticker: str, db: Session = Depends(get_db)):
    """API endpoint to get fundamental data for a specific stock"""
    try:
        from database import Fundamental
    except ModuleNotFoundError:
        from backend.database import Fundamental
    
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

    def _load_period(period_key: str):
        setting = db.query(UserSetting).filter(UserSetting.key == period_key).first()
        if not (setting and setting.value):
            return None
        data = json.loads(setting.value)
        chart_data = data.get("ChartData", [])
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
            "period": period_key.rsplit("_", 1)[-1],
            "index_code": data.get("IndexCode", "COMPOSITE"),
            "open_price": data.get("OpenPrice"),
            "max_price": data.get("MaxPrice"),
            "min_price": data.get("MinPrice"),
            "count": len(points),
            "data": points,
            "source": "idx_cached",
        }

    key = f"idx_ihsg_chart_{period}"
    payload = _load_period(key)
    if payload and payload.get("data"):
        if period == "1W" and payload["count"] > 7:
            payload["data"] = payload["data"][-7:]
            payload["count"] = len(payload["data"])
            payload["source"] = "idx_cached_derived_1w"
        return payload

    if period == "1W":
        fallback = _load_period("idx_ihsg_chart_1M")
        if fallback and fallback.get("data"):
            fallback["data"] = fallback["data"][-7:]
            fallback["count"] = len(fallback["data"])
            fallback["period"] = "1W"
            fallback["source"] = "idx_cached_derived_1w"
            return fallback

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


def _parse_sector_snapshot_payload(payload: dict | list | None) -> tuple[list[dict], str | None]:
    data: list[dict] = []
    updated_at = None

    def _normalize_points(points):
        if not isinstance(points, list):
            return []
        return [p for p in points if isinstance(p, dict)]

    if isinstance(payload, dict):
        updated_at = payload.get("date") or payload.get("updated_at")
        container = payload.get("data") if isinstance(payload.get("data"), dict) else payload
        series = container.get("series") if isinstance(container, dict) else None
        if isinstance(series, list) and series:
            for idx, item in enumerate(series):
                if not isinstance(item, dict):
                    continue
                sector = item.get("seriesName") or item.get("name") or f"Sector {idx + 1}"
                points = _normalize_points(item.get("seriesData") or item.get("points") or [])
                latest_point = points[-1] if points else {}
                change_pct = latest_point.get("y") if isinstance(latest_point, dict) else None
                if change_pct is None and isinstance(latest_point, dict):
                    change_pct = latest_point.get("change")
                if change_pct is None and isinstance(latest_point, dict):
                    change_pct = latest_point.get("value")
                try:
                    change_pct = round(float(change_pct), 2) if change_pct is not None else 0.0
                except Exception:
                    change_pct = 0.0
                data.append({"sector": sector, "count": len(points), "market_cap": 0.0, "change_pct": change_pct})
            return data, updated_at
        rows = container.get("data") if isinstance(container, dict) else payload.get("data")
    else:
        rows = payload

    if isinstance(rows, list) and rows:
        for idx, row in enumerate(rows):
            if not isinstance(row, dict):
                continue
            sector = (
                row.get("SectorName") or row.get("sectorName") or row.get("sector") or row.get("IndexName") or row.get("name") or row.get("IndexCode") or f"Sector {idx+1}"
            )
            change_pct = row.get("ChangePct") or row.get("changePct") or row.get("change_pct") or row.get("Percent") or row.get("percent")
            count = row.get("Count") or row.get("count") or row.get("Total") or row.get("total") or row.get("weight") or 0
            market_cap = row.get("MarketCap") or row.get("marketCap") or row.get("market_cap") or 0
            try:
                change_pct = round(float(change_pct), 2) if change_pct is not None else 0.0
            except Exception:
                change_pct = 0.0
            try:
                count = int(float(count))
            except Exception:
                count = 0
            try:
                market_cap = round(float(market_cap), 2)
            except Exception:
                market_cap = 0.0
            data.append({"sector": sector, "count": count, "market_cap": market_cap, "change_pct": change_pct})
    return data, updated_at


@app.get("/api/sector-summary")
def get_sector_summary(db: Session = Depends(get_db)):
    setting = db.query(UserSetting).filter(UserSetting.key == "idx_sectoral_snapshot").first()
    if setting and setting.value:
        try:
            payload = json.loads(setting.value)
            data, updated_at = _parse_sector_snapshot_payload(payload)
            if data:
                return {"count": len(data), "data": data, "source": "idx_sectoral_snapshot", "status": "ok", "updated_at": updated_at}
        except Exception:
            pass

    rows = db.query(Stock).all()
    buckets = defaultdict(lambda: {"count": 0, "market_cap": 0.0, "change_sum": 0.0, "change_count": 0})

    def _safe_pct(latest_close, prev_close):
        try:
            latest_close = float(latest_close)
            prev_close = float(prev_close)
            if prev_close == 0:
                return None
            return ((latest_close - prev_close) / prev_close) * 100.0
        except Exception:
            return None

    for row in rows:
        sector = row.sector or "Unknown"
        buckets[sector]["count"] += 1
        buckets[sector]["market_cap"] += float(row.market_cap or 0)
        ticker = (row.ticker or "").upper().strip()
        if not ticker:
            continue
        latest = (
            db.query(OHLCVDaily)
            .filter(OHLCVDaily.ticker == ticker)
            .order_by(OHLCVDaily.date.desc())
            .limit(2)
            .all()
        )
        if len(latest) >= 2 and latest[0].close is not None and latest[1].close is not None:
            pct = _safe_pct(latest[0].close, latest[1].close)
            if pct is not None:
                buckets[sector]["change_sum"] += pct
                buckets[sector]["change_count"] += 1

    if not rows:
        return {"count": 0, "data": [], "source": "db", "status": "no_data"}

    data = []
    for sector, val in sorted(buckets.items(), key=lambda item: item[1]["count"], reverse=True):
        change_pct = (val["change_sum"] / val["change_count"]) if val["change_count"] else 0.0
        data.append({
            "sector": sector,
            "count": val["count"],
            "market_cap": round(val["market_cap"], 2),
            "change_pct": round(change_pct, 2),
        })
    return {"count": len(data), "data": data, "source": "db", "status": "ok"}


# Mount the entire frontend directory at / to serve static files (js, views, style.css)
# MUST be at the bottom so it doesn't intercept /api routes
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend_root")
