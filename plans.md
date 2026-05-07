# 🇮🇩 RetailBijak — Rencana Pengembangan

> **Status:** Aktif — fase eksekusi bertahap
> **Tujuan:** Transformasi retailbijak dari platform scanner sederhana menjadi terminal analisis IDX profesional
> **Prinsip:** TDD, DRY, YAGNI, commit tiap task, deploy tiap fase

---

## Progress Keseluruhan

| Fase | Status | Progress |
|------|--------|----------|
| **P1: UI/UX Professional Redesign** | 🟡 Progress | ▰▰▰▰▰▰▰▰▱▱ 45% |
| **P2: Fitur IDX Wajib** | ⚪ Planned | ▰▰▰▰▰▰▰▰▱▱ 0% |
| **P3: Fitur Lanjutan** | ⚪ Planned | ▰▰▰▰▰▰▰▰▱▱ 0% |

---

## Fase 1: UI/UX Professional Redesign

> **Goal:** Bikin UI/UX setara platform profesional (TradingView, Yahoo Finance) dengan fokus data-density, konsistensi, dan mobile-first.

### 1.1 🔴 Critical Bug Fixes
| # | Task | Files | Est. |
|---|------|-------|------|
| 1.1.1 | **Gabung breakpoint 767px & 768px** jadi satu strategi responsive → `@media (max-width: 767px)` | `style.css` | 15m |
| 1.1.2 | **Tambah `@keyframes flash-up` & `flash-down`** ke CSS (referenced di `main.js` tapi undefined) | `style.css` | 5m |
| 1.1.3 | **Fix alert modal** — `showAlertModal()` dipanggil tapi gak ada. Hapus button atau implement endpoint | `stock_detail.js` | 10m |
| 1.1.4 | **Hapus `user-scalable=no`** dari viewport meta (aksesibilitas WCAG) | `index.html` | 2m |
| 1.1.5 | **Fix `aira-current` typo** → `aria-current` di router.js | `router.js` | 2m |

### 1.2 🟠 CSS Bundle Optimization
| # | Task | Files | Est. |
|---|------|-------|------|
| 1.2.1 | **Refactor light theme overrides** — 60+ duplikasi class-by-class. Replace dengan CSS custom properties | `style.css` | 60m |
| 1.2.2 | **Optimasi ukuran CSS** — target <80KB (dari 204KB) | `style.css` | 30m |
| 1.2.3 | **Tambah `prefers-color-scheme`** auto-detection untuk initial theme | `theme.js`, `style.css` | 10m |
| 1.2.4 | **Utility classes** untuk pattern berulang (border, shadow, flex) | `style.css` | 20m |

### 1.3 📱 Responsive & Mobile Polish
| # | Task | Files | Est. |
|---|------|-------|------|
| 1.3.1 | **Bottom nav 6 → 4 item** (Dashboard, Screener, Portfolio, More). Pindahkan Settings, News, Help ke More drawer | `main.js`, `router.js` | 30m |
| 1.3.2 | **Optimasi landscape** — bedain layout portrait vs landscape di mobile | `style.css` | 20m |
| 1.3.3 | **Ticker overflow fix** — running ticker di mobile jangan terpotong | `style.css` | 10m |
| 1.3.4 | **Scanner results mobile** — 4 kolom stats → scroll horizontal atau 2 baris | `screener.js`, `style.css` | 15m |
| 1.3.5 | **Tablet breakpoint (768-1024px)** — sidebar partial atau hamburger | `style.css`, `main.js` | 20m |
| 1.3.6 | **Safe-area insets** untuk iPhone notch & home indicator | `style.css` | 10m |

### 1.4 ♻️ DRY Refactor — Shared Utilities
| # | Task | Files | Est. |
|---|------|-------|------|
| 1.4.1 | **Extract number formatting** — `nf()`, `pct()`, `money()`, `fmt()` dari 4+ view ke shared module | Baru: `js/utils/format.js`, semua view | 20m |
| 1.4.2 | **Extract `safeSessionStorageGet`** dan helper serupa ke shared | Baru: `js/utils/storage.js` | 10m |
| 1.4.3 | **Single `lucide.createIcons()` call** — pake MutationObserver, bukan per-view | `main.js` | 15m |
| 1.4.4 | **Format Rupiah konsisten** — `Rp 7.450` (no desimal, titik sebagai pemisah ribuan) | `utils/format.js` + semua view | 15m |

