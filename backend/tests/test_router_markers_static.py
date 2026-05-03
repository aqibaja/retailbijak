from pathlib import Path

ROUTER = Path('/home/rich27/retailbijak/frontend/js/router.js')


def test_router_sets_dom_route_markers_for_browser_verification():
    content = ROUTER.read_text()
    assert "root.dataset.routePath = cleanPath;" in content
    assert "root.dataset.activeView = view || 'dashboard';" in content
