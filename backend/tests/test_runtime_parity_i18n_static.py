from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SYNC_SCRIPT = (ROOT / 'scripts' / 'sync_production.sh').read_text()
PARITY_SCRIPT = (ROOT / 'scripts' / 'check_frontend_runtime_parity.py').read_text()
DEPLOY_DOC = (ROOT / 'DEPLOY.md').read_text()


def test_sync_script_copies_i18n_runtime_asset():
    assert 'copy_item "$REPO_DIR/frontend/js/i18n.js" "$PROD_DIR/frontend/js/i18n.js"' in SYNC_SCRIPT


def test_parity_script_covers_i18n_runtime_asset():
    assert "'js/i18n.js'" in PARITY_SCRIPT


def test_deploy_doc_mentions_i18n_runtime_sync():
    assert 'frontend/js/i18n.js' in DEPLOY_DOC
