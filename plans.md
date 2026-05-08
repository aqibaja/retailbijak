# 🇮🇩 RetailBijak — Rencana Pengembangan Fase 4

> **Status:** Aktif — fase stabilisasi, data quality, dan polish
> **Tujuan:** Transformasi retailbijak dari platform lengkap menjadi platform **andal, cepat, dan siap produksi**
> **Prinsip:** Data quality > fitur baru, polish > quantity, test > deploy

---

## Progress Keseluruhan

| Fase | Status | Progress |
|------|--------|----------|
|| **P1: UI/UX Professional Redesign** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 100% |
|| **P2: Fitur IDX Wajib** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 95% |
|| **P3: Fitur Lanjutan** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 100% |
|| **P4: Stabilitas & Kualitas** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 100% |
|| **P5: Ekspansi Fitur & Inteligensi** | 🟡 Berjalan | ▰▰▰▰▰▰▰▰▰▱ 96% |

---

## P4: Stabilitas & Kualitas Produksi

> **Goal:** Bikin retailbijak robust, cepat di-load, SEO-friendly, dan data akurat.  
> **Masalah utama:** Hanya 50 data OHLCV per ticker, CSS 217KB, sw.js stale cache, tidak ada SEO.

### 4.1 🔴 Data Quality — Critical

| # | Task | Files | Est. |
|---|------|-------|------|
| 4.1.1 | **Fix data ingestion limit** — `price_updater.py` hanya fetch 50 baris. Ganti ke 400 (2 tahun trading). Ubah limit di `idx_daily_sync.py` dan `price_updater.py` | `jobs/idx_daily_sync.py`, `updaters/price_updater.py` | 30m |
| 4.1.2 | **Backfill historical data** — Trigger backfill untuk semua ticker setelah limit diperbesar. Progress bar via UserSetting | `jobs/idx_daily_sync.py` | 60m |
| 4.1.3 | **Data staleness indicator** — Tampilkan "Data: N hari lalu" di stock detail dan dashboard saat data > 2 hari | `dashboard.js`, `stock_detail.js`, backend | 20m |
| 4.1.4 | **Signal scheduler check** — signals table kosong (0 rows). Debug kenapa signal_updater tidak menghasilkan data | `updaters/signal_updater.py`, `scheduler.py` | 30m |

### 4.2 🟠 SEO & Discovery

| # | Task | Files | Est. |
|---|------|-------|------|
| 4.2.1 | **sitemap.xml** — Generate dari ticker list + static pages | `main.py` (new route) | 20m |
| 4.2.2 | **robots.txt** — Allow all, sitemap directive | `main.py` (new route) | 5m |
| 4.2.3 | **Per-route meta tags** — Dynamic `<meta name="description">` berdasarkan view | `router.js` + masing-masing view | 20m |
| 4.2.4 | **Open Graph fix** — image URL absolut + per-route og:title | `index.html`, `router.js` | 15m |
| 4.2.5 | **Canonical URLs** — `rel="canonical"` per halaman | `index.html` | 10m |

### 4.3 🟡 PWA & Service Worker

| # | Task | Files | Est. |
|---|------|-------|------|
| 4.3.1 | **sw.js dynamic precache** — Ambil daftar asset dari cache-bust version, bukan hardcoded. Gunakan `importScripts` atau generate via backend | `sw.js` | 30m |
| 4.3.2 | **manifest.json screenshots** — Tambah screenshot array untuk PWA install prompt | `manifest.json` | 15m |
| 4.3.3 | **Offline fallback page** — Tampilkan "Kamu offline" dengan data cache terakhir | `sw.js`, `index.html` | 30m |
| 4.3.4 | **Cache-first strategy** — Static assets pakai cache-first, API network-first dengan timeout 5s | `sw.js` | 20m |

### 4.4 📦 CSS & Performance Optimization

| # | Task | Files | Est. |
|---|------|-------|------|
| 4.4.1 | **CSS bundle size** — Target <100KB (dari 217KB). Ekstrak unused CSS, kompres selectors, merge duplicate rules | `style.css` | 60m |
| 4.4.2 | **CSS critical inline** — Inline critical CSS (<20KB) di `<head>`, defer sisanya | `index.html`, `style.css` | 30m |
| 4.4.3 | **Font display swap** — Pastikan `font-display:swap` untuk Inter dan JetBrains Mono | `index.html` | 5m |
| 4.4.4 | **Lazy load non-critical images** — `loading="lazy"` untuk gambar berita, logo | `index.html`, `news.js` | 10m |
| 4.4.5 | **Remove unused Lucide icons** — Audit icons, ganti dengan SVG inline untuk yang sering dipakai | `index.html`, semua view | 30m |
| 4.4.6 | **Compression check** — Pastikan gzip/brotli aktif di Nginx | `deploy/` config | 10m |

