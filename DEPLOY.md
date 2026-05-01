# Deployment Runbook (Public)

This project is deployed from `/opt/swingaq` and served via nginx -> uvicorn on `127.0.0.1:8000`.

## One-time assumptions
- nginx vhost `retailbijak.rich27.my.id` proxies to `127.0.0.1:8000`
- Python venv exists at `/opt/swingaq/backend/venv`
- systemd unit installed: `/etc/systemd/system/swingaq-backend.service`

## Deploy latest from GitHub clone
1. Update repo in working clone:
   - `git pull origin main`
2. Sync app files to runtime dir:
   - `cp backend/main.py /opt/swingaq/backend/main.py`
   - `cp backend/database.py /opt/swingaq/backend/database.py`
   - `cp frontend/js/api.js /opt/swingaq/frontend/js/api.js`
   - `cp frontend/js/views/portfolio.js /opt/swingaq/frontend/js/views/portfolio.js`
   - `cp frontend/js/views/screener.js /opt/swingaq/frontend/js/views/screener.js`
3. Run pre-restart parity check:
   - `python scripts/check_frontend_runtime_parity.py`
   - This must pass before `systemctl restart swingaq-backend`.
4. Validate syntax:
   - `python -m py_compile /opt/swingaq/backend/main.py /opt/swingaq/backend/database.py`
   - `python -m compileall -q /opt/swingaq/frontend/js`
5. Restart uvicorn process.
6. Smoke test public endpoints:
   - `/api/health`
   - `/api/settings`
   - `/api/watchlist`
   - `/api/portfolio`

## Preferred one-command deploy
- `bash scripts/sync_production.sh`
- Script sekarang menjalankan **pre-restart parity check** otomatis sebelum service restart.

## Test before shipping
- `cd backend && pytest -q test_api_e2e.py`

## Mobile UI checks
- Confirm bottom navigation appears at width <= 768px.
- Confirm `#watchlist`, `#portfolio`, `#screener`, `#settings` all render and are interactive.
