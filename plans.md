# 🇮🇩 RetailBijak — Rencana Pengembangan Fase 7

> **Status:** 🆕 Baru — fase engagement, inteligensi, dan polish akhir
> **Tujuan:** Transformasi dari platform fitur-lengkap menjadi platform **cerdas, engaging, dan siap-pakai harian**
> **Prinsip:** Zero dependency pada data source baru. Semua fitur harus jalan dengan data existing (50 bars/ticker, 974 stocks, 7,928 signals, 958 fundamentals).
> **Constraint:** IDX API rate-limited, yfinance rate-limited. Hanya pakai data yang sudah ada di DB.

---

## Progress Keseluruhan

| Fase | Status | Progress |
|------|--------|----------|
| **P1: UI/UX Professional Redesign** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 100% |
| **P2: Fitur IDX Wajib** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 95% |
| **P3: Fitur Lanjutan** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 100% |
| **P4: Stabilitas & Kualitas** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 100% |
| **P5: Ekspansi Fitur & Inteligensi** | 🟡 96% | ▰▰▰▰▰▰▰▰▰▱ (5.1.4 BLOCKED) |
| **P6: Engagement, Visualisasi & Personalisasi** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 100% |
|| **P7: AI Intelligence, Engagement & Production Polish** | 🟡 70% | ▰▰▰▰▰▰▰▰▰▰ 70% |

---

## Masalah Teridentifikasi (dari Audit 2026-05-10)

| # | Masalah | Dampak | Prioritas |
|---|---------|--------|-----------|
| M1 | **AI Chat tidak punya riwayat** — tiap chat ke stock detail mulai dari kosong | User gak bisa lihat analisis sebelumnya, repeat pertanyaan sama | 🔴 High |
| M2 | **Portfolio & watchlist 0 item** — user belum engage karena empty state kurang menarik | User engagement rendah | 🔴 High |
| M3 | **Tidak ada sinyal overview** — sinyal cuma visible di stock detail, gak ada dashboard sinyal | User ketinggalan sinyal penting | 🔴 High |
| M4 | **Hanya tersedia Bahasa Indonesia** — toggle ID/EN di topbar gak berfungsi | User English-speaking gak bisa pakai optimal | 🟠 Medium |
| M5 | **Stock detail tidak bisa di-export** — gak ada print-friendly report | Analis gak bisa share/print laporan | 🟠 Medium |
| M6 | **Screener hasilnya text-only** — gak ada visual chart/sparkline | Screening decision kurang cepat | 🟡 Medium |
| M7 | **Dividend/IPO/RUPS info tidak tampil** — corporate action endpoint sudah ada tapi gak di-frontend | Kurangnya konteks fundamental | 🟡 Low |
| M8 | **No onboarding for key features** — user baru bingung fitur apa aja yang ada | Drop-off tinggi, engagement rendah | 🟡 Low |

---

## P7: AI Intelligence, Engagement & Production Polish

### 7.1 🔴 AI Chat History & Context (HIGH IMPACT)

> **Goal:** AI chat per stock jadi persistent, bisa liat history, context-aware.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 7.1.1 | **Model ChatHistory** — `id, ticker, role(user/assistant), message, created_at, metadata(JSON)` | `database.py` | 15m | SQLite table baru |
| 7.1.2 | **Chat CRUD endpoint** — `POST /api/stocks/{ticker}/chat` simpan + return, `GET /api/stocks/{ticker}/chat-history` list, `DELETE /api/stocks/{ticker}/chat-history` clear | `routes/stock_detail.py` | 30m | POST simpan Q&A, GET return history |
| 7.1.3 | **Chat UI history** — tampilkan chat bubble dari history, scroll ke bawah | `stock_detail.js` | 30m | Render history, auto-scroll |
| 7.1.4 | **Clear history button** — tombol hapus riwayat chat di panel AI | `stock_detail.js` | 10m | Confirm + clear |
| 7.1.5 | **Chat context injection** — inject 3 pesan terakhir sebagai context ke AI prompt | `routes/stock_detail.py` | 15m | LLM dapat konteks percakapan |

**Value:** ★★★★★ — ini fitur paling diminta untuk daily use

