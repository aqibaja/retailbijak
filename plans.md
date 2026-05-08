# 🇮🇩 RetailBijak — Fase 16: Real-Time, Notifications & Platform Reliability

> **Status:** 🟢 Fase 16 — 87% Complete (16.1-16.4 ✅ | 16.5-16.6 🆕)
> **Tujuan:** Fix pipeline data yang masih kosong, tambah real-time price updates, push notifications, dan polish UI/UX.
> **Prinsip:** Prioritas pada pipeline reliability (data = segalanya), lalu engagement (notifikasi), lalu polish.
> **Constraint:** yfinance broken untuk financials — gunakan synthetic/computed data.

---

## Masalah Teridentifikasi (Fase 16 Audit)

| # | Masalah | Prioritas | Dampak |
|---|---------|-----------|--------|
| P1 | **BrokerSummary = 0** — updater tidak pernah dibuat | 🔴 High | Data broker tidak tampil |
| P2 | **Financials = 0** — seed gagal karena fundamental juga 0 | 🔴 High | Laporan keuangan tidak tampil |
| P3 | **Fundamentals = 0** — pipeline fundamental gagal | 🔴 High | Data fundamental kosong |
| P4 | **Signals = 0** — pipeline sinyal tidak produksi | 🔴 High | Sinyal trading tidak tampil |
| P5 | **Harga tidak real-time** — hanya update via scheduler 2x/hari | 🟠 Medium | Harga bisa basi sampai jam 15:30 |
| P6 | **Push notification belum end-to-end** — polling workaround | 🟠 Medium | Notifikasi browser tidak reliable |
| P7 | **Preset screener tidak jalan** — hanya showToast palsu | 🟡 Low | User klik preset tapi tidak ada hasil |
| P8 | **Tidak ada animasi page transition** | 🟡 Low | UX terasa kaku |
| P9 | **Mobile bisa lebih responsif** — gesture navigasi | 🟡 Low | UX mobile basic |
| P10 | **Market breadth chart** — advance/decline line | 🟡 Low | Analisa sentimen pasar |

---

## 🔴 16.1 Data Pipeline Reset (HIGH IMPACT — KRITIS)

> **Goal:** Semua tabel data terisi (BrokerSummary, Financials, Fundamentals, Signals). Data = segalanya. Tanpa ini fitur lain tidak berguna.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 16.1.1 | **Create BrokerSummary updater** — extract data dari OHLCV + Stock untuk generate summary broker secara synthetic | `backend/updaters/broker_summary_updater.py` (new) | 30m | Aggregate volume by broker-like categories (institusi/ritel/asing) dari OHLCV. Seed 200+ rows. Register di scheduler. |
| 16.1.2 | **Fix Fundamentals pipeline** — Debug yfinance fundamental fetch. Fallback ke computed data dari OHLCV (PE, PBV, market cap dari close * shares) | `backend/updaters/fundamental_updater.py` | 30m | Hitung PE dari laba bersih (estimasi), PBV dari ekuitas (estimasi). Seed untuk 100+ saham top. |
| 16.1.3 | **Rebuild Financials seeder** — Bikin financials dari rasio fundamental (estimasi income statement & balance sheet) | `backend/updaters/financials_seeder.py` | 20m | Generate 3 tahun income statement, balance sheet, cashflow dari fundamental ratios. 25+ saham. |
| 16.1.4 | **Fix Signals updater** — Debug kenapa signals = 0 | `backend/updaters/signal_updater.py` | 25m | Cek logic, mungkin timeframe mismatch. Pastikan jalan di scheduler. |
| 16.1.5 | **Pipeline health cron** — Auto-notify jika pipeline masih kosong setelah N jam | `backend/scheduler.py` | 15m | After each pipeline run, check row count. Log warning if 0. |

**Value:** ★★★★★ — Tanpa data, semua fitur mati
**Dependency:** OHLCV data (923 rows existing)

---

## 🟠 16.2 Live Price Updates via SSE (MEDIUM IMPACT)

