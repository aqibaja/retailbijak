# 🇮🇩 RetailBijak — Fase 26: Retention & Intelligence Layer

> **Status:** 🆕 Research Complete — Recommendations Ready
> **Tujuan:** Fitur-fitur yang mendorong *daily active usage*, *user retention*, dan *trading intel*
> **Constraint:** FREE models only. Vanilla JS SPA + FastAPI + SQLite. Zero paid API.
> **Prinsip:** Data yang sudah ada → visualisasi baru. Infrastruktur yang sudah ada → fitur baru.

---

## 🧠 Research Methodology

1. **Codebase audit** — 24,018 lines across 50+ Python files, 38 JS files
2. **Competitor analysis** — Stockbit, RTI Business, Yahoo Finance, Bloomberg Terminal (simplified)
3. **IDX retail trader behavior** — What Indonesian traders actually crave (dividends, real-time prices, Telegram, IPO)
4. **Effort/impact matrix** — Using existing data + infrastructure = faster delivery

---

## 📊 Recommendation Ranking (Impact ÷ Effort)

| # | Feature | Impact | Effort | Data Already Exists? | Category |
|---|---------|--------|--------|---------------------|----------|
| 1 | **Live Watchlist Price Streaming** | 🔥🔥🔥🔥🔥 | 🟢 Low (4h) | ✅ Yes (SSE infra, OHLCV data) | **Retention** |
| 2 | **Dividend Dashboard & Calculator** | 🔥🔥🔥🔥🔥 | 🟢 Low (6h) | ✅ Yes (CalendarEvent table) | **Intel** |
| 3 | **Chart Technical Overlays** | 🔥🔥🔥🔥 | 🟢 Low (5h) | ✅ Yes (LightweightCharts loaded) | **Power User** |
| 4 | **Portfolio Analytics 2.0 (Sharpe, DD, Benchmark)** | 🔥🔥🔥🔥 | 🟡 Med (6h) | ⚠️ Partial (needs calc) | **Power User** |
| 5 | **Pattern Backtest View** | 🔥🔥🔥🔥 | 🟢 Low (4h) | ✅ Yes (signals + ohlcv data) | **Analytics** |
| 6 | **Stock Comparison 2.0 (Ratios + Correlation)** | 🔥🔥🔥 | 🟡 Med (6h) | ⚠️ Partial (compare exists) | **Analytics** |
| 7 | **Telegram Alert Integration** | 🔥🔥🔥🔥🔥 | 🟢 Low (5h) | ✅ Yes (alert engine exists) | **Retention** |
| 8 | **IPO Pipeline Tracker** | 🔥🔥🔥🔥 | 🟡 Med (8h) | ⚠️ Partial (calendar data) | **Intel** |
| 9 | **Macro/Economic Dashboard** | 🔥🔥🔥 | 🟡 Med (8h) | ❌ New data source needed | **Intel** |
| 10 | **Saved Screeners + Auto-Run** | 🔥🔥🔥 | 🟢 Low (4h) | ✅ Yes (SavedScreener table) | **Productivity** |

---

## 🔟 Detailed Recommendations

### #1 — LIVE WATCHLIST PRICE STREAMING ⭐ HIGHEST IMPACT

**Problem:** Watchlist only refreshes on page load. Users must manually refresh to see price changes. No real-time feel.

**Solution:** SSE stream that pushes price updates for watchlist items + portfolio positions.

**What to build:**
- Backend SSE endpoint `/api/watchlist/stream?tickers=BBCA,BMRI,TLKM`
- Frontend: Auto-connect on portfolio/watchlist view, update prices in-place with flash animations (already have flashUp/flashDown CSS animations)
- Reuse existing SSE infrastructure from `scanner_stream.py`

**Why high impact:** Every retail trader checks prices obsessively. This turns RetailBijak from a "check once" tool into a "keep open all day" tool.

**Effort:** ~4h | **Files:** `backend/routes/scanner_stream.py` (new SSE), `frontend/js/views/portfolio.js`, `frontend/js/api.js`

---

### #2 — DIVIDEND DASHBOARD & CALCULATOR 💰

**Problem:** Calendar has dividend events mixed in with other events. No dedicated dividend view. Indonesian investors are *obsessed* with dividends — it's a core investment thesis for most retail traders.

