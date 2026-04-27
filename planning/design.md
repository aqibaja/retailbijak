Build a complete, production-grade stock market analysis and trading dashboard web application 
frontend. This is a data-dense, professional fintech web app — not a landing page. 
Design must feel like a premium, institutional-grade trading terminal with clean aesthetics.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESIGN PHILOSOPHY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Style: Clean, minimalist, Swiss-grid-inspired, professional fintech dashboard.
Feel: Calm, data-focused, high-trust, fast-scannable for active traders.
Avoid: Purple/blue neon gradients, glowing orbs, gradient buttons, decorative background 
blobs, icon-in-colored-circle patterns, symmetrical 3-column feature grids, 
oversized hero typography, generic AI-template aesthetics, colored side borders on cards.
Reference: Linear, Vercel, Robinhood Web, Bloomberg Terminal (modernized), TradingView.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESIGN TOKENS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

--- LIGHT MODE ---
--color-bg:               #F5FAF6        /* soft green-white base */
--color-surface:          #FFFFFF        /* card, panel */
--color-surface-2:        #EFF7F1        /* nested surface */
--color-surface-offset:   #E4F0E7        /* subtle offset */
--color-surface-dynamic:  #D8EBDc        /* hover surfaces */
--color-divider:          #D0E5D4
--color-border:           #C4DCCA

--color-text:             #111C15        /* primary text */
--color-text-muted:       #526158        /* secondary text */
--color-text-faint:       #A0B5A5        /* placeholder, tertiary */
--color-text-inverse:     #F5FAF6

--color-primary:          #0F7B43        /* emerald green CTA */
--color-primary-hover:    #0A6136
--color-primary-active:   #074D2C
--color-primary-highlight:#C8E6D3

--color-success:          #18A058        /* bullish / gain */
--color-success-bg:       #E4F5EC
--color-danger:           #C53030        /* bearish / loss */
--color-danger-bg:        #FDEAEA
--color-warning:          #B45309
--color-warning-bg:       #FEF3C7

--radius-sm: 4px
--radius-md: 8px
--radius-lg: 12px
--radius-xl: 16px
--radius-full: 9999px

--shadow-sm: 0 1px 3px rgba(10,40,20,0.06)
--shadow-md: 0 4px 12px rgba(10,40,20,0.08)
--shadow-lg: 0 12px 32px rgba(10,40,20,0.12)

--font-body: 'Inter', 'Geist', system-ui, sans-serif
--font-mono: 'JetBrains Mono', 'Fira Code', monospace  /* for prices, tickers */

--- DARK MODE ---
--color-bg:               #0C1410
--color-surface:          #121A16
--color-surface-2:        #18231D
--color-surface-offset:   #1C2920
--color-surface-dynamic:  #243028
--color-divider:          #1E2B22
--color-border:           #28392D

--color-text:             #E8F5EC
--color-text-muted:       #7FA888
--color-text-faint:       #4A6B52
--color-text-inverse:     #0C1410

--color-primary:          #2ECC71
--color-primary-hover:    #27AE60
--color-primary-active:   #1E8449
--color-primary-highlight:#1B3A24

--color-success:          #3DD68C
--color-success-bg:       #0F2A1A
--color-danger:           #FC5C5C
--color-danger-bg:        #2A0F0F
--color-warning:          #F59E0B
--color-warning-bg:       #2A1F00

--shadow-sm: 0 1px 3px rgba(0,0,0,0.25)
--shadow-md: 0 4px 12px rgba(0,0,0,0.35)
--shadow-lg: 0 12px 32px rgba(0,0,0,0.45)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TYPOGRAPHY SCALE (Web App, Compact)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Page title:        20–24px, semibold     (one per page, largest allowed)
Section heading:   16–18px, medium/semi
Body text:         14–15px, regular
Button / nav:      13–14px, medium
Label / badge:     11–12px, medium uppercase tracked
Price / ticker:    14–16px, monospace tabular-nums lining-nums
Number changes:    tabular-nums, color-coded green/red

