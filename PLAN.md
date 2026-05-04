# Phase 1: AI Picks — Data Flow Change (DB-only) · Phase 2: UI/UX Enhancement · Phase 3: Stock Detail Pro

> **Model routing:** planning/reasoning → `deepseek-v4-pro` · coding/execution → `deepseek-v4-flash`

---

## Phase 3: Stock Detail Pro — AI Chat, Chart Pro, Rich Analytics

**Status:** PLANNED  
**Timeline:** 1 minggu (5-7 hari kerja)  
**Scope:** `/frontend/js/views/stock_detail.js`, `/frontend/style.css`, `/backend/routes/stock_detail.py`, `/backend/services/openrouter_llm.py`, `+ AI Chat backend endpoint`

---

### 🔍 Current State Assessment (Stock Detail)

```
┌─────────────────────────────────────────────────────┐
│ HERO: ticker + harga + change                        │
├──────────────────────┬──────────────────────────────┤
│ CHART (left, 1fr)    │ SIDEBAR (right, 390px)       │
│                      │                              │
│ [7D] [30D] [ALL]     │ Ringkasan Sesi (snapshot)     │
│                      │                              │
│ Level Suggestions    │ Ringkasan Teknikal + signal   │
│ [STOP] [ENTRY] [TGT] │ [RSI, MACD, SMA, Boll...]    │
│                      │                              │
│ LightweightCharts    │ Statistik Kunci (fundamental) │
│ candlestick + vol    │ [PE, PB, ROE, DER...]        │
│                      │                              │
│ Decision Panel       │ ACTION BAR                   │
│ [AKUMULASI BERTAHAP] │ [Tambah Watchlist] [Alert]    │
│                      │ [Jalankan Pemindai]           │
│                      │                              │
│ AI CHAT PLACEHOLDER  │                              │
│ (static, not funct.) │                              │
│ sample prompts tiles │                              │
│ [Tanya AI...] input  │                              │
└──────────────────────┴──────────────────────────────┘
```

### Key Gaps & Issues

| # | Issue | Severity |
|---|-------|----------|
| 1 | **AI Chat hanya placeholder** — input tidak fungsional, tidak ada API endpoint chat | 🔴 Critical |
| 2 | **Catalyst Strip tidak dirender** — fungsi `renderCatalystStrip()` ada tapi tidak dipanggil + DOM mount `#catalyst-strip` tidak ada di template | 🟡 Medium |
| 3 | **Chart hanya candlestick + volume** — tidak ada SMA/EMA overlay, tidak ada Bollinger Bands, tidak ada support/resistance lines | 🟡 Medium |
| 4 | **Tidak ada tab navigasi** — semua panel datar, user harus scroll panjang | 🟡 Medium |
| 5 | **Tidak ada peer comparison** — user tidak bisa bandingkan dengan saham sektor sama | 🟠 Low |
| 6 | **Alert system masih dummy** — `btn-set-alert` cuma `showToast` placeholder | 🟠 Low |
| 7 | **Tidak ada broker activity** — padahal model `BrokerSummary` ada di database | 🟠 Low |
| 8 | **Decision panel terlalu sederhana** — hanya 1 rekomendasi statis | 🟡 Medium |
| 9 | **Loading state per-section tidak granular** — semua dimuat bersamaan, lambat terasa | 🟠 Low |
| 10 | **Mobile layout cramped** — side stack terlalu panjang di HP | 🟡 Medium |
| 11 | **Back button tidak kontekstual** — selalu ke dashboard, harusnya ke halaman asal | 🟢 Done (AI Picks context) |
| 12 | **Tidak ada corporate actions** — dividends, stock splits, rights issue | 🟠 Low |
| 13 | **Chart timeframe terlalu sedikit** — hanya 7D/30D/ALL, tidak ada 1D/3D/90D | 🟠 Low |

---

### 🎯 Target End State

