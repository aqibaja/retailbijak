from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAIN = ROOT / 'backend/main.py'


def test_main_uses_lifespan_instead_of_on_event_hooks():
    src = MAIN.read_text(encoding='utf-8')
    assert 'lifespan=' in src
    assert '@app.on_event("startup")' not in src
    assert '@app.on_event("shutdown")' not in src
    assert 'def on_startup' not in src
    assert 'def on_shutdown' not in src
