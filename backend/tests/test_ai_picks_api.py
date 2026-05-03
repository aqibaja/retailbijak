from fastapi.testclient import TestClient

from backend.ai_picks import build_ai_picks_fallback_payload
from backend.main import app


KNOWN_MODES = ("swing", "defensive", "catalyst")
EXPLAINABILITY_KEYS = {
    'ticker', 'name', 'rank', 'score', 'confidence', 'horizon', 'fit_label',
    'reason_codes', 'reason_labels', 'risk_note', 'entry_style', 'entry_zone',
    'invalidation', 'target_zone', 'catalyst', 'source', 'latest_close',
    'change_pct', 'volume_ratio', 'bars_count', 'factor_scores', 'comparison_points',
}


def test_ai_picks_endpoint_returns_expected_top_level_shape():
    with TestClient(app) as client:
        res = client.get('/api/ai-picks')

    assert res.status_code == 200
    data = res.json()
    assert set(data.keys()) == {'mode', 'updated_at', 'source', 'market_context', 'summary', 'data'}
    assert data['mode'] == 'swing'
    assert data['source'] in {'derived', 'db', 'no_data'}
    assert isinstance(data['market_context'], dict)
    assert set(data['market_context'].keys()) == {'tone', 'breadth_label', 'latest_date'}
    assert isinstance(data['summary'], dict)
    assert set(data['summary'].keys()) == {'candidates_analyzed', 'eligible_count', 'featured_ticker'}


def test_ai_picks_endpoint_returns_list_for_data_even_when_empty():
    with TestClient(app) as client:
        res = client.get('/api/ai-picks?mode=swing&limit=5')

    assert res.status_code == 200
    data = res.json()
    assert isinstance(data['data'], list)



def test_ai_picks_endpoint_supports_known_modes():
    with TestClient(app) as client:
        for mode in KNOWN_MODES:
            res = client.get(f'/api/ai-picks?mode={mode}&limit=3')
            assert res.status_code == 200
            data = res.json()
            assert data['mode'] == mode
            assert isinstance(data['data'], list)



def test_ai_picks_endpoint_handles_unknown_mode_safely():
    with TestClient(app) as client:
        res = client.get('/api/ai-picks?mode=unknown-mode')

    assert res.status_code == 200
    data = res.json()
    assert data['mode'] == 'swing'
    assert data['source'] in {'derived', 'db', 'no_data'}
    assert isinstance(data['data'], list)



def test_ai_picks_endpoint_live_rows_include_explainable_metrics_and_compare_points():
    with TestClient(app) as client:
        res = client.get('/api/ai-picks?mode=swing&limit=3')

    assert res.status_code == 200
    data = res.json()
    if data['source'] != 'derived' or not data['data']:
        return

    first = data['data'][0]
    assert EXPLAINABILITY_KEYS.issubset(first.keys())
    assert set(first['factor_scores'].keys()) == {'technical', 'liquidity', 'fundamental', 'catalyst', 'risk'}
    assert set(first['comparison_points'].keys()) == {'technical_label', 'liquidity_label', 'fundamental_label', 'catalyst_label'}
    assert isinstance(first['latest_close'], (int, float))
    assert isinstance(first['change_pct'], (int, float))
    assert isinstance(first['volume_ratio'], (int, float))
    assert first['bars_count'] >= 30



def test_ai_picks_endpoint_honors_limit_on_ranked_rows():
    with TestClient(app) as client:
        res = client.get('/api/ai-picks?mode=catalyst&limit=2')

    assert res.status_code == 200
    data = res.json()
    assert len(data['data']) <= 2
    if data['source'] == 'derived' and data['data']:
        assert len(data['data']) == 2
        assert [row['rank'] for row in data['data']] == [1, 2]



def test_ai_picks_fallback_payload_keeps_stable_no_data_summary_defaults():
    data = build_ai_picks_fallback_payload('defensive')

    assert data['summary'] == {
        'candidates_analyzed': 0,
        'eligible_count': 0,
        'featured_ticker': None,
    }
    assert data['market_context']['tone'] in {'unknown', 'bullish', 'neutral', 'defensive'}
    assert data['market_context']['breadth_label']
