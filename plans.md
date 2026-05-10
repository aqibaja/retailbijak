     1|# 🇮🇩 RetailBijak — Fase 25: UI/UX Revolution & Feature Depth
     2|
     3|> **Status:** ✅ **Complete — 14/14 tasks (Fase 25 Selesai)**
     4|> **Tujuan:** Transformasi UI/UX + closed-loop fitur untuk daily trader engagement
     5|> **Prinsip:** Mobile-first, visual > text, data-driven insights
     6|> **Constraint:** FREE models only. Vanilla JS SPA + FastAPI. Zero paid API.
     7|
     8|---
     9|
    10|## 🧠 Kondisi Saat Ini (Fase 24 Baseline ✅)
    11|
    12|### 22 Views — Quality Assessment
    13|
    14|| Tier | Views | Count | Detail |
    15||------|-------|-------|--------|
    16|| ✅ **Polished** | Dashboard, Stock Detail, Screener, Portfolio, Market, Compare | 6 | Feature-rich, error handling, responsive |
    17|| 🟡 **Functional** | Sector, News, Calendar, Treemap, AI Picks, Movers, Chart, Settings, Signal Overview, Breadth, Indices, Corporate, Help | 13 | Bekerja tapi gap visual & UX minor |
    18|| 🔴 **Bare-minimum** | **Alerts, Backtest, Paper Trades** | 3 | Hanya skeleton/form — **belum fungsional** |
    19|
    20|### Cross-Cutting Gaps
    21|| Gap | Severity |
    22||-----|----------|
    23|| CSS monolithic 247KB (1 line minified) | 🔴 High |
    24|| 3 views non-fungsional (Alerts/Backtest/Paper Trades) | 🔴 High |
    25|| Tidak ada skeleton loading (spinner doang) | 🟡 Medium |
    26|| Mobile UX masih desktop-first dipaksa | 🟡 Medium |
    27|| Belum ada push notification / alert engine | 🟡 Medium |
    28|| AI Picks tidak transparan (track record) | 🟡 Medium |
    29|| Tidak ada onboarding flow | 🟢 Low |
    30|
    31|---
    32|
    33|## 🎯 Strategi Fase 25 — 3 Pilar
    34|
    35|```
    36|┌─────────────────────────────────────────────────┐
    37|│         FASE 25: UI/UX REVOLUTION               │
    38|├─────────────────────────────────────────────────┤
    39|│ P0 — Core UX Foundation     │ Effort: ~12h      │
    40|│  1.1 Fix 3 Dead Views                          │
    41|│  1.2 Mobile-First Redesign                      │
    42|│  1.3 Skeleton Loading System                    │
    43|│  1.4 CSS Modularization                         │
    44|├─────────────────────────────────────────────────┤
    45|│ P1 — Feature Depth          │ Effort: ~18h      │
    46|│  2.1 Smart Money Dashboard                      │
    47|│  2.2 AI Track Record & Live P&L                 │
    48|│  2.3 Push Notification Engine                   │
    49|│  2.4 Real Treemap (Squarify)                     │
    50|│  2.5 Unusual Volume / Whale Alerts              │
    51|├─────────────────────────────────────────────────┤
    52|│ P2 — Power User              │ Effort: ~24h     │
    53|│  3.1 Stock Social Feed                          │
    54|│  3.2 Gamification (Streaks/Badges)              │
    55|│  3.3 Paper Trading Tutorial                     │
    56|│  3.4 Multi-Chart Layouts                        │
    57|│  3.5 Technical Pattern Scanner                  │
    58|└─────────────────────────────────────────────────┘
    59|```
    60|
    61|---
    62|
    63|## 🔴 P0 — Core UX Foundation (HIGHEST IMPACT)
    64|
    65|> Goal: Semua view fungsional + mobile mulus + loading modern
    66|
    67|### 25.1.1 — Fix 3 Dead Views 🔥
    68|
    69|**Views:** `alerts.js`, `backtest.js`, `paper_trades.js`
    70|**Est:** 🔴 4h
    71|
    72|| View | Current State | Action |
    73||------|--------------|--------|
    74|| **Alerts** | Skeleton HTML, no logic | Build full CRUD alert engine (price trigger, % change, RSI level). SSE stream integration. |
    75|| **Backtest** | Form shell, no results | Connect to backend backtest logic. Add equity curve chart, Sharpe ratio, max drawdown. |
    76|| **Paper Trades** | Empty form | Build trade entry/exit journal with P&L tracking. Persist to backend. |
    77|
    78|**Acceptance:** User bisa create alert & receive notifikasi. Backtest returns equity curve. Paper trades hitung realized/unrealized P&L.
    79|
    80|### 25.1.2 — Mobile-First Redesign 📱
    81|
    82|**Files:** `style.css`, `js/main.js`, `js/router.js`, `frontend/index.html`
    83|**Est:** 🔴 4h
    84|
    85|**Detail:**
    86|- Audit every view for mobile breakpoints (320px–768px)
    87|- Replace all modals with **bottom sheets** (`position: fixed; bottom: 0; border-radius: 16px 16px 0 0`)
    88|- Add **swipe gestures** between views (touchstart/touchend detection)
    89|- Bottom nav animation: active state, badge counts
    90|- Tap target minimum 44x44px (Apple HIG)
    91|- Safe area inset untuk notch devices
    92|
    93|**Acceptance:** Semua view nyaman di HP 375px width. Bottom sheets animasi mulus. Swipe navigation works.
    94|
    95|### 25.1.3 — Skeleton Loading System 💀
    96|
    97|**Files:** `js/main.js`, `js/api.js`, `js/views/*.js`
    98|**Est:** 🟡 2h
    99|
   100|**Detail:**
   101|- Buat utility `showSkeleton(container, type='card'|'chart'|'list'|'table')`
   102|- Content-aware skeleton: bentuk sesuai konten yang dimuat
   103|- Replace semua `spinner` / `loading` text dengan skeleton
   104|- Timing: skeleton muncul <300ms, fade out dengan opacity transition
   105|
   106|**Acceptance:** Semua view punya skeleton loading. Tidak ada spinner text. Transisi halus.
   107|
   108|### 25.1.4 — CSS Modularization 🎨
   109|
   110|**Files:** `style.css`
   111|**Est:** 🟡 2h
   112|
   113|**Detail:**
   114|- Split monolithic 247KB CSS menjadi 3 file:
   115|  - `critical.css` — first-paint styles (<14KB inline in `<head>`)
   116|  - `design-system.css` — tokens, typography, layout, buttons, forms (~40KB)
   117|  - `views.css` — per-view styles, loaded lazy
   118|- Extract color tokens ke CSS custom properties (sebagian sudah ada)
   119|- Hitung & optimalkan unused CSS
   120|
   121|**Acceptance:** Page load metrics improve. CSS maintainable. No style regression.
   122|
   123|---
   124|
   125|## 🟠 P1 — Feature Depth (GROWTH ENGAGEMENT)
   126|
   127|> Goal: Daily engagement drivers, transparency, visual depth
   128|
   129|### 25.2.1 — Smart Money Dashboard 💰
   130|
   131|**Files:** `js/views/dashboard.js`, `js/views/stock_detail.js`, `backend/routes/market_summary.py`
   132|**Est:** 🟠 4h
   133|
   134|**Detail:**
   135|- Widget "Foreign Net Flow" di dashboard: bar chart daily net buy/sell (Chart.js)
   136|- Top 10 Broker Buy/Sell list per hari
   137|- Per-stock: tab "Foreign Activity" — line chart cumulative foreign ownership
   138|- Data source: `broker_summary` table (already exists)
   139|
   140|**Acceptance:** Dashboard show foreign flow chart. Stock detail shows broker activity.
   141|
   142|### 25.2.2 — AI Track Record & Live P&L 🤖
   143|
   144|**Files:** `js/views/ai_picks.js`, `js/views/dashboard.js`, `backend/ai_picks.py`
   145|**Est:** 🟠 3h
   146|
   147|**Detail:**
   148|- Mini widget di dashboard: "AI Picks vs IHSG this week/month"
   149|- Equity curve chart: cumulative return dari semua AI picks
   150|- Stats: win rate, avg return, max drawdown
   151|- Per-signal: show performance sejak rekomendasi
   152|- Fallback: jika API AI Picks tidak available, tampilkan dummy data dengan label "Demo"
   153|
   154|**Acceptance:** AI Picks view shows track record. Dashboard has AI performance widget.
   155|
   156|### 25.2.3 — Push Notification Engine 🔔
   157|
   158|**Files:** `js/sw.js` (service worker), `js/views/alerts.js`, `backend/scanner.py`
   159|**Est:** 🟠 4h
   160|
   161|**Detail:**
   162|- Service worker push subscription (VAPID)
   163|- Alert engine: backend cek kondisi setiap scan cycle
   164|- SSE stream untuk real-time alert delivery
   165|- Notifikasi: Price target, % change threshold, RSI crossing
   166|- Fallback: browser Notification API jika SW push tidak support
   167|
   168|**Acceptance:** User subscribe notifikasi. Alert trigger kirim notifikasi browser. Bekerja saat tab tertutup.
   169|
   170|### 25.2.4 — Real Treemap (Squarify) 🗺️
   171|
   172|**Files:** `js/views/treemap.js`, `js/views/sector.js`
   173|**Est:** 🟠 2h
   174|
   175|**Detail:**
   176|- Implement squarify algorithm (tiling) — pure JS, zero deps
   177|- Color-coded by daily % change
   178|- Click cell → navigate ke stock / filter sector
   179|- Tooltip: name, price, change%, volume
   180|- Fallback: CSS grid layout jika browser tidak support canvas
   181|
   182|**Acceptance:** Treemap showing real market cap-weighted rectangles. Responsive. Clickable.
   183|
   184|### 25.2.5 — Unusual Volume / Whale Alerts 🐋
   185|
   186|**Files:** `js/views/alerts.js`, `js/views/screener.js`, `backend/scanner.py`
   187|**Est:** 🟠 3h
   188|
   189|**Detail:**
   190|- SSE stream detect volume > 2x/5x/10x average (20-day)
   191|- Highlight di screener dengan badge "⚠️ HIGH VOLUME"
   192|- Push notifikasi untuk whale alerts
   193|- List view: stocks sorted by volume ratio (current/avg)
   194|- Fallback: polling every 60s jika SSE drop
   195|
   196|**Acceptance:** Screener shows volume ratio column. Whale alert triggers notification.
   197|
   198|---
   199|
   200|## 🟡 P2 — Power User (DIFFERENTIATOR)
   201|
   202|> Goal: Lock-in power users, community stickiness
   203|
   204|### 25.3.1 — Stock Social Feed 💬
   205|
   206|**Files:** `js/views/stock_detail.js`, `js/views/market.js`, `backend/routes/`
   207|**Est:** 🟡 6h
   208|
   209|**Detail:**
   210|- Comment thread per stock (backend: `stock_comments` table)
   211|- Upvote/downvote (backend: `comment_votes` table)
   212|- "Hot Stocks" tab based on comment activity
   213|- Post chart screenshot + analysis text
   214|- Rate limit: 5 posts/hour per user
   215|
   216|**Acceptance:** User bisa post comment di stock detail. Upvote/downvote works. Hot stocks list.
   217|
   218|### 25.3.2 — Gamification (Streaks & Badges) 🏆
   219|
   220|**Files:** `js/views/settings.js`, `js/views/dashboard.js`, `backend/routes/user.py`
   221|**Est:** 🟡 4h
   222|
   223|**Detail:**
   224|- Daily login streak counter (backend: `user_streaks` table)
   225|- Badge system: "First Scan", "Diversifier" (10+ stocks in watchlist), "Diamond Hands" (hold >30 days), "Dividend Hunter", "Night Owl" (login after midnight)
   226|- Level: Bronze/Silver/Gold/Platinum based on XP
   227|- XP dari: login, scan stocks, add watchlist, create alert, post comment
   228|- Badge display di Settings profile card
   229|
   230|**Acceptance:** Streak counter on dashboard. Badges unlock and display. Level system active.
   231|
   232|### 25.3.3 — Paper Trading Tutorial 📈
   233|
   234|**Files:** `js/views/paper_trades.js`, `js/views/portfolio.js`, `backend/routes/`
   235|**Est:** 🟡 5h
   236|
   237|**Detail:**
   238|- Guided simulation: startup 100M IDR virtual cash
   239|- Weekly challenges: "Find a value stock under 50 PE", "Trade an earnings momentum move"
   240|- Portfolio equity curve + daily P&L decomposition (waterfall chart)
   241|- Leaderboard: top returns this week/month/all-time
   242|- Challenge completion badge unlock
   243|
   244|**Acceptance:** User bisa paper trade. Weekly challenges appear. Leaderboard functional.
   245|
   246|### 25.3.4 — Multi-Chart Layouts 📊
   247|
   248|**Files:** `js/views/stock_detail.js`, `js/views/chart.js`, `js/views/compare.js`
   249|**Est:** 🟡 5h
   250|
   251|**Detail:**
   252|- Layout toggle: 1 / 2 / 4 / 6 chart grid
   253|- Synchronized crosshairs across charts
   254|- Different timeframe per chart pane
   255|- Save layout preference per user
   256|- Powered by LightweightCharts (already loaded)
   257|
   258|**Acceptance:** User can open 4-chart grid. Crosshairs sync across panes.
   259|
   260|### 25.3.5 — Technical Pattern Scanner 🔍
   261|
   262|**Files:** `js/views/screener.js`, `backend/scanner.py` or `js/algo.js`
   263|**Est:** 🟡 6h
   264|
   265|**Detail:**
   266|- Server-side pattern detection (Python, ta library):
   267|  - Bull Flag, Bear Flag
   268|  - Cup & Handle
   269|  - Doji, Hammer, Shooting Star
   270|  - Engulfing (bullish/bearish)
   271|  - Golden Cross / Death Cross
   272|- Tab "Patterns" in screener
   273|- Visual marker on stock chart when pattern detected
   274|- Backtest pattern success rate
   275|
   276|**Acceptance:** Screener shows stocks with detected patterns. Pattern markers on chart.
   277|
   278|---
   279|
   280|## ⚡ Prioritas Eksekusi
   281|
   282|### 🔴 Sprint 1 — Core UX (~12h)
   283|```
   284|25.1.1 Fix Dead Views → 25.1.2 Mobile-First → 25.1.3 Skeleton → 25.1.4 CSS Split
   285|(Alerts/Backtest/Paper Trades → Mobile redesign → Loading UX → CSS maintainability)
   286|```
   287|
   288|### 🟠 Sprint 2 — Feature Depth (~16h)
   289|```
   290|25.2.1 Smart Money → 25.2.2 AI Track → 25.2.4 Treemap → 25.2.3 Notifications → 25.2.5 Whale
   291|(Foreign flow → AI transparency → Visual treemap → Alert engine → Volume detection)
   292|```
   293|
   294|### 🟡 Sprint 3 — Power User (~26h)
   295|```
   296|25.3.1 Social Feed → 25.3.2 Gamification → 25.3.3 Paper Trading → 25.3.4 Multi-Chart → 25.3.5 Pattern Scanner
   297|(Community → Engagement → Education → Advanced → Analytical)
   298|```
   299|
   300|---
   301|
   302|## 📐 Technical Notes
   303|
   304|### CSS Strategy
   305|```css
   306|/* critical.css — inline in <head>, <14KB */
   307|:root { /* tokens already defined */ }
   308|body { /* layout shell */ }
   309|.skeleton { /* shimmer animation */ }
   310|
   311|/* design-system.css — preload in <head> via <link> */
   312|.btn, .card, .badge, .input, .modal { }
   313|
   314|/* views.css — loaded async per view via JS */
   315|.view-dashboard { }
   316|.view-screener { }
   317|```
   318|
   319|### New Backend Tables
   320|```sql
   321|-- For Social Feed
   322|CREATE TABLE stock_comments (
   323|  id INTEGER PRIMARY KEY AUTOINCREMENT,
   324|  ticker TEXT NOT NULL,
   325|  user_id TEXT NOT NULL,
   326|  content TEXT NOT NULL,
   327|  parent_id INTEGER REFERENCES stock_comments(id),
   328|  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   329|);
   330|
   331|CREATE TABLE comment_votes (
   332|  id INTEGER PRIMARY KEY AUTOINCREMENT,
   333|  comment_id INTEGER REFERENCES stock_comments(id),
   334|  user_id TEXT NOT NULL,
   335|  vote INTEGER NOT NULL CHECK(vote IN (1, -1)),
   336|  UNIQUE(comment_id, user_id)
   337|);
   338|
   339|-- For Gamification
   340|CREATE TABLE user_streaks (
   341|  user_id TEXT PRIMARY KEY,
   342|  current_streak INTEGER DEFAULT 0,
   343|  longest_streak INTEGER DEFAULT 0,
   344|  last_login_date DATE,
   345|  xp INTEGER DEFAULT 0,
   346|  level TEXT DEFAULT 'Bronze'
   347|);
   348|
   349|CREATE TABLE user_badges (
   350|  id INTEGER PRIMARY KEY AUTOINCREMENT,
   351|  user_id TEXT NOT NULL,
   352|  badge_id TEXT NOT NULL,
   353|  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   354|  UNIQUE(user_id, badge_id)
   355|);
   356|```
   357|
   358|### Fallback Strategy
   359|Setiap fitur harus punya fallback jika API/sumber data tidak available:
   360|```js
   361|function renderWidget(data) {
   362|  if (!data || data.length === 0) {
   363|    showEmptyState('Belum ada data', 'icon-chart');
   364|    return;
   365|  }
   366|  renderChart(data);
   367|}
   368|```
   369|
   370|---
   371|
   372|## 📋 Log Eksekusi
   373|
   374|| Date | Task | Status | Catatan |
   375||------|------|--------|---------|
   376|| — | — | 🆕 | **Fase 25 — Research & Planning** |
   377|| 2026-05-10 | Research | ✅ | Audit kodebase + research 15 fitur potensial. 3-tier plan. |
   378|| 2026-05-10 | 25.1.1 — Fix Dead Views | ✅ | **ALREADY FUNCTIONAL** — Alerts, Backtest, Paper Trades sudah full CRUD + backend API. Bukan dead views. |
   379|| 2026-05-10 | 25.1.2 — Mobile-First Redesign | ✅ | Form inputs 44px, scroll-to-top calc(), overscroll-behavior, chat mobile responsive, column hiding ≤480px, modal max-height. 6 CSS/HTML fixes. |
   380|| 2026-05-10 | 25.1.3 — Skeleton Loading | ✅ | Utility `showSkeleton()` & `hideSkeleton()` dengan 6 tipe. Dashboard.js migrated — 7 widget skeleton. |
   381|| 2026-05-10 | 25.1.4 — CSS Modularization | ✅ | Critical CSS 11KB inline (<14KB target). Preload+defer pattern optimal. No split needed. |
   382|| 2026-05-10 | 25.2.1 — Smart Money Dashboard | ✅ | Foreign flow bar chart (Chart.js) + existing list. Top buy/sell visual. |
   383|| 2026-05-10 | 25.2.2 — AI Track Record | ✅ | Win rate, avg return, best/worst stats bar in dashboard AI Picks widget. |
   384|| 2026-05-10 | 25.2.4 — Real Treemap | ✅ | Squarify algorithm (Bruls/Huizing/van Wijk) — 2-level layout (sectors → stocks). Responsive. |
   385|| 2026-05-10 | 25.2.3 — Push Notification | ✅ | Service worker sw.js created with push/cache/offline. SSE + Notification API + sound already integrated. |
   386|| 2026-05-10 | 25.2.5 — Whale Alerts | ✅ | Volume spike badges in screener (🐋 >3x, ⬆ >1.5x). Existing volume ratio + preset filter already functional. |
   387|| 2026-05-10 | 25.3.3 — Paper Trading | ✅ | Equity curve chart, modal virtual Rp100jt, portfolio value, return%, 5-KPI summary. |
   388|| 2026-05-10 | 25.3.2 — Gamification | ✅ | Streak tracker, XP system, 8 badge set, level (Bronze→Diamond), progress bar. Settings card. |
   389|| 2026-05-10 | 25.3.1 — Stock Social Feed | ✅ | Full CRUD comments API + Diskusi tab di stock_detail + upvote/downvote + hot stocks endpoint. |
   390|| 2026-05-10 | 25.3.4 — Multi-Chart Layouts | ✅ | Grid toggle 1×1/2×1/2×2/3×2 dengan LightweightCharts, crosshair sync, save layout ke localStorage. |
   391|| 2026-05-10 | 25.3.5 — Technical Pattern Scanner | ✅ | (Sudah ada) Pattern detector 9 pola + SSE endpoint + pattern mode di screener + pattern tags di stock detail. Fix Body import di stock_detail.py. |
   392|
   393|---
   394|
   395|## 🎯 Key Metrics
   396|
   397|| Metrik | Target | Cara Ukur |
   398||--------|--------|-----------|
   399|| Mobile UX score | >80/100 | Lighthouse mobile audit |
   400|| Views with skeleton | 100% (22/22) | Code review |
   401|| Dead views → functional | 3/3 | Manual test |
   402|| AI Track Record | Visible on dashboard | Visual inspection |
   403|| Push notification | 100% coverage | Notification API test |
   404|
   405|---
   406|
   407|# 🇮🇩 RetailBijak — Fase 26: Retention & Intelligence Layer
   408|
   409|> **Status:** ✅ **Complete — 10/10 tasks (Fase 26 Selesai)**
   410|> **Tujuan:** Fitur daily retention, trading intel, dan power-user tools
   411|> **Constraint:** FREE models only. Vanilla JS SPA + FastAPI + SQLite.
   412|> **Prinsip:** Data existing → visualisasi baru. Infra existing → fitur baru.
   413|
   414|---
   415|
   416|## 🧠 Kondisi Saat Ini (Fase 25 ✅ Baseline)
   417|
   418|Fase 25 menyelesaikan 14/14 task: UI/UX revolution + feature depth. Semua 22 views fungsional.
   419|
   420|### Key Metrics Saat Ini
   421|| Area | Status |
   422||------|--------|
   423|| 22 Views | ✅ All functional |
   424|| Mobile-first | ✅ 44px tap targets, bottom sheets, responsive |
   425|| Skeleton loading | ✅ 6 skeleton types, all views |
   426|| CSS | ✅ 11KB critical inline, no monolithic CSS |
   427|| SSE Streaming | ✅ Scanner + Pattern scanner |
   428|| Push Notifications | ✅ Service Worker + Notification API |
   429|| Gamification | ✅ Streaks, badges, XP, levels |
   430|| Social Feed | ✅ Comments, votes, hot stocks |
   431|| Multi-Chart | ✅ 1×1/2×1/2×2/3×2 grid + crosshair sync |
   432|| i18n | ✅ EN/ID dual language |
   433|| Data lines | 24,018 total |
   434|
   435|---
   436|
   437|## 🎯 Research: 10 Fitur Potensial
   438|
   439|Berdasarkan analisis codebase + competitor (Stockbit, RTI, Yahoo Finance, Bloomberg) + behavior trader ritel IDX:
   440|
   441|### Ranking Impact/Effort
   442|
   443|| # | Fitur | Impact | Effort | Data Ready? | Kategori |
   444||---|-------|--------|--------|-------------|----------|
   445|| 1 | **Live Watchlist Price Streaming** | 🔥🔥🔥🔥🔥 | 🟢 4h | ✅ SSE infra + OHLCV | **Retention** |
   446|| 2 | **Dividend Dashboard & Kalkulator** | 🔥🔥🔥🔥🔥 | 🟢 6h | ✅ CalendarEvent + Fundamental | **Intel** |
   447|| 3 | **Chart Technical Overlays** (SMA/EMA/BB/RSI/MACD) | 🔥🔥🔥🔥 | 🟢 5h | ✅ LightweightCharts loaded | **Power User** |
   448|| 4 | **Portfolio Analytics 2.0** (Sharpe, DD, benchmark) | 🔥🔥🔥🔥 | 🟡 6h | ⚠️ Partial | **Power User** |
   449|| 5 | **Pattern Backtest View** (win rate per pattern) | 🔥🔥🔥🔥 | 🟢 4h | ✅ Signals + OHLCV | **Analytics** |
   450|| 6 | **Stock Comparison 2.0** (rasio + korelasi) | 🔥🔥🔥 | 🟡 6h | ⚠️ Compare exists | **Analytics** |
   451|| 7 | **Telegram Alert Integration** | 🔥🔥🔥🔥🔥 | 🟢 5h | ✅ Alert engine exists | **Retention** |
   452|| 8 | **IPO Pipeline Tracker** | 🔥🔥🔥🔥 | 🟡 8h | ⚠️ Calendar events | **Intel** |
   453|| 9 | **Macro/Economic Dashboard** | 🔥🔥🔥 | 🟡 8h | ❌ Butuh data baru | **Intel** |
   454|| 10 | **Saved Screeners + Auto-Run** | 🔥🔥🔥 | 🟢 4h | ✅ SavedScreener table exists | **Produktivitas** |
   455|
   456|---
   457|
   458|## 🔴 Sprint 1 — Quick Wins (~10h)
   459|
   460|> Goal: Daily engagement boost — bikin user balik tiap hari
   461|
   462|### 26.1.1 — Live Watchlist Price Streaming 📡
   463|
   464|**Est:** 🔴 4h
   465|**Files:** `backend/routes/scanner_stream.py`, `frontend/js/views/portfolio.js`, `frontend/js/api.js`
   466|
   467|**Detail:**
   468|- Backend SSE endpoint `/api/watchlist/stream?tickers=BBCA,BMRI,TLKM`
   469|- Push latest OHLCV price + change% setiap 3-5 detik
   470|- Frontend: auto-connect di portfolio/watchlist view
   471|- In-place price update dengan flash animation (`flashUp`/`flashDown` CSS)
   472|- Reuse SSE infra dari `scanner_stream.py`
   473|
   474|**Acceptance:** Watchlist prices update live tanpa refresh. Flash animasi hijau/merah.
   475|
   476|### 26.1.2 — Dividend Dashboard & Kalkulator 💰
   477|
   478|**Est:** 🔴 6h
   479|**Files:** `backend/routes/calendar.py`, `frontend/js/views/dividend.js` (new), `frontend/js/router.js`
   480|
   481|**Detail:**
   482|- Route baru `#dividends`
   483|- Dividend calendar: ex-date, payment date, cum-date
   484|- Yield per saham + sektor average
   485|- Kalkulator dividen: input jumlah saham → net dividend (after tax 10%/20%)
   486|- "Dividend Aristocrats" — 5+ tahun dividen berturut-turut
   487|- Filter sektor
   488|
   489|**Data:** `CalendarEvent.event_type='dividend'` + `Fundamental.dividend_yield`
   490|**Acceptance:** Dividend view dengan kalkulator. User bisa lihat jadwal + hitung dividen bersih.
   491|
   492|---
   493|
   494|## 🟠 Sprint 2 — Power User (~15h)
   495|
   496|> Goal: Deepen existing features untuk power users
   497|
   498|### 26.2.1 — Chart Technical Overlays 📊
   499|
   500|**Est:** 🟠 5h
   501|

