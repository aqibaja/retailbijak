from pathlib import Path

ROOT = Path('/home/rich27/retailbijak')
API = ROOT / 'frontend/js/api.js'
ROUTER = ROOT / 'frontend/js/router.js'
VIEW = ROOT / 'frontend/js/views/ai_picks.js'
STYLE = ROOT / 'frontend/style.css'


def test_api_exposes_fetch_ai_picks_helper_with_safe_fallback_shape():
    content = API.read_text()
    assert 'export async function fetchAiPicks(mode = \'swing\', limit = 5)' in content
    assert "return apiFetch(`/ai-picks?mode=${safeMode}&limit=${safeLimit}`) || {" in content
    assert "source: 'no_data'" in content
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



def test_ai_picks_view_contains_compare_tray_and_explainable_metric_hooks():
    content = VIEW.read_text()
    assert 'renderCompareTray' in content
    assert 'renderFactorMeter' in content
    assert 'ai-picks-compare-grid' in content
    assert 'ai-picks-factor-list' in content
    assert 'ai-picks-factor-meter' in content
    assert 'ai-picks-metric-strip' in content
    assert 'change_pct' in content
    assert 'volume_ratio' in content
    assert 'comparison_points' in content
    assert 'factor_scores' in content
    assert 'data-ai-picks-compare' in content



def test_ai_picks_styles_exist_for_shell_layout():
    content = STYLE.read_text()
    assert '.ai-picks-page' in content
    assert '.ai-picks-hero' in content
    assert '.ai-picks-summary-strip' in content
    assert '.ai-picks-featured-card' in content
    assert '.ai-picks-rank-card' in content
    assert '.ai-picks-compare-tray' in content



def test_ai_picks_styles_exist_for_compare_and_factor_visuals():
    content = STYLE.read_text()
    assert '.ai-picks-compare-grid' in content
    assert '.ai-picks-compare-card' in content
    assert '.ai-picks-factor-list' in content
    assert '.ai-picks-factor-meter' in content
    assert '.ai-picks-factor-fill' in content
    assert '.ai-picks-metric-strip' in content
