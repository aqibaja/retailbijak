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
copy_item "$REPO_DIR/backend/indicators_extended.py" "$PROD_DIR/backend/indicators_extended.py"
copy_item "$REPO_DIR/backend/routes/user.py" "$PROD_DIR/backend/routes/user.py"
copy_item "$REPO_DIR/backend/routes/stock_detail.py" "$PROD_DIR/backend/routes/stock_detail.py"
copy_item "$REPO_DIR/backend/services/openrouter_llm.py" "$PROD_DIR/backend/services/openrouter_llm.py"
copy_item "$REPO_DIR/backend/services/idx_response_factory.py" "$PROD_DIR/backend/services/idx_response_factory.py"
copy_item "$REPO_DIR/frontend/index.html" "$PROD_DIR/frontend/index.html"
copy_item "$REPO_DIR/frontend/style.css" "$PROD_DIR/frontend/style.css"
copy_item "$REPO_DIR/frontend/js/main.js" "$PROD_DIR/frontend/js/main.js"
copy_item "$REPO_DIR/frontend/js/router.js" "$PROD_DIR/frontend/js/router.js"
copy_item "$REPO_DIR/frontend/js/api.js" "$PROD_DIR/frontend/js/api.js"
copy_item "$REPO_DIR/frontend/js/theme.js" "$PROD_DIR/frontend/js/theme.js"
copy_item "$REPO_DIR/frontend/js/i18n.js" "$PROD_DIR/frontend/js/i18n.js"
rm -rf "$PROD_DIR/frontend/js/views"
mkdir -p "$PROD_DIR/frontend/js/views"
copy_item "$REPO_DIR/frontend/js/views/." "$PROD_DIR/frontend/js/views"

cp "$REPO_DIR/scripts/check_frontend_runtime_parity.py" "$PROD_DIR/scripts/check_frontend_runtime_parity.py"
cp "$REPO_DIR/scripts/post_deploy_smoke_check.py" "$PROD_DIR/scripts/post_deploy_smoke_check.py"
cp "$REPO_DIR/scripts/check_public_resource_chain.py" "$PROD_DIR/scripts/check_public_resource_chain.py"

echo "[2/6] Running pre-restart frontend parity check..."
python "$REPO_DIR/scripts/check_frontend_runtime_parity.py"

echo "[3/6] Restarting service..."
sudo systemctl restart "$SERVICE_NAME"

sleep 2

echo "[4/6] Health check..."
curl -fsS http://127.0.0.1:8000/api/health >/dev/null

echo "[5/7] Running post-deploy smoke check..."
python "$REPO_DIR/scripts/post_deploy_smoke_check.py"

echo "[6/7] Running public resource chain check..."
python "$REPO_DIR/scripts/check_public_resource_chain.py"

echo "[7/7] Done. Production is healthy."