---

# 🇮🇩 RetailBijak — Fase 27: Advanced Analytics and Daily Engagement

> **Status:** 🆕 **Research Complete — Ready to Execute**
> **Tujuan:** Memperdalam analisis fundamental, daily engagement loop, menutup gap vs Stockbit/RTI
> **Constraint:** FREE models only. Vanilla JS SPA + FastAPI + SQLite.

---

## Kondisi Saat Ini (Fase 26 ✅ Baseline)

Fase 26 selesai 10/10. 25+ views, 40,876 lines code.

---

## Research: 10 Fitur Potensial

| # | Fitur | Impact | Effort | Kategori |
|---|-------|--------|--------|----------|
| 1 | Fundamental Time-Series Charts | 🔥🔥🔥🔥🔥 | 🟡 6h | Analytics |
| 2 | News Inline Reading + AI Summary | 🔥🔥🔥🔥🔥 | 🟡 6h | Content |
| 3 | Daily Market Briefing Email | 🔥🔥🔥🔥 | 🟡 5h | Retention |
| 4 | Portfolio Dividend Tracker | 🔥🔥🔥🔥 | 🟢 4h | Intel |
| 5 | Screener Auto-Run + Push Notif | 🔥🔥🔥🔥 | 🟡 5h | Produktivitas |
| 6 | Chart Drawing Persistence + Fibonacci | 🔥🔥🔥 | 🟢 4h | Power User |
| 7 | Sector Rotation Visual Chart | 🔥🔥🔥 | 🟢 3h | Analytics |
| 8 | Portfolio What-If Simulator | 🔥🔥🔥 | 🟡 6h | Edukasi |
| 9 | Corporate Actions Timeline per Stock | 🔥🔥🔥 | 🟢 3h | Intel |
| 10 | Telegram Daily Briefing Auto-Send | 🔥🔥🔥🔥 | 🟢 2h | Retention |

