# RetailBijak Frontend — Comprehensive Codebase Audit

**Audit Date:** 2026-05-10  
**Project:** RetailBijak — IDX Stock Intelligence Platform  
**Location:** `/home/rich27/retailbijak/frontend/`  
**Total Assets:** 46 files | **CSS:** ~247KB (minified) | **JS Views:** ~11.7KB–103KB each  

---

## 1. Architecture Overview

### Shell (index.html — 191 lines)
- **Layout:** Topbar + Sidebar (desktop) + Bottom Nav (mobile) + `<main id="app-root">`
- **PWA:** Manifest, service worker (`sw.js`), install banner, offline page
- **Overlays:** Global search (Cmd+K), keyboard shortcuts, mobile "More" drawer
- **Topbar features:** IHSG ticker, market status (live/closed/countdown), running ticker tape, theme/lang toggle, search trigger, settings link
- **Sidebar:** 18 nav items with Lucide icons + badge notifications for signals/alerts
- **Bottom Nav:** 5 items (Dashboard, Screener, Portfolio, Settings, More) for mobile
- **Critical CSS inlined:** ~19KB of keyframe animations and CSS custom properties for instant first paint
- **Deferred loading:** Full `style.css` loaded via `<link rel="preload">` with noscript fallback
- **CDN deps:** lightweight-charts (v5.2), lucide (v1.14) — both deferred
- **i18n:** Indonesian primary, English secondary — toggled via topbar button

### Router (router.js — 210 lines)
- Hash-based SPA routing with lazy dynamic imports per route
- 23 registered views with route meta (title, description for SEO/OG)
- View caching via `viewCache` object
- Route normalization (handles `-` to `_` mapping, sub-routes like `#stock/BBCA`)
- Page transition: fade out (`.page-loading`) → render → fade in
- 3-second safety timeout to prevent stuck blank screens
- Specific route handling: `portfolio`+`watchlist`, `sector`+`sector/:id`, `stock/:ticker`, `chart/:ticker`, `screener`
- Error boundary per-route with reload button

### API Layer (api.js — 352 lines)
- Unified `apiFetch()` with 8s timeout, AbortController, error toast
- ~20 typed API wrappers: news, fundamental, technical, analysis, chart-data, market-summary, IHSG-chart, sector-summary, stock-detail, search, top-movers, market-breadth, scan, settings, watchlist CRUD, portfolio CRUD, ai-picks
- SSE URL builder for scanner live feed
- Toast notification system v2: rate-limited (1.5s), dedup, max 3 visible, pause-on-hover, auto-dismiss with progress bar
- SEO meta tag management (`setPageMeta()`)
- TradingView widget loader for symbol profile widget
- TV theme sync (MutationObserver on `data-theme`)
- `API_BASE = '/api'` (relative, proxy-friendly)

### Theme Engine (theme.js — 47 lines)
- 3 themes: `dark` (default), `light`, `amoled`
- Theme rotation on toggle button click
- Language toggle: ID ↔ EN with `i18n.js`

### Main Entry (main.js — 1190 lines)
- Global error boundary (`window.onerror` + `unhandledrejection`)
- Animation engine: IntersectionObserver stagger-reveal, number animation (`animateValue`)
- View timer lifecycle management (cleanup intervals/timeouts on navigation)
- Running tape ticker with horizontal scroll
- Market status polling: IHSG price, market open/closed, countdown to next session
- Global search overlay: debounced stock search with keyboard nav + sector filter chips
- Data freshness indicator: colored dot + "Last updated" text
- Pull-to-refresh mechanism for mobile
- PWA install banner handler
- Keyboard shortcuts: `?` (help), `/` (search), `g+d` (dashboard), `g+s` (screener), `g+p` (portfolio), `Esc` (close modal)
- Scroll-to-top floating button
- Auto-refresh timer system per view

### Internationalization (i18n.js — 771 lines)
- ID ↔ EN translation maps for navigation, sidebar, topbar, market status, buttons
- Comprehensive coverage across all views