Rule: Never use display-scale sizes (32px+) in the app UI. 
This is a dashboard, not a marketing page.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LAYOUT ARCHITECTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Global Layout (Desktop 1280px+):
┌────────────────────────────────────────────────────────┐
│  TOPBAR  (fixed, 56px)                                 │
│  Logo | Search | Market Status | Notif | Theme | User  │
├─────────┬──────────────────────────────────────────────┤
│         │                                              │
│ SIDEBAR │   MAIN CONTENT AREA                         │
│  240px  │   (scrollable, single scroll region)        │
│  fixed  │                                              │
│         │                                              │
└─────────┴──────────────────────────────────────────────┘

Sidebar Navigation Items:
- Dashboard (home icon)
- Market Overview
- Watchlist
- Stock Screener
- Portfolio
- News & Analysis
- [divider]
- Settings
- Help

Topbar includes:
- Logo (left)
- Global search bar (center, cmd+K shortcut hint)
- Market session status badge (OPEN / CLOSED / PRE-MARKET)
- IDX index mini-display (IHSG: 7,284 +0.42%)
- Notification bell with badge
- Theme toggle (sun/moon)
- User avatar + dropdown

Tablet (768–1024px): Sidebar collapses to icon-only (48px)
Mobile (<768px): Sidebar becomes bottom tab bar (5 items max)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGES — Build all of the following
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

═══════════════════════════
PAGE 1: Dashboard Overview
═══════════════════════════

Layout: Bento-grid modular layout. Not symmetrical — vary card sizes for visual hierarchy.

Row 1 — Market Index KPI Cards (4 cards, full width):
  Each card: index name + current value + % change chip + sparkline + open/close indicator
  Indices: IHSG, LQ45, IDX30, KOMPAS100
  Green chip for positive, red chip for negative
  Sparkline: 7-day trend, matches change color

Row 2 — Two-column split:
  LEFT (60%): Featured Index Chart (IHSG)
    - Large candlestick/area chart (Chart.js or ApexCharts)
    - Timeframe tabs: 1D / 1W / 1M / 3M / YTD / 1Y
    - Hover tooltip showing O/H/L/C, volume
    - Volume histogram at the bottom

  RIGHT (40%): Top Movers panel
    Tabs: Top Gainers | Top Losers | Most Active
    Each row: rank number, ticker badge, company short name, price, % change chip, mini sparkline
    Show 8 rows, scroll if more
    % change: bold, green/red color
    Add to watchlist icon on hover

Row 3 — Three-column split:
  LEFT (35%): Watchlist
    - Card title with "Edit" and "+" icon
    - Rows: ticker | name | price | % change | sparkline (40px wide)
    - Hover row: highlight + "See Detail" action
    - Empty state if no stocks added

  CENTER (35%): Portfolio Summary
    - Total portfolio value (large number, green)
    - Today's P&L (+ amount / % change)
    - Allocation donut chart (sector breakdown, 5–6 sectors)
    - List: top 4 holdings with allocation %

  RIGHT (30%): Market News
    - List of 5–6 news items
    - Each: publication badge, headline (max 2 lines), timestamp
    - Clicking opens news detail modal
    - Category filter chips: All | Corporate | Economy | Sector

Row 4 — Full width:
  Sector Heatmap
  - Grid of sector tiles (Finance, Consumer, Energy, Mining, Property, Infrastructure, 
    Healthcare, Tech, Agriculture)
  - Color intensity: deep green → light green → white → light red → deep red
  - Each tile: sector name + % change + market cap label
  - Hover: tooltip with top 3 stocks in that sector


═══════════════════════════════════
PAGE 2: Stock Detail / Stock View
═══════════════════════════════════

URL pattern: /stock/[ticker] (hash routing is fine)
Dummy data: Use BBCA, TLKM, GOTO, ASII, BBRI, UNVR as examples.

Header section:
  - Ticker (large, monospace, bold) + Company name
  - Exchange badge: IDX | Sector badge: Banking | Market Cap badge
  - Current price (very large, prominent)
  - Change today: +/- amount and % in green or red chip
  - 52-week range bar
  - Buy button (primary green) + Sell button (outlined red) + Add to Watchlist (ghost)

