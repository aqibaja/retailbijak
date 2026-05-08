# 🇮🇩 RetailBijak — Fase 17: Platform Maturity, Mobile UX & Tooling

> **Status:** 🟢 Fase 17 — 20% Complete (17.1 ✅ | 17.2-17.8 🆕)
> **Tujuan:** Fix pipeline yang masih kosong (calendar_events), polish light theme, enhance mobile UX, tambah fitur export/import Docker, dan selesaikan i18n.
> **Prinsip:** Maturity sebelum scaling — fix yang broken dulu, baru tambah fitur baru.
> **Constraint:** yfinance masih rate-limited — semua scheduler harus punya synthetic fallback.

---

## Masalah Teridentifikasi (Fase 17 Audit)

| # | Masalah | Prioritas | Dampak |
|---|---------|-----------|--------|
| P1 | **Calendar events = 0** — seed gagal karena yfinance | 🔴 High | Dividen, IPO, rights issue tidak tampil |
| P2 | **Light theme belum sempurna** — banyak komponen masih hardcoded dark | 🟠 Medium | User light mode lihat teks putih di background putih |
| P3 | **Tidak ada CSV import portfolio** — harus input manual 1 per 1 | 🟠 Medium | User dengan banyak posisi malas input |
| P4 | **Search hanya terbatas** — cmd-K minimalis, tidak ada autocomplete | 🟡 Low | User susah cari saham |
| P5 | **Chart tidak bisa di-export** — screenshot atau download image | 🟡 Low | Analis tidak bisa share chart |
| P6 | **No Docker setup** — deployment manual via cp ke /opt/swingaq | 🟡 Low | Developer lain susah clone & run |
| P7 | **i18n belum selesai** — English mode hanya sebagian | 🟡 Low | User non-Indonesia kurang nyaman |
| P8 | **Mobile PWA install prompt masih basic** | 🟡 Low | Install rate rendah |
| P9 | **Bottom nav desktop** — sidebar bagus, tapi desktop juga butuh bottom bar | 🟡 Low | Navigasi desktop bisa lebih efisien |

---

## 🔴 17.1 Calendar Pipeline Fix (HIGH IMPACT)

> **Goal:** Calendar events terisi data dividen, IPO, dan earnings dari synthetic data + OHLCV.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 17.1.1 | **Synthetic calendar seeder** — Generate dividend events from OHLCV price data + random IPO/rights for top stocks | `backend/updaters/calendar_updater.py` (modify) | 20m | Use dividend_yield from fundamentals to calculate dividend dates. Add synthetic IPO events for recent years. |
| 17.1.2 | **Admin trigger endpoint** — `POST /api/admin/seed-calendar` | `backend/routes/system.py` | 5m | Simple wrapper like seed-brokers |
| 17.1.3 | **Calendar health card** — Show calendar event count in settings health | already done | 0m | 16.10.3 already covers this |

**Value:** ★★★★☆ — Dividen tracker adalah fitur yang paling diminta investor IDX
**Dependency:** Fundamentals data (150 rows), OHLCV data

---

## 🟠 17.2 Light Theme Polish (MEDIUM IMPACT)

> **Goal:** Light theme benar-benar usable — semua komponen punya light mode styling.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 17.2.1 | **Audit light mode issues** — Find all hardcoded dark colors | `frontend/style.css` (audit) | 15m | Search for `#1a1a2e`, `#0f0f1a`, `#16213e` and similar dark-only colors |
| 17.2.2 | **Fix remaining light mode CSS** — Add `[data-theme="light"]` overrides | `frontend/style.css` | 30m | Focus on: cards, tables, inputs, headers, bottom nav, sidebar |
| 17.2.3 | **Test all views in light mode** — Manual QA | manual | 15m | Check each view: dashboard, screener, stock detail, portfolio, news, settings |

**Value:** ★★★★☆ — Light mode users currently get a broken experience
**Dependency:** CSS knowledge

---

## 🟠 17.3 Portfolio CSV Import (MEDIUM IMPACT)

> **Goal:** Import portfolio positions from broker CSV (format: ticker, lots, avg_price).

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 17.3.1 | **CSV import endpoint** — `POST /api/portfolio/import-csv` parse CSV body, batch insert | `backend/routes/portfolio.py` | 20m | Accept multipart/form-data. Support columns: ticker, lots, avg_price, notes. |
| 17.3.2 | **CSV import UI** — Upload button + file picker + preview + confirm | `frontend/js/views/portfolio.js` | 20m | Drag-and-drop or file input. Preview parsed rows before import. Toast result. |
| 17.3.3 | **Sample CSV download** — `GET /api/portfolio/sample-csv` return template | `backend/routes/portfolio.py` | 5m | Downloadable CSV template with example data |

**Value:** ★★★★☆ — Saves users hours of manual entry
**Dependency:** Portfolio routes (already exist)

---

## 🟡 17.4 Search Enhancement (LOW IMPACT)

