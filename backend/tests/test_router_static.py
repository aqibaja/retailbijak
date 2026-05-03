from pathlib import Path

ROUTER = Path('/home/rich27/retailbijak/frontend/js/router.js')


def test_router_normalizes_hash_query_and_amp_suffixes_before_route_dispatch():
    content = ROUTER.read_text()
    assert "function normalizeRoute(hash) {" in content
    assert "const cleanPath = path.split(/[?&]/)[0] || 'dashboard';" in content
    assert "const [view, ...rest] = cleanPath.split('/');" in content