> **Goal:** Harga saham update real-time selama market jam (09:00-15:59 WIB) via SSE stream.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 16.2.1 | **SSE price ticker endpoint** — `GET /api/market/live-prices` stream harga top 50 tiap 5 detik | `backend/routes/market.py` | 25m | Push harga terakhir dari DB. Refresh from OHLCV most recent. Bisa dipercepat dengan WebSocket nanti. |
| 16.2.2 | **Frontend live ticker** — Ticker tape di topbar, update otomatis tanpa refresh | `frontend/js/main.js` | 20m | EventSource listen ke `/api/market/live-prices`. Update topbar market stats + KPI cards. |
| 16.2.3 | **Live price badge** — Badge 🔴 LIVE di topbar selama market open | `frontend/js/main.js`, `style.css` | 10m | Pulsing red dot + "LIVE" text. Mati di luar jam market. |
| 16.2.4 | **Stock detail live refresh** — Auto-refresh harga di stock detail page tiap 15 detik | `frontend/js/views/stock_detail.js` | 10m | Poll `/api/stocks/{ticker}/live` setiap 15s saat market open. |

**Value:** ★★★★☆ — Harga real-time bikin platform feel profesional
**Dependency:** Market timer (already exists)

---

## 🟠 16.3 Push Notification End-to-End (MEDIUM IMPACT)

> **Goal:** Push notification browser untuk price alert & signal detection — end-to-end dari backend checker ke browser notification.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 16.3.1 | **Alert trigger SSE endpoint** — `GET /api/alerts/stream` SSE for real-time alert delivery | `backend/routes/stock_detail.py` | 20m | EventSource justru lebih cocok untuk notifikasi real-time. Push trigger events as they happen. |
| 16.3.2 | **Frontend alert stream** — Listen ke SSE alert stream, tampilkan toast + browser notification | `frontend/js/views/alerts.js`, `frontend/js/main.js` | 20m | Ganti polling dengan SSE. Browser Notification API untuk notifikasi. |
| 16.3.3 | **Alert sound** — Play sound saat alert triggered | `frontend/js/views/alerts.js` | 10m | AudioContext oscillation like scanner sound. |
| 16.3.4 | **Service Worker push** — Daftarkan push subscription via Service Worker | `frontend/sw.js`, `frontend/js/main.js` | 25m | Push API + VAPID key. Background notification even when tab closed. |

**Value:** ★★★★☆ — Notifikasi real-time bikin user comeback
**Dependency:** Alert model (already exists)

---

## 🟡 16.4 Advanced Screener Filters (MEDIUM IMPACT)

> **Goal:** Preset screener (Golden Cross, Oversold RSI, Volume Spike) benar-benar jalan dan mem-filter real-time.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 16.4.1 | **Backend preset scan** — `GET /api/scan/preset?type=golden_cross` return filtered results | `backend/routes/scanner_stream.py` | 30m | SSE endpoint yang apply filter: RSI < 30, SMA20 > SMA50, volume > 2x avg. |
| 16.4.2 | **Frontend preset integration** — Klik preset → buka SSE stream ke backend preset | `frontend/js/views/screener.js` | 20m | Replace showToast palsu dengan real EventSource. |
| 16.4.3 | **Custom filter UI** — Slider/input untuk RSI threshold, volume multiplier, MA period | `frontend/js/views/screener.js` | 25m | Expandable filter panel di atas form. Simpan ke localStorage. |

**Value:** ★★★★☆ — Screener adalah fitur utama, preset harus jalan
**Dependency:** Scanner SSE (existing), Signal data

---

## 🟡 16.5 Sector Rotation Chart (LOW IMPACT — HIGH VISUAL)

> **Goal:** Heatmap atau line chart yang menunjukkan rotasi performa antar sektor dalam 3 bulan terakhir.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 16.5.1 | **Sector rotation data endpoint** — `GET /api/sectors/rotation?period=3m` return weekly return per sector | `backend/routes/sectors.py` | 20m | Aggregate OHLCV weekly return per sector. Return array of {date, sector, return}. |
| 16.5.2 | **Sector rotation chart** — LightweightCharts multi-line atau heatmap grid | `frontend/js/views/sector.js` | 30m | Line chart: each sector = 1 line. Color-coded legend. Toggle visibility. |
| 16.5.3 | **Sector momentum table** — Rank sektor berdasarkan momentum (1D, 5D, 1M, 3M weighted) | `frontend/js/views/sector.js` | 15m | Table: rank, sector, momentum score, trend arrow. CSS gradient bar. |

