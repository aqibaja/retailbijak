#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/home/rich27/retailbijak"
PROD_DIR="/opt/swingaq"
SERVICE_NAME="swingaq-backend"

copy_item() {
  local src="$1"
  local dst="$2"
  mkdir -p "$(dirname "$dst")"
  cp -r "$src" "$dst"
}

echo "[1/6] Syncing backend and frontend..."
copy_item "$REPO_DIR/backend/main.py" "$PROD_DIR/backend/main.py"
copy_item "$REPO_DIR/backend/routes/user.py" "$PROD_DIR/backend/routes/user.py"
copy_item "$REPO_DIR/backend/services/idx_response_factory.py" "$PROD_DIR/backend/services/idx_response_factory.py"
copy_item "$REPO_DIR/frontend/js/views/market.js" "$PROD_DIR/frontend/js/views/market.js"
copy_item "$REPO_DIR/frontend/style.css" "$PROD_DIR/frontend/style.css"
copy_item "$REPO_DIR/frontend/index.html" "$PROD_DIR/frontend/index.html"

echo "[2/6] Running pre-restart frontend parity check..."
python "$REPO_DIR/scripts/check_frontend_runtime_parity.py"

echo "[3/6] Restarting service..."
sudo systemctl restart "$SERVICE_NAME"

sleep 2

echo "[4/6] Health check..."
curl -fsS http://127.0.0.1:8000/api/health >/dev/null

echo "[5/6] Running post-deploy smoke check..."
python "$REPO_DIR/scripts/post_deploy_smoke_check.py"

echo "[6/6] Done. Production is healthy."
