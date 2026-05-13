# RetailBijak Smoke Test Report

**Timestamp:** 2026-05-13T10:15:52.891353

**Backend URL:** http://localhost:8000

## Summary
- **Views Tested:** 25 (✓ 25 | ✗ 0)
- **APIs Tested:** 7 (✓ 7 | ✗ 0)
- **Overall Pass Rate:** 100.0%

## API Endpoints
| Endpoint | Method | Status | Message |
|----------|--------|--------|---------|
| /api/health | GET | ✓ PASS | OK |
| /api/market-summary | GET | ✓ PASS | OK |
| /api/stocks?limit=10 | GET | ✓ PASS | OK |
| /api/stocks/AAPL | GET | ✓ PASS | OK |
| /api/scan | GET | ✓ PASS | OK (non-JSON) |
| /api/news?limit=5 | GET | ✓ PASS | OK |
| /api/portfolio | GET | ✓ PASS | OK |

## Frontend Views
| View | Status | Message |
|------|--------|---------|
| dashboard | ✓ PASS | OK |
| market | ✓ PASS | OK |
| screener | ✓ PASS | OK |
| stock_detail | ✓ PASS | OK |
| portfolio | ✓ PASS | OK |
| alerts | ✓ PASS | OK |
| news | ✓ PASS | OK |
| indices | ✓ PASS | OK |
| sector | ✓ PASS | OK |
| macro | ✓ PASS | OK |
| calendar | ✓ PASS | OK |
| dividend | ✓ PASS | OK |
| ipo | ✓ PASS | OK |
| corporate | ✓ PASS | OK |
| chart | ✓ PASS | OK |
| compare | ✓ PASS | OK |
| paper_trades | ✓ PASS | OK |
| signal_overview | ✓ PASS | OK |
| ai_picks | ✓ PASS | OK |
| backtest | ✓ PASS | OK |
| treemap | ✓ PASS | OK |
| breadth | ✓ PASS | OK |
| movers | ✓ PASS | OK |
| help | ✓ PASS | OK |
| settings | ✓ PASS | OK |

## Failures
✓ No failures detected!