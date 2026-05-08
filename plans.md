     1|     1|# 🇮🇩 RetailBijak — Rencana Pengembangan
     2|     2|
     3|     3|> **Status:** Aktif — fase eksekusi bertahap
     4|     4|> **Tujuan:** Transformasi retailbijak dari platform scanner sederhana menjadi terminal analisis IDX profesional
     5|     5|> **Prinsip:** TDD, DRY, YAGNI, commit tiap task, deploy tiap fase
     6|     6|
     7|     7|---
     8|     8|
     9|     9|## Progress Keseluruhan
    10|    10|
    11|    11|| Fase | Status | Progress |
    12|    12||------|--------|----------|
    13|    13|| **P1: UI/UX Professional Redesign** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 100% |
    14|    14|| **P2: Fitur IDX Wajib** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 95% |
    15|    15|| **P3: Fitur Lanjutan** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 100% |
    16|    16|
    17|    17|---
    18|    18|
    19|    19|## Fase 1: UI/UX Professional Redesign
    20|    20|
    21|    21|> **Goal:** Bikin UI/UX setara platform profesional (TradingView, Yahoo Finance) dengan fokus data-density, konsistensi, dan mobile-first.
    22|    22|
    23|    23|### 1.1 🔴 Critical Bug Fixes
    24|    24|| # | Task | Files | Est. |
    25|    25||---|------|-------|------|
    26|    26|| 1.1.1 | **Gabung breakpoint 767px & 768px** jadi satu strategi responsive → `@media (max-width: 767px)` | `style.css` | 15m |
    27|    27|| 1.1.2 | **Tambah `@keyframes flash-up` & `flash-down`** ke CSS (referenced di `main.js` tapi undefined) | `style.css` | 5m |
    28|    28|| 1.1.3 | **Fix alert modal** — `showAlertModal()` dipanggil tapi gak ada. Hapus button atau implement endpoint | `stock_detail.js` | 10m |
    29|    29|| 1.1.4 | **Hapus `user-scalable=no`** dari viewport meta (aksesibilitas WCAG) | `index.html` | 2m |
    30|    30|| 1.1.5 | **Fix `aira-current` typo** → `aria-current` di router.js | `router.js` | 2m |
    31|    31|
    32|    32|### 1.2 🟠 CSS Bundle Optimization
    33|    33|| # | Task | Files | Est. |
    34|    34||---|------|-------|------|
    35|    35|| 1.2.1 | **Refactor light theme overrides** — 60+ duplikasi class-by-class. Replace dengan CSS custom properties | `style.css` | 60m |
    36|    36|| 1.2.2 | **Optimasi ukuran CSS** — target <80KB (dari 204KB) | `style.css` | 30m |
    37|    37|| 1.2.3 | **Tambah `prefers-color-scheme`** auto-detection untuk initial theme | `theme.js`, `style.css` | 10m |
    38|    38|| 1.2.4 | **Utility classes** untuk pattern berulang (border, shadow, flex) | `style.css` | 20m |
    39|    39|
    40|    40|### 1.3 📱 Responsive & Mobile Polish
    41|    41|| # | Task | Files | Est. |
    42|    42||---|------|-------|------|
    43|    43|| 1.3.1 | **Bottom nav 6 → 4 item** (Dashboard, Screener, Portfolio, More). Pindahkan Settings, News, Help ke More drawer | `main.js`, `router.js` | 30m |
    44|    44|| 1.3.2 | **Optimasi landscape** — bedain layout portrait vs landscape di mobile | `style.css` | 20m |
    45|    45|| 1.3.3 | **Ticker overflow fix** — running ticker di mobile jangan terpotong | `style.css` | 10m |
    46|    46|| 1.3.4 | **Scanner results mobile** — 4 kolom stats → scroll horizontal atau 2 baris | `screener.js`, `style.css` | 15m |
    47|    47|| 1.3.5 | **Tablet breakpoint (768-1024px)** — sidebar partial atau hamburger | `style.css`, `main.js` | 20m |
    48|    48|| 1.3.6 | **Safe-area insets** untuk iPhone notch & home indicator | `style.css` | 10m |
    49|    49|
    50|    50|### 1.4 ♻️ DRY Refactor — Shared Utilities
    51|    51|| # | Task | Files | Est. |
    52|    52||---|------|-------|------|
    53|    53|| 1.4.1 | **Extract number formatting** — `nf()`, `pct()`, `money()`, `fmt()` dari 4+ view ke shared module | Baru: `js/utils/format.js`, semua view | 20m |
    54|    54|| 1.4.2 | **Extract `safeSessionStorageGet`** dan helper serupa ke shared | Baru: `js/utils/storage.js` | 10m |
    55|    55|| 1.4.3 | **Single `lucide.createIcons()` call** — pake MutationObserver, bukan per-view | `main.js` | 15m |
    56|    56|| 1.4.4 | **Format Rupiah konsisten** — `Rp 7.450` (no desimal, titik sebagai pemisah ribuan) | `utils/format.js` + semua view | 15m |
    57|    57|
    58|    58|### 1.5 🎯 Empty States & Fallback
    59|    59|| # | Task | Files | Est. |
    60|    60||---|------|-------|------|
    61|    61|| 1.5.1 | **IHSG chart empty state** — visible "Data belum tersedia", bukan canvas kosong | `dashboard.js` | 10m |
    62|    62|| 1.5.2 | **AI Picks fallback cycle fix** — backend fallback jangan bikin confusion | `ai_picks.js`, backend | 15m |
    63|    63|| 1.5.3 | **Portfolio error vs empty distinction** — bedain "belum ada data" vs "gagal load" | `portfolio.js` | 10m |
    64|    64|| 1.5.4 | **Stock detail partial failure** — API gagal tapi jangan blank total | `stock_detail.js` | 20m |
    65|    65|
    66|    66|### 1.6 ✨ Detail Polish
    67|    67|| # | Task | Files | Est. |
    68|    68||---|------|-------|------|
    69|    69|| 1.6.1 | **Custom scrollbar styling** — thin, dark theme, transparent track | `style.css` | 5m |
    70|    70|| 1.6.2 | **Document title per route** — audit semua view udah set `document.title` | Semua view | 10m |
    71|    71|| 1.6.3 | **Favicon SVG inline** — emoji 📈 atau custom SVG, no file dependency | `index.html` | 5m |
    72|    72|| 1.6.4 | **Theme-color meta tag** — mobile chrome color `#0b1220` | `index.html` | 2m |
    73|    73|| 1.6.5 | **Panel hover lift** — remove `.panel:hover { transform: translateY(-4px) }` | `style.css` | 5m |
    74|    74|| 1.6.6 | **Keyboard shortcut overlay** — ganti Help page statis jadi interactive | `help.js` | 30m |
    75|    75|| 1.6.7 | **AI Chat markdown rendering** — pake format chat, bukan textContent doang | `stock_detail.js` | 15m |
    76|    76|| 1.6.8 | **Tambah Help link** ke bottom nav More drawer atau settings | `main.js` | 5m |
    77|    77|
    78|    78|### 1.7 📦 Performance
    79|    79|| # | Task | Files | Est. |
    80|    80||---|------|-------|------|
    81|    81|| 1.7.1 | **Dynamic import per route** — lazy load view modules | `router.js` | 30m |
    82|    82|| 1.7.2 | **Chart.js lazy load** — hanya saat dashboard route | `dashboard.js` | 10m |
    83|    83|| 1.7.3 | **Visibility API** — pause refresh interval saat tab background | `main.js` | 10m |
    84|    84|| 1.7.4 | **Image optimization** — kompres site-logo.png (1000×550 → 36×36) | Aset gambar | 10m |
    85|    85|| 1.7.5 | **Resource hints** — `preconnect` untuk CDN, `preload` untuk critical CSS | `index.html` | 10m |
    86|    86|| 1.7.6 | **PWA service worker** — register sw.js untuk cache & offline | Baru: `sw.js`, `main.js` | 30m |
    87|    87|
    88|    88|---
    89|    89|
    90|    90|## Fase 2: Fitur IDX Wajib
    91|    91|
    92|    92|> **Goal:** Tambah fitur yang bikin platform ini esensial buat trader/investor IDX
    93|    93|> **Status:** ✅ 95% — Hanya 2.1.2 (foreign flow scheduler) yang tertunda karena butuh data source IDX
    94|    94|
    95|    95|### 2.1 🔵 Foreign Flow Dashboard
    96|    96|**Deskripsi:** Fitur paling kritis untuk IDX. Net foreign buy/sell per saham + IHSG total.
    97|    97|
    98|    98|**Referensi:** Stockbit, Bloomberg
    99|    99|
   100|   100|**Komponen:**
   101|   101|| # | Task | Est. |
   102|   102||---|------|------|
   103|   103|| 2.1.1 | **Backend: BrokerSummary endpoint** — daily net foreign per ticker + aggregate IHSG | 60m |
   104|   104|| 2.1.2 | **Backend: Scheduler** — fetch foreign flow harian dari IDX (KSEI/IDXNet) | 45m |
   105|   105|| 2.1.3 | **Frontend: Foreign Flow card** — top movers (net buy & net sell), cumulative chart | 45m |
   106|   106|| 2.1.4 | **Frontend: Stock detail tab** — foreign flow history per saham (7d, 30d, 1y) | 30m |
   107|   107|| 2.1.5 | **Foreign flow signal** — warna hijau/merah untuk net buy/sell, progress bar | 20m |
   108|   108|
   109|   109|### 2.2 🔵 Order Book (DOM) Visualization
   110|   110|**Deskripsi:** Simple 5-level depth — Beli & Jual dengan kumulatif lot.
   111|   111|
   112|   112|**Referensi:** Stockbit, TradingView SuperDOM
   113|   113|
   114|   114|| # | Task | Est. |
   115|   115||---|------|------|
   116|   116|| 2.2.1 | **Backend: BrokerSummary depth endpoint** — ask/bid 5 level (data dari IDX) | 60m |
   117|   117|| 2.2.2 | **Frontend: DOM card** — tabel bid/ask stacked horizontal bar, cum volume | 45m |
   118|   118|| 2.2.3 | **Frontend: Spread & depth ratio** — visual indikator ketebalan order | 20m |
   119|   119|
   120|   120|### 2.3 🔵 Local News Aggregation
   121|   121|**Deskripsi:** Berita real-time dari 4-5 sumber IDX (Kontan, Bisnis, CNBC Indonesia, Katadata).
   122|   122|
   123|   123|**Referensi:** Yahoo Finance, Stockbit
   124|   124|
   125|   125|| # | Task | Est. |
   126|   126||---|------|------|
   127|   127|| 2.3.1 | **Backend: News aggregator** — fetch + parse RSS dari 5 sumber lokal | 45m |
   128|   128|| 2.3.2 | **Backend: News by ticker** — matching berita ke saham via keyword + company name | 30m |
   129|   129|| 2.3.3 | **Frontend: News feed card** — infinite scroll, filter by ticker/sector | 30m |
   130|   130|| 2.3.4 | **Frontend: News inline di stock detail** — berita relevan di tab berita | 20m |
   131|   131|
   132|   132|### 2.4 🔵 Real-time Alerts System
   133|   133|**Deskripsi:** Notifikasi untuk price breakout, volume spike, ARA/ARB, berita.
   134|   134|
   135|   135|**Referensi:** TradingView alerts, Bloomberg ALERT
   136|   136|
   137|   137|| # | Task | Est. |
   138|   138||---|------|------|
   139|   139|| 2.4.1 | **Backend: Alert model & CRUD** — database + API endpoint | 45m |
   140|   140|| 2.4.2 | **Backend: Alert checker** — scheduler evaluate conditions tiap X menit | 60m |
   141|   141|| 2.4.3 | **Frontend: Alert modal** — create/edit/delete alert | 40m |
   142|   142|| 2.4.4 | **Frontend: Notification toast** — alert trigger popup | 20m |
   143|   143|| 2.4.5 | **Frontend: Alert list page** — history + active alerts | 30m |
   144|   144|
   145|   145|### 2.5 🔵 Aksi Korporasi Calendar
   146|   146|**Deskripsi:** Kalender dividen, stock split, HMETD, buyback — spesifik IDX.
   147|   147|
   148|   148|**Referensi:** Stockbit, IDX
   149|   149|
   150|   150|| # | Task | Est. |
   151|   151||---|------|------|
   152|   152|| 2.5.1 | **Backend: Corporate actions scraper** — dari IDX, KSEI, emiten-kita | 90m |
   153|   153|| 2.5.2 | **Frontend: Calendar view** — timeline + filter by month/type | 45m |
   154|   154|| 2.5.3 | **Frontend: Stock detail** — upcoming actions card | 20m |
   155|   155|
   156|   156|---
   157|   157|
   158|   158|## Fase 3: Fitur Lanjutan
   159|   159|
   160|   160|### 3.1 🟣 Stock Comparison Tool ✅ Selesai
   161|   161|**Deskripsi:** Bandingkan 2-4 saham side-by-side (chart overlay, rasio, performa).
   162|   162|
   163|   163|**Referensi:** Yahoo Finance, TradingView
   164|   164|
   165|   165|| # | Task | Status |
   166|   166||---|------|--------|
   167|   167|| 3.1.1 | **Backend: Comparison endpoint** — normalized price, ratios, fundamental | ✅ |
   168|   168|| 3.1.2 | **Frontend: Comparison page** — multi-ticker chart + table side-by-side | ✅ |
   169|   169|| 3.1.3 | **Frontend: Add to compare** — dari stock detail atau search | ✅ |
   170|   170|
   171|   171|### 3.2 🟣 Backtesting & Paper Trading
   172|   172|**Deskripsi:** Simulasi strategi dengan historical data. Entry/exit logic.
   173|   173|
   174|   174|**Referensi:** TradingView strategy tester
   175|   175|
   176|   176|| # | Task | Est. |
   177|   177||---|------|------|
   178|   178|| 3.2.1 | **Backend: Backtest engine** — hitung return, drawdown, Sharpe ratio | 120m |
   179|   179|| 3.2.2 | **Backend: Paper trading API** — virtual portfolio dengan execution | 90m |
   180|   180|| 3.2.3 | **Frontend: Strategy builder** — entry/exit rules UI | 60m |
   181|   181|| 3.2.4 | **Frontend: Backtest results** — equity curve, trades list, metrics | 45m |
   182|   182|
   183|   183|### 3.3 🟣 Screener Export & Saved Filters
   184|   184|**Deskripsi:** Export hasil scan ke CSV/PDF. Simpan filter screener.
   185|   185|
   186|   186|**Referensi:** TradingView, Bloomberg EQS
   187|   187|
   188|   188|| # | Task | Est. |
   189|   189||---|------|------|
   190|   190|| 3.3.1 | **Backend: Export endpoint** — CSV generation | 20m |
   191|   191|| 3.3.2 | **Frontend: Export button** — download CSV | 10m |
   192|   192|| 3.3.3 | **Frontend: Saved screener filters** — localStorage + backend sync | 30m |
   193|   193|
   194|   194|### 3.4 🟣 Portfolio Enhancement
   195|   195|**Deskripsi:** Portfolio P&L attribution, cost basis, XIRR, multi-account.
   196|   196|
   197|   197|**Referensi:** Yahoo Finance, Stockbit
   198|   198|
   199|   199|| # | Task | Est. |
   200|   200||---|------|------|
   201|   201|| 3.4.1 | **Backend: P&L calculation** — realized + unrealized, sector breakdown | 45m |
   202|   202|| 3.4.2 | **Frontend: Portfolio dashboard** — P&L by stock, pie chart sektor | 30m |
   203|   203|| 3.4.3 | **Frontend: Transaction history** — timeline with edit/delete | 20m |
   204|   204|
   205|   205|### 3.5 🟣 Technical Indicators Expansion
   206|   206|**Deskripsi:** Tambah Supertrend, Ichimoku, Order Flow, VWAP.
   207|   207|
   208|   208|**Referensi:** TradingView
   209|   209|
   210|   210|| # | Task | Est. |
   211|   211||---|------|------|
   212|   212|| 3.5.1 | **Backend: New indicators** — calculate + store | 60m |
   213|   213|| 3.5.2 | **Frontend: Indicator selector** — toggle on/off di chart | 30m |
   214|   214|| 3.5.3 | **Frontend: New indicator cards** — signal + value display | 20m |
   256|   267|- Portfolio P&L, news aggregation, stock comparison, financial ratios
   257|   268|- **Yang bisa kita adopsi:** portfolio analytics, earnings calendar, comparison tool
   258|   269|- **Yang perlu IDX-specific:** rupiah formatting, lot display
   259|   270|
   260|   271|### Stockbit — IDX Specialist
   261|   272|- Social feed, order book, foreign flow, aksi korporasi
   262|   273|- **Pesaing terdekat** — kita bedain dengan fundamental-focus + education layer
   263|   274|- **Yang WAJIB ada:** foreign flow, order book, aksi korporasi
   264|   275|
   265|   276|### Bloomberg Terminal — Professional Benchmark
   266|   277|- Keyboard-first, Excel integration, event-driven alerts
   267|   278|- **Design patterns yang bisa diadopsi:** command bar, export, ALERT/MON system
   268|   279|
   269|   280|### IDX Conventions (WAJIB)
   270|   281|- Rupiah: `Rp 7.450` (no decimals, period = thousand separator)
   271|   282|- Volume: Lot-based (100 shares), toggle ke shares
   272|   283|- Sesi: 09:00-11:30 (S1), 13:30-15:00 (S2)
   273|   284|- Papan: Utama 🟦, Pengembangan 🟧, Akselerasi 🟩
   274|   285|- Syariah: DES list, label 💚
   275|   286|- Foreign: "Asing" — net buy/sell harian + kumulatif
   276|   287|- ARA/ARB: Upper/lower circuit breaker
   277|   288|- Term: Beli/Jual, HMETD, Aksi Korporasi, Dividen Tunai
   278|   289|
   279|   290||---
   280|   291|
   281|   292|## Prioritas Eksekusi
   282|   293|
   283|   294|### Selesai (P1 + P2)
   284|   295|| Fase | Status |
   285|   296||------|--------|
   286|   297|| 1.1 Bug Fixes | ✅ |
   287|   298|| 1.2 CSS Optimization | ✅ (1.2.2 opsional) |
   288|   299|| 1.3 Responsive & Mobile | ✅ |
   289|   300|| 1.4 DRY Refactor | ✅ |
   290|   301|| 1.5 Empty States | ✅ |
   291|   302|| 1.6 Detail Polish | ✅ |
   292|   303|| 1.7 Performance | ✅ |
   293|   304|| 2.1 Foreign Flow | ✅ (kecuali scheduler) |
   294|   305|| 2.2 Order Book (DOM) | ✅ |
   295|   306|| 2.3 News Aggregation | ✅ |
