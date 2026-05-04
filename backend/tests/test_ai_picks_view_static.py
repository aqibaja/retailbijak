from pathlib import Path

ROOT = Path('/home/rich27/retailbijak')
API = ROOT / 'frontend/js/api.js'
ROUTER = ROOT / 'frontend/js/router.js'
VIEW = ROOT / 'frontend/js/views/ai_picks.js'
DASHBOARD = ROOT / 'frontend/js/views/dashboard.js'
STOCK_DETAIL = ROOT / 'frontend/js/views/stock_detail.js'
STYLE = ROOT / 'frontend/style.css'


def test_api_exposes_fetch_analysis_helper_with_optional_llm_query():
    content = API.read_text()
    assert 'export async function fetchAnalysis(ticker, options = {}) {' in content
    assert "const withLlm = options?.llm ? '?llm=1' : '';" in content
    assert "return apiFetch(`/stocks/${ticker}/analysis${withLlm}`);" in content


def test_api_exposes_fetch_ai_picks_helper_with_safe_fallback_shape():
    content = API.read_text()
    assert "export async function fetchAiPicks(mode = 'swing', limit = 5)" in content
    assert "return apiFetch(`/ai-picks?mode=${safeMode}&limit=${safeLimit}`) || {" in content
    assert "source: 'no_data'" in content
    assert "trading_date: null" in content
    assert "generated_at: null" in content
    assert "freshness: { label: 'Belum ada briefing', is_stale: true, generated_at: null }" in content
    assert "market_context: { tone: 'unknown', breadth_label: 'data belum cukup', latest_date: null }" in content


def test_router_registers_ai_picks_view():
    content = ROUTER.read_text()
    assert "import { renderAiPicks } from './views/ai_picks.js" in content
    assert "else if (baseRoute === 'ai-picks') renderAiPicks(root);" in content


def test_ai_picks_view_exports_render_function_and_shell_hooks():
    content = VIEW.read_text()
    assert 'export async function renderAiPicks(root)' in content
    assert 'ai-picks-page' in content
    assert 'ai-picks-hero' in content
    assert 'ai-picks-mode-switch' in content
    assert 'ai-picks-featured' in content
    assert 'ai-picks-ranked-list' in content
    assert 'ai-picks-compare' in content
    assert 'ai-picks-empty' in content
    assert 'fetchAiPicks' in content


def test_ai_picks_view_contains_daily_briefing_hooks_and_actionable_fields():
    content = VIEW.read_text()
    assert 'AI Picks Hari Ini' in content
    assert 'Premarket briefing otomatis' in content
    assert 'ai-picks-briefing-meta' in content
    assert 'ai-picks-freshness' in content
    assert 'ai-picks-generated-at' in content
    assert 'entry_zone' in content
    assert 'stop_loss' in content
    assert 'take_profit' in content
    assert 'risk_reward' in content
    assert 'thesis' in content
    assert 'risk_notes' in content
    assert 'catalysts' in content


def test_ai_picks_view_contains_compare_tray_and_explainable_metric_hooks():
    content = VIEW.read_text()
    assert 'renderCompareTray' in content
    assert 'renderFactorMeter' in content
    assert 'renderAiDeskBrief' in content
    assert 'ai-picks-compare-grid' in content
    assert 'ai-picks-factor-list' in content
    assert 'ai-picks-factor-meter' in content
    assert 'ai-picks-metric-strip' in content
    assert 'ai-picks-llm-brief' in content
    assert 'runtime_message' in content
    assert 'runtime_state' in content
    assert 'change_pct' in content
    assert 'volume_ratio' in content
    assert 'comparison_points' in content
    assert 'factor_scores' in content
    assert 'data-ai-picks-compare' in content


def test_ai_picks_view_persists_mode_and_exposes_richer_state_markers():
    content = VIEW.read_text()
    assert 'const AI_PICKS_MODE_KEY =' in content
    assert 'localStorage.getItem(' in content
    assert 'localStorage.setItem(' in content
    assert 'data-ai-picks-state="loading"' in content
    assert 'data-ai-picks-state="empty"' in content
    assert 'data-ai-picks-state="error"' in content
    assert 'data-ai-picks-retry' in content


def test_ai_picks_view_supports_detail_context_handoff_and_pin_state():
    content = VIEW.read_text()
    assert 'const AI_PICKS_CONTEXT_KEY =' in content
    assert 'const AI_PICKS_PINNED_KEY =' in content
    assert 'safeSessionStorageSet(' in content
    assert 'safeLocalStorageGetJson(' in content
    assert 'safeLocalStorageSetJson(' in content
    assert 'data-ai-picks-open-detail' in content
    assert 'data-ai-picks-pin' in content
    assert 'ai-picks-pin-active' in content
    assert 'Pin Prioritas' in content
    assert 'Pin aktif' in content
    assert "window.location.hash = `#stock/${ticker}`" in content
    assert 'reason_labels' in content
    assert 'risk_note' in content
    assert 'fit_label' in content
    assert 'entry_zone' in content
    assert 'source_route' in content
    assert 'source_label' in content


