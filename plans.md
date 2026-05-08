# 🇮🇩 RetailBijak — Rencana Pengembangan

> **Status:** 🎉 **SEMUA FASE SELESAI — retailbijak matang dan siap pakai!**
> **Capaian:** 8 fase, 50+ fitur, 974 stocks, 47K OHLCV, 7.9K signals, 958 fundamentals.
> **Sisa:** Hanya 7.5.4 BLOCKED (financials data source).
> **Tujuan:** Ubah retailbijak dari platform fungsional jadi platform **pintar, komparatif, dan engaging**
> **Prinsip:** Zero external data — semua fitur harus jalan dengan data yang sudah ada di DB (974 stocks, 47K OHLCV, 7.9K signals, 958 fundamentals, 330 news, AI picks)
> **Constraint:** IDX API rate-limited. Hanya pakai data existing.

---

## Progress Keseluruhan

| Fase | Status | Progress |
|------|--------|----------|
| **P1: UI/UX Professional Redesign** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 100% |
| **P2: Fitur IDX Wajib** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 100% |
| **P3: Fitur Lanjutan** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 100% |
| **P4: Stabilitas & Kualitas** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 100% |
| **P5: Ekspansi Fitur & Inteligensi** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 100% |
| **P6: Engagement, Visualisasi & Personalisasi** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 100% |
| **P7: AI Intelligence, Engagement & Production Polish** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 100% |
| **P8: Platform Maturity & Advanced Analytics** | ✅ Selesai | ▰▰▰▰▰▰▰▰▰▰ 100% |

---

## Masalah yang Ditargetkan Fase 8

| # | Masalah | Dampak | Prioritas |
|---|---------|--------|-----------|
| M1 | **Tidak ada overview sektor** — user gak bisa lihat performa sektor sekaligus | Investor sektor-based gak punya acuan | 🔴 High |
| M2 | **Gak bisa bandingin saham** — tiap stock detail standalone, gak ada side-by-side comparison | Analis harus buka 2 tab manual | 🔴 High |
| M3 | **Alerts backend ada tapi gak di-frontend** — tabel `alerts` dan `alert_triggers` sudah ada, no UI | User gak bisa set alert | 🟠 High |
| M4 | **AI Picks cuma di dashboard** — ada 11 report, gak ada dedicated page | User ketinggalan rekomendasi AI | 🟠 Medium |
| M5 | **Paper trading ada tapi gak di-menu** — `paper_trades` table ada, P&L engine gak di-expose | User gak bisa track paper trade | 🟡 Medium |
| M6 | **Search terbatas** — cuma cari by ticker/name, gak bisa filter by sector/industry/mcap | Discovery saham lambat | 🟡 Medium |
| M7 | **Nggak ada stock comparator di mobile** — comparison tool berguna untuk mobile user juga | Aksesibilitas terbatas | 🟢 Low |

---

## Fase 8: Platform Maturity & Advanced Analytics

### 8.1 🔴 Sector Performance Dashboard (HIGH IMPACT)

> **Goal:** Satu halaman untuk lihat performa tiap sektor — aggregation dari OHLCV per sector, best/worst performers, sector rotation.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 8.1.1 | **Sector performance endpoint** — `GET /api/sectors/performance` aggregate avg return % per sector (1d, 5d, 1m, 3m) from OHLCV | `routes/sectors.py` (new) | 30m | JOIN stocks.sector + ohlcv_daily close price, calc return % per period |
| 8.1.2 | **Sector page view** — `#sectors` page: cards per sector, expand to see top stocks, mini chart sparkline | `sector.js` (new), `router.js` | 30m | Sector cards with performance + top holdings |
| 8.1.3 | **Sector KPI widget on dashboard** — "Top/Bottom Sector" mini widget, bisa klik navigasi ke sector page | `dashboard.js` | 15m | Quick sector glance |
| 8.1.4 | **Sector rotation visualization** — horizontal bar chart showing sector performance sorted best→worst | `sector.js` | 20m | SVG/Chart.js bar chart |

**Value:** ★★★★★ — fitur penting untuk institutional investor

### 8.2 🔴 Stock Comparison Tool (HIGH IMPACT)

