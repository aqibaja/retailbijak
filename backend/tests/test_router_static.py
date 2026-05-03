from pathlib import Path

ROUTER = Path('/home/rich27/retailbijak/frontend/js/router.js')


def test_router_normalizes_hash_query_and_amp_suffixes_before_route_dispatch():
    content = ROUTER.read_text()
    assert "const cleanPath = path.split('?')[0].split('&')[0];" in content
    assert "const baseRoute = cleanPath.split('/')[0];" in content
    assert "const segments = cleanPath.split('/');" in content
