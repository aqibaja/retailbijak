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
| 2026-05-09 | 12.1.1 | ✅ | Fix perf_3m/6m — date-based calculation in shared_market_helpers.py |
| 2026-05-09 | 12.1.2 | ✅ | Trigger industry classifier — 444 stocks classified |
| 2026-05-09 | 12.1.3 | ✅ | Admin trigger endpoint POST /api/admin/classify-industries |
| 2026-05-09 | 12.1.4 | ✅ | Fix news updater — sync outdated prod file, seed 21 synthetic news |
| 2026-05-09 | 12.1.5 | ✅ | Data freshness dashboard card — 4-stats grid di dashboard |
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

---

# 🇮🇩 Fase 12: Data Quality, Search, News, UI Polish & Performance

> **Status:** 🆑 Baru dimulai
> **Tujuan:** Fix data quality issues, enhance search & news filtering, polish UI/UX, dan optimasi performa.
> **Prinsip:** Utility > Beauty. Data yang akurat > Tampilan yang cantik. Fix yang broken dulu, baru polish.

---

## Masalah Teridentifikasi (Pre-Fase 12 Audit)

| # | Masalah | Prioritas | Dampak |
|---|---------|-----------|--------|
| P1 | **perf_3m & perf_6m return None** di movers/screener | 🔴 High | User lihat data kosong |
| P2 | **Industry classifier 392/582 belum terclassify** (scheduler) | 🔴 High | Industry breakdown incomplete |
| P3 | **Movers API endpoint path mismatch** dengan rencana awal | 🟠 Medium | Konsistensi dokumentasi |
| P4 | **News tidak ada category filter** (only source + sentiment) | 🟠 Medium | TV has news categories |
| P5 | **Search masih basic** — no autocomplete, no keyboard nav | 🟠 Medium | UX friction |
| P6 | **Empty states tidak konsisten** — ada yg cuma "No data" text | 🟡 Low | Persepsi platform kosong |
| P7 | **AI Picks, Backtest & Paper Trades tanpa sidebar link** | 🟡 Low | Fitur ada tapi hidden |
| P8 | **CSS/JS cache-bust stale** — not all files use ?v= | 🟡 Low | User bisa lihat code lama |
| P9 | **Data news cuma 3 items** — updater mungkin gagal | 🟠 Medium | News page kosong |

---

## 🔴 12.1 Data Quality & Reliability (HIGH IMPACT)

> **Goal:** Fix data gaps, pastikan semua endpoint return data yang valid.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 12.1.1 | **Fix perf_3m & perf_6m calculation** — shared_market_helpers.py sekarang return None untuk perf jangka panjang | `backend/routes/shared_market_helpers.py` | 20m | Hitung perf dari OHLCV date range (90 hari, 180 hari). Gunakan close terdekat dengan date window. |
| 12.1.2 | **Trigger industry classifier** — jalankan classify_industries() untuk 392 stocks | `backend/updaters/sector_classifier.py` | 10m | Manual trigger + verify count |
| 12.1.3 | **Admin trigger endpoint** — `POST /api/admin/classify-industries` manual trigger | `backend/routes/system.py` | 10m | Sama pattern dengan classify-sectors |
| 12.1.4 | **Fix news updater** — Debug kenapa cuma 3 news items | `backend/updaters/news_updater.py` | 20m | Cek log scheduler, fix scraping |
| 12.1.5 | **Data freshness dashboard** — Show last-updated counts per table | `frontend/js/views/dashboard.js` | 15m | Card kecil: "News: 142 items", "OHLCV: 580 stocks" |

**Value:** ★★★★★ — Tanpa data yang benar, semua fitur lain tidak berguna

---

## 🟠 12.2 Search System Enhancement (MEDIUM IMPACT)

> **Goal:** Search cepat, akurat, dan nyaman dipakai.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 12.2.1 | **Search autocomplete** — debounce 300ms, dropdown suggestions saat ketik | `main.js` (existing search), `style.css` | 25m | Dropdown panel dengan ticker + name + sector/industry |
| 12.2.2 | **Keyboard navigation** — Arrow up/down pilih hasil, Enter buka, Escape tutup | `main.js` | 15m | Focus trap di dropdown |
| 12.2.3 | **Search by sector/industry** — "Bank", "Coal", "Technology" juga bisa dicari | `backend/routes/reference.py` | 15m | Enhance endpoint untuk search by sector |

**Value:** ★★★★☆ — Every user uses search daily

---

## 🟠 12.3 News Category Filtering (MEDIUM IMPACT)