> **Goal:** Search overlay yang lebih powerful — autocomplete, sector filter, keyboard nav.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 17.4.1 | **Enhanced search endpoint** — `GET /api/search?q=...` return stocks + sectors + indices | `backend/routes/system.py` | 15m | UNION query: stocks matching name/ticker, sectors matching name |
| 17.4.2 | **Search UI upgrade** — Autocomplete dropdown dengan kategori | `frontend/js/main.js` (setupSearchOverlay) | 25m | Debounced input. Show results grouped: Saham, Sektor, Indeks. Arrow key nav + Enter to select. |
| 17.4.3 | **Mobile search** — Search bar di bottom drawer / dedicated search page | `frontend/js/views/search.js` (new) | 20m | Route `#search` with full-page search. Keyboard opens instantly. |

**Value:** ★★★☆☆ — Power users navigate via keyboard
**Dependency:** None

---

## 🟡 17.5 Chart Export (LOW IMPACT)

> **Goal:** Export chart sebagai PNG image.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 17.5.1 | **Export chart button** — Tambah button di chart toolbar | `frontend/js/views/chart.js` | 15m | `Download as PNG` button. Use canvas.toDataURL() for LightweightCharts. |
| 17.5.2 | **Download trigger** — Create temporary link + click | `frontend/js/views/chart.js` | 5m | Auto-download with filename: `BBCA_2026-05-10_chart.png` |

**Value:** ★★★☆☆ — Analis suka simpan chart untuk laporan
**Dependency:** LightweightCharts (canvas-based)

---

## 🟡 17.6 Docker Setup (LOW IMPACT — HIGH INFRA)

> **Goal:** Dockerfile + docker-compose untuk development & production.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 17.6.1 | **Dockerfile** — Python + uvicorn production image | `Dockerfile` (new) | 15m | Multi-stage: install deps, copy backend, expose 8000. |
| 17.6.2 | **Nginx config for Docker** — Static files + reverse proxy | `deploy/nginx.conf` (new) | 15m | Serve frontend via nginx, proxy `/api` to uvicorn. |
| 17.6.3 | **docker-compose.yml** — App + optional watchtower for auto-update | `docker-compose.yml` (new) | 10m | Single service app. Mount volume for SQLite. |

**Value:** ★★★☆☆ — Reproducible deployment, easier onboarding
**Dependency:** None

---

## 🟡 17.7 i18n Completion (LOW IMPACT)

> **Goal:** English translation 100% complete — toggle ID/EN works everywhere.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 17.7.1 | **Audit missing translations** — Find views that don't use `__()` | `frontend/js/views/*.js` | 15m | Search for hardcoded Indonesian strings that should be translated |
| 17.7.2 | **Add missing i18n keys** — For 5-10 most-viewed pages | `frontend/js/i18n.js` | 20m | Add keys for dashboard, screener, stock detail, portfolio |
| 17.7.3 | **English toggle in settings** — Persistent language preference | `frontend/js/views/settings.js` | 10m | Dropdown/setting to choose language. Save to localStorage + UserSetting. |

**Value:** ★★★☆☆ — Membuka pasar pengguna internasional
**Dependency:** i18n.js (already exists)

---

## 🟡 17.8 Mobile UX Polish (LOW IMPACT)

> **Goal:** Mobile experience feels native — bottom nav enhancement, PWA install, touch feedback.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 17.8.1 | **Desktop bottom nav** — Show bottom nav on desktop too (compact mode) | `frontend/index.html`, `style.css` | 15m | Bottom nav visible on all screen sizes. Hide sidebar on mobile. |
| 17.8.2 | **PWA install prompt enhancement** — Better banner UI with screenshots | `frontend/js/main.js` | 15m | Custom install dialog with app screenshots. Track dismissed state. |
| 17.8.3 | **Touch feedback** — Ripple effect on buttons/cards | `frontend/style.css` | 10m | CSS `:active` state with transform scale + background flash. |

**Value:** ★★★☆☆ — Mobile users = majority of Indonesian retail traders
**Dependency:** None

---

## Prioritas Eksekusi — Fase 17

### 🔴 NOW (Day 1)
17.1.1 → 17.1.2 (Calendar Pipeline)

### 🟠 Next (Day 2)
17.2.1 → 17.2.2 → 17.2.3 (Light Theme)
17.3.1 → 17.3.2 → 17.3.3 (CSV Import)

### 🟡 Later (Day 3-4)
17.4.1 → 17.4.2 → 17.4.3 (Search)
17.5.1 → 17.5.2 (Chart Export)
17.6.1 → 17.6.2 → 17.6.3 (Docker)
17.7.1 → 17.7.2 → 17.7.3 (i18n)
17.8.1 → 17.8.2 → 17.8.3 (Mobile UX)

---

## Log Eksekusi

| Date | Task | Status | Catatan |
|------|------|--------|---------|
| — | — | 🆕 | Fase 17 dimulai |
| 2026-05-10 | 17.1.1 | ✅ | Synthetic calendar seeder — 1,716 events (dividends, earnings, IPO, rights/split) |
| 2026-05-10 | 17.1.2 | ✅ | `POST /api/admin/seed-calendar` — admin trigger endpoint |