```
┌──────────────────────────────────────────────────────────────┐
│ HERO: [← back] BBCA · IDX EKUITAS · DB          Rp 9.800 +2.1% │
│ Bank Central Asia Tbk · update 2026-05-04 15:30              │
│ [1D] [3D] [7D] [30D] [90D] [ALL]                             │
├──────────────────────┬───────────────────────────────────────┤
│ CHART PRO (left)     │ TAB NAV: [Analisis] [AI Chat] [Berita] │
│                      │                                       │
│ Candlestick + Vol    │ ┌─ TAB: Analisis ──────────────────┐  │
│ + SMA 20/50 overlay  │ │ Snapshot Sesi (compact cards)     │  │
│ + Bollinger Bands    │ │ Teknikal (expandable groups)      │  │
│ + Support/Resistance │ │ Fundamental (key stats)           │  │
│   horizontal lines   │ │ Decision Panel (richer)           │  │
│ + Level annotations  │ │ Catalyst Strip (connected!)       │  │
│                      │ │ Broker Activity (if available)    │  │
│                      │ │ Corporate Actions (if available)  │  │
│                      │ └──────────────────────────────────┘  │
│                      │                                       │
│                      │ ┌─ TAB: AI Chat ───────────────────┐  │
│                      │ │ Chat UI dengan history            │  │
│                      │ │ Streaming response (SSE)          │  │
│                      │ │ Quick prompts:                    │  │
│                      │ │ - Analisis teknikal BBCA?         │  │
│                      │ │ - Support resistance?             │  │
│                      │ │ - Bandingkan dengan BMRI?         │  │
│                      │ │ - Berita terbaru?                 │  │
│                      │ │ - Rekomendasi entry?              │  │
│                      │ └──────────────────────────────────┘  │
│                      │                                       │
│                      │ ┌─ TAB: Berita & Katalis ──────────┐  │
│                      │ │ News feed terkait ticker           │  │
│                      │ │ Announcements IDX                  │  │
│                      │ │ Sentiment analysis (jika LLM on)   │  │
│                      │ └──────────────────────────────────┘  │
│                      │                                       │
│                      │ ACTION BAR (sticky bottom)            │
│                      │ [Tambah Watchlist] [Atur Alert]       │
│                      │ [Bandingkan] [Bagikan]                │
└──────────────────────┴───────────────────────────────────────┘
```

### Feature Breakdown

| Feature | Deskripsi | Prioritas | Estimasi |
|---------|-----------|-----------|----------|
| **AI Chat** | Chat fungsional dengan LLM via SSE, context-aware (ticker, chart, technical) | P0 | 2 hari |
| **Catalyst Strip Fix** | Wire `renderCatalystStrip()` + perbaiki DOM mount | P0 | 0.5 hari |
| **Chart Indicators Overlay** | SMA 20/50, Bollinger Bands, S/R lines di LightweightCharts | P1 | 1 hari |
| **Tab Navigation** | Analisis / AI Chat / Berita tabs di sidebar kanan | P1 | 0.5 hari |
| **Decision Panel V2** | Richer decision: confluences, risk matrix, multi-timeframe | P1 | 0.5 hari |
| **Broker Activity** | Tampilkan broker summary dari DB (jika data ada) | P2 | 0.5 hari |
| **Corporate Actions** | Dividen, stock split, rights issue dari pengumuman IDX | P2 | 0.5 hari |
| **Alert System** | Basic alert setup (harga, indikator) — backend + UI | P2 | 0.5 hari |
| **Peer Comparison** | Mini-table saham sektor sama dengan metrik kunci | P3 | 0.5 hari |
| **Mobile UX Polish** | Tab jadi accordion, sticky action bar, chart full-width | P3 | 0.5 hari |
| **Loading States** | Skeleton per-section, progressive loading | P3 | 0.5 hari |

---

### 📁 Files Affected

| File | Change | Scope |
|------|--------|-------|
| `frontend/js/views/stock_detail.js` | **Rewrite mayor** | Tab system, AI Chat UI, chart indicators, catalyst wire, decision v2 |
| `frontend/style.css` | **Modify** | Tab styles, chat UI, broker cards, chart overlays, mobile polish |
| `backend/routes/stock_detail.py` | **Modify** | Add `/api/stocks/{ticker}/chat` SSE endpoint, broker data endpoint |
| `backend/services/openrouter_llm.py` | **Modify** | Add `build_stock_chat_llm_payload()` for chat context |
| `backend/routes/news.py` | **Modify** | Ensure `company-announcements` returns corporate actions |
| `backend/main.py` | **Modify** | Mount chat route, alert CRUD endpoints |
| `backend/database.py` | **Modify** | Add `Alert` model (jika belum ada) |
| `frontend/js/api.js` | **Modify** | Add `fetchStockChat()`, `fetchBrokerActivity()`, alert CRUD helpers |
| `frontend/js/router.js` | **No change** | Stock route sudah ada |
| `frontend/index.html` | **No change** | Shell tetap |

