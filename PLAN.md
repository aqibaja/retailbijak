# PLAN: RetailBijak UI/UX Fixes

## Overview
Improving stock detail page based on planning document (7 categories, 16 steps).

## Progress

### ✅ Phase 1: Decision Panel & Technical Panel [DONE]
- [x] Add confluence score numeric (XX/100) to decision panel
- [x] Add info tooltip explaining methodology
- [x] Add neutral marker (50) on progress bar
- [x] Dynamic recommendation based on score
- [x] RSI/Stoch overbought alert badges (CSS classes + highlight)
- [x] Multi-indicator overbought banner alert

### ✅ Phase 2: Typography & Layout [DONE]
- [x] Bigger change % font size (18px, weight 600)
- [x] Better contrast for timestamp/source links
- [x] Corporate actions section fills dead space under Katalis Terbaru
- [x] Richer peer comparison table (price, change%)
- [x] Sidebar tooltips (CSS already exists, wired data-labels)

### ⏳ Phase 3: Polish & Microcopy [PENDING]
- [x] Fix capitalization "fundamental: menunggu" → "Fundamental: Menunggu"
- [x] Add skeleton loaders and empty states
- [x] Add last-update timestamp in header

### ⏳ Phase 4: Responsive & Final [PENDING]
- [x] Stack layout on mobile already works (CSS media queries)
- [ ] Test regression on other pages

## Files Modified
- `frontend/js/views/stock_detail.js` — decision panel, technical alerts, catalyst, peer
- `frontend/style.css` — overbought CSS, alert banner, typography, corporate actions