**Solution:** Dedicated `/dividends` view with:
- Dividend calendar (ex-date, payment date, cum-date)
- Dividend yield calculation
- Tax impact (withholding tax 10% for Indonesian residents, 20% for non-residents)
- "Dividend Aristocrats" — companies with 5+ years consecutive dividends
- Total dividend income calculator (input shares → calculate net dividend)
- Sector filter

**Data source:** CalendarEvent table already has `event_type='dividend'`. Yield data exists in `Fundamental.dividend_yield`.

**Why high impact:** Dividen is the #1 topic in Indonesian stock forums. This alone drives daily check-ins during dividend season.

**Effort:** ~6h | **Files:** `backend/routes/calendar.py` (new endpoint), `frontend/js/views/dividend.js` (new view), `frontend/js/router.js` (add route)

---

### #3 — CHART TECHNICAL OVERLAYS 📊

**Problem:** Stock detail chart only shows price. No SMA, EMA, Bollinger Bands, RSI, MACD overlaid on the chart.

**Solution:** Toggleable technical indicators on LightweightCharts chart:
- SMA (20, 50, 200) — simple line overlay
- EMA (12, 26) — line overlay
- Bollinger Bands (20, 2) — shaded area overlay
- RSI (14) — separate sub-pane
- MACD (12, 26, 9) — separate sub-pane
- Volume bars (already have this?)
- All calculated client-side (pure JS, zero backend cost)

**Why high impact:** 90% of retail traders use at least SMA + RSI. This closes the gap with RTI Business and TradingView.

**Effort:** ~5h | **Files:** `frontend/js/views/chart.js`, `frontend/js/views/stock_detail.js`

---

### #4 — PORTFOLIO ANALYTICS 2.0 📈

**Problem:** Portfolio shows P&L but not risk metrics. Users don't know their Sharpe ratio, max drawdown, win rate, or benchmark comparison.

**Solution:**
- **Performance metrics card:** Sharpe ratio, Sortino ratio, Max Drawdown, Win Rate, Avg Win/Loss
- **Benchmark comparison overlay:** IHSG line on equity curve
- **Sector allocation pie chart** (data already available in portfolio/summary endpoint)
- **Monthly returns heatmap** (green/red grid showing return per month)
- **Risk decomposition:** sector concentration risk, single stock concentration

**Data source:** Portfolio transactions + OHLCV data. Simple Python calculations.

**Why high impact:** Turns portfolio from "what I own" to "how I'm performing". Essential for serious traders.

**Effort:** ~6h | **Files:** `frontend/js/views/portfolio.js`, `backend/routes/user.py` (new endpoints)

---

### #5 — CANDLESTICK PATTERN BACKTEST VIEW 🔍

**Problem:** Pattern Scanner finds patterns, but users don't know if they actually work. "Doji detected — what happens next?"

**Solution:** Pattern backtest view showing:
- For each pattern: total occurrences, win rate, avg return, max profit, max loss
- Filterable by timeframe, sector, market condition
- Visual: histogram of forward returns per pattern
- Time decay: does pattern accuracy decline over time?
- Top patterns this month

**Data source:** Already have pattern_detector.py + full OHLCV history. Just need to run detection historically and measure forward returns.

**Why high impact:** Educational + actionable. Teaches users which patterns actually matter for IDX stocks.

**Effort:** ~4h | **Files:** `backend/routes/scanner.py` (new analytics endpoint), `frontend/js/views/backtest.js` (enhance)

---

### #6 — STOCK COMPARISON 2.0 (RATIOS + CORRELATION) ⚖️

**Problem:** Compare view exists but only shows price overlay. Missing fundamental ratios, correlation, and side-by-side stats.

**Solution:**
- **Fundamental comparison table:** PE, PB, ROE, ROA, DER, Dividend Yield side by side
- **Price correlation matrix** (0-1 scale)
- **Relative strength chart** (normalized to 100)
- **Sector + Market Cap badges**
- **Performance comparison:** YTD, 1M, 3M, 1Y returns table
- **Export comparison as image/CSV**

**Data source:** Fundamental table already has all ratios. OHLCV for correlation/performance.

**Why high impact:** "Which one should I buy — BBCA or BMRI?" is the #1 question. This answers it.

