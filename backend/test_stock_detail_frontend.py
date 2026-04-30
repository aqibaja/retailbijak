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