---

### 🧪 Test Plan (TDD)

#### Backend Tests

| # | Test | Assert |
|---|------|--------|
| T1 | `GET /api/stocks/{ticker}/broker-activity` | Return broker summary rows, source field |
| T2 | `GET /api/stocks/{ticker}/chat` via SSE | Stream chunks, final message, event types |
| T3 | `POST /api/alerts` | Create alert, validate fields |
| T4 | `GET /api/alerts` | List alerts for ticker |
| T5 | `DELETE /api/alerts/{id}` | Remove alert |
| T6 | `GET /api/stocks/{ticker}/corporate-actions` | Return dividends/splits/rights |

#### Frontend Static Tests

| # | Guard | Assert |
|---|-------|--------|
| T7 | Tab navigation hooks | `data-stock-tab`, `data-stock-tab-content` |
| T8 | AI Chat hooks | `stock-chat-container`, `stock-chat-input`, `stock-chat-messages` |
| T9 | Chart indicator toggle | `data-indicator-toggle`, SMA/Boll checkboxes |
| T10 | Catalyst strip rendered | `#catalyst-strip` exists in DOM, not empty |
| T11 | Decision panel v2 hooks | `decision-confluence`, `decision-risk-matrix` |
| T12 | Broker activity section | `broker-activity-panel` with data rows |
| T13 | Mobile tab accordion | `@media (max-width: 768px)` tab styles |
| T14 | No placeholder copy leaks | Ban `UI placeholder`, `Coming Soon` in stock detail |

---

### ⚙️ Execution Plan (per hari)

#### Hari 1: Foundation — Backend Chat + Catalyst Fix + Tab Shell

**Task 1.1** — Fix Catalyst Strip (wire existing function)
- Tambah `#catalyst-strip` mount di template HTML `stock_detail.js`
- Panggil `renderCatalystStrip(symbol, newsPayload, announcementsPayload)` di main render
- Test: browser QA — catalyst strip muncul setelah load

**Task 1.2** — Backend SSE Chat endpoint
- `backend/routes/stock_detail.py`: tambah `GET /api/stocks/{ticker}/chat?message=...`
- Panggil `build_stock_chat_llm_payload()` di `openrouter_llm.py`
- Context: ticker, technical summary, fundamental snapshot, recent news
- Return SSE stream: `data: {"chunk": "..."} ` → `data: {"done": true}`
- Test: curl endpoint

**Task 1.3** — Tab Shell UI
- Replace sidebar flat layout dengan tab system
- 3 tabs: Analisis, AI Chat, Berita
- Tab switching with event delegation
- CSS: `.stock-tabs`, `.stock-tab`, `.stock-tab-content`

**End Day 1**: Catalyst strip hidup, chat backend berfungsi, tab shell terpasang.

---

#### Hari 2: AI Chat Frontend + Context Integration

**Task 2.1** — AI Chat UI
- Chat container dengan message bubbles
- Input box + send button
- Loading state (typing indicator)
- SSE consumer (EventSource atau fetch stream)
- Quick prompt chips yang auto-fill input

**Task 2.2** — Chat Context Enrichment
- Backend `build_stock_chat_llm_payload()`:
  - Technical summary (RSI, MACD, trend, support/resistance)
  - Fundamental snapshot (PE, PB, ROE, DER)
  - Recent news headlines (max 3)
  - Scanner analysis score
  - Prompt: analis saham IDX yang menjawab dalam Bahasa Indonesia
- Frontend: kirim ticker + conversation history (last 5 messages)

**Task 2.3** — Integration Test
- Buka stock detail → tab AI Chat
- Kirim "Apa sinyal teknikal BBCA?"
- Verifikasi response streaming