**Effort:** ~6h | **Files:** `frontend/js/views/compare.js`, `backend/routes/stocks.py` (new comparison endpoint)

---

### #7 — TELEGRAM ALERT INTEGRATION 🤖

**Problem:** Push notifications work via browser Service Worker, but Indonesian traders live on Telegram. Browser notifications get lost; Telegram messages get read.

**Solution:** 
- Backend module to send alerts via Telegram Bot API (free, no paid API)
- User settings page: input Telegram Chat ID, link account
- When alert triggers → push notification + Telegram message
- Optional: daily market briefing to Telegram (AI Picks summary)
- Optional: price alerts as Telegram message with chart snapshot

**Why high impact:** Telegram is the operating system for Indonesian retail traders. This bridges RetailBijak to their daily workflow.

**Effort:** ~5h | **Files:** `backend/services/telegram_bot.py` (new), `backend/routes/user.py` (settings), `frontend/js/views/settings.js`

---

### #8 — IPO PIPELINE & PERFORMANCE TRACKER 🚀

**Problem:** Calendar has IPO events, but no dedicated view. IPOs are a massive topic in IDX — often oversubscribed and highly anticipated.

**Solution:**
- **Upcoming IPOs:** Company name, sector, price range, offering period, listing date
- **Recent IPOs (last 6 months):** Performance since listing (+X%), volume trend
- **IPO performance by sector** heatmap
- **IPO Allocation calculator:** Estimate allotment based on bid amount
- **Prospectus download link** (if available)

**Data source:** CalendarEvent table with `event_type='ipo'`. IDX website scraping for allocation data.

**Why high impact:** IPOs drive massive retail interest. Every new IPO brings a wave of new traders.

**Effort:** ~8h | **Files:** `backend/routes/calendar.py`, `frontend/js/views/ipo.js` (new view), `frontend/js/router.js`

---

### #9 — MACRO / ECONOMIC DASHBOARD 🌏

**Problem:** No macro context when looking at stocks. BI rate, inflation, GDP growth, trade balance — these move markets.

**Solution:**
- **Key Indonesia macro indicators:** BI Rate, Inflation (CPI), GDP Growth, Trade Balance, FX Reserves, Unemployment
- **Time-series chart** for each indicator (last 5 years)
- **Correlation widget:** How do stocks react to BI rate changes?
- **Data freshness badge**
- **Calendar of upcoming economic releases** (BI rate decision dates, inflation release)

**Data source:** Bank Indonesia website, BPS (Badan Pusat Statistik), public JSON endpoints. Scrape or manual CSV seed.

**Why high impact:** Context for trading decisions. "BI rate cut → banking stocks rally" — this helps users see the bigger picture.

**Effort:** ~8h | **Files:** `backend/updaters/macro_updater.py` (new), `backend/routes/macro.py` (new), `frontend/js/views/macro.js` (new view)

---

### #10 — SAVED SCREENERS + AUTO-RUN 🔄

**Problem:** Screener filters reset on page reload. Users who want "stocks with RSI < 30 AND volume > 2x average" have to reconfigure every time.

**Solution:**
- Save/load screener configurations (table `SavedScreener` already exists!)
- Named presets: "Value Stocks", "Oversold Bounce", "Volume Surge"
- Auto-run saved screeners on schedule (via APScheduler, already running)
- Notification when new matches found ("2 new stocks passed your 'Value Stocks' screener")
- Share screener config via URL hash

**Why high impact:** Power users love saved workflows. This turns screener from a tool into a habit.

**Effort:** ~4h | **Files:** `frontend/js/views/screener.js`, `backend/routes/scanner.py`, `backend/database.py`

---

## ⚠️ Cross-Cutting Technical Improvements

These aren't features but should be done alongside Fase 26:

### A. Performance: SQLite WAL Mode
```sql
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA cache_size=-64000;  -- 64MB cache
```
Single line change in database.py. 5-10x read performance improvement.

### B. Performance: Query Optimization
- Add indexes on `ohlcv_daily(ticker, date)` — currently missing composite index
- Add index on `signals(ticker, signal_date, signal_type)` — currently only single column
- N+1 queries in portfolio summary (looping `OHLCVDaily` per position) → batch query

