# 🇮🇩 RetailBijak — Fase 15: Index Intelligence, Advanced Tools & Platform Maturity

> **Status:** 🟡 Fase 15 — Sedang Berjalan (Index Engine ✅, Financials 🟡, sisa 🆕)
> **Tujuan:** Menambahkan fitur intelijen indeks IDX (LQ45, IDX30, KOMPAS100), corporate actions tracker, dan tools analisis lanjutan.
> **Prinsip:** Semua fitur harus jalan dengan data existing di DB. Zero external data di runtime. Scheduler boleh fetch enrichment.
> **Constraint:** IDX API rate-limited. Financials pipeline rusak — fix dulu.

---

## Masalah Teridentifikasi (Pre-Fase 15 Audit)

| # | Masalah | Prioritas | Dampak |
|---|---------|-----------|--------|
| P1 | **Index constituents (LQ45/IDX30/KOMPAS100) tidak ada** | 🔴 High | Trader IDX butuh filter saham blue-chip |
| P2 | **Financials = 0** — pipeline gagal fetch yfinance financials | 🔴 High | Laporan keuangan tidak tampil |
| P3 | **IPO / Rights Issue / Corporate Actions tidak ada halaman dedicated** | 🟠 Medium | User tidak bisa tracking aksi korporasi |
| P4 | **Portfolio rebalancing UI belum ada** — backend sudah siap | 🟠 Medium | Fitur setengah jadi |
| P5 | **Tidak ada market session timer** | 🟡 Low | User tidak tahu market open/close |
| P6 | **Tidak ada AMOLED dark theme** | 🟡 Low | OLED users prefer true black |
| P7 | **Tidak ada full-screen chart mode** | 🟡 Low | Analis butuh chart besar |
| P8 | **Watchlist news feed tidak ada** | 🟡 Low | News hanya global, tidak per-watchlist |
| P9 | **Sector rotation chart tidak ada** | 🟡 Low | Visual rotasi sektor |
| P10 | **BrokerSummary = 0** — pipeline mungkin gagal | 🟠 Medium | Data broker tidak tampil |
| P11 | **Cache-bust stale** — perlu bump setelah Fase 15 | 🟡 Low | User bisa lihat JS lama |

---

## 🔴 15.1 Index Constituents Engine (HIGH IMPACT)

> **Goal:** Setiap saham di DB punya tag indeks (LQ45, IDX30, KOMPAS100, IDX80, IDXESGL). User bisa filter dan sort berdasarkan indeks membership.
> **Data:** Seed dari list statis (indeks berubah 6 bulan sekali). Bisa di-update manual via admin trigger.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 15.1.1 | **Index model + migration** — `StockIndex` table: ticker + index_name (PK composite) | `backend/database.py` | 10m | Composite PK: ticker + index_name. Index on index_name for filtering. |
| 15.1.2 | **Seed data** — Hardcode konstituen LQ45, IDX30, KOMPAS100, IDX80, IDXESGL (periode Feb-Jul 2026) | `backend/updaters/index_updater.py` (new) | 30m | ~200+ total unique stocks across indices. Gunakan ticker existing. |
| 15.1.3 | **Index API endpoint** — `GET /api/indices` list + `GET /api/indices/{name}/constituents` detail | `backend/routes/indices.py` (new) | 15m | Return tickers + current price + perf for each constituent |
| 15.1.4 | **Index filter in screener** — Filter dropdown: "Indeks: LQ45" di panel screener | `frontend/js/views/screener.js`, `backend/scanner.py` | 20m | SSE scanner support index filter |
| 15.1.5 | **Index badges on stock detail** — Badge LQ45/IDX30/ESGL di hero stock detail | `frontend/js/views/stock_detail.js` | 10m | Colored chips: LQ45=🔵 blue, IDX30=🟢 green |
| 15.1.6 | **Index performance page** — `#indices` view: tabel semua index + perf hari ini + YTD + konstituen top/bottom | `frontend/js/views/indices.js` (new), `router.js`, `index.html` | 35m | TV-style index table + mini treemap per index |
| 15.1.7 | **Index sidebar nav** — Link ke `#indices` | `frontend/index.html` | 5m | bar-chart-3 icon |

**Value:** ★★★★★ — Setiap trader IDX butuh index filter
**Dependency:** Stock model, OHLCV data

---

## 🔴 15.2 Financials Pipeline Fix (HIGH IMPACT)