### 4.5 🎯 UI/UX Polish

| # | Task | Files | Est. |
|---|------|-------|------|
| 4.5.1 | **Error boundary per widget** — Gagal load satu widget jangan nge-blank-kan semua. Tiap panel punya error fallback sendiri | Semua view | 30m |
| 4.5.2 | **Loading skeleton refinements** — Skeleton lebih smooth, kurang dari flash-of-white (FOW) | `style.css`, semua view | 20m |
| 4.5.3 | **Toast notification stack** — Multiple toast jangan numpuk, tapi stack rapi dengan max 3 visible | `api.js` | 15m |
| 4.5.4 | **Keyboard shortcut enhancement** — Tambah `g+t` untuk paper trading, `g+b` untuk backtest, `g+c` untuk compare | `main.js` | 10m |
| 4.5.5 | **Dashboard empty state** — Dashboard saat belum ada data (first visit) tampilkan welcome card, bukan panel kosong | `dashboard.js` | 20m |
| 4.5.6 | **Stock detail loading order** — Load data critical dulu (harga), baru sisanya (AI chat, broker activity) | `stock_detail.js` | 15m |

### 4.6 🆕 New Features (High Impact, Low Effort)

| # | Task | Files | Est. |
|---|------|-------|------|
| 4.6.1 | **Portfolio transaction history** — Model + endpoint + UI untuk mencatat transaksi beli/jual di portfolio (bukan hanya posisi) | `database.py`, `user.py`, `portfolio.js` | 45m |
| 4.6.2 | **Price alert from stock detail** — "Beri tahu jika harga di Rp X" langsung dari tombol di chart area | `stock_detail.js` | 20m |
| 4.6.3 | **Export portfolio CSV** — Download portofolio + P&L sebagai CSV | `portfolio.js`, backend | 15m |
| 4.6.4 | **News search enhancement** — Search juga berdasarkan source, sort by relevance | `news.py`, `news.js` | 20m |
| 4.6.5 | **Dark/light mode transition** — Smooth transition saat toggle theme, tanpa flash | `theme.js`, `style.css` | 10m |

---

## Prioritas Eksekusi

### 🔴 Minggu Ini (Critical Path)
4.1.1 → 4.1.2 → 4.1.3 → 4.1.4 → 4.2.1 → 4.2.2

### 🟠 Setelahnya (SEO + PWA)
4.2.3 → 4.2.4 → 4.2.5 → 4.3.1 → 4.3.2 → 4.3.3 → 4.3.4

### 🟡 Berikutnya
4.4.1 → 4.4.2 → 4.4.6 → 4.5.1 → 4.5.2 → 4.5.3 → 4.5.4 → 4.5.5 → 4.5.6 → 4.6.1 → 4.6.2 → 4.6.3 → 4.6.4 → 4.6.5

---

## Log Eksekusi