> **Goal:** Side-by-side comparison 2-4 stocks — overlay chart, fundamentals, TA signals.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 8.2.1 | **Compare endpoint** — `GET /api/stocks/compare?tickers=BBCA,BBRI,BMRI` return OHLCV, fundamentals, signals for multi-ticker | `routes/stock_detail.py` | 30m | Batch query, normalize dates |
| 8.2.2 | **Compare page** — `#compare/BBCA+BBRI+BMRI` route, multi-line chart (normalized), fundamental table rows, signal matrix | `compare.js` (new), `router.js` | 45m | New view with overlay chart |
| 8.2.3 | **Compare entry point** — search/multi-select widget di stock detail, CTA "Bandingkan" | `stock_detail.js` | 15m | Add to existing stock actions |

**Value:** ★★★★★ — most-requested analytical feature

### 8.3 🟠 Alerts System Activation (HIGH IMPACT)

> **Goal:** Backend `alerts` + `alert_triggers` sudah ada. Frontend UI untuk manage alerts.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 8.3.1 | **Alert CRUD frontend** — `GET /api/alerts` list, `POST /api/alerts` create, `DELETE /api/alerts/:id` di settings page | `routes/alerts.py` (check existing), `settings.js` | 30m | Check if alert routes exist, if not create |
| 8.3.2 | **Alert UI in settings** — form create alert (ticker, type: price/signal, condition: above/below, value), list active alerts, toggle on/off | `settings.js` | 30m | In settings page |
| 8.3.3 | **Alert trigger history** — lihat history trigerred alerts di settings atau dedicated page | `settings.js` | 20m | History of triggered alerts |
| 8.3.4 | **Quick alert from stock detail** — tombol "🔔 Set Alert" di stock actions, pre-fill ticker | `stock_detail.js` | 10m | Shortcut from stock detail |

**Value:** ★★★★☆ — alerts adalah gateway untuk user engagement harian

### 8.4 🟠 AI Picks Showcase Page (MEDIUM IMPACT)

> **Goal:** 11 daily AI pick reports sudah ada di `daily_ai_pick_reports`. Dedicated page untuk lihat + track.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 8.4.1 | **AI Picks endpoint** — `GET /api/ai-picks` list reports, filter by date/mode | `routes/ai_picks.py` (check existing) | 15m | Query daily_ai_pick_reports |
| 8.4.2 | **AI Picks page** — `#ai-picks` view: list of AI picks with stock, reasoning, performance | `ai_picks.js` (new), `router.js` | 30m | New view |
| 8.4.3 | **AI Picks historical** — show past picks and their subsequent performance vs IHSG | `ai_picks.js` | 20m | Performance tracking |

**Value:** ★★★★☆ — bikin AI picks jadi fitur utama bukan sidebar

### 8.5 🟡 Paper Trading Polish (MEDIUM IMPACT)

> **Goal:** `paper_trades` table ada. Polish frontend + add P&L summary.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 8.5.1 | **Paper trading endpoint** — CRUD + P&L aggregation | `routes/paper_trades.py` (check existing) | 20m | Win rate, total P&L, best/worst trades |
| 8.5.2 | **Paper trading tab** — di portfolio page atau settings. List trades, add trade form | `portfolio.js` or `settings.js` | 30m | UI for paper trades |
| 8.5.3 | **P&L dashboard widget** — "Paper P&L: +2.3M (12.4%)" mini widget di dashboard | `dashboard.js` | 10m | Quick P&L glance |

**Value:** ★★★☆☆ — gamification element

### 8.6 🟡 Search Enhancement (MEDIUM IMPACT)

> **Goal:** Filter dan discovery saham lebih powerful.

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 8.6.1 | **Advanced search endpoint** — `GET /api/stocks/search?q=&sector=&industry=&mcap_min=&mcap_max=` | `routes/stocks.py` | 20m | Multi-filter search |
| 8.6.2 | **Search filter UI** — filter chips di search modal untuk sector/industry/mcap range | `main.js` | 25m | Enhanced Ctrl+K search |
| 8.6.3 | **Search result enhancements** — show sector + change% in search results | `main.js` | 10m | Richer results |