### Utilities (3 files):
- **format.js** (56 lines): `nf()`, `pct()`, `pf()`, `money()`, `fmtRp()`, `fmt()`, `renderMarkdown()` — id-ID locale, no deps
- **export.js** (34 lines): CSV export with BOM for Excel, Excel-safe quoting
- **storage.js** (15 lines): Safe sessionStorage wrapper (try-catch for private browsing)

### Service Worker (sw.js — 139 lines)
- Cache-first for static assets, network-first for API
- Precaches core assets (CSS, JS, logo)
- Offline fallback page

### Versioning (version.js — 4 lines)
- Single cache-bust version token: `RBK_VERSION = '20260510'`

---

## 2. Design System (style.css + style.critical.css)

### Design System Stats
| Metric | Value |
|---|---|
| Total CSS size | ~247KB (minified) |
| Critical CSS | ~129KB (split out) |
| CSS class count | ~441 |
| CSS custom properties | ~50+ |
| Keyframe animations | ~25 |
| Theme variants | 3 (dark, light, AMOLED-like mobile dark) |
| Breakpoints | Responsive (mobile 767px, tablet 1023px) |

### Design Tokens (CSS Custom Properties)
- **Colors:** `--bg-base`, `--bg-panel`, `--bg-elevated`, `--bg-mobile-surface`, `--primary-color` (emerald), `--accent-indigo`, `--up-color`/`--down-color`/`--warn-color` with corresponding backgrounds
- **Typography:** Inter (sans), JetBrains Mono (mono) — loaded from Google Fonts
- **Spacing:** `--gap-md`, `--gap-sm`, `--header-h`, `--sidebar-w`, `--bottom-nav-h`
- **Radii:** `--radius-sm` (6px), `--radius-md` (12px), `--radius-lg` (18px)
- **Elevation:** Panel backgrounds with transparency (glassmorphism)
- **Light theme:** Complete overrides via `[data-theme=light]` selectors (~70+ rules)
- **Mobile dark:** Even darker `--bg-base: #020305` on mobile

### Animation System
- Skeleton shimmer, view fade-in, modal enter/exit, toast slide-in, pulse-ring, flash-up/down for price changes, stagger-fade-in, tape-scroll, ticker-scroll, loading spinner, dot pulse
- Touch feedback: `.btn:active`, `.nav-item:active`, `.scanner-row:active` with `transform: scale(0.97)`

### Component Library
- Buttons: `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-icon`, `.btn-sm`, `.btn-danger`
- Cards/panels: `.panel`, `.card`, `.glass-card`, `.market-card`, `.backtest-card`, `.paper-card`, `.index-card`, `.cmp-card`
- Forms: `.form-input`, `.form-select`, checkboxes, labels
- Badges: `.badge`, `.badge-up`, `.badge-down`, `.badge-news`, `.badge-corporate`, `.badge-warn`
- Skeleton loaders: `.skeleton`, `.skeleton-card`, `.skeleton-h-*`, `.skeleton-shimmer`
- Empty states: `.empty-state-v2`, `.empty-state-card`, `.market-empty`
- Modals: `.modal-overlay`, `.modal-backdrop`, `.modal-panel`, `.modal-btn`
- Tables/lists: `.scanner-row-grid`, `.breadth-row`, `.alerts-table`, `.triggered-table`
- Notifications: `.toast`, `.toast-success/error/warning/info`, `.toast-progress`
- Print styles: `.printing-report` hides nav, adjusts stock detail layout
- Tags/chips: `.pattern-chip`, `.perf-chip`, `.market-tag`, `.screener-chip`, `.sector-chip`
- Navigation: `.nav-item`, `.bottom-nav-item`, `.nav-badge`, `grp-tab`

### Layout System
- Flex utilities: `.flex`, `.flex-col`, `gap-*`, `items-center`, `justify-between`
- Grid: `.grid`, `.grid-cols-12`, `.col-span-*`, `.sector-detail-grid`, `.treemap-grid`, `.price-board-grid`
- Responsive: Mobile-first breakpoints at 767px and 1023px
- Sidebar: fixed 64px width, icon-only with tooltips
- Main content: offset for sidebar, max-width constrained
- Bottom nav: fixed at bottom, 64px height for mobile