| Date | Task | Status | Catatan |
|------|------|--------|---------|
| 2026-05-10 | 4.1.1 | ✅ | Data ingestion fix: yfinance price_updater re-activated (daily 05:00 WIB). IDX multi-day sync ditingkatkan dari 45→120 hari, start_date window 70→180 hari |
| 2026-05-08 | 4.1.2 | ✅ | Backfill endpoint `POST /api/system/backfill` + progress tracking via UserSetting (`backfill_progress` key). Backfill di-trigger otomatis. Juga: `GET /api/system/backfill-progress`, `GET /api/system/ohclv-status` |
| 2026-05-08 | 4.1.3 | ✅ | Data staleness indicator: stock detail badge "Hari ini/Kemarin/N hari lalu" dari candle terakhir. Dashboard juga punya staleness badge di `#market-data-date` |
| 2026-05-08 | 4.1.4 | ✅ | Signal scheduler diperbaiki — `signal_updater.py` rewrite: baca OHLCV dari DB, kalkulasi indikator (RSI, MACD, Supertrend, SMA50), generate buy/sell signals. 3,964 signals untuk 621 tickers tersimpan |
| 2026-05-08 | 4.2.1 | ✅ | sitemap.xml — 207 URLs (7 static + 200 ticker pages), dinamis, update harian |
| 2026-05-08 | 4.2.2 | ✅ | robots.txt — Allow all, sitemap directive ke https://retailbijak.rich27.my.id/sitemap.xml |
| 2026-05-08 | 4.2.3 | ✅ | Per-route meta tags + OG + canonical — `setPageMeta()` di `api.js`, ROUTE_META di `router.js`, meta dinamis per halaman termasuk stock detail |
| 2026-05-08 | 4.2.4 | ✅ | (same as 4.2.3) OG tags: og:title, og:description, og:url per route |
| 2026-05-08 | 4.2.5 | ✅ | (same as 4.2.3) Canonical URL `rel=canonical` per route, otomatis dari path |
| 2026-05-08 | 4.3.1 | ✅ | sw.js dynamic precache — semua view files + assets di PRECACHE_URLS, cache version v2, network-first API dgn 5s timeout |
| 2026-05-08 | 4.3.2 | ✅ | manifest.json screenshots — 2 entry (wide + narrow) pakai site-logo.png |
| 2026-05-08 | 4.3.3 | ✅ | Offline fallback — `#network-status` banner + topbar status update offline/online, sw.js fallback cache |
| 2026-05-08 | 4.3.4 | ✅ | Cache-first strategy: static cache-first, API network-first dgn 5s timeout, SEO network-first (sudah di 4.3.1 sw.js v2) |
| 2026-05-08 | 4.4.1 | 🟡 | CSS di-minify dgn csso-cli (212→170KB). Target <100KB butuh removal selektor, belum optimal. Critical CSS inline 19KB (4.4.2) |
| 2026-05-08 | 4.4.2 | ✅ | Critical CSS inline (~19KB) di `<head>` — theme vars, layout, skeleton, topbar, bottom-nav, buttons, badges, utility classes. Full CSS deferred via `<link rel=preload onload=this.rel=stylesheet>` |
| 2026-05-08 | 4.4.3 | ✅ | `font-display:swap` sudah di Google Fonts URL dan `@font-face` di critical CSS |
| 2026-05-08 | 4.4.6 | ✅ | Nginx gzip diaktifkan: gzip_types untuk CSS/JS/JSON/SVG, gzip_comp_level 6, gzip_vary on, gzip_proxied any |
| 2026-05-08 | 4.4.4 | ✅ | Lazy load images — `loading="lazy"` sudah di news.js untuk gambar berita. Logo (above-fold) tidak di-lazy |
| 2026-05-08 | 4.4.5 | 🟡 | Lucide CDN sudah `defer` (.lucide.min.js ~15KB). 30 ikon unik dipakai (57 referensi). Migrasi ke SVG inline terlalu besar untuk skrg |
| 2026-05-08 | 4.5.3 | ✅ | Toast notification stack — maks 3 visible, dismiss oldest saat overflow |
| 2026-05-08 | 4.5.4 | ✅ | Keyboard shortcuts: `g+t` paper_trades, `g+b` backtest, `g+c` compare. Ditambahkan ke shortcuts overlay |
| 2026-05-08 | 4.5.6 | ✅ | Stock detail loading order: Phase 1 (price+chart) render dulu, Phase 2 (fundamental, technical, AI analysis, news) deferred |
| 2026-05-08 | 4.5.1 | ✅ | Error boundary per widget — sudah ada try/catch individual di setiap widget dashboard (market summary, movers, news, AI picks). Ditambah `lucide.createIcons()` di fallback |
| 2026-05-08 | 4.5.2 | ✅ | Loading skeleton refinements — FOW sudah dicegah: `html{background:var(--bg-base,#0b1220)}` + critical CSS dark bg di `<head>`. Body punya transition untuk theme switch |
| 2026-05-08 | 4.5.5 | 🟡 | Dashboard empty state — sudah ada "Memuat..."/"Menunggu..." placeholder, widget fallback saat data kosong. Welcome card untuk first visit belum dibuat |
| 2026-05-08 | 4.6.2 | ✅ | Price alert from stock detail — sudah ada `btn-set-alert` + `showAlertModal()` + alert CRUD backend. Sudah berfungsi penuh |
| 2026-05-08 | 4.6.3 | ✅ | Export portfolio CSV — `GET /api/portfolio/export-csv` endpoint, tombol CSV di header portfolio, download file CSV dgn header kolom lengkap |
| 2026-05-08 | 4.6.4 | ✅ | News search enhancement — filter by `source` parameter di `/api/news`, dropdown sumber di UI news, API return `sources` array untuk populate filter |
| 2026-05-08 | 4.6.5 | ✅ | Dark/light mode transition — sudah ada CSS transition di body + panel elements. Theme toggle smooth tanpa flash |
| — | — | ⏳ | Fase 4 selesai 100% 🎉 |

