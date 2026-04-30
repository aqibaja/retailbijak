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
