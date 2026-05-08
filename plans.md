# 🇮🇩 RetailBijak — Fase 9: Intelligence & Data Richness

> **Status:** 🆕 Baru — fase enrichment dan professional-grade analytics
> **Tujuan:** Mengubah retailbijak dari platform fungsional menjadi platform **data-rich, profesional, dan comprehensive**
> **Prinsip:** Zero external data di runtime. Scheduler boleh fetch metadata (sector/industry) sekali untuk enrichment.
> **Constraint:** IDX API rate-limited. Semua user-facing feature harus jalan dengan data existing.

---

## Masalah Teridentifikasi

| # | Masalah | Dampak | Prioritas |
|---|---------|--------|-----------|
| M1 | **Sektor cuma 14/974 saham** — sector dashboard hampir useless | User gak bisa analisis sektoral secara bermakna | 🔴 High |
| M2 | **Tidak ada market breadth chart** — advance-decline cuma angka, gak ada visual trend | Trader gak bisa lihat momentum pasar | 🔴 High |
| M3 | **Watchlist gak bisa di-group** — semua saham jadi 1 daftar | User power butuh organisasi | 🟠 Medium |
| M4 | **Nggak ada data freshness di setiap view** — cuma dashboard yang punya | User ragu data sudah usang | 🟡 Low |
| M5 | **Mobile experience masih desktop-first** — gak ada pull-to-refresh, swipe gesture | User mobile kurang puas | 🟡 Low |

---

## Fase 9: Intelligence & Data Richness

### 9.1 🔴 Sector Classification for ALL Stocks (HIGHEST IMPACT)

> **Goal:** 960 stocks tanpa sector → semua punya sector/industry. Sector dashboard jadi berguna untuk semua 974 saham.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 9.1.1 | **Sector classifier script** — batch-fetch sector/industry dari yfinance untuk 960 stocks, chunked 50/batch, 1s delay | `updaters/sector_classifier.py` (new) | 45m | yfinance `info.sector`/`info.industry`, batch update SQL, timeout handling |
| 9.1.2 | **Register in scheduler** — jalankan daily 03:00 WIB, update only stocks with NULL sector | `scheduler.py` | 10m | Run after fundamentals update |
| 9.1.3 | **Manual trigger endpoint** — `POST /api/admin/classify-sectors` untuk trigger manual | `routes/system.py` | 10m | One-click classification |
| 9.1.4 | **Sector dashboard refresh** — update `sector.js` untuk handle 974 stocks, loading state untuk 100+ sector | `sector.js`, `style.css` | 20m | Handle large dataset |

**Value:** ★★★★★ — ini unlock sector dashboard dari gimmick jadi killer feature

### 9.2 🔴 Market Breadth Chart (HIGH IMPACT)

> **Goal:** Advance-decline line chart, cumulative breadth, market health visualization.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 9.2.1 | **Breadth endpoint** — `GET /api/market/breadth` return daily gainers/decliners/unchanged dari OHLCV | `routes/market.py` | 20m | Aggregate close>open per date |
| 9.2.2 | **Breadth chart view** — advance-decline line, histogram bars (green/red), cumulative breadth | `breadth.js` (new), `router.js` | 30m | Chart.js line chart |
| 9.2.3 | **Breadth widget on dashboard** — "Market Breadth: 548↑ 317↓" mini card with sparkline | `dashboard.js` | 15m | Quick health check |
| 9.2.4 | **Sidebar nav** — link ke breadth page | `index.html` | 5m | Nav item |

**Value:** ★★★★★ — professional-grade tool untuk trader

### 9.3 🟠 Watchlist Groups UI (MEDIUM IMPACT)

> **Goal:** Backend `watchlist_groups` table sudah ada dengan 1 row. Tambah frontend CRUD.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 9.3.1 | **Groups CRUD endpoint** — list, create, update, delete watchlist groups | `routes/user.py` | 20m | Check if endpoints exist |
| 9.3.2 | **Groups UI in watchlist** — tab/select untuk pilih group, "Buat Group Baru" modal | `portfolio.js` | 30m | Group management |
| 9.3.3 | **Move stocks between groups** — drag or dropdown untuk pindahin saham ke group lain | `portfolio.js` | 20m | Organization |

**Value:** ★★★☆☆ — power user feature

### 9.4 🟡 Data Freshness Everywhere (LOW IMPACT)

> **Goal:** Setiap view punya indikator kapan data terakhir di-update.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 9.4.1 | **Data freshness endpoint** — `GET /api/system/freshness` return last update per table | `routes/system.py` | 15m | Query MAX(updated_at) for each table |
| 9.4.2 | **Freshness bar in topbar** — indikator kecil di topbar "Data: 2 jam lalu" | `main.js`, `index.html` | 20m | Global freshness indicator |

**Value:** ★★★☆☆ — UX transparency

### 9.5 🟡 Mobile Pull-to-Refresh (LOW IMPACT)

> **Goal:** Native-feeling pull-to-refresh gesture on mobile.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 9.5.1 | **PTR implementation** — touch-based pull-to-refresh untuk semua view | `main.js` | 30m | Touch events + visual indicator |
| 9.5.2 | **PTR visual** — animated pull-down indicator, spinner, haptic feedback | `style.css` | 15m | Smooth animation |

**Value:** ★★★☆☆ — mobile UX parity

---

## Prioritas Eksekusi

### 🔴 Langsung (Now)
9.1.1 → 9.1.2 → 9.1.3 → 9.1.4 → 9.2.1 → 9.2.2

### 🟠 Berikutnya
9.2.3 → 9.2.4 → 9.3.1 → 9.3.2

### 🟡 Setelahnya
9.3.3 → 9.4.1 → 9.4.2 → 9.5.1 → 9.5.2

---

## Log Eksekusi — Fase 9

| Date | Task | Status | Catatan |
|------|------|--------|---------|
| 2026-05-08 | — | 🆕 | Mulai Fase 9: Intelligence & Data Richness |

---

*Plan ini akan diupdate setiap ada progres task.*
