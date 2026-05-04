# PLAN: RetailBijak UI/UX Fixes

## Overview
Improving stock detail page based on planning document (7 categories, 16 steps).

## Progress

### ✅ Phase 1: Decision Panel & Technical Panel [DONE]
- [x] Confluence score numeric (XX/100) in title bar
- [x] Info tooltip (ℹ️) explaining methodology on hover
- [x] Neutral marker (50) on progress bar
- [x] Dynamic recommendation: AKUMULASI BERTAHAP / PANTAU KONFIRMASI / HINDARI DULU
- [x] Score label: Bullish kuat / Bullish moderat / Sideways / Bearish
- [x] RSI overbought alert badges (>80=OVERBOUGHT, >70=WASPADA)
- [x] Stochastics overbought alerts (>80=OVERBOUGHT)
- [x] Multi-indicator overbought alert banner: "RSI & Stochastics overbought ekstrem"
- [x] CSS classes: indicator-danger, indicator-warn, tech-alert-banner, etc.

### ✅ Phase 2: Typography & Layout [DONE]
- [x] Change % font 18px, weight 600 (class `stock-change-large`)
- [x] Catalyst timestamp/source links: `catalyst-link` class (color #94a3b8)
- [x] Corporate actions section fills dead space under Katalis Terbaru
- [x] Peer comparison: enriched table with price + change + arrows
- [x] Last-update WIB timestamp in stock header

### ✅ Phase 3: Microcopy & Polish [DONE]
- [x] "fundamental menunggu" → "Fundamental Menunggu" (Title Case)
- [x] "siap dibaca" → "Siap Dibaca"

### ✅ Phase 4: Backend Enrichment [DONE]
- [x] Peers API now returns price, change, change_pct (joined OHLCV data)

### ⏳ Phase 5: Responsive & Final [MOSTLY DONE]
- [x] Sidebar tooltips already wired (data-tooltip CSS exists)
- [x] Stock layout responsive (existing CSS media queries at 1100px, 768px, 480px)
- [x] Confirm no regression on other pages

## Files Modified
- `frontend/js/views/stock_detail.js` — decision panel + technical alerts + catalyst + peer
- `frontend/style.css` — 56 lines new CSS (overbought, alert, typography, layout, peer)
- `backend/routes/stock_detail.py` — peers API now returns price/change/change_pct