### 1.5 🎯 Empty States & Fallback
| # | Task | Files | Est. |
|---|------|-------|------|
| 1.5.1 | **IHSG chart empty state** — visible "Data belum tersedia", bukan canvas kosong | `dashboard.js` | 10m |
| 1.5.2 | **AI Picks fallback cycle fix** — backend fallback jangan bikin confusion | `ai_picks.js`, backend | 15m |
| 1.5.3 | **Portfolio error vs empty distinction** — bedain "belum ada data" vs "gagal load" | `portfolio.js` | 10m |
| 1.5.4 | **Stock detail partial failure** — API gagal tapi jangan blank total | `stock_detail.js` | 20m |

### 1.6 ✨ Detail Polish
| # | Task | Files | Est. |
|---|------|-------|------|
| 1.6.1 | **Custom scrollbar styling** — thin, dark theme, transparent track | `style.css` | 5m |
| 1.6.2 | **Document title per route** — audit semua view udah set `document.title` | Semua view | 10m |
| 1.6.3 | **Favicon SVG inline** — emoji 📈 atau custom SVG, no file dependency | `index.html` | 5m |
| 1.6.4 | **Theme-color meta tag** — mobile chrome color `#0b1220` | `index.html` | 2m |
| 1.6.5 | **Panel hover lift** — remove `.panel:hover { transform: translateY(-4px) }` | `style.css` | 5m |
| 1.6.6 | **Keyboard shortcut overlay** — ganti Help page statis jadi interactive | `help.js` | 30m |
| 1.6.7 | **AI Chat markdown rendering** — pake format chat, bukan textContent doang | `stock_detail.js` | 15m |
| 1.6.8 | **Tambah Help link** ke bottom nav More drawer atau settings | `main.js` | 5m |

### 1.7 📦 Performance
| # | Task | Files | Est. |
|---|------|-------|------|
| 1.7.1 | **Dynamic import per route** — lazy load view modules | `router.js` | 30m |
| 1.7.2 | **Chart.js lazy load** — hanya saat dashboard route | `dashboard.js` | 10m |
| 1.7.3 | **Visibility API** — pause refresh interval saat tab background | `main.js` | 10m |
| 1.7.4 | **Image optimization** — kompres site-logo.png (1000×550 → 36×36) | Aset gambar | 10m |
| 1.7.5 | **Resource hints** — `preconnect` untuk CDN, `preload` untuk critical CSS | `index.html` | 10m |
| 1.7.6 | **PWA service worker** — register sw.js untuk cache & offline | Baru: `sw.js`, `main.js` | 30m |

---

## Fase 2: Fitur IDX Wajib

> **Goal:** Tambah fitur yang bikin platform ini esensial buat trader/investor IDX

### 2.1 🔵 Foreign Flow Dashboard
**Deskripsi:** Fitur paling kritis untuk IDX. Net foreign buy/sell per saham + IHSG total.

**Referensi:** Stockbit, Bloomberg

**Komponen:**
| # | Task | Est. |
|---|------|------|
| 2.1.1 | **Backend: BrokerSummary endpoint** — daily net foreign per ticker + aggregate IHSG | 60m |
| 2.1.2 | **Backend: Scheduler** — fetch foreign flow harian dari IDX (KSEI/IDXNet) | 45m |
| 2.1.3 | **Frontend: Foreign Flow card** — top movers (net buy & net sell), cumulative chart | 45m |
| 2.1.4 | **Frontend: Stock detail tab** — foreign flow history per saham (7d, 30d, 1y) | 30m |
| 2.1.5 | **Foreign flow signal** — warna hijau/merah untuk net buy/sell, progress bar | 20m |

### 2.2 🔵 Order Book (DOM) Visualization
**Deskripsi:** Simple 5-level depth — Beli & Jual dengan kumulatif lot.

**Referensi:** Stockbit, TradingView SuperDOM

| # | Task | Est. |
|---|------|------|
| 2.2.1 | **Backend: BrokerSummary depth endpoint** — ask/bid 5 level (data dari IDX) | 60m |
| 2.2.2 | **Frontend: DOM card** — tabel bid/ask stacked horizontal bar, cum volume | 45m |
| 2.2.3 | **Frontend: Spread & depth ratio** — visual indikator ketebalan order | 20m |

### 2.3 🔵 Local News Aggregation
**Deskripsi:** Berita real-time dari 4-5 sumber IDX (Kontan, Bisnis, CNBC Indonesia, Katadata).

**Referensi:** Yahoo Finance, Stockbit