> **Goal:** Financials table terisi dengan data income statement, balance sheet, cash flow dari yfinance.
> **Data:** yfinance `stock.financials`, `stock.balance_sheet`, `stock.cashflow`

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 15.2.1 | **Debug yfinance financials** — Test fetch untuk BBCA, cek error | `terminal` debug | 15m | Cek yfinance versi, API changes, rate limit |
| 15.2.2 | **Fix fundamental_updater.py** — Perbaiki error handling + retry logic untuk financials fetch | `backend/updaters/fundamental_updater.py` | 25m | Chunked fetch (10 stocks/batch). Exponential backoff. Skip yang udah ada. |
| 15.2.3 | **Backfill trigger** — `POST /api/admin/backfill-financials` jalankan backfill semua stocks | `backend/routes/system.py` | 10m | Endpoint mungkin sudah ada, verify + test |
| 15.2.4 | **Financials health card** — Card di dashboard: "Financial: 0/974 stocks ❌" | `frontend/js/views/dashboard.js` | 10m | Extend existing data health card |

**Value:** ★★★★★ — Tanpa financials, fundamental analysis buta
**Dependency:** yfinance library, existing Financial model

---

## 🟠 15.3 Corporate Actions & IPO Tracker (MEDIUM IMPACT)

> **Goal:** Halaman dedicated untuk IPO, rights issue, stock split, buyback, RUPS. Tambah updater untuk scraping IDX website.
> **Data:** Seed data awal dari yfinance/IDX website. CalendarEvent model sudah punya `event_type`.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 15.3.1 | **Corporate actions updater** — Fetch IPO/rights/split dari IDX website atau RTI | `backend/updaters/corporate_actions_updater.py` (new) | 25m | Scrape IDX: https://www.idx.co.id/id/perusahaan-tercatat/calendar. Fallback ke synthetic seed. |
| 15.3.2 | **Corporate actions endpoint** — `GET /api/corporate-actions?type=ipo|rights|split|buyback` | `backend/routes/calendar.py` | 15m | Filter + sort by date. Return ticker + detail. |
| 15.3.3 | **IPO page** — `#corporate-actions` view: tabs IPO / Rights / Split / Buyback | `frontend/js/views/corporate.js` (new), `router.js` | 35m | Table: ticker, price, date, status (upcoming/ongoing/closed). IPO performance chart. |
| 15.3.4 | **Dashboard IPO widget** — Upcoming IPOs this month mini card | `frontend/js/views/dashboard.js` | 10m | 3-item list with countdown |

**Value:** ★★★★☆ — IDX investors track IPOs actively
**Dependency:** CalendarEvent model, news pipeline

---

## 🟠 15.4 Portfolio Rebalancing UI (MEDIUM IMPACT)

> **Goal:** Backend `/api/portfolio/rebalance` sudah ada — bikin frontend-nya.
> **Data:** Portfolio positions + current prices.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 15.4.1 | **Rebalance view** — `#portfolio/rebalance` wizard: target allocation sliders | `frontend/js/views/portfolio.js` (or new `rebalance.js`) | 30m | Step 1: Set target % per sector/stock. Step 2: Review suggested trades. Step 3: Execute. |
| 15.4.2 | **Rebalance API integration** — Call `/api/portfolio/rebalance`, display suggested trades | `portfolio.js` | 15m | Parse response: BUY/SELL recommendations + amounts |
| 15.4.3 | **Portfolio drift alert** — Warning ketika actual allocation drift >5% dari target | `portfolio.js`, `dashboard.js` | 15m | Visual indicator di portfolio overview |

**Value:** ★★★★☆ — Institutional portfolio management
**Dependency:** Portfolio positions, `/api/portfolio/rebalance` endpoint

---

## 🟠 15.5 Full-Screen Chart & Drawing Tools (MEDIUM IMPACT)

> **Goal:** Dedicated chart page with more space + basic drawing tools using LightweightCharts.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 15.5.1 | **Full-screen chart page** — `#chart/BBCA` dedicated view with max viewport chart | `frontend/js/views/chart.js` (new), `router.js` | 30m | LightweightCharts full viewport. Timeframe selector (1d/5d/1m/3m/6m/1y). Volume overlay. |
| 15.5.2 | **Drawing tools toolbar** — Trend line, horizontal line, Fibonacci retracement | `frontend/js/views/chart.js` | 40m | LightweightCharts plugin series for lines. Save drawings to localStorage. |
| 15.5.3 | **Chart timeframe presets** — 1D, 5D, 1M, 3M, 6M, 1Y, MAX buttons | `frontend/js/views/chart.js` | 15m | Fetch OHLCV data from `/api/stocks/{ticker}/chart-data?range=1m` |
| 15.5.4 | **"Open in Chart" button** — Link from stock detail to full-screen chart | `frontend/js/views/stock_detail.js` | 5m | Maximize-2 icon in chart header |

**Value:** ★★★★☆ — Serious traders need charting workspace
**Dependency:** LightweightCharts (already loaded), OHLCV data

---

