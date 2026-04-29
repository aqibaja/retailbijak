# SwingAQ — RetailBijak

**IDX Stock Scanner & Trading Dashboard** — aplikasi web production untuk screening saham IDX, watchlist, portfolio tracker, dan analisis teknikal/fundamental.

---

## 📁 Struktur Proyek

```
retailbijak/
├── AGENTS.md                ← File ini: konteks AI lengkap
├── backend/
│   ├── main.py              ← FastAPI entrypoint (route API, static files)
│   ├── database.py          ← SQLAlchemy models (Stock, OHLCVDaily, Signal, dll)
│   ├── scheduler.py         ← APScheduler: jadwal fetch OHLCV/signal/news/fundamental
│   ├── scanner.py           ← SSE streaming scanner engine
│   ├── stocks.py            ← Helper ticker list & display
│   ├── indicators_extended.py ← TA: RSI, MACD, SMA, Bollinger, dll
│   ├── indicators.py        ← Legacy indicator helpers
│   ├── test_api_e2e.py      ← End-to-end API test (5 test)
│   ├── requirements.txt     ← Dep Python
│   └── updaters/
│       ├── price_updater.py     ← Download OHLCV dari yfinance (chunked)
│       ├── signal_updater.py    ← Hitung sinyal trading
│       ├── news_updater.py      ← Scrape news feed
│       └── fundamental_updater.py ← Update fundamental data
├── frontend/
│   ├── index.html           ← Single-page app shell
│   ├── style.css            ← Design system + responsive (1643 baris)
│   └── js/
│       ├── main.js          ← Entry: routing, GSAP animasi, topbar market
│       ├── router.js        ← Hash-based SPA router
│       ├── api.js           ← Fetch wrappers + toast system
│       ├── theme.js         ← Dark/light mode
│       └── views/
│           ├── dashboard.js    ← KPI, chart, top gainers, news, heatmap
│           ├── stock_detail.js ← Detail saham + candlestick chart + TA/FA
│           ├── screener.js     ← SSE real-time screener + filter panel
│           ├── portfolio.js    ← Watchlist & Portfolio CRUD (backend persistent)
│           ├── market.js       ← Market overview (placeholder)
│           ├── news.js         ← News feed page
│           ├── settings.js     ← User preferences (save ke backend)
│           └── help.js         ← Help page statis
├── deploy/
│   └── swingaq-backend.service  ← systemd unit untuk production
├── planning/                ← Dokumen perencanaan legacy
│   ├── ARCHITECTURE.md, API_FEATURES.md, API_SPEC.md, dll
├── DEPLOY.md                ← Runbook deploy
└── swingaq.db               ← SQLite database (auto-create, jangan commit)
```

---

## 🚀 Cara Menjalankan

### Development (repo kerja)
```bash
cd /home/rich27/.hermes/profiles/coder/home/retailbijak/backend
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
# Frontend diakses via http://127.0.0.1:8000 (static files)
```

### Production (VPS — aktif saat ini)
```bash
# Service systemd
sudo systemctl restart swingaq-backend
sudo systemctl status swingaq-backend
# Frontend: https://retailbijak.rich27.my.id
# Backend API: https://retailbijak.rich27.my.id/api/health
```

- **Binary/service**: `/opt/swingaq/backend/venv/bin/uvicorn main:app ... --workers 1`
- **Unit file**: `/etc/systemd/system/swingaq-backend.service`
- **Deploy script**: `cp` file dari repo kerja → `/opt/swingaq/` lalu restart service.
- **DB**: `swingaq.db` di `/opt/swingaq/backend/` dan bisa juga di repo kerja.
- **User service**: `rich27`

---

## 🔧 Arsitektur

