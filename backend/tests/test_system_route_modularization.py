from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAIN = ROOT / 'backend/main.py'
SYSTEM = ROOT / 'backend/routes/system.py'


def test_system_routes_are_not_defined_in_main_anymore():
    src = MAIN.read_text(encoding='utf-8')
    assert '@app.get("/api/health")' not in src
    assert '@app.get("/api/scheduler-health")' not in src
    assert '@app.get("/api/scheduler-jobs")' not in src
    assert 'def health(' not in src
    assert 'def scheduler_health(' not in src
    assert 'def scheduler_jobs(' not in src


def test_system_routes_exist_in_module():
    src = SYSTEM.read_text(encoding='utf-8')
    assert "@router.get('/api/health')" in src or '@router.get("/api/health")' in src
    assert "@router.get('/api/scheduler-health')" in src or '@router.get("/api/scheduler-health")' in src
    assert "@router.get('/api/scheduler-jobs')" in src or '@router.get("/api/scheduler-jobs")' in src
