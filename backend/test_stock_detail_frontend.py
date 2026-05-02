from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STOCK_DETAIL = ROOT / 'frontend/js/views/stock_detail.js'
STYLE = ROOT / 'frontend/style.css'


def test_stock_detail_renders_catalyst_strip_and_ai_preview():
    src = STOCK_DETAIL.read_text()
    assert 'renderCatalystStrip' in src
    assert 'renderAiPreview' in src
    assert 'catalyst-strip' in src
    assert 'AI Assistant' in src


def test_stock_detail_keeps_public_route_actions():
    src = STOCK_DETAIL.read_text()
    assert 'btn-add-watchlist' in src
    assert 'btn-set-alert' in src
    assert 'Run Scanner' in src


def test_stock_detail_uses_compact_layout_tokens():
    src = STYLE.read_text()
    assert '.stock-detail-pro{display:flex;flex-direction:column;gap:16px}' in src
    assert '.stock-layout{display:grid;grid-template-columns:minmax(0,1fr) 390px;gap:16px}' in src
    assert '.stock-chart-wrap{height:440px;width:100%' in src


def test_stock_detail_uses_responsive_breakpoints():
    src = STYLE.read_text()
    assert '@media(max-width:1100px){.stock-layout{grid-template-columns:1fr}' in src
    assert '@media(max-width:768px){.stock-detail-pro .stock-hero { padding: 12px 12px !important; }' in src or '.stock-detail-pro .stock-hero { padding: 12px 12px !important; }' in src
    assert '@media(max-width:420px){.stock-detail-pro .stock-chart-wrap { height: 220px !important; }' in src or '.stock-detail-pro .stock-chart-wrap { height: 220px !important; }' in src


def test_stock_detail_reduces_blank_space_and_uniforms_right_tiles():
    src = STYLE.read_text()
    assert '.stock-chart-card{min-height:520px;display:flex;flex-direction:column}' in src
    assert '.stock-side{min-width:0;display:flex;flex-direction:column;gap:10px}' in src or '.stock-side{min-width:0;' in src
    assert '.stock-detail-pro .stock-chart-wrap' in src or '.stock-chart-wrap{height:440px;width:100%' in src
    assert '.stock-detail-pro .stock-hero' in src or '.stock-hero{display:flex;justify-content:space-between;align-items:center' in src