Main chart area:
  - Large chart (candlestick default, toggle to line/area/bar)
  - Chart type selector + timeframe tabs: 1D 1W 1M 3M 6M 1Y 5Y
  - Toggle overlays: MA20, MA50, MA200, Volume, Bollinger Bands, MACD, RSI
  - Drawing tools toolbar (line, horizontal, text, fibonacci)
  - Full-screen expand button
  - Price scale on the right, time axis on bottom
  - Volume bars at bottom (color-coded: green/red)

Stats panel (right sidebar or below chart, responsive):
  Stats grid (2-column):
  Open | Previous Close | Day High | Day Low | 52W High | 52W Low
  Volume | Avg. Volume | Market Cap | P/E Ratio | EPS | Dividend Yield
  Beta | Float | Shares Outstanding | Book Value per Share

Detail tabs (below chart):
  - Overview: brief company description + key metrics + price performance table (1D/1W/1M/3M/1Y)
  - Financials: Revenue, Net Income, EPS, Operating Cash Flow table (quarterly + annual)
  - Technical: RSI gauge, MACD signal, moving average signals table (Buy/Sell/Neutral chips),
               support/resistance levels list
  - News: list of stock-specific news (same card style as dashboard)
  - About: company profile, founders, sector, sub-sector, listing date, address, website

Related stocks strip at bottom: horizontal scroll of similar stocks (same sector)


════════════════════════
PAGE 3: Stock Screener
════════════════════════

Layout: Filter panel left (280px) + results table right.

Filter panel (left):
  Section: Market Data
    - Sector (multiselect dropdown: All sectors)
    - Sub-sector
    - Market Cap (slider range: Micro / Small / Mid / Large)
    - Price range (min / max input)
    - Volume range

  Section: Valuation
    - P/E Ratio range (slider)
    - P/B Ratio range
    - Dividend Yield range

  Section: Performance
    - 1D Change: positive only / negative only / any
    - 1M Return: > 5% / > 10% / > 20% / custom
    - 52W near High / near Low toggle

  Section: Technical
    - RSI overbought (>70) / oversold (<30) / neutral
    - Above MA20 / Above MA50 / Above MA200 toggles
    - MACD signal: bullish / bearish / any

  [Apply Filters] primary button + [Reset] ghost button

Results table (right):
  Columns: # | Ticker | Company | Sector | Price | 1D% | 1W% | 1M% | Volume | 
           Mkt Cap | P/E | RSI | Signal | Action
  Features:
  - Column header click to sort ascending/descending (arrow indicator)
  - Row hover highlight
  - 1D%, 1W%, 1M% columns: green/red with arrow icon
  - Signal column: BUY chip (green) / SELL chip (red) / HOLD chip (gray)
  - Action column: eye icon (view) + star icon (watchlist) + chart icon
  - Pagination (10 / 25 / 50 per page selector)
  - Total count indicator: "Showing 42 of 850 stocks"
  - Search filter above table: quick search by ticker or company name
  - Export CSV button (top right)


═══════════════════════════════
PAGE 4: Portfolio & Watchlist
═══════════════════════════════

Tabs at top: Portfolio | Watchlist (tabs switch content below)

--- Portfolio Tab ---

Top summary bar:
  - Total Portfolio Value: large green number
  - Today's P&L: +/- amount + % chip
  - Total Gain/Loss: since inception, color-coded
  - Number of positions

Three-column summary row:
  LEFT: Allocation donut chart (by sector, 6 sectors, legend on right)
  CENTER: Performance chart — portfolio value over time (line chart, monthly/YTD/1Y tabs)
  RIGHT: Stats card: Best performer | Worst performer | Most valued position | Cash balance

Holdings table:
  Columns: Ticker | Company | Qty | Avg. Buy Price | Current Price | 
           Market Value | Unrealized P&L | P&L% | Daily Change | 1M Change | Action
  Features:
  - P&L and % cells: color-coded green/red, bold
  - Each row: avatar/logo placeholder + ticker badge
  - "Add Position" button above table
  - Row click opens Stock Detail page
  - Sort by any column

--- Watchlist Tab ---

Watchlist title with item count badge + "Add Stock" button