---

## 3. View-by-View Analysis

### 3.1 Dashboard (`dashboard.js` — 955 lines)
**Route:** `#dashboard`
**Status:** ✅ **Polished**

| Feature | State |
|---|---|
| IHSG snapshot card (price, change, open/high/low) | ✅ Complete |
| Market bias indicator (bullish/bearish/neutral) | ✅ Complete |
| Sector performance summary strip | ✅ Complete |
| Top gainers/losers preview | ✅ Complete |
| Market breadth widget (advance/decline) | ✅ Complete |
| AI Picks "Top Pick Today" card | ✅ Complete |
| News widget (latest market news) | ✅ Complete |
| Calendar widget (today's events) | ✅ Complete |
| IHSG mini-chart (lightweight-charts) | ✅ Complete |
| Refresh button, clear cache button, widget layout toggle | ✅ Complete |
| AI sentiment context for picks | ✅ Complete |
| Suggested watchlist presets (6 tickers) | ✅ Complete |
| Global error handling with loading states | ✅ Complete |
| Skeleton loading states | ✅ Complete |
| **Gaps:** No user-configurable widget layout (toggle exists but layout not persisted), no draggable widget reordering, no multi-timeframe IHSG chart (only monthly)

---

### 3.2 Screener (`screener.js` — 1384 lines)
**Route:** `#screener`
**Status:** ✅ **Polished**

| Feature | State |
|---|---|
| Timeframe selector (1d, 5d, 1m, 3m, 6m, 1y, max) | ✅ Complete |
| "Jalankan Pemindaian" scan trigger | ✅ Complete |
| Live SSE streaming scan results | ✅ Complete |
| SVG sparkline per row | ✅ Complete |
| Multi-column sort (ticker, close, RSI, CCI, MA, volume, perf) | ✅ Complete |
| Pattern mode toggle (candlestick patterns) | ✅ Complete |
| Performance columns toggle (1W, 1M, 3M, 6M) | ✅ Complete |
| Responsive column visibility (mobile hide/show perf) | ✅ Complete |
| Empty state with guidance | ✅ Complete |
| Skeleton loading states | ✅ Complete |
| Clickable rows → stock detail page | ✅ Complete |
| **Gaps:** No saved scan presets, no custom filter builder (only predefined timeframes), no watchlist integration in scan results, no export for scan results

---

### 3.3 Stock Detail (`stock_detail.js` — 1700 lines)
**Route:** `#stock/:ticker`
**Status:** ✅ **Most Feature-Rich View**

| Feature | State |
|---|---|
| Price board (open/high/low/prev close/volume/value/52W) | ✅ Complete |
| TradingView symbol profile widget | ✅ Complete |
| Lightweight chart with timeframe toggle | ✅ Complete |
| Candlestick pattern chips (auto-detected) | ✅ Complete |
| Performance chips (1W, 1M, 3M, 6M, 1Y returns) | ✅ Complete |
| Technical indicators panel (RSI, MACD, CCI, MA, Stochastic) | ✅ Complete |
| Support/resistance levels with visualization | ✅ Complete |
| AI analysis panel (triggered manually, streaming) | ✅ Complete |
| Fundamental data grid (PE, PBV, EPS, market cap, etc.) | ✅ Complete |
| Market stats + snapshot panel | ✅ Complete |
| Broker activity table | ✅ Complete |
| Order book depth visualization | ✅ Complete |
| Foreign flow history chart | ✅ Complete |
| Peer comparison table | ✅ Complete |
| News feed for ticker + company announcements | ✅ Complete |
| Catalyst strip (ranked news/announcements) | ✅ Complete |
| AI Pick context banner (navigated from AI Picks) | ✅ Complete |
| Watchlist add/remove | ✅ Complete |
| Trade plan section | ✅ Complete |
| Notes section | ✅ Complete |
| "Ask AI" chat toggle | ✅ Complete |
| Full-screen chart link | ✅ Complete |
| Decision panel (entry/stop/target levels) | ✅ Complete |
| Fallback candle generation for popular tickers | ✅ Complete |
| **Gaps:** No fundamental time-series charts (e.g., PE history), no analyst ratings aggregation, no interactive depth visualization (currently static table), no corporate actions timeline for the specific ticker

---

### 3.4 Portfolio (`portfolio.js` — 1334 lines)
**Route:** `#portfolio` / `#watchlist`
**Status:** ✅ **Polished**

| Feature | State |
|---|---|
| Portfolio tab — add/edit/delete positions | ✅ Complete |
| Watchlist tab — add/delete tickers, watchlist groups | ✅ Complete |
| Group management (create/rename/delete groups) | ✅ Complete |
| News tab for watchlist | ✅ Complete |
| P&L calculation (cost basis vs current price) | ✅ Complete |
| Shared modal system (form builder pattern) | ✅ Complete |
| Confirm dialog | ✅ Complete |
| Focus trap in modals | ✅ Complete |
| CSV export | ✅ Complete |
| Skeleton loading | ✅ Complete |
| **Gaps:** No portfolio performance chart (equity curve), no dividend tracking, no transaction history log, no import from broker, no portfolio rebalancing suggestions

---

### 3.5 Market Overview (`market.js` — 483 lines)
**Route:** `#market`
**Status:** ✅ **Polished**

| Feature | State |
|---|---|
| Market summary cards (IHSG, change, volume, frequency) | ✅ Complete |
| Breadth summary (advance/decline ratio) | ✅ Complete |
| Top gainers table | ✅ Complete |
| Top losers table | ✅ Complete |
| Most active by volume | ✅ Complete |
| Sector performance mini-cards | ✅ Complete |
| Corporate actions feed | ✅ Complete |
| Company announcements feed | ✅ Complete |
| Foreign trading data | ✅ Complete |
| Broker activity summary | ✅ Complete |
| Data freshness indicator per panel | ✅ Complete |
| Rich empty states with refresh CTAs | ✅ Complete |
| **Gaps:** No foreign flow net-buy/sell leaders, no market sentiment index, no comparative sector performance chart, no market summary sentence (narrative)

---

### 3.6 Sector View (`sector.js` — 758 lines)
**Route:** `#sector` / `#sector/:id`
**Status:** 🟡 **Good with gaps**

| Feature | State |
|---|---|
| Sector performance carousel/chips | ✅ Complete |
| Sector detail page with industry accordion | ✅ Complete |
| Stock list per sector with performance indicators | ✅ Complete |
| AI sector rotation analysis button | ✅ Complete |
| Refresh button | ✅ Complete |
| **Gaps:** No multi-sector comparison chart, no sector rotation visualization (just button), no sector ETF data, no historical sector performance trends

---

### 3.7 News (`news.js` — 445 lines)
**Route:** `#news`
**Status:** 🟡 **Good with gaps**

| Feature | State |
|---|---|
| News feed with category filter (market, dividend, earnings, corporate, analyst) | ✅ Complete |
| Fallback gradient thumbnails | ✅ Complete |
| Relative time display | ✅ Complete |
| News cache (sessionStorage) | ✅ Complete |
| Source badges | ✅ Complete |
| Click to open external link | ✅ Complete |
| **Gaps:** No news search, no bookmark/save articles, no inline article reading (external links only), no sentiment indicator per article, no AI summary of news

---

### 3.8 Signal Overview (`signal_overview.js` — 174 lines)
**Route:** `#signal_overview`
**Status:** 🟡 **Functional but sparse**

| Feature | State |
|---|---|
| Filter buttons: All, BUY, SELL | ✅ Complete |
| Summary cards (total signals, buy/sell counts) | ✅ Complete |
| Sortable signal table (date, direction, ticker) | ✅ Complete |
| Pagination | ✅ Complete |
| Refresh button | ✅ Complete |
| **Gaps:** No signal detail drill-down, no signal strength/confidence indicator, no signal history chart, no custom date range, no export, no watchlist signal filtering

---

### 3.9 Alerts (`alerts.js` — 182 lines)
**Route:** `#alerts`
**Status:** 🔴 **Bare Minimum**

| Feature | State |
|---|---|
| Skeleton loading state | ✅ Complete |
| "Alert Baru" create button | ✅ Present (UI only) |
| Skeleton for content area | ✅ Complete |
| **Gaps:** ❌ No alert CRUD implemented (only skeleton), no alert creation form rendering, no alert list rendering, no alert deletion, no triggered alerts list, no edit functionality — **This is essentially a placeholder page with no working features.**

---

### 3.10 Breadth (`breadth.js` — 249 lines)
**Route:** `#breadth`
**Status:** 🟡 **Functional but sparse**

| Feature | State |
|---|---|
| Summary cards (advancing, declining, unchanged, ratio) | ✅ Complete |
| Breadth history table with visual bars | ✅ Complete |
| Cumulative breadth line | ✅ Complete |
| CSV export button | ✅ Present |
| Refresh button | ✅ Present |
| Loading spinner | ✅ Complete |
| **Gaps:** No advance-decline line chart (text table only), no sector breadth breakdown, no moving averages on breadth, no interactive date range, no comparison to IHSG overlay

---

### 3.11 Calendar (`calendar.js` — 322 lines)
**Route:** `#calendar`
**Status:** 🟡 **Good basic implementation**

| Feature | State |
|---|---|
| Month grid with day numbers | ✅ Complete |
| Event badges on days (dividend, earnings, corporate) | ✅ Complete |
| Date-specific event list on selection | ✅ Complete |
| Filter by event type | ✅ Complete |
| Month navigation (prev/next) | ✅ Complete |
| i18n: Indonesian month/day names | ✅ Complete |
| Export to calendar link option | ❌ Missing |
| **Gaps:** No year-at-a-glance, no event detail modal (just list), no iCal/ICS export, no calendar sync, no price impact data around events

---

### 3.12 Treemap (`treemap.js` — 307 lines)
**Route:** `#treemap`
**Status:** 🟡 **Good CSS but simple rendering**

| Feature | State |
|---|---|
| CSS Grid-based treemap layout | ✅ Complete |
| Sector color-coding by performance | ✅ Complete |
| 8-level intensity color scale (4 up, 4 down) | ✅ Complete |
| Legend with color swatches | ✅ Complete |
| Staggered animation on load | ✅ Complete |
| Clickable stocks → stock detail | ✅ Complete |
| **Gaps:** No true treemap algorithm (CSS grid approximation), no zoom, no sector expand/collapse, no performance period toggle, no market cap weighting visualization, no tooltip on hover

---

### 3.13 Indices (`indices.js` — 177 lines)
**Route:** `#indices`
**Status:** 🟡 **Functional but sparse**

| Feature | State |
|---|---|
| Index selection tabs (LQ45, IDX30, KOMPAS100, IDX80, IDXESGL) | ✅ Complete |
| Index metadata (colors, icons, descriptions) | ✅ Complete |
| Constituent list with performance data | ✅ Complete |
| Skeleton loading cards | ✅ Complete |
| **Gaps:** No index performance chart, no index comparison overlay, no weight visualization (pie/bar), no rebalancing calendar, no screening by index membership

---

### 3.14 Corporate Actions (`corporate.js` — 159 lines)
**Route:** `#corporate`
**Status:** 🟡 **Functional but sparse**

| Feature | State |
|---|---|
| Tab filtering (All, IPO, Dividend, Corporate, IPO Calendar, Rights) | ✅ Complete |
| Card-based layout for action items | ✅ Complete |
| Skeleton loading state | ✅ Complete |
| **Gaps:** No dividend calendar with ex-date/cum-date, no IPO timeline/prospectus links, no stock split history, no rights issue subscription timeline, no corporate action calendar integration

---

### 3.15 Backtest (`backtest.js` — 227 lines)
**Route:** `#backtest`
**Status:** 🔴 **Bare Minimum**

| Feature | State |
|---|---|
| Ticker input field | ✅ Present |
| Strategy selector (SMA Crossover, RSI Reversal, Bollinger Breakout) | ✅ Present |
| Run backtest button | ✅ Present |
| Results area container | ✅ Present (empty) |
| **Gaps:** ❌ No actual backtest logic runs (frontend-only), no results rendering (equity curve, Sharpe ratio, drawdown), no parameter customization (SMA periods, RSI thresholds), no date range selector, no benchmark comparison — **Essentially a form with no working backend integration.**

---

### 3.16 Paper Trades (`paper_trades.js` — 182 lines)
**Route:** `#paper_trades`
**Status:** 🔴 **Bare Minimum**

| Feature | State |
|---|---|
| "Open Position" form (ticker, type, quantity, price) | ✅ Present |
| Position list container | ✅ Present |
| Summary placeholder | ✅ Present |
| **Gaps:** ❌ No position list rendering, no P&L calculation, no close position functionality, no portfolio summary (total value, return, cash balance), no trade history log — **Form shell with no working backend integration.**

---

### 3.17 Movers (`movers.js` — 330 lines)
**Route:** `#movers`
**Status:** 🟡 **Good but limited**

| Feature | State |
|---|---|
| Tabs: Gainers, Losers, Most Active | ✅ Complete |
| Multi-timeframe performance columns (1W, 1M, 3M, 6M) | ✅ Complete |
| Sortable columns | ✅ Complete |
| Merge logic (Most Active = gainers + losers deduped) | ✅ Complete |
| **Gaps:** No timeframe toggle, no market cap filter, no sector filter, no price range filter, no export

---

### 3.18 Compare (`compare.js` — 326 lines)
**Route:** `#compare`
**Status:** 🟡 **Functional but limited**

| Feature | State |
|---|---|
| Add/remove up to 5 tickers to compare | ✅ Complete |
| Persist comparison list in sessionStorage | ✅ Complete |
| Lightweight-charts overlay chart | ✅ Complete |
| Comparison table (price, change, volume, etc.) | ✅ Complete |
| CSV export of comparison data | ✅ Complete |
| Shared "Add to Compare" from other views | ✅ Complete (via `addToCompare()` export) |
| **Gaps:** No normalized performance chart (rebased to 100), no correlation matrix, no fundamental comparison, no radar/spider chart for multi-metric comparison

---

### 3.19 Full Chart (`chart.js` — 391 lines)
**Route:** `#chart/:ticker`
**Status:** 🟡 **Good but limited**

| Feature | State |
|---|---|
| Full-screen chart with lightweight-charts | ✅ Complete |
| Timeframe selector (1D, 5D, 1M, 3M, 6M, 1Y, MAX) | ✅ Complete |
| Drawing tools: trendline, horizontal line | ✅ Present |
| Drawing mode toggle | ✅ Present |
| Volume series | ✅ Present |
| Back button | ✅ Present |
| **Gaps:** No annotation/persistence of drawings, no Fibonacci/ellipse/rectangle tools, no indicator overlay (SMA, EMA, Bollinger), no chart screenshot/export, no crosshair price tracking, no save chart layout

---

### 3.20 AI Picks (`ai_picks.js` — 393 lines)
**Route:** `#ai-picks`
**Status:** 🟡 **Good but limited**

| Feature | State |
|---|---|
| Mode selector (momentum, swing, growth, defensive, contrarian) | ✅ Complete |
| AI pick cards with score, confidence, reason labels | ✅ Complete |
| Market context narrative | ✅ Complete |
| "Telaah lebih dalam" → stock detail with context | ✅ Complete |
| Mode cache (in-memory, prevents re-fetch on tab switch) | ✅ Complete |
| **Gaps:** No historical AI picks log, no backtest of AI pick performance, no export/share picks, no comparison between modes, no confidence/accuracy tracking

---

### 3.21 Settings (`settings.js` — 266 lines)
**Route:** `#settings`
**Status:** 🟡 **Functional but limited**

| Feature | State |
|---|---|
| UI theme toggle | ✅ Complete |
| Compact table rows toggle | ✅ Complete |
| Auto-refresh screener toggle | ✅ Complete |
| Scanning timeframe default | ✅ Complete |
| Perf columns default state | ✅ Complete |
| OpenRouter API key input (masked) | ✅ Complete |
| LLM model selector (stock analysis + AI picks models) | ✅ Complete |
| OpenRouter site URL config | ✅ Complete |
| OpenRouter app name config | ✅ Complete |
| Save settings → API | ✅ Complete |
| **Gaps:** No data management (clear cache, export all data), no notification preferences, no language selector (tied to topbar only), no account/profile management, no API connection status indicator

---

### 3.22 Help (`help.js` — 190 lines)
**Route:** `#help`
**Status:** 🟡 **Static content only**

| Feature | State |
|---|---|
| Quick start guide steps | ✅ Static HTML |
| FAQ accordion items | ✅ Static HTML |
| Keyboard shortcuts reference | ✅ Static HTML |
| Search bar for help content | ✅ Present (client-side filter) |
| Link to Settings | ✅ Complete |
| **Gaps:** ❌ Search filter not connected to actual content filtering (uses static count), no contextual help per view, no video/animated guides, no feedback form, no version/changelog display

---

## 4. Quality Assessment Summary

### Polished Views (Full Feature Set)
| View | Lines | Score |
|---|---|---|
| Stock Detail | 1700 | ★★★★★ |
| Dashboard | 955 | ★★★★☆ |
| Screener | 1384 | ★★★★☆ |
| Portfolio | 1334 | ★★★★☆ |
| Market Overview | 483 | ★★★★☆ |
| Compare | 326 | ★★★★☆ |

### Functional but Gappy Views
| View | Lines | Score |
|---|---|---|
| Sector | 758 | ★★★☆☆ |
| News | 445 | ★★★☆☆ |
| Calendar | 322 | ★★★☆☆ |
| Treemap | 307 | ★★★☆☆ |
| AI Picks | 393 | ★★★☆☆ |
| Movers | 330 | ★★★☆☆ |
| Full Chart | 391 | ★★★☆☆ |
| Settings | 266 | ★★★☆☆ |
| Signal Overview | 174 | ★★☆☆☆ |
| Breadth | 249 | ★★☆☆☆ |
| Indices | 177 | ★★☆☆☆ |
| Corporate | 159 | ★★☆☆☆ |
| Help | 190 | ★★☆☆☆ |

### Bare Minimum / Placeholder Views
| View | Lines | Score |
|---|---|---|
| Alerts | 182 | ★☆☆☆☆ (non-functional) |
| Backtest | 227 | ★☆☆☆☆ (non-functional form) |
| Paper Trades | 182 | ★☆☆☆☆ (non-functional form) |

---

## 5. Cross-Cutting Gaps & Improvements

### Critical Gaps
1. **Alerts page is non-functional** — skeleton only, no CRUD rendering
2. **Backtest has no backend integration** — form with no results
3. **Paper Trading has no backend integration** — form shell only
4. **Help search is non-functional** — static count, no actual filtering

### Feature Gaps
1. **No user authentication/login** — all data is device-local or API-provisioned
2. **No real-time WebSocket** — uses polling and SSE for scanner; price updates are request-based
3. **No notification system** (push) — PWA install exists but no push notification support
4. **No data export** (except CSV on select views) — no PDF report, no JSON export
5. **No mobile app wrapper** — PWA only
6. **No dark-mode-only AMOLED optimizations** beyond CSS color tokens

### UI/UX Improvements
1. **No drag-and-drop widget customization** (Dashboard widget toggle exists but doesn't persist)
2. **No toast for offline status** (network status bar exists but minimal)
3. **Limited keyboard navigation** — only basic shortcuts exist
4. **No bulk actions** (e.g., delete multiple watchlist items)
5. **Filter/search states not persisted** in sessionStorage/URL params
6. **No context-sensitive onboarding** — only static Help page
7. **No loading skeletons on initial app load** (only per-view)
8. **No image/media** in news (text-only cards)
9. **No market holiday calendar** in Calendar view
10. **No portfolio performance over time** (only current P&L snapshot)

### Technical Debt
1. **CSS is minified with minimal line breaks** — hard to maintain, no source maps
2. **No TypeScript** — vanilla JS throughout (~13K lines total)
3. **No unit tests** found
4. **No build step** — ESM imports with `?v=20260510` cache-busting in browser, no bundler
5. **Duplicate i18n key definitions** (i18n_new_keys.js and i18n_new_keys_id.js suggest incomplete migration)
6. **Hardcoded fallback data** in stock_detail (5 popular tickers) and API wrappers
7. **No error boundary in individual views** — only global `window.onerror`
8. **No lazy loading for images** — site logo only
9. **style.critical.css has ~129KB** — too large for true critical CSS (should be <10KB)

---

## 6. File Size Overview

```
File                               Lines    Size
─────────────────────────────────────────────────
js/views/stock_detail.js           1,700   103KB  ★ Most complex view
js/views/screener.js               1,384    63KB  ★ Scanner with live SSE
js/views/portfolio.js              1,334    70KB  ★ Portfolio + Watchlist
js/main.js                         1,190    50KB  ★ Entry point (error boundary, search, ticker)
js/views/dashboard.js                955    55KB  ★ Main dashboard
js/views/sector.js                   758    37KB  ★ Sector performance
style.css (minified)                 750   248KB  ★ Design system
style.critical.css                 1,290   129KB  ★ Critical CSS (too large)
js/views/market.js                   483    34KB  Market overview
js/views/news.js                     445    24KB  News feed
js/views/ai_picks.js                 393    18KB  AI recommendations
js/views/chart.js                    391    15KB  Full-screen chart
js/api.js                            352    13KB  API wrappers + toast system
js/views/movers.js                   330    14KB  Gainers/Losers
js/views/compare.js                  326    15KB  Stock comparison
js/views/calendar.js                 322    13KB  Market calendar
js/views/treemap.js                  307    13KB  Market treemap
js/views/settings.js                 266    13KB  Settings page
js/views/breadth.js                  249    11KB  Market breadth
js/views/backtest.js                 227    12KB  Backtest (placeholder)
js/router.js                         210    12KB  SPA router
index.html                           191    30KB  SPA shell
js/views/help.js                     190    11KB  Help page (static)
js/views/alerts.js                   182     9KB  Alerts (placeholder)
js/views/paper_trades.js             182     9KB  Paper trading (placeholder)
js/views/indices.js                  177     9KB  IDX indices
js/views/signal_overview.js          174    10KB  Signal overview
js/views/corporate.js                159     7KB  Corporate actions
sw.js                                139     4KB  Service worker
js/i18n.js                           771    29KB  Internationalization
─────────────────────────────────────────────────
Total                              ~13,674   ~800KB
```

---

## 7. Recommendations by Priority

### P0 — Must Fix
1. **Implement Alerts CRUD** — the page is fully skeleton with no working features
2. **Connect Backtest to backend** — or add proper frontend simulation engine
3. **Connect Paper Trading to backend** — or implement local P&L calculation
4. **Fix Help search** — connect the search input to actual client-side filtering

### P1 — Should Improve
5. **Reduce critical CSS** — 129KB defeats the purpose; inline only above-fold styles
6. **Add source maps** for CSS and JS to ease debugging
7. **Implement chart drawing persistence** (localStorage at minimum)
8. **Add portfolio equity curve** — aggregated P&L over time
9. **Complete signal overview** with detail drill-down and chart history
10. **Add news article inline reading** (or summary view)

### P2 — Nice to Have
11. **Treemap with real squarify algorithm** — CSS grid is a reasonable approximation but suboptimal
12. **Multi-language improvements** — merge i18n keys, remove duplicate files
13. **Drag-and-drop dashboard widgets**
14. **Keyboard shortcut cheat sheet in-app** (already in shortcuts modal, good start)
15. **Market holiday calendar** integration
16. **Portfolio CSV/PDF export** with P&L summary
17. **Sector rotation visualization** (chart, not just AI button)
18. **Push notifications** for alerts and market events