### Backend (Python FastAPI, port 8000)
- **Framework**: FastAPI + Uvicorn
- **ORM**: SQLAlchemy + SQLite
- **Scheduler**: APScheduler (BackgroundScheduler, timezone Asia/Jakarta)
- **Provider**: Yahoo Finance (yfinance) — HANYA untuk fetch batch di scheduler, **TIDAK** dipanggil dari frontend
- **Endpoint utama**:
  | Method | Path | Keterangan |
  |--------|------|------------|
  | GET | `/api/health` | Health check |
  | GET | `/api/market-summary` | Ringkasan IHSG dari DB lokal (no Yahoo) |
  | GET/PUT | `/api/settings` | User preferences (compact rows, auto-refresh) |
  | GET/POST/DELETE | `/api/watchlist` | Watchlist CRUD |
  | GET/POST/DELETE | `/api/portfolio` | Portfolio position CRUD |
  | GET | `/api/news?limit=N` | Berita market |
  | GET | `/api/stocks/{ticker}/chart-data` | OHLCV + indikator untuk chart |
  | GET | `/api/stocks/{ticker}/technical` | Summary teknikal (RSI, MACD, dll) |
  | GET | `/api/stocks/{ticker}/fundamental` | Data fundamental |
  | GET | `/api/scan?timeframe=X` | SSE streaming scanner |

### Frontend (Vanilla JS SPA)
- **Routing**: Hash-based (`#dashboard`, `#screener`, `#stock/BBCA`, dll)
- **Utils**: GSAP (animasi), Chart.js (dashboard chart), LightweightCharts (candlestick), Lucide (icons), CountUp
- **State**: Semua data dari API backend, **tidak ada fetch langsung ke Yahoo**
- **Mobile**: Bottom nav bar (4 menu utama: Dashboard, Screener, Portfolio, Settings)

---

## 🧠 Database Models (`backend/database.py`)

| Model | Table | Key | Fungsi |
|-------|-------|-----|--------|
| Stock | stocks | ticker (PK) | Info perusahaan |
| OHLCVDaily | ohlcv_daily | ticker+date (PK) | Harga harian |
| Signal | signals | ticker+timeframe+date (PK) | Sinyal trading |
| Fundamental | fundamentals | ticker (PK) | Data fundamental |
| Financial | financials | ticker+period+type (PK) | Laporan keuangan |
| News | news | id/link (PK) | Berita market |
| BrokerSummary | broker_summary | ticker+date+broker (PK) | Summary broker |
| UserSetting | user_settings | key (PK) | Preferences user |
| WatchlistItem | watchlist_items | id (autoinc) | Watchlist user |
| PortfolioPosition | portfolio_positions | id (autoinc) | Portofolio user |

---

## ⏰ Scheduler (APScheduler)

Semua timezone: **Asia/Jakarta**

| Job | Jadwal | Fungsi |
|-----|--------|--------|
| OHLCV fetch | Mon-Fri 09:00 & 15:30 | `price_updater.update_daily_ohlcv()` |
| Signal calc | Mon-Fri 09:00-16:00 every 30m | `signal_updater.update_signals()` |
| News fetch | Daily 07:00-20:00 every 30m | `news_updater.update_news()` |
| Fundamental | Daily 02:00 | `fundamental_updater.update_fundamentals()` |

**Penting**: Service dijalankan dengan `--workers 1` untuk mencegah duplikasi job scheduler. Saat startup di jam market, scheduler langsung menjadwalkan 1x OHLCV refresh.

---

## 🎨 UI/UX Design System

- **Tema**: Green design system (light/dark mode)
- **Layout**:
  - Desktop: Topbar + Sidebar (240px) + Main content
  - Tablet (≤1024px): Sidebar collapse (64px, icon-only)
  - Mobile (≤768px): Bottom navigation (4 menu utama), sidebar hidden
- **Komponen**: Card, KPI card, data-table, toast, skeleton loader, modal overlay, chip/badge
- **Animasi**: GSAP (page transition, card stagger, count-up, sparkline draw)
- **Accessibility**: Skip-to-content link, prefers-reduced-motion, keyboard shortcut ⌘K

---

## 📋 Fitur (Saat Ini)