def test_ai_picks_and_dashboard_use_indonesian_confidence_copy_with_explanation():
    ai_picks = VIEW.read_text()
    dashboard = DASHBOARD.read_text()
    expected = [
        'Keyakinan',
        'cukup layak dipantau, tetapi belum konfirmasi kuat',
        'konfirmasi teknikal cukup kuat untuk akumulasi bertahap',
    ]
    for marker in expected:
        assert marker in ai_picks or marker in dashboard

    banned = [
        'Confidence ',
        'Conf ',
        'Explainable ranking engine memilih kandidat ini untuk mode swing.',
    ]
    for marker in banned:
        assert marker not in ai_picks
        assert marker not in dashboard


def test_dashboard_contains_top_ai_pick_widget_hooks():
    content = DASHBOARD.read_text()
    assert 'fetchAiPicks' in content
    assert 'Top AI Pick Today' in content
    assert 'dash-ai-pick-card' in content
    assert 'dash-ai-pick-cta' in content
    assert 'dash-ai-pick-summary' in content
    assert 'dash-ai-pick-featured' in content
    assert 'loadAiPickWidget' in content
    assert '#ai-picks' in content
    assert 'const AI_PICKS_CONTEXT_KEY =' in content
    assert 'safeSessionStorageSet(' in content
    assert 'buildAiPickContext(' in content
    assert 'data-dash-ai-pick-open-detail' in content
    assert "window.location.hash = `#stock/${ticker}`" in content
    assert 'dash-ai-pick-alt-list' in content
    assert 'dash-ai-pick-alt-item' in content
    assert 'data-dash-ai-pick-alt-detail' in content
    assert 'picks.slice(1, 3)' in content


def test_stock_detail_can_render_ai_pick_context_banner():
    content = STOCK_DETAIL.read_text()
    assert 'const AI_PICKS_CONTEXT_KEY =' in content
    assert 'safeSessionStorageGet(' in content
    assert 'safeSessionStorageRemove(' in content
    assert 'renderAiPickContextBanner' in content
    assert 'renderAiPreview(' in content
    assert 'fetchAnalysis(symbol, { llm: true })' in content
    assert 'analysis?.llm' in content
    assert 'runtime_message' in content
    assert 'Asisten AI aktif' in content
    assert 'OpenRouter belum aktif' in content
    assert 'stock-ai-pick-context' in content
    assert 'Datang dari AI Picks' in content
    assert 'mode' in content
    assert 'score' in content
    assert 'fit_label' in content
    assert 'Entry' in content
    assert 'Target' in content
    assert 'Invalidasi' in content
    assert 'source_route' in content
    assert 'source_label' in content
    assert 'returnHref' in content
    assert 'heroBackHref' in content
    assert 'Kembali ke shortlist asal' in content
    assert 'data-stock-origin-back' in content
    assert 'stock-ai-pick-context-origin' in content
    assert 'stock-ai-pick-context-cta' in content


def test_ai_picks_styles_exist_for_shell_layout():
    content = STYLE.read_text()
    assert '.ai-picks-page' in content
    assert '.ai-picks-hero' in content
    assert '.ai-picks-summary-strip' in content
    assert '.ai-picks-featured-card' in content
    assert '.ai-picks-rank-card' in content
    assert '.ai-picks-compare-tray' in content
    assert '.ai-picks-briefing-meta' in content
    assert '.ai-picks-freshness' in content


def test_ai_picks_styles_exist_for_compare_and_factor_visuals():
    content = STYLE.read_text()
    assert '.ai-picks-compare-grid' in content
    assert '.ai-picks-compare-card' in content
    assert '.ai-picks-factor-list' in content
    assert '.ai-picks-factor-meter' in content
    assert '.ai-picks-factor-fill' in content
    assert '.ai-picks-metric-strip' in content


def test_ai_picks_styles_cover_loading_empty_and_error_states():
    content = STYLE.read_text()
    assert '.ai-picks-state-card' in content
    assert '.ai-picks-state-stack' in content
    assert '.ai-picks-state-pulse' in content
    assert '.ai-picks-retry-btn' in content


def test_dashboard_styles_cover_top_ai_pick_widget():
    content = STYLE.read_text()
    assert '.dash-ai-pick-card' in content
    assert '.dash-ai-pick-featured' in content
    assert '.dash-ai-pick-metrics' in content
    assert '.dash-ai-pick-summary' in content
    assert '.dash-ai-pick-alt-list' in content
    assert '.dash-ai-pick-alt-item' in content


def test_stock_detail_styles_cover_ai_pick_context_banner():
    content = STYLE.read_text()
    assert '.stock-ai-pick-context' in content
    assert '.stock-ai-pick-context-meta' in content
    assert '.stock-ai-pick-context-origin' in content
    assert '.stock-ai-pick-context-actions' in content