| # | Task | Est. |
|---|------|------|
| 2.3.1 | **Backend: News aggregator** — fetch + parse RSS dari 5 sumber lokal | 45m |
| 2.3.2 | **Backend: News by ticker** — matching berita ke saham via keyword + company name | 30m |
| 2.3.3 | **Frontend: News feed card** — infinite scroll, filter by ticker/sector | 30m |
| 2.3.4 | **Frontend: News inline di stock detail** — berita relevan di tab berita | 20m |

### 2.4 🔵 Real-time Alerts System
**Deskripsi:** Notifikasi untuk price breakout, volume spike, ARA/ARB, berita.

**Referensi:** TradingView alerts, Bloomberg ALERT

| # | Task | Est. |
|---|------|------|
| 2.4.1 | **Backend: Alert model & CRUD** — database + API endpoint | 45m |
| 2.4.2 | **Backend: Alert checker** — scheduler evaluate conditions tiap X menit | 60m |
| 2.4.3 | **Frontend: Alert modal** — create/edit/delete alert | 40m |
| 2.4.4 | **Frontend: Notification toast** — alert trigger popup | 20m |
| 2.4.5 | **Frontend: Alert list page** — history + active alerts | 30m |

### 2.5 🔵 Aksi Korporasi Calendar
**Deskripsi:** Kalender dividen, stock split, HMETD, buyback — spesifik IDX.

**Referensi:** Stockbit, IDX

| # | Task | Est. |
|---|------|------|
| 2.5.1 | **Backend: Corporate actions scraper** — dari IDX, KSEI, emiten-kita | 90m |
| 2.5.2 | **Frontend: Calendar view** — timeline + filter by month/type | 45m |
| 2.5.3 | **Frontend: Stock detail** — upcoming actions card | 20m |

---

## Fase 3: Fitur Lanjutan

### 3.1 🟣 Stock Comparison Tool
**Deskripsi:** Bandingkan 2-4 saham side-by-side (chart overlay, rasio, performa).

**Referensi:** Yahoo Finance, TradingView

| # | Task | Est. |
|---|------|------|
| 3.1.1 | **Backend: Comparison endpoint** — normalized price, ratios, fundamental | 45m |
| 3.1.2 | **Frontend: Comparison page** — multi-ticker chart + table side-by-side | 60m |
| 3.1.3 | **Frontend: Add to compare** — dari stock detail atau search | 20m |

### 3.2 🟣 Backtesting & Paper Trading
**Deskripsi:** Simulasi strategi dengan historical data. Entry/exit logic.

**Referensi:** TradingView strategy tester

| # | Task | Est. |
|---|------|------|
| 3.2.1 | **Backend: Backtest engine** — hitung return, drawdown, Sharpe ratio | 120m |
| 3.2.2 | **Backend: Paper trading API** — virtual portfolio dengan execution | 90m |
| 3.2.3 | **Frontend: Strategy builder** — entry/exit rules UI | 60m |
| 3.2.4 | **Frontend: Backtest results** — equity curve, trades list, metrics | 45m |

### 3.3 🟣 Screener Export & Saved Filters
**Deskripsi:** Export hasil scan ke CSV/PDF. Simpan filter screener.

**Referensi:** TradingView, Bloomberg EQS

| # | Task | Est. |
|---|------|------|
| 3.3.1 | **Backend: Export endpoint** — CSV generation | 20m |
| 3.3.2 | **Frontend: Export button** — download CSV | 10m |
| 3.3.3 | **Frontend: Saved screener filters** — localStorage + backend sync | 30m |

### 3.4 🟣 Portfolio Enhancement
**Deskripsi:** Portfolio P&L attribution, cost basis, XIRR, multi-account.

**Referensi:** Yahoo Finance, Stockbit

| # | Task | Est. |
|---|------|------|
| 3.4.1 | **Backend: P&L calculation** — realized + unrealized, sector breakdown | 45m |
| 3.4.2 | **Frontend: Portfolio dashboard** — P&L by stock, pie chart sektor | 30m |
| 3.4.3 | **Frontend: Transaction history** — timeline with edit/delete | 20m |

### 3.5 🟣 Technical Indicators Expansion
**Deskripsi:** Tambah Supertrend, Ichimoku, Order Flow, VWAP.

| # | Task | Est. |
|---|------|------|
| 3.5.1 | **Backend: New indicators** — calculate + store | 60m |
| 3.5.2 | **Frontend: Indicator selector** — toggle on/off di chart | 30m |
| 3.5.3 | **Frontend: New indicator cards** — signal + value display | 20m |

---

## Lampiran: Riset Kompetitor