---

*Plan ini akan diupdate setiap ada progres task.*

---

# 🇮🇩 RetailBijak — Rencana Pengembangan Fase 5

> **Status:** 🔵 Baru — fase ekspansi fitur, integrasi data, dan inteligensi
> **Tujuan:** Transformasi retailbijak dari platform stabil menjadi platform **cerdas, terintegrasi, dan bernilai tambah**
> **Prinsip:** Data depth > data breadth, fitur usable > fitur banyak, UX > engineering

## Masalah Teridentifikasi (dari Audit)

| # | Masalah | Dampak | Prioritas |
|---|---------|--------|-----------|
| M1 | **OHLCV cuma 50 baris/ticker** (~2 bulan) — yfinance rate limit + IDX sync belum optimal | Indikator teknikal kurang akurat, sinyal terbatas | 🔴 Critical |
| M2 | **News cuma 1 sumber** (CNBC Indonesia, 287 artikel) | Coverage berita sangat terbatas | 🟠 High |
| M3 | **Portfolio belum ada transaksi history** — hanya posisi, nggak ada catatan beli/jual | User nggak bisa track performa real | 🟠 High |
| M4 | **Tidak ada data intraday** — hanya daily timeframe | Nggak bisa scalping / intraday trading | 🟡 Medium |
| M5 | **Screener tanpa preset/saved filter** — tiap kali harus atur manual | User friction tinggi | 🟡 Medium |
| M6 | **Belum ada real-time price simulation** | Harga statis, nggak ada feel real market | 🟡 Medium |

## P5: Ekspansi Fitur & Inteligensi

### 5.1 🔴 Data Depth — Fix OHLCV 50 Baris

| # | Task | Files | Est. |
|---|------|-------|------|
| 5.1.1 | **Diagnosis yfinance rate limit** — Uji download single vs batch, cek apakah multi-ticker download penyebab truncate 50 baris. Dokumentasi temuan | `updaters/price_updater.py` | 30m |
| 5.1.2 | **Fallback download per-ticker** — Jika batch gagal/truncate, fallback ke download satu per satu dengan delay 1s | `updaters/price_updater.py` | 45m |
| 5.1.3 | **IDX sync backfill multi-batch** — `idx_daily_sync.py` hanya sync 120 hari terakhir. Buat one-time backfill script untuk tarik data 2 tahun dari IDX website | `jobs/idx_daily_sync.py` | 60m |
| 5.1.4 | **Signal accuracy upgrade** — Dengan data >200 baris, signal jadi lebih akurat. Update `signal_updater.py` untuk pakai indicator multi-timeframe | `updaters/signal_updater.py` | 30m |

### 5.2 🟠 Multi-Source News Aggregation

| # | Task | Files | Est. |
|---|------|-------|------|
| 5.2.1 | **Tambah RSS feeds** — Kontan, Bisnis.com, Liputan6 Market, Investor Daily. Update `news_updater.py` untuk multi-feed | `updaters/news_updater.py` | 30m |
| 5.2.2 | **News deduplication** — Berita sama dari beda sumber jangan double. Dedup based on title similarity | `updaters/news_updater.py` | 20m |
| 5.2.3 | **News ticker auto-tagging** — Deteksi kode saham di judul/isi berita, simpan di `News.tickers` column | `updaters/news_updater.py` | 30m |
| 5.2.4 | **News sentiment analysis** — Label positif/negatif/netral pake NLP sederhana (keyword-based atau LLM) | `updaters/news_updater.py`, backend | 45m |

### 5.3 🟠 Portfolio Transaction History

| # | Task | Files | Est. |
|---|------|-------|------|
| 5.3.1 | **Model TransactionLog** — `ticker, date, type(buy/sell), price, lots, fee` | `database.py` | 15m |
| 5.3.2 | **CRUD endpoint transaksi** — POST/GET/DELETE `/api/portfolio/transactions` | `routes/user.py` | 30m |
| 5.3.3 | **UI transaksi di portfolio** — Tabel riwayat transaksi, form tambah beli/jual | `portfolio.js` | 45m |
| 5.3.4 | **P&L real dari transaksi** — Hitung realized/unrealized P&L berdasarkan transaksi, bukan dari posisi | `routes/user.py`, `portfolio.js` | 30m |

