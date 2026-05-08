# 🇮🇩 RetailBijak — Fase 9: Intelligence & Data Richness

> **Status:** 🟢 Fase 9 SELESAI — 100% (all tasks done)
> **Tujuan:** Mengubah retailbijak dari platform fungsional menjadi platform **data-rich, profesional, dan comprehensive**
> **Prinsip:** Zero external data di runtime. Scheduler boleh fetch metadata (sector/industry) sekali untuk enrichment.
> **Constraint:** IDX API rate-limited. Semua user-facing feature harus jalan dengan data existing.

---

## Masalah Teridentifikasi (Fase 9 — ✅ All Solved)

| # | Masalah | Prioritas | Status |
|---|---------|-----------|--------|
| M1 | **Sektor cuma 14/974 saham** | 🔴 High | ✅ 582 stocks classified |
| M2 | **Tidak ada market breadth chart** | 🔴 High | ✅ Breadth chart + widget |
| M3 | **Watchlist gak bisa di-group** | 🟠 Medium | ✅ Groups + move between groups |
| M4 | **Nggak ada data freshness** | 🟡 Low | ✅ Freshness endpoint + topbar indicator |
| M5 | **Mobile masih desktop-first** | 🟡 Low | ✅ Pull-to-refresh |

---

## 🟢 Fase 10: Advanced Trading Tools ✅ 100% COMPLETE

> **Goal:** Professional-grade trading tools — alerts, comparison, portfolio analytics, pattern recognition.
> **Prinsip:** Backend sudah mature, fokus ke frontend UX dan insight. Gunakan data yang sudah ada (OHLCV, sinyal, fundamental).

### 🔴 10.1 Price Alerts UI (HIGH IMPACT)
> **Status:** Backend ✅ (alert_checker.py, Alert DB model, API routes). Frontend ❌

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 10.1.1 | **Alerts list page** — `#alerts` view with table of active alerts (ticker, type, value, status) | `frontend/js/views/alerts.js` (new), `router.js`, `index.html` | 30m | Table + toggle enable/disable |
| 10.1.2 | **Create alert modal** — Pilih ticker, tipe (price_above/below, rsi_above/below), threshold value | `frontend/js/views/stock_detail.js`, `alerts.js` | 30m | From stock detail page |
| 10.1.3 | **Alert notification toast** — Triggered alerts appear as toast with sound | `main.js` (already has polling) | 15m | Enhance existing checker |
| 10.1.4 | **Badge count on sidebar** — Number of triggered alerts | `main.js` | 10m | Badge icon |

**Value:** ★★★★★ — Must-have for every trader
**Dependency:** Backend already complete (routes, checker, DB model)

### 🔴 10.2 Stock Comparison Tool (HIGH IMPACT)

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 10.2.1 | **Compare endpoint** — `GET /api/compare?tickers=BBCA,BBRI,BMRI` return side-by-side stats | `routes/stock_detail.py` | 20m | Price, change, volume, RSI, MACD, sector |
| 10.2.2 | **Compare view** — `#compare/BBCA+BBRI+BMRI` table + overlay chart | `frontend/js/views/compare.js` (new), `router.js`, `index.html` | 40m | Stock comparison table + LightweightCharts overlay |
| 10.2.3 | **Add-to-compare from search** — Multi-select tickers → compare | `main.js` (search) | 15m | Integration |
| 10.2.4 | **Compare from watchlist** — Select stocks → "Bandingkan" button | `portfolio.js` | 15m | Context menu |

**Value:** ★★★★☆ — Professional analysis tool
**Dependency:** OHLCV + signal data already exist

### 🟠 10.3 Portfolio Analytics (MEDIUM IMPACT)

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 10.3.1 | **P&L endpoint** — `GET /api/portfolio/performance` return XIRR, total P&L, daily P&L | `routes/user.py` | 25m | XIRR calculation from transaction history |
| 10.3.2 | **Allocation pie chart** — Sector allocation, position sizing | `portfolio.js` | 20m | Chart.js doughnut |
| 10.3.3 | **Performance chart** — Portfolio value over time vs IHSG benchmark | `portfolio.js` | 25m | Line chart overlay |
| 10.3.4 | **Portfolio summary in dashboard** — Mini P&L widget | `dashboard.js` | 15m | Top card |

