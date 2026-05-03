from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SYNC_SCRIPT = (ROOT / 'scripts' / 'sync_production.sh').read_text()
DEPLOY_DOC = (ROOT / 'DEPLOY.md').read_text()
PUBLIC_CHAIN_SCRIPT = (ROOT / 'scripts' / 'check_public_resource_chain.py').read_text()


def test_public_resource_chain_script_exists_and_checks_active_modules():
    expected_markers = [
        "index.html",
        "js/main.js",
        "js/router.js",
        "js/api.js",
        "js/views/dashboard.js",
        "js/views/portfolio.js",
        "main.js?v=",
        "api.js?v=",
        "Dashboard Intelijen Pasar",
        "Grafik Harga",
        "Berita Terbaru",
    ]
    for marker in expected_markers:
        assert marker in PUBLIC_CHAIN_SCRIPT


def test_sync_script_copies_and_runs_public_resource_chain_check():
    assert 'cp "$REPO_DIR/scripts/check_public_resource_chain.py" "$PROD_DIR/scripts/check_public_resource_chain.py"' in SYNC_SCRIPT
    assert 'python "$REPO_DIR/scripts/check_public_resource_chain.py"' in SYNC_SCRIPT
    assert SYNC_SCRIPT.index('python "$REPO_DIR/scripts/post_deploy_smoke_check.py"') < SYNC_SCRIPT.index('python "$REPO_DIR/scripts/check_public_resource_chain.py"')


def test_deploy_doc_mentions_public_resource_chain_check():
    assert 'check_public_resource_chain.py' in DEPLOY_DOC
    assert 'public resource chain' in DEPLOY_DOC.lower()
