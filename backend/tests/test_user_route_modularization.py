from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAIN = ROOT / 'backend/main.py'
USER_ROUTER = ROOT / 'backend/routes/user.py'


def test_user_api_routes_are_not_defined_directly_in_main():
    src = MAIN.read_text(encoding='utf-8')
    assert '@app.get("/api/settings")' not in src
    assert '@app.put("/api/settings")' not in src
    assert '@app.get("/api/watchlist")' not in src
    assert '@app.post("/api/watchlist")' not in src
    assert '@app.delete("/api/watchlist/{ticker}")' not in src
    assert '@app.get("/api/portfolio")' not in src
    assert '@app.post("/api/portfolio")' not in src
    assert '@app.delete("/api/portfolio/{ticker}")' not in src


def test_user_api_routes_live_in_routes_user_module():
    src = USER_ROUTER.read_text(encoding='utf-8')
    assert "@router.get('/api/settings')" in src
    assert "@router.put('/api/settings')" in src
    assert "@router.get('/api/watchlist')" in src
    assert "@router.post('/api/watchlist')" in src
    assert "@router.delete('/api/watchlist/{ticker}')" in src
    assert "@router.get('/api/portfolio')" in src
    assert "@router.post('/api/portfolio')" in src
    assert "@router.delete('/api/portfolio/{ticker}')" in src