**Value:** ★★★★☆ — Essential for portfolio tracking
**Dependency:** Portfolio positions + transactions data

### 🟠 10.4 Candlestick Pattern Recognition (MEDIUM IMPACT)

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 10.4.1 | **Pattern detector** — Python function to detect doji, hammer, engulfing, morning/evening star | `backend/indicators_extended.py` | 30m | OHLCV-based pattern detection |
| 10.4.2 | **Patterns endpoint** — `GET /api/stock/{ticker}/patterns` return detected patterns | `routes/stock_detail.py` | 15m | Last 30 days patterns |
| 10.4.3 | **Pattern tags on stock detail** — Badge chips showing recent patterns | `stock_detail.js` | 15m | "Doji (2 hari lalu)" |
| 10.4.4 | **Pattern screener filter** — Screener filter: "Stocks with hammer pattern today" | `screener.js`, `scanner.py` | 20m | Pattern-based screening |

**Value:** ★★★☆☆ — Nice-to-have TA tool
**Dependency:** OHLCV data only

### 🟡 10.5 Screener Presets (LOW IMPACT)

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 10.5.1 | **Preset save endpoint** — `POST /api/screener/presets` save current filters | `routes/scanner.py` | 15m | JSON storage in UserSetting |
| 10.5.2 | **Preset UI** — Save/load/delete presets dropdown in screener panel | `screener.js` | 20m | Quick-load filters |
| 10.5.3 | **Default presets** — "Golden Cross", "Oversold RSI", "Volume Spike" | `screener.js` | 15m | Built-in templates |

**Value:** ★★★☆☆ — Enhances screener usability

### 🟡 10.6 Market Heatmap (LOW IMPACT)

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 10.6.1 | **Heatmap endpoint** — `GET /api/market/heatmap` return sector → stocks perf | `routes/market.py` | 15m | Aggregate sector performance |
| 10.6.2 | **Heatmap view** — Treemap-style grid with color-coded cells | `frontend/js/views/market.js` | 30m | CSS grid heatmap |
| 10.6.3 | **Heatmap widget on dashboard** — Mini heatmap sector overview | `dashboard.js` | 15m | Sector grid |

**Value:** ★★★☆☆ — Visual market overview

---

## Prioritas Eksekusi — Fase 10

### 🔴 Minggu 1 (NOW)
10.1.1 → 10.1.2 → 10.1.3 → 10.1.4 → 10.2.1 → 10.2.2

### 🟠 Minggu 2
10.2.3 → 10.2.4 → 10.3.1 → 10.3.2 → 10.3.3

### 🟡 Minggu 3
10.3.4 → 10.4.1 → 10.4.2 → 10.4.3 → 10.4.4 → 10.5.1 → 10.5.2 → 10.5.3 → 10.6.1 → 10.6.2 → 10.6.3

---

## Log Eksekusi

