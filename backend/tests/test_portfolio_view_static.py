from pathlib import Path


PORTFOLIO_VIEW = Path('/home/rich27/retailbijak/frontend/js/views/portfolio.js')
STYLE = Path('/home/rich27/retailbijak/frontend/style.css')


def test_portfolio_view_uses_compact_shell_and_editorial_table_rows():
    content = PORTFOLIO_VIEW.read_text()
    assert 'portfolio-page-pro' in content
    assert 'portfolio-header' in content
    assert 'portfolio-tab-switch' in content
    assert 'portfolio-table-shell' in content
    assert 'portfolio-row-kicker' in content
    assert 'portfolio-row-note' in content
    assert 'portfolio-meta-rail' in content
    assert 'portfolio-summary' in content


def test_portfolio_styles_define_compact_hierarchy_and_mobile_stack():
    content = STYLE.read_text()
    assert '.portfolio-page-pro {' in content
    assert '.portfolio-header {' in content
    assert '.portfolio-tab-switch {' in content
    assert '.portfolio-table-shell {' in content
    assert '.portfolio-row-kicker {' in content
    assert '.portfolio-meta-rail {' in content
    assert '.portfolio-summary {' in content
    assert '@media (max-width: 768px) {' in content
