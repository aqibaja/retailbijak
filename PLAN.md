# PLAN: Stock Detail V2 Redesign

## ✅ ALL DONE — Deployed & Pushed

### Major UI Redesign Changes

| Area | Before | After |
|------|--------|-------|
| **Hero** | `.stock-hero panel` dengan inline styles | `.stock-hero-v2`: price 28px, change sebagai pill colored |
| **Decision Panel** | `.decision-hero` — text-heavy, confusion bar/info | `.score-card`: big 30px score number, progress fill, buy/warn/avoid badge |
| **Market Stats** | 2 panel terpisah: Snapshot (6 tiles) + Fundamental (8 tiles) = 14 tile sama | `.stock-stats-v2`: 3-col grid, 6 stat tiles merged, border-left color coding |
| **Technical Panel** | `.stat-tile` standar (72px min-height) | `.tech-tile-v2` compact (48px), tile-danger/warn/good background, tech-badge |
| **Catalyst Strip** | 4 tile dengan label "Katalis Terbaru" berulang | `.catalyst-row` compact: icon + title + link, tanpa label redundan |
| **Side Panels** | `.panel` (sama dengan main content) | `.stock-side-panel` lebih gelap, lebih compact |
| **Actions** | `.action-bar` inline | `.stock-actions` flex bar |

### CSS Stats
- `style.css`: +400 lines (1612 → ~2012)
- `stock_detail.js`: +480 lines (826 → ~1306)

### Files Changed
- `frontend/style.css` — v2 CSS classes
- `frontend/js/views/stock_detail.js` — template + all render fns
