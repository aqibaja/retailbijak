from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_stock_detail_view_does_not_embed_inline_style_block():
    content = (ROOT / 'frontend/js/views/stock_detail.js').read_text(encoding='utf-8')
    assert '<style>' not in content