### 7.2 🔴 Signal Overview Dashboard (HIGH IMPACT)

> **Goal:** Satu halaman untuk lihat semua sinyal dari semua saham sekaligus.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 7.2.1 | **Signal summary endpoint** — `GET /api/signals/summary` return count per signal_type, latest signals per ticker | `routes/scanner.py` | 20m | Group by signal, limit per ticker |
| 7.2.2 | **Signal overview view** — `#signal-overview` page: table/summary sinyal, filter by type, sort by date | `signal_overview.js` (new), `router.js` | 30m | New view page |
| 7.2.3 | **Signal dashboard widget** — widget di dashboard: "5 sinyal terbaru" dengan ticker + signal + arah | `dashboard.js` | 20m | Mini widget |
| 7.2.4 | **Signal badge on sidebar** — notifikasi count sinyal baru di sidebar navigasi | `main.js` | 10m | Badge merah di radar icon |

**Value:** ★★★★★ — bikin user selalu update sinyal tanpa perlu buka tiap saham

### 7.3 🟠 Watchlist & Portfolio Engagement (HIGH IMPACT)

> **Goal:** Bikin watchlist & portfolio engaging meskipun data kosong. Add sample data, visual highlights.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 7.3.1 | **Watchlist price highlights** — badge 🟢🔴 di watchlist jika price change >3%, animasi pulse | `portfolio.js` | 20m | Highlight big movers |
| 7.3.2 | **Sample portfolio data** — seed script untuk isi portfolio + transactions dengan data sample (5 saham populer) | `user.py`, `portfolio.js` | 30m | Demo data untuk first-time user |
| 7.3.3 | **Portfolio empty state upgrade** — "Mulai portofolio" card dengan contoh, CTA ke screener | `portfolio.js` | 15m | Better empty state |
| 7.3.4 | **Watchlist empty state upgrade** — "Cari saham via Cmd+K" + trending stocks suggestion | `portfolio.js` | 15m | Better empty state |
| 7.3.5 | **Portfolio rebalancing** — target vs actual sector allocation, list saham yang over/under weight | `routes/user.py`, `portfolio.js` | 45m | Rebalance suggestions |

**Value:** ★★★★☆ — user engagement booster

### 7.4 🟠 i18n Implementation (MEDIUM IMPACT)

> **Goal:** ID/EN toggle beneran berfungsi. Full translation.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 7.4.1 | **i18n engine** — fungsi `__()` untuk translate, detect dari `lang` setting, fallback ke ID | `i18n.js` (new) | 30m | Simple key-value translation |
| 7.4.2 | **ID translation file** — string existing di ID (complete) | `locales/id.json` | 10m | Full Indonesian |
| 7.4.3 | **EN translation file** — semua string di-English-kan | `locales/en.json` | 30m | Full English translation |
| 7.4.4 | **Wire lang toggle** — `#lang-toggle` beneran ganti bahasa, persist ke UserSetting + localStorage | `main.js`, `theme.js` | 20m | Toggle works |
| 7.4.5 | **Auto-translate DOM** — scan all elements with `data-i18n` attribute, ganti textContent | `main.js` | 20m | DOM translation engine |

**Value:** ★★★★☆ — accessibility untuk English speaker

### 7.5 🟡 Stock Detail Improvements (MEDIUM IMPACT)

> **Goal:** Stock detail jadi lebih comprehensive dan actionable.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 7.5.1 | **Print-friendly stock report** — tombol "Print Report" yang render layout khusus cetak, buka print dialog | `stock_detail.js` | 20m | CSS @media print enhancement |
| 7.5.2 | **Corporate actions timeline** — tampilkan dividen, stock split, RUPS dari endpoint existing `/api/corporate-actions` | `stock_detail.js` | 30m | Timeline card |
| 7.5.3 | **Peers comparison widget** — ticker peers dari `/api/stocks/{ticker}/peers` ditampilkan sebagai mini table dengan price + change | `stock_detail.js` | 20m | Peer comparison card |
| 7.5.4 | **Fundamental trend** — revenue/profit chart dari financials (multi-year trendline) | `stock_detail.js` | 30m | Chart financial trend |

**Value:** ★★★★☆ — depth analysis