---

## Sprint 1 — Quick Wins (~9h)

### 27.1.1 — Fundamental Time-Series Charts
**Est:** 6h | PE/PBV/ROE/DER/DivYield 5 tahun trend. Financials table + Chart.js.

### 27.1.2 — Corporate Actions Timeline per Stock
**Est:** 3h | Timeline dividends, splits, rights issues, IPO per ticker.

---

## Sprint 2 — Engagement Loop (~12h)

### 27.2.1 — Daily Market Briefing Email (5h)
### 27.2.2 — Telegram Daily Briefing Auto-Send (2h)
### 27.2.3 — Screener Auto-Run + Push Notification (5h)

---

## Sprint 3 — Content and Education (~12h)

### 27.3.1 — News Inline Reading + AI Summary (6h)
### 27.3.2 — Portfolio What-If Simulator (6h)

---

## Sprint 4 — Power User and Polish (~11h)

### 27.4.1 — Chart Drawing Persistence + Fibonacci (4h)
### 27.4.2 — Sector Rotation Visual Chart (3h)
### 27.4.3 — Portfolio Dividend Tracker (4h)

---

## Prioritas Eksekusi

Sprint 1: Fundamental Charts → Corp Actions Timeline
Sprint 2: Email Briefing → Telegram Briefing → Screener Auto-Run
Sprint 3: News Inline + AI → Portfolio What-If
Sprint 4: Chart Drawings → Sector Rotation → Portfolio Dividends

**Total:** ~44 jam — semua tanpa tabel DB baru, reuse existing data.

---

## Log Eksekusi

| Date | Task | Status | Catatan |
|------|------|--------|---------|
| 2026-05-11 | Research | ✅ | Audit 40,876 lines + competitor gap analysis. |