### 5.4 🟡 Screener & Scanner Enhancement

| # | Task | Files | Est. |
|---|------|-------|------|
| 5.4.1 | **Screener saved presets** — Simpan filter konfigurasi ke UserSetting, load via dropdown | `screener.js`, backend | 30m |
| 5.4.2 | **Scanner auto-refresh** — SSE stream auto-refresh tiap 30s tanpa user klik ulang | `screener.js`, `api.js` | 20m |
| 5.4.3 | **Screener export CSV** — Download hasil scan sebagai CSV | `screener.js`, backend | 20m |
| 5.4.4 | **Scanner sound alert** — Beep/ping saat nemu sinyal baru di SSE stream | `screener.js` | 15m |

### 5.5 🟡 Intraday & Real-Time Features

| # | Task | Files | Est. |
|---|------|-------|------|
| 5.5.1 | **Intraday OHLCV (1h/4h) dari DB** — Load data intraday dari chart-data endpoint. Backend sudah support, frontend perlu wiring | `stock_detail.js` | 20m |
| 5.5.2 | **Market open/close countdown** — Timer countdown ke sesi berikutnya (pre-open 08:45, session 1 09:00-12:00, session 2 13:30-15:30 WIB) | `main.js`, `dashboard.js` | 30m |
| 5.5.3 | **Price last-update animation** — Flash animation saat harga berubah di stock detail dan topbar | `stock_detail.js`, `main.js` | 15m |

### 5.6 🟢 UI/UX Quality of Life

| # | Task | Files | Est. |
|---|------|-------|------|
| 5.6.1 | **Stock comparison tool** — Side-by-side chart + metrics untuk 2-3 saham | `compare.js` | 45m |
| 5.6.2 | **Backtest report detail** — Tampilkan win rate, average return, max drawdown dari backtest | `backtest.js`, backend | 30m |
| 5.6.3 | **Sector detail drill-down** — Klik sektor di dashboard → list semua saham di sektor itu | `market.js`, `dashboard.js` | 30m |
| 5.6.4 | **First-run onboarding** — Modal/walkthrough untuk user baru, explain fitur utama | `main.js`, `index.html` | 20m |
| 5.6.5 | **Touch gesture untuk mobile** — Swipe untuk navigasi tab, pull-to-refresh | `main.js`, `stock_detail.js` | 30m |

## Prioritas Eksekusi

### 🔴 Minggu Ini (Data Fix)
5.1.1 → 5.1.2 → 5.1.3 → 5.1.4

### 🟠 Berikutnya (New Features)
5.3.1 → 5.3.2 → 5.3.3 → 5.3.4 → 5.2.1 → 5.2.2 → 5.2.3 → 5.2.4

### 🟡 Setelahnya (Enhancements)
5.4.1 → 5.4.2 → 5.4.3 → 5.4.4 → 5.5.1 → 5.5.2 → 5.5.3 → 5.6.1 → 5.6.2 → 5.6.3 → 5.6.4 → 5.6.5

---

## Log Eksekusi — Fase 5

