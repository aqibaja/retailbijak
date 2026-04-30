from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STOCK_DETAIL = ROOT / "frontend" / "js" / "views" / "stock_detail.js"


def test_stock_detail_removes_one_day_chart_range():
    src = STOCK_DETAIL.read_text()
    assert 'data-limit="1"' not in src
    assert '>1D<' not in src
    assert 'data-limit="7"' in src
    assert 'data-limit="30"' in src


def test_stock_detail_has_sentiment_colored_metrics():
    src = STOCK_DETAIL.read_text()
    assert 'sentimentClass' in src
    assert 'metric-good' in src
    assert 'metric-bad' in src
    assert 'renderInsightCards' in src


def test_stock_detail_has_pro_dashboard_sections():
    src = STOCK_DETAIL.read_text()
    assert 'Decision Panel' in src
    assert 'renderDecisionPanel' in src
    assert 'renderMetricGroup' in src
    assert 'Momentum' in src
    assert 'Trend' in src
    assert 'Volatility' in src
    assert 'Levels' in src
    assert 'Set Alert' in src
    assert 'Run Scanner' in src
    assert '7D' in src
    assert '30D' in src
    assert 'ALL' in src
    assert 'renderLevelOverlay' in src


def test_stock_detail_hides_invalid_zero_levels_and_uses_clean_decision_copy():
    src = STOCK_DETAIL.read_text()
    assert 'isValidLevel' in src
    assert 'filterValidCards' in src
    assert 'Support', 'Resistance'
    assert 'Rp 0' not in src
    assert 'TAHAN / WATCH' in src
    assert 'BUY PULLBACK' not in src
    assert 'Risk/reward kurang ideal' in src


def test_stock_detail_uses_compact_layout_tokens():
    src = STOCK_DETAIL.read_text()
    assert 'stock-detail-compact' in src
    assert 'grid-template-columns:minmax(0,1.45fr) minmax(320px,.85fr)' in src
    assert 'height:320px' in src
    assert 'compact-grid-3' in src
    assert 'compact-notes' in src
    assert 'overflow:visible' in src


def test_stock_detail_fills_left_empty_space_below_chart_only():
    src = STOCK_DETAIL.read_text()
    assert 'below-chart-fill' in src
    assert 'renderBelowChartFill' in src
    assert 'Range 7D' in src
    assert 'Volume Context' in src
    assert 'Quick Read' in src
    assert 'id="below-chart-fill"' in src


def test_stock_detail_has_ai_chat_placeholder_signal_card_and_entry_line():
    src = STOCK_DETAIL.read_text()
    assert 'ai-chat-placeholder' in src
    assert 'ai-fill-panel' in src
    assert 'AI Assistant' in src
    assert 'Ask AI about this stock' in src
    assert 'sample-prompts' in src
    assert 'signal-card' in src
    assert 'Signal' in src
    assert 'Confidence' in src
    assert 'Signal Score' not in src
    assert 'score-ring' not in src
    assert "line('ENTRY'" in src
    assert 'balanced-level-label' in src
    assert 'compact-right-scroll' in src


def test_stock_detail_reduces_blank_space_and_uniforms_right_tiles():
    src = STOCK_DETAIL.read_text()
    assert '.stock-chart-card{display:flex;flex-direction:column;' in src
    assert 'ai-chat-placeholder{flex:1' in src
    assert 'right-uniform-grid' in src
    assert 'grid-template-columns:repeat(auto-fit,minmax(128px,1fr))' in src