**End Day 2**: AI Chat fully functional dengan context saham.

---

#### Hari 3: Chart Pro — Indicators Overlay

**Task 3.1** — SMA/EMA Overlay
- Tambah SMA 20 + SMA 50 sebagai line series di LightweightCharts
- Warna: SMA 20 = `#fbbf24` (amber), SMA 50 = `#6366f1` (indigo)
- Toggle checkbox di atas chart

**Task 3.2** — Bollinger Bands Overlay
- Tambah Upper + Middle + Lower bands
- Warna: semi-transparent `#6366f1` area
- Data dari `/api/stocks/{ticker}/chart-data` (backend sudah kirim SMA)

**Task 3.3** — Support/Resistance Lines
- Horizontal line di level S/R dari technical endpoint
- Dashed style, label di kanan
- Update saat ganti timeframe

**Task 3.4** — Chart Toolbar
- Compact toolbar di atas chart: [SMA] [Bollinger] [S/R] [Volume]
- Toggle on/off tanpa reload chart
- Simpan preferensi di localStorage

**End Day 3**: Chart profesional dengan multi-indicator overlay.

---

#### Hari 4: Decision Panel V2 + Broker Activity

**Task 4.1** — Decision Panel Redesign
- Confluence section: berapa indikator yang align (bullish/bearish)
- Risk matrix kecil: risk/reward visual
- Multi-timeframe mini: 7D, 30D trend summary
- Action recommendation dengan confidence level
- Compact, tidak overwhelming

**Task 4.2** — Broker Activity Panel
- Backend: `GET /api/stocks/{ticker}/broker-activity`
- Query `broker_summary` table by ticker, last 5 days
- Tampilkan: broker name, buy/sell volume, net
- Frontend: mini table dengan warna buy/sell

**Task 4.3** — Corporate Actions
- Backend: filter `company-announcements` untuk corporate actions
- Tampilkan: dividend date, amount, stock split ratio
- Mini cards di tab Analisis

**End Day 4**: Decision panel kaya, broker activity + corporate actions hadir.

---

#### Hari 5: Alert System + Peer Comparison

**Task 5.1** — Alert Backend
- Model `Alert`: id, ticker, condition (price_above/price_below/rsi_above/rsi_below), value, active
- CRUD endpoints: `GET/POST/DELETE /api/alerts`
- Simpan di SQLite

**Task 5.2** — Alert UI
- Modal/drawer untuk atur alert
- List alert aktif untuk ticker ini
- Toggle on/off, delete
- Integrasi dengan `btn-set-alert`

**Task 5.3** — Peer Comparison
- Backend: `GET /api/stocks/{ticker}/peers` → return saham sektor sama
- Frontend: mini comparison table (ticker, price, change%, PE, market cap)
- Klik navigasi ke stock detail peer

**End Day 5**: Alert system + peer comparison.

---

#### Hari 6: Mobile Polish + Progressive Loading + Final Integration

**Task 6.1** — Mobile Layout Optimization
- Chart full-width di mobile
- Sidebar tabs jadi vertical accordion
- Sticky action bar di bottom mobile
- Touch-friendly tab buttons
- Font size adjustment untuk mobile

**Task 6.2** — Progressive Loading
- Skeleton loader per-section (chart, technical, fundamental)
- Render section by section as data arrives
- Prioritaskan chart + price dulu, baru detail

**Task 6.3** — Tab State Persistence
- Ingat tab terakhir yang dibuka per ticker (sessionStorage)
- Saat navigasi balik, buka tab yang sama

**Task 6.4** — Cross-route Context Polish
- AI Picks → Stock Detail context banner (already done, verify)
- Screener → Stock Detail context (add `entry`, `target`, `stop` dari scanner)

**End Day 6**: Polish complete, mobile UX halus.

---

#### Hari 7: Testing, QA, Deploy, Documentation

**Task 7.1** — Full Test Suite
- Backend: pytest all tests
- Frontend: static guards, compile check
- Browser QA: semua route, tab switching, mobile emulation

**Task 7.2** — Performance Check
- Chart render time
- AI Chat latency
- Bundle size check (pastikan tidak ada regresi)

**Task 7.3** — Deploy & Verify
- Sync ke `/opt/swingaq/`
- Restart backend
- Verify live domain