Watchlist table:
  Columns: Ticker | Company | Sector | Price | 1D Change | 1W | 1M | Volume | 
           52W High | 52W Low | Action (view + remove)
  Features:
  - Inline sparkline (last 5 days) in its own mini column
  - Color coded change columns
  - Quick remove with confirmation tooltip (not modal)
  - Drag-to-reorder rows


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UI COMPONENT SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Buttons:
  Primary:   solid --color-primary background, white text, --radius-md, 
             hover darken, active press effect
  Secondary: outlined border --color-primary, primary text
  Danger:    solid --color-danger background, white text
  Ghost:     transparent, border --color-border, neutral text
  Icon-only: square, --radius-md, tooltip on hover, aria-label required

Cards:
  Background: --color-surface
  Border: 1px solid --color-border (alpha-blended, not solid gray)
  Border-radius: --radius-lg
  Shadow: --shadow-sm, upgrade to --shadow-md on hover
  Padding: 20px
  No colored side borders

Badges / Chips:
  Status: OPEN (green filled) | CLOSED (gray) | PRE-MARKET (amber)
  Change positive: green bg, green text, ▲ icon
  Change negative: red bg, red text, ▼ icon
  Sector: neutral surface, muted text, small font
  Signal: BUY (green) / SELL (red) / HOLD (gray)
  All badges: --radius-full, 11px font, padding 3px 8px

Data Tables:
  Header: sticky, slightly offset bg, bold small caps labels
  Row: alternating subtle shade, row hover highlight
  Borders: horizontal only (between rows), thin divider color
  Numbers: tabular-nums, monospace for prices
  Sorting arrows in header
  Empty state with illustration + message if no results

Tooltips:
  Dark bg (--color-bg inverted), white text, --radius-md, --shadow-md
  Appear on hover with 150ms delay, 200ms fade
  Arrow pointer toward trigger element

Charts (use Chart.js or ApexCharts):
  Candlestick: green candles (close > open), red candles (close < open)
  Line/Area: primary color line, 15% opacity fill
  Volume bars: match candle color
  Grid lines: very faint, --color-divider
  Axis labels: --text-xs, --color-text-muted
  Crosshair: dashed line, matches cursor
  Tooltip: floating card style, O/H/L/C + volume
  Background: transparent (inherits card surface)
  No chart borders, only minimal axis

Sparklines:
  Tiny inline 60×24px charts, no axes, no labels
  Color: green if positive overall, red if negative
  Used in: KPI cards, watchlist rows, top movers

KPI Cards:
  - Metric name: small, muted, uppercase, 11px
  - Primary value: 22–26px, semibold, monospace
  - Delta: change chip (green/red) + arrow icon
  - Sparkline (optional, bottom right of card)
  - Surface card with subtle border, --radius-lg

Form Inputs:
  Border: --color-border, 1px
  Focus: 2px --color-primary outline with 3px offset
  Placeholder: --color-text-faint
  Error state: --color-danger border + inline error message below
  Label: above input, 13px medium
  All inputs: --radius-md, 40px height

Modal / Drawer:
  Overlay: rgba(0,0,0,0.5) backdrop
  Panel: --color-surface, --radius-xl (top corners for drawer)
  Header: title + close button (X)
  Animation: fade + scale-in (200ms) for modal, slide-in for drawer

Skeleton Loading:
  Shimmer animation: light gray → slightly lighter → back
  Match the exact layout of the real component
  Used for: chart area, table rows, KPI cards

Empty States:
  Centered in container: soft icon + heading + body text + CTA button
  Never just "No data." — be specific: "Your watchlist is empty. Add your first stock."


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTERACTIONS & BEHAVIOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Theme toggle:
  - Sun/moon icon in topbar
  - Smoothly transitions all color tokens (transition: 200ms)
  - Persists state in a JS variable (no localStorage)
  - Default: system preference (prefers-color-scheme)

Hover states:
  - All interactive elements have clear hover: background shift, color change, or shadow upgrade
  - Rows in tables: subtle background highlight on hover
  - Sidebar items: bg fill on hover and active
  - Cards: shadow upgrade on hover (for clickable cards only)

Active/focus states:
  - All focusable elements: 2px solid --color-primary outline, 3px offset
  - Visible keyboard navigation at all times

Chart interactions:
  - Hover shows crosshair + floating tooltip
  - Timeframe tabs animate chart transition (fade/morph, not instant redraw)
  - Overlay toggles animate in/out

