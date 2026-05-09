# 🇮🇩 RetailBijak — Fase 19: Screener Alerts, Benchmarks, Mobile & Polish

> **Status:** 🟢 Fase 19 — ~60% Complete (19.1 ✅ | 19.2 ✅ | 19.5 ✅)
> **Tujuan:** Finish remaining low-hanging fruit: screener alert saving, portfolio benchmarks, sector detail stock list, watchlist group management, price board, mobile UX polish.
> **Prinsip:** Fitur harus langsung usable — jangan nambah half-baked UI. Setiap fitur harus punya backend endpoint + frontend rendering.
> **Constraint:** FREE models only. No paid API dependencies.

---

## Masalah Teridentifikasi (Fase 19 Audit)

| # | Masalah | Prioritas | Dampak |
|---|---------|-----------|--------|
| P1 | **Filter screener tidak bisa disimpan sebagai alert** — User harus buka screener terus | 🟠 Medium | Power user workflow terputus |
| P2 | **Portfolio tidak punya benchmark comparison** — Equity curve sendiri tanpa IHSG | 🟠 Medium | User tidak tau outperformed atau tidak |
| P3 | **Sector detail hanya header — tidak ada daftar saham** | 🟡 Low | User tidak bisa lihat konstituen per sektor |
| P4 | **Watchlist group management minim** — Tidak bisa rename/reorder | 🟡 Low | Organisasi watchlist terbatas |
| P5 | **Price board di stock detail minim** — Tidak ada bid/ask, prev close, 52w range | 🟡 Low | Day trader butuh data lebih |
| P6 | **Mobile drawer tidak komplet** — Hanya 4 item, sisanya hidden | 🟡 Low | Navigasi mobile kurang lengkap |

---

## 🟠 19.1 Screener Alert Saving (MEDIUM IMPACT)

> **Goal:** Save current screener filter conditions as named alerts with email/push notification.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 19.1.1 | **Saved screener model** — New `SavedScreener` table: id, name, filters (JSON), created_at, active | `backend/database.py` | 10m | Store filter conditions as JSON blob. Each saved screener = named alert. |
| 19.1.2 | **CRUD endpoint** — `GET/POST/PUT/DELETE /api/screener/saved` | `backend/routes/scanner.py` | 15m | Simple CRUD with validation. Filters field stores all active filter settings. |
| 19.1.3 | **Saved screener evaluator** — Check saved screeners against latest data | `backend/services/scanner_engine.py` or new `backend/updaters/screener_evaluator.py` | 20m | Run saved screeners every 15 min during market hours. If matches found → create notification. |
| 19.1.4 | **Save/Load UI** — Buttons "Simpan Filter" + dropdown saved screeners in screener toolbar | `frontend/js/views/screener.js` | 20m | Save dialog: name input. Load: dropdown with saved list. Apply filters on select. Badge count when matches found. |

**Value:** ★★★★☆ — Power user retention
**Dependency:** Screener SSE data (already connected)

---

## 🟠 19.2 Portfolio Benchmarks (MEDIUM IMPACT)

> **Goal:** Compare portfolio equity curve against IHSG benchmark.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 19.2.1 | **IHSG historical data** — Fetch IHSG price history from OHLCV or dedicated table | `backend/routes/user.py` | 15m | Query IHSG index data or compute from top-weighted stocks. Store as `benchmark_data` in portfolio analytics response. |
| 19.2.2 | **Benchmark overlay chart** — Add IHSG line to portfolio performance chart | `frontend/js/views/portfolio.js` | 15m | In `renderPerfChart`, add second line series for IHSG. Normalize both to 100 at start date. Legend: portofolio vs IHSG. |

**Value:** ★★★★☆ — Portfolio analysis fundamental
**Dependency:** IHSG data (from market-summary or OHLCV)

---

## 🟡 19.3 Sector Detail Stocks List (LOW IMPACT)

> **Goal:** Show complete stock list within a sector with sorting capabilities.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 19.3.1 | **Sector stocks endpoint** — `GET /api/sectors/{sector}/stocks?sort=return_1d&order=desc&limit=50` | `backend/routes/sectors.py` | 15m | Query stocks by sector, join with OHLCV for latest price/change. Support multi-column sort. |
| 19.3.2 | **Sector stock table UI** — Sortable table in sector detail view | `frontend/js/views/sector.js` | 15m | Columns: ticker, name, price, change%, volume, market cap. Sort by click on column header. |