### C. PWA Enhancements
- Add `beforeinstallprompt` event handler (already in HTML shell)
- Add background sync for offline alert checking
- Add badge API for alert counts on mobile home screen icon

### D. Error Monitoring
- Add `navigator.sendBeacon()` for client-side JS error reporting
- Backend `/api/log-error` endpoint for anonymous error collection

---

## 🎯 Execution Strategy

### 🔴 Sprint 1 — Quick Wins (~10h)
```
1️⃣ Live Watchlist Streaming (4h) → 2️⃣ Dividend Dashboard (6h)
(Immediate daily engagement boost)
```

### 🟠 Sprint 2 — Power User (~15h)
```
3️⃣ Chart Technical Overlays (5h) → 4️⃣ Portfolio Analytics 2.0 (6h) → 10️⃣ Saved Screeners (4h)
(Deepen existing features for power users)
```

### 🟡 Sprint 3 — Intelligence Layer (~19h)
```
7️⃣ Telegram Integration (5h) → 6️⃣ Comparison 2.0 (6h) → 5️⃣ Pattern Backtest (4h) → 8️⃣ IPO Tracker (8h)
(New capabilities that differentiate from competitors)
```

### 🟢 Sprint 4 — Polish (~8h)
```
9️⃣ Macro Dashboard (8h) + Cross-cutting perf fixes (4h)
(Wrap up with macro context and performance)
```

---

## 📐 Tech Notes

### New Backend Tables
```sql
-- For Saved Screeners (already exists, but may need migration)
-- SavedScreener table already in database.py

-- For Telegram integration
CREATE TABLE telegram_links (
  user_id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- For IPO tracking
ALTER TABLE calendar_events ADD COLUMN ipo_details TEXT;  -- JSON
```

### SSE Reuse Pattern
```python
# Pattern: existing SSE from scanner_stream.py
# Reuse same StreamingResponse pattern for:
# - Watchlist price streaming
# - Alert delivery (already partially done)
```

### Fallback Strategy
Every feature inherits the project's fallback-first approach:
```js
if (!data || data.length === 0) {
  showEmptyState('Belum ada data dividen', 'icon-dollar-sign');
  return;
}
```

---

## 📊 Expected Impact

| Metric | Current | Target (Fase 26) |
|--------|---------|------------------|
| Daily active time | ~5 min | ~15 min (live prices + charts) |
| Dashboard → Watchlist flow | Manual refresh | Auto-streaming |
| Dividend users | Calendar only | Dedicated dashboard |
| Screener re-use rate | Low | High (saved presets) |
| Telegram reach | 0 | Users can get alerts via Telegram |
| Portfolio power users | Basic P&L | Risk metrics + benchmark |
| Chart usage | Price only | Full TA toolkit |

---

## 📋 Recommendation Summary

| # | Feature | Impact | Effort | Why It Matters for IDX Traders |
|---|---------|--------|--------|-------------------------------|
| 1 | **Live Watchlist Streaming** | 🔥🔥🔥🔥🔥 | 🟢 Low | "Keep open all day" — retention driver |
| 2 | **Dividend Dashboard** | 🔥🔥🔥🔥🔥 | 🟢 Low | Dividen is #1 topic in IDX retail |
| 3 | **Chart Technical Overlays** | 🔥🔥🔥🔥 | 🟢 Low | Closes gap with RTI/TradingView |
| 4 | **Portfolio Analytics 2.0** | 🔥🔥🔥🔥 | 🟡 Med | Serious traders need risk metrics |
| 5 | **Pattern Backtest** | 🔥🔥🔥🔥 | 🟢 Low | Educational + actionable |
| 6 | **Comparison 2.0** | 🔥🔥🔥 | 🟡 Med | "Which stock to buy?" — answered |
| 7 | **Telegram Integration** | 🔥🔥🔥🔥🔥 | 🟢 Low | Telegram is OS for IDX traders |
| 8 | **IPO Pipeline** | 🔥🔥🔥🔥 | 🟡 Med | IPOs drive massive retail interest |
| 9 | **Macro Dashboard** | 🔥🔥🔥 | 🟡 Med | Macro context for trading decisions |
| 10 | **Saved Screeners** | 🔥🔥🔥 | 🟢 Low | Power user retention workflow |

---

*Research completed by Hermes Agent — May 10, 2026*
