from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAIN = ROOT / 'backend/main.py'
REFERENCE = ROOT / 'backend/routes/reference.py'


def test_reference_routes_are_not_defined_in_main_anymore():
    src = MAIN.read_text(encoding='utf-8')
    assert '@app.get("/api/timeframes")' not in src
    assert '@app.get("/api/stocks")' not in src
    assert 'async def timeframes(' not in src
    assert 'async def stocks(' not in src


def test_reference_routes_exist_in_module():
    src = REFERENCE.read_text(encoding='utf-8')
    assert "@router.get('/api/timeframes')" in src or '@router.get("/api/timeframes")' in src
    assert "@router.get('/api/stocks')" in src or '@router.get("/api/stocks")' in src