**Task 7.4** — Update PLAN.md + Commit
- Mark all tasks done
- Final commit & push

**End Day 7**: Phase 3 complete, deployed, documented.

---

### 🧱 Layout Spec Detail

#### Tab: Analisis (default)

```
┌─────────────────────────────────────────┐
│ Ringkasan Sesi · 2026-05-04 15:30       │
│ ┌──────┬──────┬──────┬──────┐           │
│ │ Open │ H/L  │ Prev │ Vol  │           │
│ │9.750 │9.9K/ │9.700 │1.2M  │           │
│ │      │9.650 │      │      │           │
│ └──────┴──────┴──────┴──────┘           │
├─────────────────────────────────────────┤
│ Teknikal                        [−]     │
│ Sinyal: BULLISH · Keyakinan 72/100      │
│ RSI 58 · MACD bullish · SMA20 ↑         │
│ [expand untuk detail indikator]         │
├─────────────────────────────────────────┤
│ Fundamental · data 2025-Q4     [−]      │
│ P/E 14.2x · P/B 2.1x · ROE 18.4%       │
│ DER 1.2 · Revenue Rp 28.5T              │
├─────────────────────────────────────────┤
│ Decision Panel                          │
│ ┌─────────────────────────────────┐     │
│ │ Confluence: 4/5 indikator BUY   │     │
│ │ Risk/Reward: 1:2.4x             │     │
│ │ Multi-TF: 7D↑ 30D↑ 90D→         │     │
│ │ Action: AKUMULASI BERTAHAP       │     │
│ │ Entry 9.700 · Stop 9.450 · TP 10.200│  │
│ └─────────────────────────────────┘     │
├─────────────────────────────────────────┤
│ Katalis Terbaru                         │
│ ┌─────────────────────────────────┐     │
│ │ BBCA bagikan dividen Rp 230     │     │
│ │ 2j lalu · idx_announcement      │     │
│ └─────────────────────────────────┘     │
├─────────────────────────────────────────┤
│ Broker Activity (5 hari)                │
│ Broker       Buy      Sell     Net      │
│ Mandiri      5.2M     3.1M     +2.1M    │
│ UBS          2.8M     4.5M     -1.7M    │
│ ...                                     │
├─────────────────────────────────────────┤
│ [Tambah Watchlist] [Atur Alert]         │
│ [Bandingkan]                            │
└─────────────────────────────────────────┘
```

#### Tab: AI Chat

```
┌─────────────────────────────────────────┐
│ Asisten AI · BBCA                       │
│ Konteks: teknikal + fundamental + berita│
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────┐     │
│ │ 🧑 Apa sinyal teknikal BBCA?    │     │
│ └─────────────────────────────────┘     │
│ ┌─────────────────────────────────┐     │
│ │ 🤖 BBCA menunjukkan sinyal      │     │
│ │ BULLISH dengan keyakinan 72%.   │     │
│ │ RSI di 58 (netral-kuat), MACD   │     │
│ │ baru saja golden cross di TF    │     │
│ │ daily. Harga di atas SMA 20     │     │
│ │ dan SMA 50, mengkonfirmasi      │     │
│ │ uptrend jangka pendek...        │     │
│ └─────────────────────────────────┘     │
├─────────────────────────────────────────┤
│ Quick Prompts:                          │
│ [Support resistance?] [Entry plan?]     │
│ [Bandingkan BMRI] [Berita terbaru?]     │
├─────────────────────────────────────────┤
│ [___________________________] [Kirim]   │
└─────────────────────────────────────────┘
```

#### Tab: Berita & Katalis