### 7.6 🟡 Screener Enhancement (MEDIUM IMPACT)

> **Goal:** Screener lebih visual dan actionable.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 7.6.1 | **Mini chart sparkline** — tiap row di hasil screener punya sparkline 20-bar dari OHLCV close price | `screener.js`, `routes/scanner_stream.py` | 30m | SVG/Cavas sparkline, data dari DB |
| 7.6.2 | **Screener result count** — tampilkan total count hasil scan + progress | `screener.js` | 10m | "Menampilkan 12 dari 45 hasil" |
| 7.6.3 | **Screener sort by column** — klik header kolom untuk sort ascending/descending | `screener.js` | 20m | Client-side sorting |
| 7.6.4 | **Scan all tickers quick button** — tombol untuk langsung scan semua ticker tanpa filter | `screener.js` | 10m | Quick scan |

**Value:** ★★★☆☆ — UX improvement

### 7.7 🟡 Dashboard Intelligence (MEDIUM IMPACT)

> **Goal:** Dashboard lebih informatif dan engaging.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 7.7.1 | **Today's market narrative** — ringkasan otomatis: "Hari ini IHSG +0.8%, dipimpin sektor Financials (+2.1%)" dari data market summary | `dashboard.js` | 20m | Narrative card |
| 7.7.2 | **Signal count badge** — widget "Sinyal Aktif: X Buy / Y Sell" di dashboard | `dashboard.js` | 15m | Make it actionable |
| 7.7.3 | **Dashboard data freshness** — "Data diperbarui: 2 jam lalu" dari scheduler health | `dashboard.js` | 10m | Transparency |

**Value:** ★★★☆☆ — makes dashboard feel alive

### 7.8 🟢 UI Polish & Bug Fixes (LOW IMPACT)

> **Goal:** Polish terakhir sebelum production stabil.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 7.8.1 | **Fix light mode gaps** — audit semua komponen di light theme, cari yg masih dark-only | `style.css`, semua views | 30m | Light mode completeness |
| 7.8.2 | **Toast refinement** — animasi lebih smooth, auto-dismiss timer, stack management | `api.js` | 15m | Toast V2 |
| 7.8.3 | **Skeleton loading refinement** — kurangin FOW di semua view, timing yg pas | `style.css`, semua views | 20m | Loading states |
| 7.8.4 | **Mobile touch targets** — pastiin semua interactive element >=44px di mobile | `style.css` | 15m | Accessibility |
| 7.8.5 | **Console error cleanup** — audit JS console errors, fix semua warning | Semua views | 20m | Zero errors |

**Value:** ★★★☆☆ — quality

---

## Prioritas Eksekusi

### 🔴 Minggu Ini (Core Features)
7.1.1 → 7.1.2 → 7.1.3 → 7.1.4 → 7.1.5 → 7.2.1 → 7.2.2 → 7.2.3

### 🟠 Berikutnya (Engagement)
7.3.1 → 7.3.2 → 7.3.3 → 7.3.4 → 7.3.5 → 7.4.1 → 7.4.2 → 7.4.3

### 🟡 Setelahnya (Depth & Polish)
7.4.4 → 7.4.5 → 7.5.1 → 7.5.2 → 7.5.3 → 7.5.4 → 7.6.1 → 7.6.2 → 7.6.3 → 7.6.4 → 7.7.1 → 7.7.2 → 7.7.3 → 7.8.1 → 7.8.2 → 7.8.3 → 7.8.4 → 7.8.5

---

## Log Eksekusi — Fase 7