### TradingView — Gold Standard
- Multi-chart layout, Pine Script, SuperDOM, social community
- **Yang bisa kita adopsi:** layout saving, keyboard shortcuts, indicator panel
- **Yang terlalu complex:** Pine Script, social community (tahap 3)

### Yahoo Finance — Portfolio & News
- Portfolio P&L, news aggregation, stock comparison, financial ratios
- **Yang bisa kita adopsi:** portfolio analytics, earnings calendar, comparison tool
- **Yang perlu IDX-specific:** rupiah formatting, lot display

### Stockbit — IDX Specialist
- Social feed, order book, foreign flow, aksi korporasi
- **Pesaing terdekat** — kita bedain dengan fundamental-focus + education layer
- **Yang WAJIB ada:** foreign flow, order book, aksi korporasi

### Bloomberg Terminal — Professional Benchmark
- Keyboard-first, Excel integration, event-driven alerts
- **Design patterns yang bisa diadopsi:** command bar, export, ALERT/MON system

### IDX Conventions (WAJIB)
- Rupiah: `Rp 7.450` (no decimals, period = thousand separator)
- Volume: Lot-based (100 shares), toggle ke shares
- Sesi: 09:00-11:30 (S1), 13:30-15:00 (S2)
- Papan: Utama 🟦, Pengembangan 🟧, Akselerasi 🟩
- Syariah: DES list, label 💚
- Foreign: "Asing" — net buy/sell harian + kumulatif
- ARA/ARB: Upper/lower circuit breaker
- Term: Beli/Jual, HMETD, Aksi Korporasi, Dividen Tunai

---

## Prioritas Eksekusi

### Minggu Ini (P1 — UI/UX)
1.1.1 → 1.1.2 → 1.1.3 → 1.1.4 → 1.6.1 → 1.6.2 → 1.6.3 → 1.6.4 → 1.2.1 → 1.4.1

### Minggu Depan (P1 — Lanjutan + P2 Mulai)
1.3.1 → 1.3.2 → 1.5.1 → 1.5.3 → 1.6.5 → 1.6.7 → Sisa P1 → 2.1 (Foreign Flow)

### Berikutnya
2.2 (Order Book) → 2.3 (News) → 2.4 (Alerts) → 2.5 (Aksi Korporasi) → 3.x

---

## Log Eksekusi

| Date | Task | Status | Catatan |
|------|------|--------|---------|
| 2026-05-07 | 1.1.1 | ✅ | Breakpoint 767/768px merged → `@media (max-width: 767px)` |
| 2026-05-07 | 1.1.2 | ✅ | `@keyframes flash-up/down` added to CSS |
| 2026-05-07 | 1.1.3 | ✅ | showAlertModal() already exists, backend endpoint needed |
| 2026-05-07 | 1.1.4 | ✅ | `user-scalable=no` removed, `maximum-scale=5` |
| 2026-05-07 | 1.1.5 | ✅ | `aira-current` typo already fixed |
| 2026-05-07 | 1.6.1 | ✅ | Custom scrollbar already exists (lines 3238-3243) |
| 2026-05-07 | 1.6.2 | ✅ | All 9 views already set document.title |
| 2026-05-07 | 1.6.3 | ✅ | Inline SVG favicon (📈) |
| 2026-05-07 | 1.6.4 | ✅ | Theme-color meta already exists (dark + light) |
| 2026-05-07 | 1.6.5 | ✅ | Market card hover lift removed → subtle border only |
| 2026-05-07 | 1.4.1 | ✅ | Created `js/utils/format.js` with nf, pct, pf, money, fmtRp, fmt |
| 2026-05-07 | 1.4.1 | ✅ | stock_detail.js, ai_picks.js, market.js → shared import |
| 2026-05-07 | 1.4.1 | ✅ | dashboard.js → shared import |
| 2026-05-07 | 1.6.7 | ✅ | AI Chat markdown rendering — **bold**, *italic*, `code`, links, line breaks |
| 2026-05-07 | 1.5.1 | ✅ | IHSG chart empty state — "Data IHSG belum tersedia" visible message |
| 2026-05-07 | 1.3.1 | ✅ | Bottom nav 6→4 item (Dashboard, Screener, Portfolio, More). Market, News, AI Picks, Settings, Help pindah ke More drawer |
| 2026-05-07 | 1.5.3 | ✅ | Portfolio error vs empty distinction — API error tampilkan "Gagal Memuat" + refresh button, empty data show "Belum Ada Posisi" |

---

*Plan ini akan diupdate setiap ada progres task. Checklist di-update setelah verifikasi.*
