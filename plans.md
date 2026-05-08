# 🇮🇩 RetailBijak — Rencana Pengembangan Fase 4

> **Status:** Aktif — fase stabilisasi, data quality, dan polish
> **Tujuan:** Transformasi retailbijak dari platform lengkap menjadi platform **andal, cepat, dan siap produksi**
> **Prinsip:** Data quality > fitur baru, polish > quantity, test > deploy

---

## Progress Keseluruhan

| Fase | Status | Progress |
|------|--------|----------|
| **P1: UI/UX Professional Redesign** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 100% |
| **P2: Fitur IDX Wajib** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 95% |
| **P3: Fitur Lanjutan** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 100% |
| **P4: Stabilitas & Kualitas** | 🟡 Progress | ▰▱▱▱▱▱▱▱▱▱ 5% |

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
| — | — | ⏳ | — |

---

*Plan ini akan diupdate setiap ada progres task.*