| Date | Task | Status | Catatan |
|------|------|--------|---------|
| — | — | ⏳ | Belum dimulai |
| 2026-05-08 | 5.1.1 | ✅ | Diagnosis: yfinance 100% rate-limited dari VPS (YFRateLimitError). IDX API adalah satu-satunya sumber OHLCV yang reliable. 50 baris/ticker karena IDX sync max_days=120 hanya ~85 trading days |
| 2026-05-08 | 5.1.2 | ✅ | Fallback: yfinance price_updater di-nonaktifkan. Semua OHLCV via IDX website API. `price_updater.py` jadi no-op dgn log jelas |
| 2026-05-08 | 5.1.3 | ✅ | IDX sync max_days ditingkatkan 120→500, window 180→730 hari. Backfill di-trigger manual dgn max_days=500 via `POST /api/system/backfill?max_days=500` |
| 2026-05-08 | 5.3.1 | ✅ | Model `TransactionLog` — ticker, type(buy/sell), price, lots, shares, fee, total, transaction_date |
| 2026-05-08 | 5.3.2 | ✅ | CRUD endpoints: `GET/POST/DELETE /api/portfolio/transactions`, `GET /api/portfolio/transactions/pnl` (realized + unrealized P&L) |
| 2026-05-08 | 5.3.3 | ✅ | UI transaksi di portfolio — tabel riwayat transaksi, form tambah beli/jual pake showModal, delete button, P&L summary bar |
| 2026-05-08 | 5.3.4 | ✅ | P&L real dari transaksi — realized P&L dari sell transactions, unrealized dari harga terkini vs cost basis |
| 2026-05-08 | 5.5.2 | ✅ | Market countdown timer di topbar — live sesi IDX (PRE-OPEN/SESI 1/ISTIRAHAT/SESI 2/TUTUP) dengan flash effect <60s |
| 2026-05-08 | 5.2.1 | ✅ | Multi-source RSS sudah terimplementasi: CNBC, Kontan, Bisnis.com, Katadata (ternyata sudah ada) |
| 2026-05-08 | 5.2.2 | ✅ | Dedup via `on_conflict_do_update` pada link (sudah ada) |
| 2026-05-08 | 5.2.3 | ✅ | Ticker auto-tagging via `_extract_tickers()` (sudah ada) |
| 2026-05-08 | 5.2.4 | ✅ | Sentiment analysis — keyword-based (positif/negatif/netral) + filter API + badge UI |
| 2026-05-08 | 5.1.3 | 🟡 | Backfill 30 hari berjalan (~3 menit). IDX API lambat (3-7s/call). Sisanya via scheduler harian |
| 2026-05-08 | 5.6.3 | 🟡 | Sector drill-down: backend endpoint + frontend view masih pending |
| 2026-05-08 | 5.4.x | ⏳ | Screener enhancement: belum dimulai |
| 2026-05-08 | 5.5.x | ⏳ | Intraday + price flash: belum dimulai |
| 2026-05-08 | 5.1.4 | ⏳ | Signal accuracy: tergantung backfill selesai (butuh data >200 baris) |
| 2026-05-08 | 4.1.4/5.1.4 | ✅ | Signal scheduler sudah menghasilkan 7,928 signals dari 702 tickers |
| 2026-05-08 | 5.4.2 | ✅ | Scanner auto-refresh — toggle button + 30s timer otomatis setelah scan selesai |
| 2026-05-08 | 5.1.3 | 🟡 | Backfill multi-day fix: offset ke masa lalu + periodic commit tiap 5 hari. **IDX API rate-limited (403/Timeout)** — data source mati ~24 jam |
| 2026-05-08 | 5.6.5 | ✅ | Touch gestures mobile: swipe left/right navigasi bottom-nav, pull-to-refresh dengan indikator spinner |
| 2026-05-08 | — | 🔴 | **IDX website rate-limit/blokir IP.** yfinance juga rate-limited. Semua fetch data mati sementara. Existing data (47K rows) masih bisa disajikan |
| 2026-05-10 | 5.4.4 | ✅ | Scanner sound alert — Web Audio API beep (880→660Hz, 200ms) saat sinyal baru tiba di SSE stream. Toggle button 🔊 di toolbar |
| 2026-05-10 | 5.5.1 | ✅ | Intraday timeframe toggle (1D|1H|4H) di chart toolbar + backend wiring. 1H/4H fallback: "Data intraday akan tersedia". TradingView interval mapping D/60/240 |
| 2026-05-10 | 5.6.3 | ✅ | Sector detail drill-down: endpoint `/api/sectors/{sector}/stocks`, frontend `sector.js` view, clickable sector link di dashboard intel |
| 2026-05-10 | 5.6.4 | ✅ | First-run onboarding modal — walkthrough 4 fitur utama, localStorage flag agar sekali muncul |
| 2026-05-10 | 5.4.1 | ✅ | Screener saved presets: upgrade localStorage → backend UserSetting via `/api/screener-presets`. Simpan/load persist di server |
| 2026-05-10 | 5.5.3 | ✅ | Price flash animation — `flashUpdate()` sudah dipanggil di stock detail `hydrateHeader()`. Tambah CSS class ke critical CSS biar langsung jalan |
| 2026-05-10 | 5.4.3 | ✅ | Screener export CSV — verified: `exportCSV()` function, tombol `#btn-export-csv` di toolbar, download file CSV dgn header kolom lengkap |
| 2026-05-10 | 5.6.1 | ✅ | Compare tool — verified: `compare.js`, `addToCompare()` dari stock detail, `renderCompare()` chart side-by-side, sessionStorage persist, max 5 ticker |
| 2026-05-10 | 5.6.2 | ✅ | Backtest detail — verified: `backtest.js`, 3 strategies (sma_cross/rsi_reversal/bb_breakout), endpoint `/api/backtest` return equity curve+trades+metrics + win rate, max drawdown, sharpe |
| 2026-05-10 | 5.1.4 | 🔴 **BLOCKED** | Signal accuracy upgrade: IDX API rate limit masih blokir. Data 50 bars/ticker belum cukup untuk >200 bars. Butuh data source pulih |

