from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SYNC_SCRIPT = (ROOT / 'scripts' / 'sync_production.sh').read_text()
DEPLOY_DOC = (ROOT / 'DEPLOY.md').read_text()


def test_sync_script_runs_frontend_parity_check_before_restart():
    assert 'python "$REPO_DIR/scripts/check_frontend_runtime_parity.py"' in SYNC_SCRIPT
    assert SYNC_SCRIPT.index('check_frontend_runtime_parity.py') < SYNC_SCRIPT.index('systemctl restart')


def test_deploy_doc_mentions_pre_restart_frontend_parity_check():
    assert 'check_frontend_runtime_parity.py' in DEPLOY_DOC
    assert 'pre-restart parity check' in DEPLOY_DOC.lower()