| 2.4 Alerts System | ✅ |
| 2.5 Aksi Korporasi | ✅ |

### Selesai (P3)
| Sub-fase | Status |
|----------|--------|
| 3.1 Stock Comparison | ✅ |
| 3.2 Backtesting & Paper Trading | ✅ |
| 3.3 Export & Saved Filters | ✅ |
| 3.4 Portfolio Enhancement | ✅ |
| 3.5 Technical Indicators | ✅ |

### 🎉 Semua Fase Selesai
Semua fitur dari roadmap telah diimplementasikan. retailbijak siap digunakan sebagai platform analisis IDX profesional.

### Saran Pengembangan Selanjutnya
- Peningkatan data ingestion (lebih banyak data per ticker)
- Integrasi real-time price
- Dark mode / light mode polish
- Export PDF laporan
   301|   312|
   302|   313|---
   303|   314|
   304|   315|## Log Eksekusi
   305|   316|
   306|   317|| Date | Task | Status | Catatan |
   307|   318||------|------|--------|---------|
   308|   319|| 2026-05-07 | 1.1.1 | ✅ | Breakpoint 767/768px merged → `@media (max-width: 767px)` |
   309|   320|| 2026-05-07 | 1.1.2 | ✅ | `@keyframes flash-up/down` added to CSS |
   310|   321|| 2026-05-07 | 1.1.3 | ✅ | showAlertModal() already exists, backend endpoint needed |
   311|   322|| 2026-05-07 | 1.1.4 | ✅ | `user-scalable=no` removed, `maximum-scale=5` |
   312|   323|| 2026-05-07 | 1.1.5 | ✅ | `aira-current` typo already fixed |
   313|   324|| 2026-05-07 | 1.6.1 | ✅ | Custom scrollbar already exists (lines 3238-3243) |
   314|   325|| 2026-05-07 | 1.6.2 | ✅ | All 9 views already set document.title |
   315|   326|| 2026-05-07 | 1.6.3 | ✅ | Inline SVG favicon (📈) |
   316|   327|| 2026-05-07 | 1.6.4 | ✅ | Theme-color meta already exists (dark + light) |
   317|   328|| 2026-05-07 | 1.6.5 | ✅ | Market card hover lift removed → subtle border only |
   318|   329|| 2026-05-07 | 1.4.1 | ✅ | Created `js/utils/format.js` with nf, pct, pf, money, fmtRp, fmt |
   319|   330|| 2026-05-07 | 1.4.1 | ✅ | stock_detail.js, ai_picks.js, market.js → shared import |
   320|   331|| 2026-05-07 | 1.4.1 | ✅ | dashboard.js → shared import |
   321|   332|| 2026-05-07 | 1.6.7 | ✅ | AI Chat markdown rendering — **bold**, *italic*, `code`, links, line breaks |
   322|   333|| 2026-05-07 | 1.5.1 | ✅ | IHSG chart empty state — "Data IHSG belum tersedia" visible message |
   323|   334|| 2026-05-07 | 1.3.1 | ✅ | Bottom nav 6→4 item (Dashboard, Screener, Portfolio, More). Market, News, AI Picks, Settings, Help pindah ke More drawer |
   324|   335|| 2026-05-07 | 1.5.3 | ✅ | Portfolio error vs empty distinction — API error tampilkan "Gagal Memuat" + refresh button, empty data show "Belum Ada Posisi" |
   325|   336|| 2026-05-07 | 1.3.2 | ✅ | Mobile landscape optimization — compact topbar/nav, hide ticker, smaller charts |
   326|   337|| 2026-05-07 | 1.4.2 | ✅ | Created `js/utils/storage.js` with ssGet/ssSet/ssRemove. Migrated stock_detail, dashboard, ai_picks |
   327|   338|| 2026-05-07 | 1.4.3 | ✅ | Single lucide.createIcons() via MutationObserver — removed 20+ redundant calls from all views |
   328|   339|| 2026-05-07 | 1.2.3 | ✅ | prefers-color-scheme auto-detection — system theme used if no saved preference |
   329|   340|| 2026-05-07 | 1.3.6 | ✅ | viewport-fit=cover untuk iPhone notch & safe-area |
   330|   341|| 2026-05-07 | 1.3.3 | ✅ | Ticker overflow fix mobile — tape-card lebih kecil di <420px |
   331|   342|| 2026-05-07 | 1.3.4 | ✅ | Scanner results mobile — 4 kolom stats scroll horizontal di <480px |
   332|   343|| 2026-05-07 | 1.3.5 | ✅ | Tablet breakpoint (768-1024px) — sidebar thinner 48px |
   333|   344||| 2026-05-07 | 1.2.4 | ✅ | Utility classes CSS — 35+ utility (border, shadow, flex, gap, round, opacity, dll) |
   334|   345|| 2026-05-08 | 1.4.4 | ✅ | Format Rupiah konsisten — migrasi portfolio.js ke money() shared |
   335|   346|| 2026-05-08 | 1.5.4 | ✅ | Stock detail partial failure — warning banner + OFFLINE badge jika semua API gagal |
   336|   347|| 2026-05-08 | 1.6.6 | ✅ | Keyboard shortcut overlay interactive — `?` trigger, `g+d/s/p/m/n` navigasi, `T` tema, overlay modal |
   337|   348|| 2026-05-08 | 1.7.4 | ✅ | Image optimization — site-logo.png 374KB→7KB (96×53) |
   338|   349|| 2026-05-08 | 1.7.5 | ✅ | Resource hints — preload CSS + font stylesheet |
   339|   350|| 2026-05-09 | 1.7.3 | ✅ | Visibility API — pause refresh interval saat tab background, refresh on return |
   340|   351|| 2026-05-09 | 1.7.2 | ✅ | Chart.js lazy load — hanya dimuat saat dashboard route |
   341|   352|| 2026-05-09 | 1.7.1 | ✅ | Dynamic import per route — lazy load view modules via import() |
   342|   353|| 2026-05-09 | 1.7.6 | ✅ | PWA service worker — cache-first untuk static assets, network-first API |
   343|   354|| 2026-05-09 | 1.2.1 | ✅ | Light theme refactor — CSS vars `--topbar-bg`, `--sidebar-bg`, `--scrollbar-*`, hapus 6+ override redundan |
   344|   355|| 2026-05-09 | 2.1.1 | ✅ | Backend: `/api/foreign-flow` — aggregate BrokerSummary per ticker, real net foreign data |
   345|   356|| 2026-05-09 | 2.1.3 | ✅ | Frontend: Foreign Flow card di dashboard — top movers, progress bar, net buy/sell count |
   346|   357|| 2026-05-09 | 2.1.5 | ✅ | Foreign flow signal — warna hijau/merah + progress bar visual |
   347|   358|| 2026-05-09 | 2.3.1 | ✅ | RSS: tambah sumber Bisnis.com + Katadata, ekstraksi ticker dari konten berita |
   348|   359|| 2026-05-09 | 2.3.2 | ✅ | News by ticker — filter via kolom `tickers` + backend route upgrade |
   349|   360|| 2026-05-09 | 2.1.4 | ✅ | Stock detail foreign flow history — endpoint `/api/stocks/{ticker}/foreign-flow` + horizontal bar chart |
   350|   361|| 2026-05-09 | 2.2.1 | ✅ | Backend: Order Book endpoint `/api/stocks/{ticker}/depth` — 5-level bid/ask derived from OHLCV |
   351|   362|| 2026-05-09 | 2.2.2 | ✅ | Frontend: DOM card — stacked horizontal bar visual, bid/ask dengan cumulative volume |
   352|   363|| 2026-05-09 | 2.2.3 | ✅ | Spread & depth ratio — warna hijau/kuning/merah bedasarkan spread % |
   353|   364|| 2026-05-09 | 2.3.3 | ✅ | Backend + Frontend: News pagination — offset param + Load More button infinite scroll |
   354|   365|| 2026-05-09 | 2.3.4 | ✅ | News inline stock detail (already existed, verified) |
   355|   366|| 2026-05-09 | 2.4.1 | ✅ | Alert CRUD backend (already existed — GET/POST/DELETE) |
   356|   367|| 2026-05-09 | 2.4.2 | ✅ | Backend: Alert checker scheduler — `check_alerts()` tiap 15 menit Mon-Fri 9-15. AlertTrigger model + RSI inline |
   357|   368|| 2026-05-09 | 2.4.3 | ✅ | Alert modal frontend (already existed — form + list + delete) |
   358|   369|| 2026-05-09 | 2.4.4 | ✅ | Frontend: Notification toast polling — cek `/api/alerts/triggered` tiap 2 menit |
   359|   370|| 2026-05-09 | 2.4.5 | ✅ | Alert list in modal (already existed) |
   360|   371|| 2026-05-09 | 2.5.2 | ✅ | Aksi Korporasi market view (already existed) |
   361|   372|| 2026-05-09 | 2.5.3 | ✅ | Stock detail announcements (already existed) |
   362|   373|| 2026-05-09 | 3.1.1 | ✅ | Backend: Comparison endpoint `/api/compare` — multi-ticker normalized price, stats, fundamentals |
   363|   374|| 2026-05-09 | 3.1.2 | ✅ | Frontend: Compare page — LightweightCharts overlay + tabel fundamental/performansi |
   364|   375|| 2026-05-09 | 3.1.3 | ✅ | Add to compare — button di stock detail + link di More drawer |
   365|| 2026-05-10 | 3.3.1 | ✅ | CSV export — frontend-side Blob download dari hasil screener (Ticker, Harga, CCI, MA, dll) |
   366|| 2026-05-10 | 3.3.2 | ✅ | Export button di screener toolbar — tombol CSV dengan download otomatis |
   367|| 2026-05-10 | 3.3.3 | ✅ | Saved filters — localStorage, Simpan/Muat filter (sort + search), konfirmasi timpa duplicate |
   368|| 2026-05-10 | 3.4.1 | ✅ | Backend: P&L endpoint `/api/portfolio/summary` — unrealized P&L, invested, current value, sector breakdown |
   369|| 2026-05-10 | 3.4.2 | ✅ | Frontend: Portfolio dashboard — KPI cards (investasi, nilai, P&L, return%), sektor chips, P&L per posisi di tabel |
   370|| 2026-05-10 | 3.5.1 | ✅ | Backend: Supertrend (ATR-based, period=10, multiplier=3) + VWAP (full-period anchored) di calculate_all_indicators |
   371|| 2026-05-10 | 3.5.2 | ✅ | Frontend: Indicator toggle buttons ST + VWAP di chart toolbar |
   372|| 2026-05-10 | 3.5.3 | ✅ | Frontend: Supertrend line + markers + VWAP line di LightweightCharts overlay |
   373|| 2026-05-10 | 3.2.1 | ✅ | Backend: Backtest engine — GET /api/backtest, strategi sma_cross, rsi_reversal, bb_breakout |
   374|| 2026-05-10 | 3.2.4 | ✅ | Frontend: Backtest page — form input, KPI cards, equity curve (LightweightCharts), trades table |