| Date | Task | Status | Catatan |
|------|------|--------|---------|
| 2026-05-08 | 9.1.1 | ✅ | Sector classifier — keyword-based for 582/974 stocks |
| 2026-05-08 | 9.1.2 | ✅ | Scheduler registration — daily 03:00 WIB |
| 2026-05-08 | 9.1.3 | ✅ | Manual trigger endpoint |
| 2026-05-08 | 9.1.4 | ✅ | Sector dashboard handles 12 sectors |
| 2026-05-08 | 9.2.1 | ✅ | Breadth endpoint — 50 days data |
| 2026-05-08 | 9.2.2 | ✅ | Breadth chart view — Chart.js bar+line |
| 2026-05-08 | 9.2.3 | ✅ | Breadth widget on dashboard — visual bar + adv/dec |
| 2026-05-08 | 9.2.4 | ✅ | Sidebar nav link |
| 2026-05-08 | 9.3.1 | ✅ | Watchlist groups CRUD backend |
| 2026-05-08 | 9.3.2 | ✅ | Groups UI tabs + manage dialog |
| 2026-05-08 | 9.3.3 | ✅ | Move stocks between groups — dropdown per row |
| 2026-05-08 | 9.4.1 | ✅ | Freshness endpoint — GET /api/system/freshness |
| 2026-05-08 | 9.4.2 | ✅ | Freshness bar in topbar — indicator + auto-refresh |
| 2026-05-08 | 9.5 | ✅ | Pull-to-refresh — touch events + indicator |
| 2026-05-08 | 10.1.1 | ✅ | Alerts list page — #alerts view + table + empty state |
| 2026-05-08 | 10.1.2 | ✅ | Create alert modal — ticker/type/value + save |
| 2026-05-08 | 10.1.3 | ✅ | Alert notification toast — enhanced polling |
| 2026-05-08 | 10.1.4 | ✅ | Badge count on sidebar — bell icon + count |
| 2026-05-08 | 10.2.1 | ✅ | Compare endpoint — already existed |
| 2026-05-08 | 10.2.2 | ✅ | Compare view — already existed |
| 2026-05-08 | 10.2.3 | ✅ | Compare from search — button per result |
| 2026-05-08 | 10.2.4 | ✅ | Compare from watchlist — button in header |
| 2026-05-08 | 10.3.1 | ✅ | P&L endpoint — already existed |
| 2026-05-08 | 10.3.2 | ✅ | Allocation pie chart — already existed |
| 2026-05-08 | 10.3.3 | ✅ | Performance chart — already existed |
| 2026-05-08 | 10.3.4 | ✅ | Dashboard P&L widget — P&L card in hero |
| 2026-05-08 | 10.4.1 | ✅ | Pattern detector — doji, hammer, engulfing, star |
| 2026-05-08 | 10.4.2 | ✅ | Patterns endpoint — GET /api/stocks/{ticker}/patterns |
| 2026-05-08 | 10.4.3 | 🟡 | Pattern tags on stock detail — fungsi ok, belum integrasi ke template |
| 2026-05-08 | 10.4.4 | 🟡 | Pattern screener filter — butuh integrasi |
| 2026-05-08 | 10.5.1 | ✅ | Screener preset endpoint — already existed |
| 2026-05-08 | 10.5.2 | ✅ | Screener preset UI — already existed |
| 2026-05-08 | 10.5.3 | ✅ | Default presets — Golden Cross, Oversold RSI, Volume Spike |
| 2026-05-08 | 10.6.1 | ✅ | Heatmap endpoint — already existed |
| 2026-05-08 | 10.6.2 | ✅ | Heatmap view — TV widget + CSS grid |
| 2026-05-08 | 10.6.3 | ✅ | Mini heatmap widget on dashboard |
| 2026-05-08 | 10.4.3 | ✅ | Pattern tags on stock detail — loadPatterns() + badge chips |
| 2026-05-08 | 10.4.4 | ✅ | Pattern screener filter — dropdown + runPatternScan() |
| 2026-05-08 | 11.1.1 | ✅ | Movers multi-timeframe perf — enhanced shared_market_helpers.py |
| 2026-05-08 | 11.1.2 | ✅ | Movers dedicated page — movers.js + router.js route |
| 2026-05-08 | 11.1.3 | ✅ | Dashboard movers widget — perf_1w badge + #movers link |
| 2026-05-08 | 11.1.4 | ✅ | Sidebar nav #movers — trending-up icon |
| 2026-05-08 | 11.2.1 | ✅ | Scanner perf columns — perf_1w/1m/3m/6m in scanner_stream.py |
| 2026-05-08 | 11.2.2 | ✅ | Screener perf columns — frontend table + toggle + CSV export |
| 2026-05-08 | 11.2.3 | ✅ | Stock detail perf chips — 1W/1M/3M badges from candles |
| 2026-05-08 | 11.3.1 | ✅ | Calendar endpoint + model + updater — CalendarEvent, /api/calendar |
| 2026-05-08 | 11.3.2 | ✅ | Calendar view — calendar.js month grid + event list |
| 2026-05-08 | 11.3.3 | ✅ | Dashboard calendar widget — today's events mini list |
| 2026-05-08 | 11.4.1 | ✅ | Industry classifier — classify_industries() + keyword fallback + scheduler |
| 2026-05-08 | 11.4.2 | ✅ | Industry endpoint — /api/sectors/{sector} industry_breakdown + /api/industries |
| 2026-05-08 | 11.4.3 | ✅ | Industry UI accordion — expand/collapse industry → stocks |
| 2026-05-08 | 11.5.1 | ✅ | Column toggle UI — dropdown checklist + localStorage |
| 2026-05-08 | 11.5.2 | ✅ | Multi-sort — sort chain 2+ columns + indicators |
| 2026-05-08 | 11.5.3 | ✅ | Quick filter chips — 5 presets (Gainers, Volume Spike, RSI) |
| 2026-05-08 | 11.6.1 | ✅ | Treemap endpoint — GET /api/market/treemap |
| 2026-05-08 | 11.6.2 | ✅ | Treemap view — CSS treemap + mobile list |