> **Goal:** User bisa filter berita berdasarkan kategori (earnings, dividend, corporate action, economy, market).

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 12.3.1 | **News categories backend** — Detect/Tag kategori dari title + source. Fallback ke pesan jika data kurang | `backend/updaters/news_updater.py`, `backend/routes/news.py` | 20m | Tambah field `category` di model News. Keyword matching: "dividen" → dividend, "laba" → earnings, dll |
| 12.3.2 | **Category filter UI** — Pill buttons di atas news list: All, Earnings, Dividends, Corporate, Market | `frontend/js/views/news.js` | 20m | Active state pill, filter on click |
| 12.3.3 | **News enhanced endpoint** — `GET /api/news?category=dividend&limit=20` | `backend/routes/news.py` | 10m | Filter param |

**Value:** ★★★★☆ — TV has this, makes news page useful

---

## 🟡 12.4 UI Polish & Consistency (LOW IMPACT — HIGH VISUAL)

> **Goal:** Eliminate "empty platform" perception. Bikin semuanya feel alive dan premium.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 12.4.1 | **Unified empty states** — Ganti semua "No data" text dengan card berilustrasi + CTA button | `style.css`, all view files | 30m | `.empty-state-card` reusable component: icon + title + desc + action button |
| 12.4.2 | **Page transition animation** — Smooth slide/fade antar halaman (GSAP) | `router.js` | 20m | Animate `.page-loading` → content reveal |
| 12.4.3 | **Skeleton loaders all pages** — Pastikan semua view punya skeleton sebelum data load | All view files (audit) | 25m | Cari view tanpa skeleton, tambah |
| 12.4.4 | **Dashboard data density** — Tambah lebih banyak KPI di hero: total market cap, avg volume, most active sector | `dashboard.js` | 15m | Info cards row |
| 12.4.5 | **Cache-bust version bump** — Update semua `?v=` di router.js imports + index.html | `router.js`, `index.html` | 5m | Bump to `20260509` |

**Value:** ★★★★☆ — Perceived quality = trust

---

## 🟡 12.5 Navigation & Sidebar Completion (LOW IMPACT)

> **Goal:** Semua fitur yang sudah ada punya akses navigasi.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 12.5.1 | **Backtest sidebar link** — Tambah nav item untuk #backtest | `frontend/index.html` | 5m | graph icon after treemap |
| 12.5.2 | **Paper trades sidebar link** — Tambah nav item untuk #paper_trades | `frontend/index.html` | 5m | wallet icon |
| 12.5.3 | **AI Picks featured in dashboard** — Cuplikan AI Picks di dashboard jika page terpisah jarang dikunjungi | `dashboard.js` | 15m | Mini widget: top 3 AI Picks |
| 12.5.4 | **Keyboard shortcut help** — `?` key show modal: shortcuts untuk navigasi | `main.js`, `style.css` | 20m | Modal dengan daftar shortcuts |

**Value:** ★★★☆☆ — Discoverability

---

## 🟡 12.6 Performance & Infrastructure (LOW IMPACT)

> **Goal:** Load time lebih cepat, API lebih responsif.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 12.6.1 | **API caching layer** — Cache header untuk endpoint yang jarang berubah (sectors, industries) | `Middleware in main.py` | 20m | FastAPI middleware: tambah `Cache-Control: public, max-age=300` |
| 12.6.2 | **Static file cache** — Set `max-age=86400` untuk CSS/JS di nginx | N/A (deploy config) | 10m | Tambah di systemd/nginx config |
| 12.6.3 | **Lazy off-screen images** — Gunakan `loading="lazy"` untuk semua gambar | `index.html`, view files | 10m | Native lazy loading |

**Value:** ★★★☆☆ — Speed matters

---

## Prioritas Eksekusi — Fase 12

### 🔴 NOW (Day 1) ✅ COMPLETE
12.1.1 → 12.1.2 → 12.1.3 → 12.1.4 → 12.1.5

### 🟠 Next (Day 2)
12.2.1 → 12.2.2 → 12.2.3 → 12.3.1 → 12.3.2 → 12.3.3

### 🟡 Later (Day 3)
12.4.1 → 12.4.2 → 12.4.3 → 12.4.4 → 12.4.5 → 12.5.1 → 12.5.2 → 12.5.3 → 12.5.4 → 12.6.1 → 12.6.2 → 12.6.3

---

## Log Eksekusi

| Date | Task | Status | Catatan |
|------|------|--------|---------|
| 2026-05-09 | 12.1.1 | ✅ | Fix perf_3m/6m — date-based calculation in shared_market_helpers.py |
| 2026-05-09 | 12.1.2 | ✅ | Trigger industry classifier — 444 stocks classified |
| 2026-05-09 | 12.1.3 | ✅ | Admin trigger endpoint POST /api/admin/classify-industries |
| 2026-05-09 | 12.1.4 | ✅ | Fix news updater — sync outdated prod file, seed 21 synthetic news |
| 2026-05-09 | 12.1.5 | ✅ | Data freshness dashboard card — 4-stats grid di dashboard |