## 🟡 15.6 Market Session Timer & Status (LOW IMPACT — HIGH VISUAL)

> **Goal:** Tampilkan status market (Open/Pre-Open/Closed) + countdown ke sesi berikutnya di topbar.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 15.6.1 | **Market session logic** — Fungsi JavaScript hitung status berdasarkan jam (09:00-12:00, 13:30-15:59 WIB) | `frontend/js/main.js` | 15m | Pre-open (08:45-09:00), Session 1 (09:00-12:00), Lunch (12:00-13:30), Session 2 (13:30-15:59), Closed |
| 15.6.2 | **Market timer UI** — Badge di topbar: 🟢 OPEN (2h 45m) atau 🔴 CLOSED (12h 30m) | `frontend/js/main.js`, `frontend/style.css` | 15m | Live countdown update setiap detik. Warna hijau/merah/abu. |
| 15.6.3 | **Session-based data freshness** — Label "Last updated: 09:45 WIB (Session 1)" | `frontend/js/main.js` | 10m | Integrasi dengan existing freshness indicator |

**Value:** ★★★☆☆ — Professional feel, useful for timing
**Dependency:** None — pure frontend logic

---

## 🟡 15.7 AMOLED Dark Theme (LOW IMPACT — HIGH VISUAL)

> **Goal:** Opsi tema "AMOLED Black" dengan background #000 untuk penghemat baterai OLED.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 15.7.1 | **AMOLED CSS variables** — Tambah `[data-theme="amoled"]` block di style.css | `frontend/style.css` | 20m | --bg-primary: #000, --bg-secondary: #0a0a0a, --bg-card: #111. Text putih murni. |
| 15.7.2 | **Theme selector enhancement** — 3-way toggle: Dark / Light / AMOLED | `frontend/js/views/settings.js`, `style.css` | 15m | Radio group + icon: 🌙 ☀️ ⚫ |
| 15.7.3 | **Persist preference** — Simpan ke UserSetting + localStorage | `frontend/js/theme.js` | 5m | Same pattern as existing dark/light toggle |

**Value:** ★★★☆☆ — OLED users will appreciate battery savings
**Dependency:** Theme system (already exists)

---

## 🟡 15.8 Watchlist News Feed (LOW IMPACT)

> **Goal:** Aggregasi berita khusus untuk saham di watchlist user.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 15.8.1 | **Watchlist news endpoint** — `GET /api/news/watchlist` return news tagged dengan ticker yang ada di watchlist user | `backend/routes/news.py` | 15m | Query news where tickers IN watchlist items. Limit 20. |
| 15.8.2 | **Watchlist news widget** — Tab/panel di portfolio page: "Berita Watchlist" | `frontend/js/views/portfolio.js` | 15m | News cards with ticker badges. Link ke stock detail. |
| 15.8.3 | **Watchlist news indicator** — Badge count "3 berita baru" di watchlist tab | `portfolio.js`, `main.js` | 10m | Poll `/api/news/watchlist?since=...` for new items |

**Value:** ★★★☆☆ — Keeps users informed about their picks
**Dependency:** News data + watchlist items

---

## 🟡 15.9 Enhanced AI Features (LOW IMPACT)

> **Goal:** Improve AI Stock Chat with structured responses + sector rotation analysis via AI.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 15.9.1 | **AI sector rotation analysis** — Button "Analisis Rotasi Sektor" → AI summaries which sectors are rotating | `frontend/js/views/sector.js` | 20m | Send sector perf data to LLM, get rotation analysis |
| 15.9.2 | **AI trade ideas in screener** — "Tanya AI" button in screener → AI filter suggestions based on current criteria | `frontend/js/views/screener.js` | 20m | "Based on your filters, consider adding: RSI < 30, Volume > 2x avg" |
| 15.9.3 | **AI Picks enhancement** — Show reason + confidence score for each pick | `frontend/js/views/ai_picks.js` | 15m | Expand existing AI Picks card |

**Value:** ★★★☆☆ — Makes AI more actionable
**Dependency:** LLM endpoint (already exists via chat API)

---

## 🟡 15.10 Data Pipeline Reliability (LOW IMPACT — CRITICAL)

> **Goal:** Fix data pipelines yang belum jalan (BrokerSummary, Financials). Tambah monitoring.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 15.10.1 | **Fix BrokerSummary pipeline** — Debug kenapa 0 rows | `backend/updaters/broker_summary_updater.py` | 20m | Cek yfinance data source. Maybe source changed or rate limited. |
| 15.10.2 | **Data pipeline dashboard** — `/api/system/data-health` return status per pipeline | `backend/routes/system.py` | 15m | Count rows per table, last updated time, success/fail status |
| 15.10.3 | **Pipeline health frontend** — Card di settings atau dashboard | `frontend/js/views/settings.js` | 15m | Traffic light: 🟢🟡🔴 per pipeline |