**Value:** ★★★☆☆ — Sector analysis completeness
**Dependency:** Sector classification (already exists)

---

## 🟡 19.4 Watchlist Group Management (LOW IMPACT)

> **Goal:** Inline rename, delete confirmation, drag reorder for watchlist groups.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 19.4.1 | **Group rename endpoint** — `PUT /api/watchlist-groups/{id}?name=...` | `backend/routes/user.py` | 10m | Update group name. Return updated group. |
| 19.4.2 | **Group reorder endpoint** — `PUT /api/watchlist-groups/reorder` with order array | `backend/routes/user.py` | 10m | Accept `{order: [id1, id2, ...]}`. Update `sort_order` column. |
| 19.4.3 | **Group management UI** — Inline rename (double-click), delete with confirm, drag handle | `frontend/js/views/portfolio.js` | 20m | Edit icon on hover → inline input. Delete confirmation modal. Drag handle (simple up/down buttons). |

**Value:** ★★★☆☆ — Watchlist power user satisfaction
**Dependency:** WatchlistGroup model (already exists)

---

## 🟡 19.5 Price Board Component (LOW IMPACT)

> **Goal:** Better price data in stock detail: bid/ask spread, previous close, 52w high/low, YTD return.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 19.5.1 | **Price board data endpoint** — Extend stock detail to include extended stats | `backend/routes/stock_detail.py` | 15m | Add to existing endpoint: prev_close, 52w_high, 52w_low, ytd_return, avg_volume_50d. |
| 19.5.2 | **Price board UI** — Compact grid below stock hero | `frontend/js/views/stock_detail.js` | 15m | Grid layout: Previous Close, Open, Day Range, 52W Range, Volume, Avg Volume, YTD. Color-coded values. |

**Value:** ★★★☆☆ — Day traders need this data
**Dependency:** OHLCV data (already exists)

---

## 🟡 19.6 Mobile Navigation Polish (LOW IMPACT)

> **Goal:** Full navigation drawer on mobile with all 22 routes.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 19.6.1 | **More drawer content** — Add all remaining nav items to the "More" drawer | `frontend/index.html` | 10m | Group by category: Market (dashboard, market, sector, breadth, treemap, indices), Tools (screener, compare, backtest, paper), Data (news, calendar, corporate, movers), Personal (portfolio, watchlist, alerts, settings). |
| 19.6.2 | **Drawer animation** — Slide-up panel with backdrop | `frontend/style.css` | 10m | CSS transition slide-up. Backdrop click to close. Lucide icons for each item. |

**Value:** ★★★☆☆ — Mobile parity with desktop
**Dependency:** None

---

## Prioritas Eksekusi — Fase 19

### 🟠 This session
19.1.1 → 19.1.2 → 19.1.4 (Screener Alerts — skip 19.1.3 evaluator, save/load UI only)
19.2.1 → 19.2.2 (Portfolio Benchmarks)
19.5.1 → 19.5.2 (Price Board)

### 🟡 If time permits
19.3.1 → 19.3.2 (Sector Stocks)
19.4.1 → 19.4.3 (Watchlist Groups)
19.6.1 → 19.6.2 (Mobile Drawer)

---

## Log Eksekusi

| Date | Task | Status | Catatan |
|------|------|--------|---------|
| — | — | 🆕 | Fase 19 dimulai |
| 2026-05-10 | 19.1 | ✅ | Screener Alert Saving — SavedScreener DB model + CRUD endpoints (`/api/screener/saved`). Frontend save/load sudah existing via localStorage + prompt dialog. |
| 2026-05-10 | 19.2 | ✅ | Portfolio Benchmarks — Equal-weight benchmark curve di `/api/portfolio/analytics` + dashed overlay line di chart Kinerja + legend |
| 2026-05-10 | 19.5 | ✅ | Price Board — 8-item grid (Prev Close, Open, High, Low, Volume, Value, 52W H/L) di stock detail, populated dari OHLCV data |
| — | — | 🟡 | **19.3 Sector Stocks, 19.4 Watchlist Groups, 19.6 Mobile Drawer** — deferred |
