# Rebuild SwingAQ Frontend

Transform the current basic scanner page into a comprehensive, production-grade fintech dashboard based on the specifications in `planning/design.md`.

## User Review Required
> [!IMPORTANT]
> The new design calls for a significant rewrite of the existing frontend. The current single-page scanner will be integrated into the new **Screener** page.
> Since this is a very large frontend application, I propose building it as a vanilla JavaScript Single Page Application (SPA) using hash routing, as requested ("Static frontend only"). I will integrate the existing backend APIs (News, Fundamental, Technical) to provide real data where possible, and use dummy data for the rest (Portfolio, Heatmap) as specified in the design doc.

## Open Questions
> [!WARNING]
> 1. **Charting Library**: The design mentions Chart.js or ApexCharts. However, for the Stock Detail page, TradingView Lightweight Charts is the industry standard for candlestick charts. Are you okay if I use Lightweight Charts for the main stock chart, and Chart.js for the smaller donut/sparkline charts?
> 2. **Modularity**: Currently, all JS and CSS are in single files (`app.js`, `style.css`). Given the size of the new app, I will likely split the JS into smaller modules (e.g., `router.js`, `dashboard.js`, `stock_detail.js`) for maintainability. Is that acceptable?

## Proposed Changes

### Frontend Architecture
- Transform `frontend/index.html` into the main shell (Sidebar + Topbar + Main Content Area).
- Implement hash-based routing (`#dashboard`, `#stock/:ticker`, `#screener`, `#portfolio`) to switch views without reloading the page.

### [MODIFY] `frontend/index.html`
- Add semantic HTML structure (`<aside>`, `<header>`, `<main>`, `<nav>`).
- Add CDN links for fonts (Inter, JetBrains Mono), icons (Lucide), and charting libraries.
- Define the placeholder containers for each page view.

### [MODIFY] `frontend/style.css`
- Implement Light/Dark mode CSS variables (tokens).
- Build the Swiss-grid layout system.
- Add styles for all UI components: Cards, Badges, Tabular Data Tables, Skeleton Loaders, and Buttons.
- Ensure responsiveness (Mobile, Tablet, Desktop breakpoints).

### [MODIFY] `frontend/app.js` (and split into modules)
- **Router Logic**: Handle URL hash changes to show/hide relevant sections.
- **Theme Manager**: Handle Light/Dark mode toggling.
- **Dashboard View**: Render KPI cards, fetch News from `/api/news`, and display placeholder Portfolio/Heatmap data.
- **Stock Detail View**: Fetch data from `/api/stocks/{ticker}/fundamental` and `/api/stocks/{ticker}/technical`, and render the Candlestick chart using `/api/stocks/{ticker}/chart-data`.
- **Screener View**: Migrate the existing SwingAQ scanner logic into the new Screener UI format with advanced filters.
- **Portfolio & Watchlist View**: Implement dummy tables for portfolio holdings and watchlist.

## Verification Plan
### Manual Verification
- Test light/dark mode toggling.
- Verify hash routing navigates to all 4 pages correctly.
- Ensure the Stock Detail page successfully fetches real backend data and displays the chart.
- Test mobile responsiveness down to 375px.