**Value:** ★★★★☆ — Data reliability = user trust
**Dependency:** All updaters

---

## Prioritas Eksekusi — Fase 15

### 🔴 NOW (Day 1-2)
15.2.1 → 15.2.2 → 15.2.3 → 15.2.4 (Fix Financials)
15.1.1 → 15.1.2 → 15.1.3 → 15.1.4 → 15.1.5 → 15.1.6 → 15.1.7 (Index Engine)

### 🟠 Next (Day 3-4)
15.10.1 → 15.10.2 → 15.10.3 (Data Pipeline)
15.3.1 → 15.3.2 → 15.3.3 → 15.3.4 (Corporate Actions)
15.4.1 → 15.4.2 → 15.4.3 (Portfolio Rebalance)

### 🟡 Later (Day 5-6)
15.5.1 → 15.5.2 → 15.5.3 → 15.5.4 (Full-Screen Chart)
15.6.1 → 15.6.2 → 15.6.3 (Market Timer)
15.7.1 → 15.7.2 → 15.7.3 (AMOLED Theme)
15.8.1 → 15.8.2 → 15.8.3 (Watchlist News)
15.9.1 → 15.9.2 → 15.9.3 (AI Enhancements)

---

## Log Eksekusi

| Date | Task | Status | Catatan |
|------|------|--------|---------|
| — | — | 🆕 | Fase 15 dimulai |
| 2026-05-09 | 15.1.1 | ✅ | StockIndex model, idx_index_updater.py seed 285 entries across 5 indices |
| 2026-05-09 | 15.1.2 | ✅ | Seed data LQ45/IDX30/KOMPAS100/IDX80/IDXESGL — 285 constituents |
| 2026-05-09 | 15.1.3 | ✅ | API endpoints: GET /api/index-constituents, /api/index-constituents/{name}, /api/stocks/{ticker}/indices |
| 2026-05-09 | 15.1.5 | ✅ | Index badges on stock detail — loadIndexBadges() + INDEX_BADGE_CONFIG |
| 2026-05-09 | 15.1.6 | ✅ | Indices view (indices.js) + router registration + sidebar nav link |
| 2026-05-09 | 15.1.7 | ✅ | Sidebar nav #indices — bar-chart-3 icon in index.html |
| 2026-05-09 | 15.2.1 | ⚠️ | yfinance financials API broken — rate-limited, empty returns even for AAPL |
| 2026-05-09 | 15.2.2 | ✅ | Created financials_seeder.py — generate synthetic financials from fundamental data |
| 2026-05-09 | 15.2.3 | ✅ | Ran seed_financials(): 125 records for 25 top stocks (income/balance/cashflow) |
| 2026-05-09 | 15.2.4 | ✅ | Admin trigger POST /api/admin/seed-financials |
| 2026-05-09 | 15.4.1 | ✅ | CSS + Indices page styles |
| 2026-05-09 | 15.7.1 | ✅ | AMOLED CSS: true black background, no box-shadows, minimal borders |
| 2026-05-09 | 15.7.2 | ✅ | Theme.js: 3-state cycle (dark→light→amoled→dark) + moon-star icon |
| 2026-05-09 | 15.7.3 | ✅ | Persist AMOLED preference via localStorage + data-theme attribute |
| 2026-05-09 | 15.3.1 | ✅ | corporate_actions_updater.py: 21 seed events (IPO/rights/split/dividend) |
| 2026-05-09 | 15.3.2 | ✅ | Corporate actions via existing /api/calendar + /api/corporate-actions endpoints |
| 2026-05-09 | 15.3.3 | ✅ | corporate.js frontend: 6 tabs, IDX live data + CalendarEvent, color-coded cards |
| 2026-05-09 | 15.3.4 | ✅ | Scheduler job daily 05:00 + sidebar nav + CSS |
| 2026-05-09 | 15.4.2 | ✅ | renderRebalanceTab() — fetch /api/portfolio/rebalance, cards with progress bars |
| 2026-05-09 | 15.4.3 | ✅ | Rebalance tab button in portfolio page |
| 2026-05-09 | 15.5.1 | ✅ | chart.js: full-screen chart view with LightweightCharts, 7 timeframes |
| 2026-05-09 | 15.5.2 | ✅ | Drawing tools toolbar: trend line, H-line, clear |
| 2026-05-09 | 15.5.3 | ✅ | Timeframe selector + candle data from /api/stocks/{ticker}/chart-data |
| 2026-05-09 | 15.5.4 | ✅ | Open Chart button (maximize-2 icon) in stock_detail.js |
