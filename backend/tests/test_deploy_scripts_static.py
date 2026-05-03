from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SYNC_SCRIPT = (ROOT / 'scripts' / 'sync_production.sh').read_text()
DEPLOY_DOC = (ROOT / 'DEPLOY.md').read_text()


def test_sync_script_runs_frontend_parity_check_before_restart():
    assert 'python "$REPO_DIR/scripts/check_frontend_runtime_parity.py"' in SYNC_SCRIPT
    assert 'cp "$REPO_DIR/scripts/check_frontend_runtime_parity.py" "$PROD_DIR/scripts/check_frontend_runtime_parity.py"' in SYNC_SCRIPT
    assert SYNC_SCRIPT.index('check_frontend_runtime_parity.py') < SYNC_SCRIPT.index('systemctl restart')
    assert 'rm -rf "$PROD_DIR/frontend/js/views"' in SYNC_SCRIPT
    assert 'copy_item "$REPO_DIR/frontend/js/views/." "$PROD_DIR/frontend/js/views"' in SYNC_SCRIPT


def test_sync_script_copies_smoke_script_to_production():
    assert 'cp "$REPO_DIR/scripts/post_deploy_smoke_check.py" "$PROD_DIR/scripts/post_deploy_smoke_check.py"' in SYNC_SCRIPT


def test_sync_script_runs_post_deploy_smoke_check_after_restart():
    assert 'python "$REPO_DIR/scripts/post_deploy_smoke_check.py"' in SYNC_SCRIPT
    assert SYNC_SCRIPT.index('systemctl restart') < SYNC_SCRIPT.index('python "$REPO_DIR/scripts/post_deploy_smoke_check.py"')


def test_deploy_doc_mentions_pre_restart_frontend_parity_check():
    assert 'check_frontend_runtime_parity.py' in DEPLOY_DOC
    assert 'pre-restart parity check' in DEPLOY_DOC.lower()


def test_deploy_doc_mentions_post_deploy_smoke_check():
    assert 'post_deploy_smoke_check.py' in DEPLOY_DOC
    assert 'post-deploy smoke check' in DEPLOY_DOC.lower()
    assert '#dashboard' in DEPLOY_DOC
    assert '#market' in DEPLOY_DOC
    assert '#screener' in DEPLOY_DOC
    assert '#portfolio' in DEPLOY_DOC


def test_sync_script_copies_public_resource_chain_script_to_production():
    assert 'cp "$REPO_DIR/scripts/check_public_resource_chain.py" "$PROD_DIR/scripts/check_public_resource_chain.py"' in SYNC_SCRIPT


def test_sync_script_runs_public_resource_chain_check_after_post_deploy_smoke():
    assert 'python "$REPO_DIR/scripts/check_public_resource_chain.py"' in SYNC_SCRIPT
    assert SYNC_SCRIPT.index('python "$REPO_DIR/scripts/post_deploy_smoke_check.py"') < SYNC_SCRIPT.index('python "$REPO_DIR/scripts/check_public_resource_chain.py"')


def test_deploy_doc_mentions_public_resource_chain_check():
    assert 'check_public_resource_chain.py' in DEPLOY_DOC
    assert 'public resource chain' in DEPLOY_DOC.lower()