| Fitur | Status | Backend | Frontend |
|-------|--------|---------|----------|
| Dashboard IHSG/KPI | ✅ | `/api/market-summary` (DB) | Live dari backend |
| Screener SSE | ✅ | `/api/scan` (streaming) | Real-time table |
| Stock Detail + Chart | ✅ | `/api/stocks/{t}/chart-data` | Candlestick (LightweightCharts) |
| Technical Analysis | ✅ | `/api/stocks/{t}/technical` | RSI, MACD, Trend |
| Fundamental Data | ✅ | `/api/stocks/{t}/fundamental` | P/E, P/B, EPS, dll |
| Watchlist CRUD | ✅ | `/api/watchlist` | Persistent DB |
| Portfolio CRUD | ✅ | `/api/portfolio` | Persistent DB |
| User Settings | ✅ | `/api/settings` | Compact rows, auto-refresh |
| News / Market | ✅ | `/api/news` | Feed + Market overview |
| Help page | ✅ | - | Statis |
| Dark/Light theme | ✅ | - | Toggle + auto-detect |
| Responsive mobile | ✅ | - | Bottom nav, sticky controls |
| Data ingestion | 🟡 | Scheduler dari Yahoo | Batch 2x/hari (rate-limited) |

---

## 🔍 Batasan & Catatan Penting

1. **Yahoo Rate Limit**: Scheduler batch OHLCV dari yfinance sering kena rate limit karena 600+ ticker IDX. Jadwal sudah diturunkan jadi 2x/hari (09:00 & 15:30) untuk mengurangi beban.
2. **Data real-time**: Tidak ada real-time price. Harga terbaru sesuai jadwal scheduler terakhir sukses fetch.
3. **Frontend tidak pernah fetch Yahoo langsung.** Semua data dari backend → DB lokal.
4. **SQLite** — untuk production skala besar, migrasi ke PostgreSQL dianjurkan.
5. **Auth**: Belum ada autentikasi. Aplikasi single-user saat ini.
6. **Service restart non-interaktif**: Butuh privilege systemd (`systemctl restart swingaq-backend`).

---

## Commit History (terbaru → lama)

```
a5588ae Improve mobile nav focus and screener quick-run UX
6ab1e77 Guard scheduler lifecycle across startup/shutdown
8da1286 Serve market summary from DB and harden topbar fallback
3771854 Use DB-only market summary endpoint (no live Yahoo calls)
d2fc353 Adjust OHLCV schedule to 09:00 and 15:30 weekdays
3e6a343 Harden OHLCV refresh with chunked fetch and single-worker scheduler
71833e7 Update OHLCV scheduler to run every 30 minutes on weekdays
f15983a Add systemd service definition for production backend
c90ba14 Add API E2E tests and deployment runbook
1bdeeeb Implement persistent watchlist and portfolio end-to-end
c81c1ff Enable screener auto-refresh from saved settings
ef5a52f Add backend settings API and wire frontend preferences
b37ea02 Add working routes for market, news, settings, and help
9a5fd6d Fix stock detail loading fallback and mobile nav labels
706d23d feat: complete UI/UX transformation — GSAP animations, green design system
781aa89 Initial commit - SwingAQ v2 Fintech Dashboard
```

---

## 💡 Panduan untuk AI Agent

Saat melanjutkan pekerjaan di proyek ini:

1. **Repo kerja**: `/home/rich27/.hermes/profiles/coder/home/retailbijak/`
2. **Runtime publik**: `/opt/swingaq/` — sync dengan `cp` lalu restart service.
3. **Test**: `cd /opt/swingaq/backend && ./venv/bin/pytest -q test_api_e2e.py` (5 test).
4. **Compile check**: `python -m py_compile backend/main.py backend/database.py && python -m compileall -q frontend/js`
5. **Commit & push**: `git add ... && git commit -m "..." && git push origin main`
6. **Restart service**: `systemctl restart swingaq-backend` (user rich27, no sudo needed jika di VPS shell).
7. **Dokumentasi rujukan**: lihat `planning/` untuk spesifikasi awal, `DEPLOY.md` untuk runbook.

**Prinsip**: Frontend hanya fetch dari backend. Backend fetch Yahoo hanya di scheduler, bukan di request path. Semua perubahan harus di-commit, di-push, di-deploy.