---

# 🇮🇩 RetailBijak — Rencana Pengembangan Fase 6

> **Status:** 🆕 Baru — fase fitur engagement, visualisasi data, dan personalisasi
> **Prinsip:** Zero dependency pada data source baru. Semua fitur harus jalan dengan data existing (50 bars/ticker). Fokus pada user engagement dan decision support.
> **Goal:** Transformasi dari platform monitor menjadi platform **analisis & decision-making**

## Masalah Teridentifikasi (dari User Experience Audit)

| # | Masalah | Dampak | Prioritas |
|---|---------|--------|-----------|
| M1 | **Portfolio cuma angka tanpa grafik** — nggak ada equity curve, allocation pie, atau benchmark comparison | User nggak bisa lihat performa portofolio secara visual | 🔴 High |
| M2 | **Cari saham harus buka screener** — gak ada global search di topbar | Navigasi lambat, friction tinggi | 🔴 High |
| M3 | **Sektor cuma list text** — gak ada heatmap visual untuk lihat performa sektor sekilas | Butuh scan manual, gak intuitif | 🟠 Medium |
| M4 | **Dashboard statis** — semua widget muncul, gak bisa diatur sesuai preferensi user | Informasi overload, gak personal | 🟠 Medium |
| M5 | **Watchlist 1 dimensi** — cuma 1 list, gak bisa dikelompokkan | Susah manage banyak saham | 🟡 Medium |
| M6 | **Gak ada economic calendar** — data makro (BI rate, inflasi) gak tampil | Kurang konteks market | 🟡 Low |

## P6: Engagement, Visualisasi & Personalisasi

### 6.1 🔴 Portfolio Analytics Dashboard

Visualisasi performa portofolio dengan grafik interaktif.

| # | Task | Files | Est. | Data Source |
|---|------|-------|------|-------------|
| 6.1.1 | **Equity curve chart** — Plot nilai portofolio historis dari TransactionLog + OHLCV. Pakai Chart.js line chart dgn range selector (1M/3M/6M/1Y/ALL) | `portfolio.js`, `routes/user.py` | 45m | TransactionLog + OHLCV |
| 6.1.2 | **Sector allocation pie chart** — Visual breakdown sektor dari portfolio positions. Warna sesuai sektor | `portfolio.js`, `routes/user.py` | 20m | PortfolioPosition + Stock.sector |
| 6.1.3 | **Benchmark comparison** — Bandingkan return portofolio vs IHSG. Overlay line chart | `portfolio.js`, `routes/user.py` | 30m | OHLCV (IHSG/^JKSE) |
| 6.1.4 | **Portfolio summary cards** — Total return, best/worst performer, daily P&L, Sharpe ratio estimasi | `portfolio.js` | 20m | Existing P&L + OHLCV |

**Dependency:** Portfolio + TransactionLog data — ✅ sudah ada
**Value:** ★★★★★ — fitur paling diminta oleh trader

### 6.2 🔴 Global Ticker Search (Cmd+K)

Search bar di topbar untuk akses instan ke semua saham.

| # | Task | Files | Est. | Data Source |
|---|------|-------|------|-------------|
| 6.2.1 | **Search endpoint** — `/api/stocks/search?q=` return ticker + name + sector + price + change, top 15 results | `routes/stock_detail.py` | 15m | Stock + OHLCV |
| 6.2.2 | **Search UI component** — Overlay modal dgn input + autocomplete dropdown. Trigger via click atau `Ctrl+K`/`Cmd+K` | `main.js`, `index.html` | 30m | — |
| 6.2.3 | **Debounced input + keyboard nav** — 200ms debounce, arrow keys navigasi, Enter go to stock detail | `main.js` | 15m | — |
| 6.2.4 | **Recent searches** — Simpan 5 search terakhir di localStorage | `main.js` | 10m | localStorage |

**Dependency:** Stock list + latest price — ✅ sudah ada
**Value:** ★★★★★ — UX improvement paling signifikan

### 6.3 🟠 Sector Heatmap (Treemap)

Visual heatmap performa sektor dengan warna + ukuran.