| Date | Task | Status | Catatan |
|------|------|--------|---------|
| 2026-05-10 | 7.1.1 | ✅ | Model ChatHistory + table migration (`chat_history` table created) |
| 2026-05-10 | 7.1.2 | ✅ | Chat CRUD endpoints: POST /chat (save Q&A), GET /chat-history, DELETE /chat-history |
| 2026-05-10 | 7.1.3 | ✅ | Chat UI history display: loadChatHistory() renders past bubbles on stock detail |
| 2026-05-10 | 7.1.4 | ✅ | Clear history button with confirm dialog, trash icon in chat header |
| 2026-05-10 | 7.1.5 | ✅ | Chat context injection: last 6 messages (3 exchanges) injected into LLM system prompt |
| 2026-05-10 | 7.2.1 | ✅ | Signal summary endpoint `GET /api/signals/summary` — counts by type + latest per ticker |
| 2026-05-10 | 7.2.2 | ✅ | Signal Overview view (`#signal_overview`) — table, filter by type, sort by column, summary cards (total/buy/sell/ratio) |
| 2026-05-10 | 7.2.3 | ✅ | Signal dashboard widget — 4 KPI cards (total, buy, sell, ratio) + buy/sell ratio bar |
| 2026-05-10 | 7.2.4 | ✅ | Signal badge on sidebar — auto-fetches 7-day count, shows indigo badge, updates on page load |
| 2026-05-10 | 7.3.1 | ✅ | Watchlist price highlights — price + change% columns, 🚀/🔻 badge jika move >3%, flash animation |
| 2026-05-10 | 7.3.2 | ✅ | Sample portfolio data — `POST /api/portfolio/seed-sample` (BBCA, TLKM, ASII, BMRI, BBRI) + transactions |
| 2026-05-10 | 7.3.3 | ✅ | Portfolio empty state upgrade — CTA dengan 3 button (Tambah, Cari Ide, Contoh Data) + sample preview card |
| 2026-05-10 | 7.3.4 | ✅ | Watchlist empty state upgrade — petunjuk Ctrl+K, link ke Pasar, tips saham blue chip BBCA/TLKM/ASII |
| 2026-05-10 | 7.3.5 | ✅ | Portfolio rebalancing — `GET /api/portfolio/rebalance` + UI card di portfolio, equal-weight target, over/under badge |
| 2026-05-10 | 7.4.1 | ✅ | i18n engine — `__()`, `setLanguage()`, `applyTranslations()`, `initI18n()` functions (sudah ada sebelumnya, diperluas) |
| 2026-05-10 | 7.4.2 | ✅ | ID translation file — 100+ keys: nav, sidebar, topbar, dashboard, stock detail, chat, screener, portfolio, signals, market, news, settings, general |
| 2026-05-10 | 7.4.3 | ✅ | EN translation file — 100+ keys English lengkap, termasuk tooltip, placeholder, aria-label |
| 2026-05-10 | 7.4.4 | ✅ | Lang toggle wiring — `theme.js` sudah panggil `setLanguage()`, toggle ID/EN persist ke localStorage |
| 2026-05-10 | 7.4.5 | ✅ | `data-i18n` attributes di index.html: sidebar tooltips, bottom nav labels, search placeholder, PTR indicator, aria-labels semua tombol topbar |
| 2026-05-10 | 7.5.1 | ✅ | Print-friendly stock report — button "Cetak" di stock actions, `printing-report` CSS class, enhanced @media print layout |
| 2026-05-10 | 7.5.2 | ✅ | Corporate actions widget — filter berita per-ticker dengan keyword dividen/RUPS/stock split/buyback/akuisisi, badge warna |
| 2026-05-10 | 7.5.3 | ✅ | Peers comparison widget — sudah ada (`renderPeerComparison()`), menampilkan price + change% untuk saham peers |
|| 2026-05-10 | 7.5.4 | 🟡 BLOCKED | Fundamental trend chart — financials table 0 rows, tidak ada data multi-year. Butuh data source baru |
|| 2026-05-08 | 7.6.1 | ✅ | Mini chart sparkline — close_prices array di SSE stream + SVG polyline di tiap row screener (hijau/merah trend) |
|| 2026-05-08 | 7.6.2 | ✅ | Screener result count — "X dari Y saham" display setelah scan selesai |
|| 2026-05-08 | 7.6.3 | ✅ | Sortable column headers — klik Kode/Nama/Harga/CCI/MA/Volume untuk sort ascending/descending |
|| 2026-05-08 | 7.6.4 | ✅ | Quick scan button — "⚡ Pindai Semua" langsung scan via volume sort default |
|| 2026-05-08 | 7.7.1 | ✅ | Market narrative card — narasi otomatis "IHSG menguat/melemah X%, Y adv vs Z dec" di dashboard |

---

*Plan ini akan diupdate setiap ada progres task.*