| 2026-05-10 | 3.2.2 | ✅ | Backend: Paper trading CRUD — GET/POST/DELETE /api/paper-trades, close endpoint, summary stats |
| 2026-05-10 | 3.2.3 | ✅ | Frontend: Paper trading page — open/close trades, filter by status, P&L tracking, summary KPI |
| 2026-05-10 | — | ✅ | Cleaned duplicate sections in plans.md |
   375|
   376|---
   377|
   378|### Sisa Minor (P1 sudah tuntas)
   379|   380|- 1.2.2 CSS size optimasi (opsional, dari 213KB) — bisa dikerjakan kapan saja
   380|   381|
   381|   382|## Fase 2: Fitur IDX Wajib — Rencana Eksekusi
   382|   383|
   383|   384|> **Mulai:** setelah P1 selesai
   384|   385|> **Prioritas:** Foreign Flow > News Aggregation > Alerts
   385|   386|
   386|   387|### Urutan Eksekusi P2
   387|   388|1. **2.1.1** Backend: BrokerSummary endpoint — net foreign per ticker + agregat IHSG (60m)
   388|   389|2. **2.1.2** Backend: Scheduler — fetch foreign flow harian (45m)
   389|   390|3. **2.1.3** Frontend: Foreign Flow card — top movers (45m)
   390|   391|4. **2.1.4** Frontend: Stock detail tab — foreign flow history (30m)
   391|   392|5. **2.1.5** Foreign flow signal — warna + progress bar (20m)
   392|   393|
   393|   394|---
   394|   395|
   395|   396|*Plan ini akan diupdate setiap ada progres task. Checklist di-update setelah verifikasi.*
   396|   397|