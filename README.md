# RetailBijak

RetailBijak is an IDX stock intelligence platform for market overview, stock analysis, screener, watchlist, and portfolio tracking.

## Highlights
- Live IDX-powered market intelligence
- Market Overview with:
  - Top Gainers / Top Losers
  - Market Breadth
  - Market Stats
  - Foreign Trading
  - Broker Activity
  - Corporate Actions
  - Company Announcements
- Stock detail pages with technical + fundamental analysis
- Watchlist & portfolio CRUD
- Mobile-friendly dark-first trading UI

## Tech Stack
- **Backend:** FastAPI + SQLAlchemy + SQLite
- **Frontend:** Vanilla JS SPA
- **Scheduler:** APScheduler
- **Data source:** IDX website JSON endpoints

## Current Production
- App: `swingaq-backend`
- Public URL: https://retailbijak.rich27.my.id
- Health: `/api/health`
- Scheduler health: `/api/scheduler-health`

## Development
```bash
cd /home/rich27/retailbijak/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## Verification
```bash
cd /home/rich27/retailbijak/backend
/opt/swingaq/backend/venv/bin/pytest test_api_e2e.py -q
```

Current test status:
- `test_api_e2e.py`: 8/8 passing
- `tests/test_scanner_engine.py`: 5/5 passing

## Deployment
Use the sync script:
```bash
/home/rich27/retailbijak/scripts/sync_production.sh
```

It will:
1. Sync backend/frontend files to `/opt/swingaq`
2. Restart the backend service
3. Verify `/api/health`

## Status
This repository currently includes the finalized plan in `PLAN.md` with progress notes per task.