---

## Research: TradingView IDX Pages (2026-05-08)

### Pages Diteliti

| Page | URL | Fitur Utama | Status di RetailBijak |
|------|-----|-------------|----------------------|
| **Market Movers** | `/markets/stocks-indonesia/market-movers-all-stocks/` | Table semua saham: price, chg%, volume, market cap, sector, 1W/1M/3M/6M perf, RSI, SMA, MACD | ✅ Screener sudah punya, **tapi** belum ada default sort gainers/losers/most-active, belum ada Perf.1W/3M/6M column |
| **Market Overview** | `/markets/stocks-indonesia/` | Market summary, heatmap treemap, sector perf, top movers, economic calendar | ✅ Dashboard sudah punya, **tapi** belum ada economic calendar, belum ada treemap |
| **News** | `/markets/stocks-indonesia/news/` | Headlines + filter kategori (earnings, corp actions, economy) | ✅ News ada, **tapi** belum ada category filtering |
| **Ideas** | `/markets/stocks-indonesia/ideas/` | Community trading ideas, chart analysis, rating system ❌ Tidak relevan untuk platform solo | ❌ Skip — butuh komunitas |
| **Sectors** | `/markets/stocks-indonesia/sectorandindustry-sector/` | Sector list with perf%, industry breakdown, stock count per sector | ✅ Sektor ada, **tapi** belum ada industry breakdown dalam sektor |

### TV API Columns Available via Screener
`name, close, change, change_ago, volume, market_cap_basic, sector, description, Perf.W, Perf.1M, Perf.3M, Perf.6M, Perf.YTD, relative_volume_10d_calc, RSI, SMA20, SMA50, MACD, MACD.signal`

---

## Fase 11: TV-Inspired Enhancements

> **Goal:** Menambahkan fitur yang ada di TradingView IDX tapi belum ada di RetailBijak.
> **Prinsip:** Jangan copy UI TV, adaptasi dengan design system yang sudah ada. Fokus ke data yang bisa didapat dari yfinance/IDX.

### 🔴 11.1 Market Movers Page (HIGH IMPACT) ✅ COMPLETE
> **Seperti TV:** Tabel gainers/losers/most-active dengan multi-timeframe perf, filter sorting

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 11.1.1 | **Movers endpoint** — `GET /api/market/movers?type=gainers&limit=30` return multi-timeframe perf | `routes/market.py` | 25m | Ambil OHLCV, hitung Perf.1W/1M/3M/6M per saham, sorting |
| 11.1.2 | **Movers view** — `#movers` dengan tab Gainers / Losers / Most Active, tabel dengan kolom price, chg%, vol, 1W%, 1M%, 3M% | `frontend/js/views/movers.js` (new), `router.js` | 40m | Table + sorting klik kolom |
| 11.1.3 | **Movers widget on dashboard** — Top 5 gainers/losers mini table | `dashboard.js` | 15m | Sudah ada top movers, enhance dengan perf multi-timeframe |
| 11.1.4 | **Sidebar nav** — Link ke #movers | `index.html` | 5m | Icon + tooltip |

**Value:** ★★★★★ — Most-wanted feature untuk trader
**Data:** OHLCV sudah ada, needs query multi-date

