from pathlib import Path


FRONTEND_MARKET_VIEW = Path('/home/rich27/retailbijak/frontend/js/views/market.js')
FRONTEND_STYLE = Path('/home/rich27/retailbijak/frontend/style.css')


def test_market_view_uses_resolved_stats_payload_and_compact_source_label():
    content = FRONTEND_MARKET_VIEW.read_text()
    assert "statsData?.data?.avg_price" in content
    assert "srcParts" in content
    assert "srcSummary = srcParts.length > 3" in content


def test_market_pulse_has_mobile_friendly_breadth_value_hook_and_stacked_markup():
    content = FRONTEND_MARKET_VIEW.read_text()
    assert "market-stat-box market-stat-box-breadth" in content
    assert "market-stat-value market-stat-value-breadth" in content
    assert "<span class=\"market-breadth-separator\">/</span>" in content
    assert "<span class=\"market-breadth-secondary\">" in content


def test_market_pulse_styles_support_desktop_wrap_and_mobile_stack():
    content = FRONTEND_STYLE.read_text()
    assert ".market-pulse-kpis { display:grid; grid-template-columns: repeat(3, minmax(148px,1fr));" in content
    assert ".market-stat-value-breadth { display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; font-size: clamp(1.6rem, 2.4vw, 2.1rem);" in content
    assert ".market-breadth-secondary { color: var(--text-dim);" in content
    assert "@media (max-width: 1023px) {" in content and ".market-pulse-kpis { grid-template-columns: repeat(2, minmax(0,1fr)); }" in content
    assert "@media (max-width: 767px) {" in content and ".market-pulse-kpis," in content
