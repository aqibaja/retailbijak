from pathlib import Path


FRONTEND_MARKET_VIEW = Path('/home/rich27/retailbijak/frontend/js/views/market.js')
FRONTEND_STYLE = Path('/home/rich27/retailbijak/frontend/style.css')


def test_market_view_uses_compact_source_label_and_breadth_ratio_stats_strip():
    content = FRONTEND_MARKET_VIEW.read_text()
    assert "srcParts" in content
    assert "srcSummary = srcParts.length > 3" in content
    assert "compactSource(srcParts[0])" in content
    assert "statBox('Breadth Ratio'" in content


def test_market_pulse_has_mobile_friendly_breadth_value_hook_and_stacked_markup():
    content = FRONTEND_MARKET_VIEW.read_text()
    assert "market-stat-box market-stat-box-breadth" in content
    assert "market-stat-value market-stat-value-breadth" in content
    assert "<span class=\"market-breadth-separator\">/</span>" in content
    assert "<span class=\"market-breadth-secondary\">" in content
    assert "market-stat-footnote" in content


def test_market_first_fold_uses_session_pill_metadata_rail_and_four_primary_pulse_tiles():
    content = FRONTEND_MARKET_VIEW.read_text()
    assert "market-session-pill" in content
    assert "market-meta-rail" in content
    assert "market-content" in content
    assert "market-loading" in content
    assert "Sources:" in content
    assert "Market Mood" in content
    assert "marketMood(" in content
    assert "Top Winner" in content
    assert "Top Loser" in content
    assert "market-data-quality" in content
    assert "market-empty-rich" in content
    assert "market-pulse-tile" in content
    assert "market-pulse-tile-value" in content
    assert "market-pulse-tile-footnote" in content
    assert "market-pulse-panels" not in content


def test_market_deep_insight_grid_uses_grouped_section_headers():
    content = FRONTEND_MARKET_VIEW.read_text()
    assert "market-section-group" in content
    assert "Market Internals" in content
    assert "Flow & Participation" in content
    assert "Catalysts & Events" in content
    assert "market-section-group-title" in content
    assert "market-breadth-visual" in content
    assert "market-ranked-row" in content
    assert "market-rank-badge" in content
    assert "market-section-summary" in content
    assert "market-catalyst-meta" in content
    assert "market-flow-chip" in content
    assert "market-list-card-body" in content
    assert "saham penguat tervalidasi" in content
    assert "saham pelemah tervalidasi" in content
    assert "market-row-meta" in content
    assert "market-row-kicker" in content
    assert "market-row-value-note" in content
    assert "market-catalyst-title" in content


def test_market_grouped_layout_styles_define_section_stacks():
    content = FRONTEND_STYLE.read_text()
    assert ".market-section-group {" in content
    assert ".market-section-group-head {" in content
    assert ".market-section-group-grid {" in content
    assert ".market-section-group-title" in content
    assert ".market-breadth-visual {" in content
    assert ".market-ranked-row {" in content
    assert ".market-rank-badge {" in content
    assert ".market-section-summary {" in content
    assert ".market-catalyst-meta {" in content
    assert ".market-flow-chip {" in content
    assert ".market-list-card-body {" in content
    assert ".market-list-card-head {" in content
    assert ".market-card-subtle" in content
    assert ".market-breadth-card .market-split-list {" in content
    assert ".market-row-meta {" in content
    assert ".market-row-kicker {" in content
    assert ".market-row-value-note {" in content
    assert ".market-catalyst-title {" in content
    assert ".market-card-feed {" in content
    assert ".market-section-group-internals { order: 1; }" in content
    assert ".market-section-group-flow { order: 2; }" in content
    assert ".market-section-group-catalyst { order: 3; }" in content
    assert ".market-refresh-btn { width: 100%; height: 44px; }" in content
    assert ".market-data-quality {" in content
    assert ".market-empty-rich {" in content


def test_market_first_fold_styles_define_header_rail_and_four_tile_pulse_layout():
    content = FRONTEND_STYLE.read_text()
    assert ".market-head-copy { display:flex; flex-direction:column; gap:12px; }" in content
    assert ".market-meta-rail { display:flex; flex-wrap:wrap; gap:10px;" in content
    assert ".market-session-pill { display:inline-flex;" in content
    assert ".market-hero-metrics {" in content
    assert ".market-pulse-grid { display:grid; grid-template-columns: repeat(4, minmax(0,1fr));" in content
    assert ".market-pulse-tile {" in content
    assert ".market-pulse-tile-value" in content
    assert ".market-pulse-tile-footnote" in content
    assert ".market-mood-value" in content
    assert "market-mood-box ${mood.tone}" in FRONTEND_MARKET_VIEW.read_text()
    assert ".market-stats-grid.market-stats-grid-compact { grid-template-columns: repeat(4, minmax(0,1fr)); }" in content
    assert "market-stats-grid market-stats-grid-compact" in FRONTEND_MARKET_VIEW.read_text()
    assert ".market-pulse-panels-compact" not in content


def test_market_mobile_styles_stack_top_fold_rows_and_expand_tap_targets():
    content = FRONTEND_STYLE.read_text()
    assert "@media (max-width: 767px) {" in content
    assert ".market-title-row { width: 100%; justify-content: space-between; gap: 10px; }" in content
    assert ".market-meta-rail { gap: 8px; flex-direction: column; align-items: flex-start; }" in content
    assert ".market-data-quality { width: 100%; }" in content
    assert ".market-refresh-btn { width: 100%; height: 44px; }" in content
    assert ".market-empty-refresh { min-height: 44px; }" in content
    assert ".market-row { flex-direction: column; align-items: flex-start; gap: 10px; }" in content
    assert ".market-right { width: 100%; min-width: 0; text-align: left; padding-left: 0; }" in content