```
┌─────────────────────────────────────────┐
│ Berita Terkait · BBCA                   │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────┐     │
│ │ BBCA Bagikan Dividen Rp 230     │     │
│ │ idx_announcement · 2026-05-03   │     │
│ │ [Buka Sumber]                   │     │
│ └─────────────────────────────────┘     │
│ ┌─────────────────────────────────┐     │
│ │ Bank Central Asia Bukukan Laba  │     │
│ │ Bersih Rp 14.2T di Q1 2026     │     │
│ │ rss · 2026-05-02               │     │
│ │ [Buka Sumber]                   │     │
│ └─────────────────────────────────┘     │
│ ...                                     │
├─────────────────────────────────────────┤
│ Pengumuman IDX                          │
│ ┌─────────────────────────────────┐     │
│ │ Laporan Keuangan Q1 2026        │     │
│ │ idx_announcement · 2026-04-28   │     │
│ └─────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

---

### ⚠️ Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| LightweightCharts multi-series performance | Chart lambat dengan 5+ overlay | Batasi max 3 overlay aktif, gunakan `setData()` minimal |
| SSE chat timeout / rate limit OpenRouter | Chat gagal / lambat | Timeout 15s, graceful error message, retry button |
| `broker_summary` table kosong | Panel kosong | Fallback: "Data broker belum tersedia" dengan honest source |
| `company-announcements` endpoint lambat | Tab Berita loading lama | Cache response, load async setelah tab diklik |
| Tab state lost on navigation | User frustasi | Simpan activeTab di sessionStorage per ticker |
| Mobile chart terlalu kecil | User tidak bisa baca chart | Full-width chart, horizontal scroll untuk indicator panel |
| LLM context terlalu besar | Token limit exceeded | Batasi context: max 3 news, summary technical, no raw OHLCV |
| Multiple SSE connections | Memory/connection leak | Tutup SSE stream saat ganti tab/ticker, max 1 active |

---

### 🔗 Dependencies

| Task | Depends On |
|------|-----------|
| AI Chat UI (2.1) | Chat Backend (1.2) |
| Chart Indicators (3.1-3.4) | Chart data endpoint (already exists) |
| Chat Context (2.2) | Technical + Fundamental + News endpoints (all exist) |
| Broker Activity (4.2) | `broker_summary` table (already exists, may be empty) |
| Corporate Actions (4.3) | `company-announcements` endpoint (exists) |
| Alert System (5.1-5.2) | None (new) |
| Peer Comparison (5.3) | `stocks` table + sector data |
| Mobile Polish (6.1) | All UI tasks above |

---

### Progress Log

#### 2026-05-04 — Phase 3 Plan Authoring
- [x] Audit existing stock detail code (frontend + backend)
- [x] Identify 13 gaps/issues
- [x] Design target layout & feature list
- [x] Write execution plan (7 hari, 25+ tasks)
- [x] **Hari 1**: Foundation — chat backend + catalyst fix + tab shell
- [x] **Hari 2**: AI Chat frontend + context integration
- [x] **Hari 3**: Chart Pro — indicators overlay
- [x] **Hari 4**: Decision Panel V2 + Broker Activity
- [x] **Hari 5**: Alert System + Peer Comparison
- [x] **Hari 6**: Mobile Polish + Progressive Loading
- [x] **Hari 7**: Testing, QA, Deploy, Commit

### Detail Perubahan

| Task | Files Changed | Status |
|------|---------------|--------|
| T1.1 — Catalyst strip fix | `stock_detail.js` | ✅ |
| T1.2 — Chat SSE backend + `build_stock_chat_llm_payload` | `stock_detail.py`, `openrouter_llm.py` | ✅ |
| T1.3 — Tab shell UI + CSS | `stock_detail.js`, `style.css` | ✅ |
| T2.1 — Chat UI (messages, input, quick prompts) | `stock_detail.js` | ✅ |
| T3.1-3.4 — Chart overlays (SMA, Bollinger, S/R, toolbar) | `stock_detail.js`, `style.css` | ✅ |
| T4.1 — Decision Panel V2 (confluence, multi-TF, RR bar) | `stock_detail.js`, `style.css` | ✅ |
| T4.2 — Broker Activity endpoint + frontend | `stock_detail.py`, `stock_detail.js` | ✅ |
| T5.1 — Alert model + CRUD | `database.py`, `stock_detail.py` | ✅ |
| T5.2 — Alert modal UI + list | `stock_detail.js`, `style.css` | ✅ |
| T5.3 — Peer Comparison endpoint + frontend | `stock_detail.py`, `stock_detail.js` | ✅ |
| T6 — Mobile polish (sticky action bar, touch tabs) | `style.css` | ✅ |
| T7 — Compile check, test, deploy, cache-bust, commit | All files | ✅ |

### Files Modified (Phase 3)

| File | Changes |
|------|---------|
| `frontend/js/views/stock_detail.js` | **Major rewrite**: tab system, AI Chat, chart overlays, decision V2, broker, alerts, peers, catalyst fix |
| `frontend/style.css` | Tab styles, chat UI, chart toolbar, decision panel, alert modal, mobile polish |
| `backend/routes/stock_detail.py` | Chat endpoint, broker activity, alert CRUD, peer comparison |
| `backend/services/openrouter_llm.py` | Added `build_stock_chat_llm_payload()` |
| `backend/database.py` | Added `Alert` model |
| `frontend/js/router.js` | Cache-bust bump |
| `PLAN.md` | This progress log |

---

## Phase 4: UI/UX Pro — TradingView Chart, Layout Rebalance, News Redesign, Loading States, General Polish

> **Model routing:** planning/reasoning → `deepseek-v4-pro` · coding/execution → `deepseek-v4-flash`

**Status:** PLANNED  
**Timeline:** 3-4 hari  
**Goal:** Menyelesaikan 7 isu feedback user dari Phase 3

---

### 🔍 Issue Breakdown

| # | Issue | Root Cause | Severity |
|---|-------|------------|----------|
| **1** | Topbar stock running tidak loop/hilang di mobile | CSS `@media(max-width:1100px) .topbar-ticker-wrap{display:none}` + duplikasi animasi | 🟡 Medium |
| **2** | Detail stock: kiri bawah kosong, kanan terlalu panjang | Layout imbalance: chart area cuma chart+decision, sidebar overloaded | 🟡 Medium |
| **3** | Berita: tanpa gambar, UI jelek, tanpa berita terkait | RSS feed tanpa `image_url`, tidak ada filter related news | 🟡 Medium |
| **4** | Loading state di detail stock tidak ada | Hanya teks "Memuat...", tanpa skeleton animation | 🟡 Medium |
| **5** | Chart jelek | LightweightCharts basic, perlu TradingView widget | 🔴 High |
| **6** | AI Chat pakai model salah | Runtime setting `openrouter_stock_analysis_model` pakai `nvidia/...` bukan `google/gemma...` | 🟠 Low |
| **7** | UI/UX jelek di semua fitur | Kurangnya konsistensi spacing, typography, card shadows | 🟡 Medium |

---

### 🎯 Target Perbaikan

#### Issue 1 — Topbar Running Ticker
- **Fix animation**: Hapus duplikasi `scroll-ticker` + `ticker-scroll`, pakai satu animasi `ticker-scroll 36s linear infinite` pada `.tape-row`
- **Mobile visible**: Ubah `display:none` jadi `overflow-x:auto` dengan scroll horizontal + touch drag
- **Wrap content**: Pastikan stock items duplicate untuk infinite scroll effect

**Files:**
- `frontend/style.css`: Fix `topbar-ticker-wrap` display di breakpoint mobile
- `frontend/js/main.js`: Fix init running ticker (pastikan duplikasi array jalan)

#### Issue 2 — Detail Stock Layout Rebalance
- **Pindah content**: Pindahkan **Fundamental** dan **Catalyst Strip** ke kiri bawah (di bawah decision panel)
- **Grid ratio**: Ubah dari `1fr 390px` jadi `1.2fr 1fr` biar lebih proporsional
- **Collapsible sections**: Teknikal jadi collapsible <details> di sidebar
- **Hapus spacing waste**: Hapus `decision-panel-gap` + `section-gap-large` yang kosong

**Files:**
- `frontend/js/views/stock_detail.js`: Restructure template, pindah fundamental+catalyst ke chart column
- `frontend/style.css`: Adjust grid ratios, collapsible styles

#### Issue 3 — News Page Redesign
- **Related news**: Filter berita by sector/category dari data yang ada
- **Images**: Fallback image generator dari ticker/name (gradient with text)
- **Card redesign**: Compact cards dengan source badge, relative time, kategori
- **Featured**: First story gets featured hero treatment

**Files:**
- `frontend/js/views/news.js`: Rewrite render with images, related, categories
- `frontend/style.css`: New card styles, featured hero, image fallback
- `backend/routes/news.py`: Add category/related endpoint jika perlu

#### Issue 4 — Loading States
- **Skeleton loader**: CSS skeleton shimmer animation
- **Per-section loading**: Chart skeleton, technical skeleton, fundamental skeleton
- **Progressive render**: Data yang cepat (detail) render dulu, yang lambat (analysis) belakangan

**Files:**
- `frontend/style.css`: Skeleton animation keyframes + classes
- `frontend/js/views/stock_detail.js`: Skeleton HTML template, progressive loading

#### Issue 5 — TradingView Chart
- **TradingView Widget**: Embed TradingView's free Advanced Chart Widget
- **Fallback**: LightweightCharts tetap sebagai fallback jika TradingView gagal load
- **Custom toolbar**: Timeframe switcher + indicator toggle tetap dari kita

**Implementation options:**
1. **TradingView Charting Library** (free for embedded use, requires `charting_library` folder)
2. **TradingView Widget** (simpler embed, less features)
3. **Enhanced LightweightCharts** with more features

**Recommended**: Opsi 2 — TradingView Widget via `<script>` tag (free, instant, no hosting needed)

**Files:**
- `frontend/index.html`: Add TradingView script
- `frontend/js/views/stock_detail.js`: Render TradingView widget or fallback
- `frontend/style.css`: TradingView container styles

#### Issue 6 — AI Chat Model Fix
- Update DB setting: `openrouter_stock_analysis_model` → `google/gemma-4-26b-a4b-it`

**Files:**
- Via API: `PUT /api/settings`

#### Issue 7 — General UI/UX Polish
- **Consistent spacing**: Card padding, gap uniformity
- **Better typography**: Font sizing hierarchy
- **Card shadows/glows**: Subtle glow pada panel aktif
- **Loading micro-interactions**: Smooth fade-in, staggered reveal
- **Empty states**: Better empty state design with icons
- **Button consistency**: All buttons same height, border-radius, font

**Files:**
- `frontend/style.css`: Design token refinement, utility classes
- All view files: Consistent class usage

---

### ⚙️ Execution Plan

| Hari | Fokus | Task |
|------|-------|------|
| **1** | Chart + Topbar | (1) Embed TradingView widget, (2) Fix running ticker CSS + mobile, (3) Update AI Chat model |
| **2** | Layout + Loading | (4) Rebalance stock detail layout, (5) Add skeleton loading states |
| **3** | News + Polish | (6) Redesign news page with images + related, (7) General UI/UX pass |
| **4** | QA + Deploy | Full test, browser verify, sync, commit, push |

---

### 📁 Files Affected (Phase 4)

| File | Change | Scope |
|------|--------|-------|
| `frontend/js/views/stock_detail.js` | **Modify** | Layout rebalance, skeleton, TradingView embed, collapsible |
| `frontend/style.css` | **Modify** | Ticker fix, skeleton, TradingView, card polish, mobile |
| `frontend/js/views/news.js` | **Modify** | Images, related news, card redesign, categories |
| `frontend/js/main.js` | **Minor** | Running ticker init fix |
| `frontend/index.html` | **Minor** | TradingView widget script (if needed) |
| `backend/routes/news.py` | **Minor** | Category/related endpoint (optional) |
| `backend/routes/stock_detail.py` | **No change** | All endpoints already exist |
| `frontend/js/api.js` | **No change** | Existing fetch helpers sufficient |

---

### Progress Log

#### 2026-05-04 — Phase 4 Planning
- [x] **Hari 1**: TradingView chart + topbar fix + model update
- [x] **Issue 6**: AI Chat model → `google/gemma-4-26b-a4b-it` ✅
- [x] **Issue 5**: TradingView widget embed di stock detail ✅ (fallback LightweightCharts)
- [x] **Issue 1**: Topbar running ticker — konsolidasi CSS animation, mobile scroll ✅
- [x] **Issue 2**: Layout rebalance — fundamental+catalyst pindah ke kiri, hapus gap waste ✅
- [ ] **Hari 2**: Skeleton loading states
- [ ] **Hari 3**: News redesign + general UI/UX
- [ ] **Hari 4**: QA, deploy, commit