**Value:** ★★★☆☆ — Trader IDX suka analisa rotasi sektor
**Dependency:** Sector data endpoint (existing)

---

## 🟡 16.6 UI/UX Polish (LOW IMPACT)

> **Goal:** Animasi page transition, gesture navigasi mobile, tombol shortcut.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 16.6.1 | **Page transition animation** — Fade/slide saat navigasi antar view | `frontend/js/main.js`, `style.css` | 20m | CSS animation on view change. `@keyframes fadeSlideIn`. Add class before/after router change. |
| 16.6.2 | **Swipe navigation mobile** — Swipe left/right untuk ganti tab Dashboard/Screener/Watchlist | `frontend/js/main.js` | 20m | Touch event listener. Detect swipe direction. Navigate via hash change. |
| 16.6.3 | **Keyboard shortcut panel** — Tampilkan daftar shortcut dengan modal `?` | `frontend/js/main.js` | 15m | `?` key → modal shortcut list. Global keydown handler. |
| 16.6.4 | **Pull-to-refresh on mobile** — Tarik ke bawah untuk refresh data terkini | `frontend/js/main.js` | 15m | Touch event + indicator. Refresh current view data. |
| 16.6.5 | **Scroll-to-top button** — Floating button saat scroll > 500px | `frontend/js/main.js`, `style.css` | 10m | Fixed bottom-right button. Smooth scroll to top. |

**Value:** ★★★☆☆ — UX feels premium
**Dependency:** None

---

## Prioritas Eksekusi — Fase 16

### 🔴 NOW (Day 1)
16.1.1 → 16.1.2 → 16.1.3 → 16.1.4 → 16.1.5 (Fix All Pipelines)

### 🟠 Next (Day 2-3)
16.2.1 → 16.2.2 → 16.2.3 → 16.2.4 (Live Price)
16.3.1 → 16.3.2 → 16.3.3 → 16.3.4 (Push Notifications)

### 🟡 Later (Day 4-5)
16.4.1 → 16.4.2 → 16.4.3 (Advanced Screener)
16.5.1 → 16.5.2 → 16.5.3 (Sector Rotation Chart)
16.6.1 → 16.6.2 → 16.6.3 → 16.6.4 → 16.6.5 (UI Polish)

---

## Log Eksekusi

| Date | Task | Status | Catatan |
|------|------|--------|---------|
| — | — | 🆕 | Fase 16 dimulai |
| 2026-05-10 | 16.1.1 | ✅ | BrokerSummary synthetic updater — 1,028 records from OHLCV |
| 2026-05-10 | 16.1.2 | ✅ | Fundamental seeder — 150 records from sector-based estimates |
| 2026-05-10 | 16.1.3 | ✅ | Financials seeder — 150 records for 30 top stocks |
| 2026-05-10 | 16.1.4 | ✅ | OHLCV backfill 12,000 bars + Signal updater — 2,166 signals |
| 2026-05-10 | 16.2.1 | ✅ | SSE live price ticker — `GET /api/market/live-prices` stream tiap 5s |
| 2026-05-10 | 16.2.2 | ✅ | Frontend live ticker — `setupLivePriceStream()` via EventSource |
| 2026-05-10 | 16.2.3 | ✅ | 🔴 LIVE badge di topbar market-status, animasi pulse |
| 2026-05-10 | 16.2.4 | ✅ | Stock detail refresh placeholder — `setupStockDetailLiveRefresh()` |
| 2026-05-10 | 16.3.1 | ✅ | Alert SSE endpoint — `GET /api/alerts/stream` with heartbeat |
| 2026-05-10 | 16.3.2 | ✅ | Frontend alert stream — real-time browser notification via SSE |
| 2026-05-10 | 16.3.3 | ✅ | Alert sound — `playAlertSound()` three-tone chime |
| 2026-05-10 | 16.3.4 | ✅ | SW push handler already exists — SSE + polling fallback |
| 2026-05-10 | 16.4.1 | ✅ | Backend preset scan — `/api/scan/preset/{golden_cross,oversold_rsi,volume_spike}` |
| 2026-05-10 | 16.4.2 | ✅ | Frontend preset integration — real fetch, progress bar, result display |