Price number animation:
  - When price values "update" (simulated), numbers count/morph to new value
  - Color flashes briefly: green flash for price increase, red flash for decrease

Navigation:
  - Hash-based routing (#dashboard, #stock/BBCA, #screener, #portfolio, #watchlist)
  - Sidebar active state updates on route change
  - Breadcrumb in topbar for stock detail page: Dashboard > BBCA
  - Back button in stock detail

Mobile behavior:
  - Sidebar becomes bottom navigation (5 icons: Dashboard, Watchlist, Screener, Portfolio, Menu)
  - Topbar collapses: hide search (replaces with search icon), keep logo + theme + user
  - Cards stack to single column
  - Charts become full-width
  - Tables scroll horizontally with sticky first column
  - Bottom nav has tap highlight and active state


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DUMMY DATA — Use realistic stock data
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Index values: IHSG 7,284.52 (+0.42%), LQ45 1,043.18 (-0.18%), 
              IDX30 512.76 (+0.65%), KOMPAS100 1,189.33 (+0.21%)

Stock tickers (IDX): BBCA, BBRI, TLKM, ASII, GOTO, UNVR, PGAS, ANTM, BUMI, MNCN
Sectors: Banking, Consumer, Energy, Mining, Telco, Property, Infrastructure, Healthcare, Tech

Sample portfolio holdings:
  BBCA: 500 lots | Avg 9,200 | Current 9,800 | +6.52%
  TLKM: 200 lots | Avg 3,650 | Current 3,420 | -6.30%
  GOTO: 10000 lots | Avg 88 | Current 96 | +9.09%
  ASII: 300 lots | Avg 5,100 | Current 5,300 | +3.92%
  ANTM: 1000 lots | Avg 1,840 | Current 1,920 | +4.35%

Market session hours: 09:00 – 15:49 WIB (Monday–Friday)

News headlines (use realistic IDX-style):
  "BBCA Records 18% Net Profit Growth in Q1 2026"
  "BI Holds Benchmark Rate Steady at 5.75%"
  "GOTO Announces $200M Buyback Program"
  "Mining Sector Leads IHSG Gains on Commodity Rally"
  "TLKM Dividend Yield Reaches 6.2% After Recent Pullback"


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECHNICAL REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Static frontend only (no backend required)
- Use Chart.js or ApexCharts for all charts (CDN)
- Use Lucide Icons for all icons (CDN)
- Load Inter font from Google Fonts, JetBrains Mono from Google Fonts
- All navigation via hash routing (single HTML file or component-based)
- No localStorage — use JS variables for theme and state
- All external links: target="_blank" rel="noopener noreferrer"
- Images: use real placeholder services (e.g., picsum.photos) or generated SVG
- Responsive breakpoints: 375px (mobile), 768px (tablet), 1024px (laptop), 1280px+ (desktop)
- Minimum touch target: 44x44px for all interactive elements
- All price/number values: font-variant-numeric: tabular-nums lining-nums
- Reduce motion: respect prefers-reduced-motion in all animations
- Keyboard accessible: Tab/Enter/Escape navigation throughout
- Semantic HTML: nav, main, aside, section, article, header, footer — no div-soup
- One h1 per page, proper heading hierarchy


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY CHECKLIST (Must Pass)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Light mode: clean, green-white palette, easy to read in daylight
✅ Dark mode: dark green-charcoal, low-glare, easy on eyes for night trading
✅ Theme toggle works and transitions smoothly
✅ All 4 pages are navigable from sidebar
✅ Stock detail page loads correctly from dashboard and screener clicks
✅ Charts render with dummy data in both themes
✅ Table sort works on all sortable columns
✅ Skeleton loaders shown for chart and table areas on first load
✅ Positive values = green, negative values = red consistently everywhere
✅ All numbers use tabular monospace formatting
✅ Mobile layout works at 375px — no horizontal overflow
✅ Touch targets ≥ 44px on mobile
✅ Watchlist empty state displayed if no items
✅ One clear primary action per view — no competing CTAs
✅ No purple gradients, glowing effects, or AI-template aesthetics anywhere
✅ No text below 12px
✅ All icon buttons have aria-label and tooltip
✅ Sidebar active state reflects current page
✅ Design feels like a premium fintech product, not a template