from pathlib import Path


FRONTEND_DASHBOARD_VIEW = Path('/home/rich27/retailbijak/frontend/js/views/dashboard.js')
FRONTEND_STYLE = Path('/home/rich27/retailbijak/frontend/style.css')


def test_dashboard_first_fold_uses_summary_strip_and_quote_meta_hooks():
    content = FRONTEND_DASHBOARD_VIEW.read_text()
    assert 'dash-hero-note' in content
    assert 'dash-summary-strip' in content
    assert 'dash-summary-card' in content
    assert 'dash-primary-cta' in content
    assert 'dash-secondary-cta' in content
    assert 'dash-quote-meta' in content
    assert 'dash-quote-freshness' in content
    assert 'Last sync' in content


def test_dashboard_widgets_boot_with_professional_loading_states():
    content = FRONTEND_DASHBOARD_VIEW.read_text()
    assert 'dashboard-widget-state' in content
    assert 'dashboard-widget-state-title' in content
    assert 'dashboard-widget-state-note' in content
    assert 'Loading movers...' not in content
    assert 'Loading intelligence...' not in content
    assert 'Loading news...' not in content


def test_dashboard_phase2_adds_chart_context_and_movers_summary_hooks():
    content = FRONTEND_DASHBOARD_VIEW.read_text()
    assert 'dash-chart-context' in content
    assert 'dash-chart-context-chip' in content
    assert 'dash-chart-readout' in content
    assert 'dash-movers-summary' in content
    assert 'dash-movers-summary-chip' in content
    assert 'dash-mover-row' in content


def test_dashboard_styles_define_summary_strip_widget_state_and_phase2_editorial_system():
    content = FRONTEND_STYLE.read_text()
    assert '.dash-hero-note{' in content
    assert '.dash-summary-strip{' in content
    assert '.dash-summary-card{' in content
    assert '.dash-primary-cta{' in content
    assert '.dash-secondary-cta{' in content
    assert '.dash-quote-meta{' in content
    assert '.dash-quote-freshness{' in content
    assert '.dashboard-widget-state{' in content
    assert '.dashboard-widget-state-title{' in content
    assert '.dashboard-widget-state-note{' in content
    assert '.dash-chart-context{' in content
    assert '.dash-movers-summary{' in content
    assert '.dash-mover-row{' in content
    assert '.dash-bottom-grid-phase2{' in content
    assert '.dash-intel-card{' in content
    assert '.dash-suggestion-reason{' in content
    assert '.dash-news-card-featured{' in content
    assert '.dash-news-meta{' in content
    assert '.dash-actions .btn.dash-primary-cta{min-height:44px' in content
