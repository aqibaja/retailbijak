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
    assert 'ai-picks-compact-hero' in content
    assert 'ai-picks-hero-row' in content
    assert 'ai-picks-hero-title' in content
    assert 'ai-picks-mode-switch' in content
    assert 'ai-picks-summary-strip' in content
    assert 'ai-picks-list' in content
    assert 'ai-picks-card' in content
    assert 'fetchAiPicks' in content
    assert 'modeCache' in content


def test_ai_picks_view_contains_daily_briefing_hooks_and_actionable_fields():
    content = VIEW.read_text()
    assert 'AI Picks Hari Ini' in content
    assert 'ai-picks-compact-hero' in content
    assert 'ai-picks-hero-meta' in content
    assert 'ai-picks-brief-collapsible' in content
    assert 'ai-picks-brief-summary' in content
    assert 'entry_zone' in content
    assert 'stop_loss' in content
    assert 'take_profit' in content
    assert 'risk_reward' in content
    assert 'thesis' in content
    assert 'risk_notes' in content
    assert 'catalysts' in content


def test_ai_picks_view_contains_compact_card_and_factor_hooks():
    content = VIEW.read_text()
    assert 'renderCompactCard' in content
    assert 'renderFactorMeter' in content
    assert 'ai-picks-card-head' in content
    assert 'ai-picks-card-meta' in content
    assert 'ai-picks-card-thesis' in content
    assert 'ai-picks-card-actions' in content
    assert 'ai-picks-factor-list' in content
    assert 'ai-picks-factor-meter' in content
    assert 'ai-picks-factor-fill' in content
    assert 'data-toggle-factors' in content
    assert 'data-open-detail' in content
    assert 'data-save' in content
    assert 'factor_scores' in content


def test_ai_picks_view_persists_mode_and_exposes_state_markers():
    content = VIEW.read_text()
    assert 'const AI_PICKS_MODE_KEY =' in content
    assert 'localStorage.getItem(' in content
    assert 'localStorage.setItem(' in content
    assert 'data-state=\"loading\"' in content
    assert 'data-state=\"empty\"' in content
    assert 'data-state=\"error\"' in content
    assert 'data-retry' in content


def test_ai_picks_view_supports_detail_context_handoff():
    content = VIEW.read_text()
    assert 'const AI_PICKS_CONTEXT_KEY =' in content
    assert 'safeSessionStorageSet(' in content
    assert 'data-open-detail' in content
    assert "window.location.hash = `#stock/${ticker}`" in content
    assert 'reason_labels' in content
    assert 'risk_note' in content
    assert 'fit_label' in content
    assert 'entry_zone' in content
    assert 'source_route' in content
    assert 'source_label' in content


def test_ai_picks_uses_mode_cache():
    content = VIEW.read_text()
    assert 'modeCache' in content
    assert 'modeCache[mode]' in content
    assert 'extractHeroHtml' in content
    assert 'extractSummaryHtml' in content
    assert 'renderCardList' in content


def test_ai_picks_and_dashboard_use_indonesian_confidence_copy_with_explanation():
    ai_picks = VIEW.read_text()
    dashboard = DASHBOARD.read_text()
    expected = [
        'Keyakinan',
        'cukup layak dipantau, belum konfirmasi kuat',
        'konfirmasi cukup kuat untuk akumulasi bertahap',
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


def test_ai_picks_styles_exist_for_compact_layout():
    content = STYLE.read_text()
    assert '.ai-picks-page' in content
    assert '.ai-picks-compact-hero' in content
    assert '.ai-picks-hero-row' in content
    assert '.ai-picks-hero-title' in content
    assert '.ai-picks-summary-strip' in content
    assert '.ai-picks-brief-collapsible' in content
    assert '.ai-picks-list' in content
    assert '.ai-picks-card' in content


def test_ai_picks_styles_exist_for_card_and_factor_visuals():
    content = STYLE.read_text()
    assert '.ai-picks-card-head' in content
    assert '.ai-picks-card-meta' in content
    assert '.ai-picks-card-thesis' in content
    assert '.ai-picks-card-actions' in content
    assert '.ai-picks-card-factors' in content
    assert '.ai-picks-factor-list' in content
    assert '.ai-picks-factor-meter' in content
    assert '.ai-picks-factor-fill' in content


def test_ai_picks_styles_cover_loading_empty_and_error_states():
    content = STYLE.read_text()
    assert '.ai-picks-state-card' in content
    assert '.ai-picks-state-stack' in content
    assert '.ai-picks-state-pulse' in content


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
