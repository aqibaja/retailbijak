from pathlib import Path


SCRIPT = Path('/home/rich27/retailbijak/scripts/sync_production.sh')


def test_sync_production_includes_ai_picks_backend_module():
    content = SCRIPT.read_text()
    assert 'copy_item "$REPO_DIR/backend/ai_picks.py" "$PROD_DIR/backend/ai_picks.py"' in content