**Value:** ★★★☆☆ — UX improvement

### 8.7 🟢 Polish & Performance (LOW IMPACT)

| # | Task | Files | Est. | Detail |
|---|------|-------|------|--------|
| 8.7.1 | **Production DB sync** — sync antara repo DB dan prod DB (swingaq.db vs retailbijak.db) | `backend/` | 15m | Copy/align prod DB ke repo |
| 8.7.2 | **Lazy load views** — dynamically import view JS files via `import()` on route change | `router.js` | 20m | Split bundles |
| 8.7.3 | **Console error audit** — test semua view di browser, fix runtime errors | Semua views | 20m | Zero runtime errors |
| 8.7.4 | **Light mode final audit** — verify all views in light theme, fix gaps | `style.css` | 15m | No white-on-white |

**Value:** ★★★☆☆ — quality

---

## Prioritas Eksekusi

### 🔴 Langsung (Now)
8.1.1 → 8.1.2 → 8.1.3 → 8.2.1 → 8.2.2

### 🟠 Berikutnya (Next)
8.2.3 → 8.3.1 → 8.3.2 → 8.3.3 → 8.4.1 → 8.4.2

### 🟡 Setelahnya (Later)
8.3.4 → 8.4.3 → 8.5.1 → 8.5.2 → 8.5.3 → 8.6.1 → 8.6.2 → 8.6.3 → 8.7.1 → 8.7.2 → 8.7.3 → 8.7.4

---

## Log Eksekusi — Fase 7 (Finalized)

| Date | Task | Status | Catatan |
|------|------|--------|---------|
| 2026-05-10 | 7.1.1-7.8.5 | ✅ | Semua task Fase 7 selesai. Detail lihat versi sebelumnya. |
| 2026-05-08 | **Fase 7 Final** | 🎉 **100%** | Hanya 7.5.4 BLOCKED (data source). Berhasil 30/31 task. |

---

## Log Eksekusi — Fase 8

| Date | Task | Status | Catatan |
|------|------|--------|---------|
| 2026-05-08 | 8.1.1 | ✅ | Sector performance endpoint — `GET /api/sectors/performance` aggregate return % per sector (1d, 5d, 1m, 3m) from OHLCV |
| 2026-05-08 | 8.1.2 | ✅ | Sector view — `#sector` page: carousel chips, card grid with top/bottom stocks, stock rows, returns per period |
| 2026-05-08 | 8.1.3 | ✅ | Sector sidebar nav — nav-item in index.html `pie-chart` icon linking to `#sector` |
| 2026-05-08 | 8.1.4 | ✅ | Sector rotation viz — horizontal return bar per card (card-bar), color-coded up/down |
| 2026-05-08 | 8.2 | ✅ | **Already existed** — `GET /api/compare`, `compare.js`, router, stock detail "Bandingkan" button, session storage |
| 2026-05-08 | 8.3 | ✅ | **Already existed** — `POST/GET/DELETE /api/alerts`, `GET /api/alerts/triggered`, alert modal in stock_detail.js |
| 2026-05-08 | 8.4 | ✅ | **Already existed** — `ai_picks.js` (393 lines), router, sidebar nav, backend integration |
| 2026-05-08 | 8.5 | ✅ | **Already existed** — `paper_trades.js` (182 lines), P&L summary, win rate, trade list |
| 2026-05-08 | 8.6 | 🟡 | Search enhancement — Ctrl+K modal exists, bisa tambah filter sector/industry/mcap |
| 2026-05-08 | 8.6.1 | ✅ | Advanced search endpoint — filter params `sector`, `industry`, `mcap_min/max`, available sectors list in response |
| 2026-05-08 | 8.6.2 | ✅ | Filter chips UI — `#search-filter-chips` bar with sector buttons, active toggle, re-search on filter click |
| 2026-05-08 | 8.6.3 | ✅ | Search results already show sector + change% since previous implementation |
| 2026-05-08 | 8.7 | ✅ | Polish — lazy loading via `import()` already implemented. router.js brace fix. Production DB sync done. Fase 8 complete. |

---

*Plan ini akan diupdate setiap ada progres task.*