### 🔴 11.2 Multi-Timeframe Performance Columns (HIGH IMPACT) ✅ COMPLETE
> **Seperti TV:** Kolom 1W, 1M, 3M, 6M, YTD di screener

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 11.2.1 | **Perf columns in scanner** — Tambah perf 1W/1M/3M/6M sebagai kolom yang bisa di-sort di backend scanner | `backend/scanner.py` | 20m | Hitung perf dari OHLCV dengan date window |
| 11.2.2 | **Perf headers in screener** — Tambah kolom ke tabel screener frontend, toggle visibility | `screener.js` | 20m | New column group |
| 11.2.3 | **Perf chips on stock detail** — Performance badges di hero (1W, 1M, 3M) | `stock_detail.js` | 15m | Badge di samping price |

**Value:** ★★★★☆ — Professional analysis data
**Data:** OHLCV, pure calculation

### 🟠 11.3 Economic & Corporate Calendar (MEDIUM IMPACT) ✅ COMPLETE
> **Seperti TV:** Kalender ekonomi + corporate actions

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 11.3.1 | **IDX Calendar endpoint** — `GET /api/market/calendar?type=economic|corporate` | `routes/market.py` | 30m | Scrape IDX website atau RTI for dividend/earnings dates |
| 11.3.2 | **Calendar view** — `#calendar` page with month view + event list | `frontend/js/views/calendar.js` (new) | 40m | CSS grid calendar + event cards |
| 11.3.3 | **Calendar widget on dashboard** — Today's events | `dashboard.js` | 15m | Mini list sidebar |

**Value:** ★★★★☆ — Institutional-grade feature
**Data:** Perlu scraping IDX atau sumber eksternal

### 🟠 11.4 Industry Breakdown in Sectors (MEDIUM IMPACT) ✅ COMPLETE
> **Seperti TV:** Dalam sektor, ada sub-industri dengan perf masing-masing

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 11.4.1 | **Industry classifier** — Classify industry (sub-sektor) for all stocks | `updaters/sector_classifier.py` | 20m | yfinance info.industry, keyword fallback |
| 11.4.2 | **Industry endpoint** — `GET /api/sectors/{sector}` include industry breakdown | `routes/market.py` | 15m | Aggregate perf by industry |
| 11.4.3 | **Industry UI in sector page** — Accordion/collapse industry → stocks | `sector.js` | 25m | Group stocks by industry |

**Value:** ★★★☆☆ — Better sector analysis
**Data:** yfinance info.industry (sudah di yfinance.info)

### 🟡 11.5 Screener Enhancements (LOW IMPACT) ✅ COMPLETE
> **Seperti TV:** Quick filter chips, multi-sort, column toggles

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 11.5.1 | **Column toggle UI** — Pilih kolom mana yang ditampilkan di tabel screener | `screener.js` | 20m | Dropdown checklist + localStorage |
| 11.5.2 | **Multi-sort** — Sort by 2+ columns (e.g. sector + volume) | `backend/scanner.py`, `screener.js` | 20m | Array sort params |
| 11.5.3 | **Quick filter chips** — "Saya Mau" chips: Gainers saja, volume > rata2, RSI oversold | `screener.js` | 15m | Preset buttons |

**Value:** ★★★☆☆ — UX refinement
**Data:** Existing

### 🟡 11.6 Market Treemap (LOW IMPACT) ✅ COMPLETE
> **Seperti TV:** Visual treemap seluruh pasar IDX

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 11.6.1 | **Treemap endpoint** — `GET /api/market/treemap` return {sector → [stocks]} | `routes/market.py` | 15m | Aggregate by sector |
| 11.6.2 | **Treemap view** — CSS-based treemap (rectangular tree) | `market.js`, `style.css` | 30m | Div-grid treemap, color by perf |

**Value:** ★★★☆☆ — Visual impact
**Data:** Existing

---

## Prioritas Eksekusi — Fase 11

### 🔴 NOW
11.1.1 → 11.1.2 → 11.1.3 → 11.1.4 → 11.2.1 → 11.2.2

### 🟠 Next ✅ COMPLETE
11.2.3 → 11.3.1 → 11.3.2 → 11.3.3 → 11.4.1 → 11.4.2

### 🟡 Later ✅ COMPLETE
11.4.3 → 11.5.1 → 11.5.2 → 11.5.3 → 11.6.1 → 11.6.2

---

## 📊 Fase 11: TV-Inspired Enhancements ✅ 100% COMPLETE