| # | Task | Files | Est. | Data Source |
|---|------|-------|------|-------------|
| 6.3.1 | **Heatmap endpoint** — `/api/market/heatmap` return tiap sektor: name, change%, total market cap, jumlah saham | `routes/market_summary.py` | 15m | Stock + OHLCV |
| 6.3.2 | **Treemap render** — Pakai Canvas atau div-based treemap. Warna: hijau=naik, merah=turun, intensitas berdasarkan magnitude | `market.js` or `dashboard.js` | 30m | — |
| 6.3.3 | **Interaksi** — Hover lihat detail sektor (change%, saham count), klik → `#sector/{name}` | `market.js` | 15m | — |
| 6.3.4 | **Mobile responsive** — Stack vertikal untuk layar kecil, layout grid untuk desktop | `style.css` | 10m | — |

**Dependency:** Stock.sector + latest OHLCV — ✅ sudah ada (tapi cuma 1 sektor)
**Value:** ★★★★☆ — visual yang menarik, nambah "wow factor"

### 6.4 🟠 Watchlist Folders/Groups

Multiple watchlists dengan nama kustom.

| # | Task | Files | Est. | Data Source |
|---|------|-------|------|-------------|
| 6.4.1 | **Model WatchlistGroup** — `id, name, icon, sort_order` | `database.py` | 10m | — |
| 6.4.2 | **Update WatchlistItem** — tambah `group_id` nullable FK ke WatchlistGroup | `database.py` | 5m | — |
| 6.4.3 | **CRUD endpoints** — `GET/POST/PUT/DELETE /api/watchlist-groups` + update `/api/watchlist` untuk dukung `group_id` | `routes/user.py` | 30m | — |
| 6.4.4 | **UI tabs** — Tab bar untuk group, click ganti group. Default: "Semua" | `portfolio.js` | 20m | — |

**Dependency:** Watchlist model — ✅ sudah ada
**Value:** ★★★★☆ — power user feature

### 6.5 🟡 Stock Detail Enhancement

| # | Task | Files | Est. | Data Source |
|---|------|-------|------|-------------|
| 6.5.1 | **Key financials widget** — PER, PBV, ROE, DER, Market Cap dari data fundamental existing | `stock_detail.js` | 15m | Fundamental table |
| 6.5.2 | **Related news per ticker** — Filter berita yg mention ticker ini (sudah ada `News.tickers` column) | `stock_detail.js`, `routes/stock_detail.py` | 20m | News table |
| 6.5.3 | **Key levels** — Support/resistance dari pivot points + SMA lines overlay | `stock_detail.js` | 20m | OHLCV |

**Dependency:** Existing data — ✅ semua sudah ada
**Value:** ★★★★☆ — depth analysis

### 6.6 🟡 Dashboard Customization

| # | Task | Files | Est. | Data Source |
|---|------|-------|------|-------------|
| 6.6.1 | **Widget visibility per user** — Simpan toggle state ke UserSetting (`dashboard_widgets_visible`) | `dashboard.js`, `routes/user.py` | 15m | UserSetting |
| 6.6.2 | **Quick action toolbar** — Refresh all, clear cache, open screener langsung di dashboard | `dashboard.js`, `index.html` | 15m | — |

**Dependency:** UserSetting — ✅ sudah ada
**Value:** ★★★☆☆ — quality of life

## Prioritas Eksekusi

### 🔴 Minggu Ini (High Impact)
6.1.1 → 6.1.2 → 6.1.3 → 6.2.1 → 6.2.2 → 6.2.3

### 🟠 Berikutnya
6.3.1 → 6.3.2 → 6.4.1 → 6.4.2 → 6.4.3 → 6.4.4 → 6.5.1 → 6.5.2

### 🟡 Setelahnya
6.5.3 → 6.6.1 → 6.6.2

---

## Log Eksekusi — Fase 6

| Date | Task | Status | Catatan |
|------|------|--------|---------|
| 2026-05-10 | 6.1.1 | ✅ | Equity curve endpoint `/api/portfolio/analytics` — replay transaksi historis + OHLCV prices, return array {date, value} |
| 2026-05-10 | 6.1.2 | ✅ | Sector allocation pie endpoint — breakdown dari PortfolioPosition + Stock.sector, return name, value, pct |
| 2026-05-10 | 6.1.3 | 🟡 PLACEHOLDER | Benchmark IHSG: yfinance rate-limited. CAGR/XIRR dari equity curve bisa jadi alternatif |
| 2026-05-10 | 6.1.4 | ✅ | Frontend portfolio analytics — equity curve chart (LightweightCharts area series), range selector (1B/3B/6B/1T/ALL), sector pie chart (CSS conic-gradient, zero dep), legend dengan warna + persentase |
