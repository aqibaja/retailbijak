# retailbijak — IDX Stock Intelligence

**retailbijak** adalah platform stock scanner, market dashboard, dan portfolio tracker untuk analisis saham IDX yang profesional.

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
│   ├── style.css            ← Design system + responsive
│   └── js/
│       ├── main.js          ← Entry: routing, animasi, topbar market
│       ├── router.js        ← Hash-based SPA router
│       ├── api.js          ← Fetch wrappers + toast system
│       ├── theme.js        ← Dark/light mode
│       └── views/
│           ├── dashboard.js    ← KPI, chart, movers, news, heatmap
│           ├── stock_detail.js ← Detail saham + candlestick chart + TA/FA
│           ├── screener.js     ← SSE real-time screener + filter panel
│           ├── portfolio.js    ← Watchlist & Portfolio CRUD (backend persistent)
│           ├── market.js       ← Market overview
│           ├── news.js         ← News feed page
│           ├── settings.js     ← User preferences
│           └── help.js         ← Help page statis
├── deploy/
│   └── swingaq-backend.service  ← systemd unit untuk production
├── planning/                ← Dokumen perencanaan legacy
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

### Frontend (Vanilla JS SPA)
- **Routing**: Hash-based (`#dashboard`, `#screener`, `#stock/BBCA`, dll)
- **Utils**: GSAP, Chart.js, LightweightCharts, Lucide, CountUp
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

---

## 🎨 UI/UX Design System

- **Brand**: retailbijak
- **Tema**: dark-first professional trading terminal
- **Layout**:
  - Desktop: Topbar + Sidebar + Main content
  - Mobile: Bottom navigation
- **Komponen**: Card, KPI card, data-table, toast, skeleton loader, modal overlay, chip/badge
- **Animasi**: Halus dan fungsional

---

## 📋 Fitur (Saat Ini)

| Fitur | Status |
|-------|--------|
| Dashboard IHSG/KPI | ✅ |
| Screener SSE | ✅ |
| Stock Detail + Chart | ✅ |
| Technical Analysis | ✅ |
| Fundamental Data | ✅ |
| Watchlist CRUD | ✅ |
| Portfolio CRUD | ✅ |
| User Settings | ✅ |
| News / Market | ✅ |
| Help page | ✅ |
| Dark/Light theme | ✅ |
| Responsive mobile | ✅ |
| Data ingestion | 🟡 |

---

## 🔍 Batasan & Catatan Penting

1. **Yahoo Rate Limit**: fetch OHLCV via yfinance bisa kena rate limit.
2. **Data real-time**: tidak ada real-time price.
3. **Frontend tidak pernah fetch Yahoo langsung.**

---

## 💡 Panduan untuk AI Agent

Saat melanjutkan pekerjaan di proyek ini:

1. **Repo kerja**: `/home/rich27/.hermes/profiles/coder/home/retailbijak/`
2. **Runtime publik**: `/opt/swingaq/` — sync dengan `cp` lalu restart service.
3. **Test**: `cd /opt/swingaq/backend && ./venv/bin/pytest -q test_api_e2e.py`
4. **Compile check**: `python -m py_compile backend/main.py backend/database.py && python -m compileall -q frontend/js`
5. **Commit & push**: `git add ... && git commit -m "..." && git push origin main`
6. **Restart service**: `systemctl restart swingaq-backend`

**Prinsip**: Frontend hanya fetch dari backend. Backend fetch Yahoo hanya di scheduler, bukan di request path.
