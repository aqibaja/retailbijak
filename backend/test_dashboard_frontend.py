from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DASHBOARD = ROOT / "frontend" / "js" / "views" / "dashboard.js"


def test_dashboard_market_intelligence_uses_live_breadth_and_movers_endpoints():
    src = DASHBOARD.read_text()
    assert 'fetchMarketBreadth' in src
    assert 'fetchTopMovers(5, \'losers\')' in src
    assert 'Breadth:' in src
    assert 'advancers vs' in src
    assert 'bias positif' in src or 'tekanan dominan' in src
    assert 'summary?.advancers ?? 328' not in src
    assert 'summary?.decliners ?? 271' not in src


def test_dashboard_top_movers_panel_uses_gainers_only_feed():
    src = DASHBOARD.read_text()
    assert 'fetchTopMovers(5, \'gainers\')' in src
    assert 'change_pct ?? r.change ?? 0' in src
    assert 'const MOVERS = [' in src
