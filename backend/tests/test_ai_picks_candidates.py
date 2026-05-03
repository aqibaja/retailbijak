from fastapi.testclient import TestClient

from backend.ai_picks import build_candidate_universe, compose_pick_payload
from backend.main import app



def test_build_candidate_universe_returns_rows_from_ohlcv_not_signals():
    rows = build_candidate_universe(limit_universe=5, mode='swing')

    assert isinstance(rows, list)
    assert rows
    first = rows[0]
    assert first['ticker']
    assert first['bars_count'] >= 30
    assert first['latest_close'] > 0
    assert first['avg_volume_20'] >= 0
    assert 'factors' in first
    assert isinstance(first['factors'], dict)



def test_build_candidate_universe_excludes_rows_with_insufficient_history():
    rows = build_candidate_universe(limit_universe=25, mode='swing', min_bars=60)

    assert rows == []



def test_compose_pick_payload_returns_ranked_explainable_shape():
    candidate = build_candidate_universe(limit_universe=1, mode='swing')[0]

    payload = compose_pick_payload(candidate, rank=1, mode='swing')

    assert payload['ticker']
    assert payload['name']
    assert payload['rank'] == 1
    assert payload['score'] >= 0
    assert 35 <= payload['confidence'] <= 95
    assert payload['fit_label']
    assert isinstance(payload['reason_labels'], list)
    assert payload['reason_labels']
    assert 'risk_note' in payload
    assert 'entry_style' in payload
    assert 'entry_zone' in payload
    assert 'invalidation' in payload
    assert 'target_zone' in payload
    assert payload['source'] == 'derived'
    assert 'comparison_points' in payload
    assert 'headline' in payload['comparison_points']
    assert 'risk_label' in payload['comparison_points']
    assert 'timing_label' in payload['comparison_points']



def test_ai_picks_endpoint_returns_ranked_rows_when_data_is_available():
    with TestClient(app) as client:
        res = client.get('/api/ai-picks?mode=swing&limit=5')

    assert res.status_code == 200
    data = res.json()
    assert data['source'] == 'derived'
    assert data['summary']['candidates_analyzed'] > 0
    assert data['summary']['eligible_count'] > 0
    assert data['summary']['featured_ticker']
    assert data['data']
    assert len(data['data']) <= 5
    scores = [row['score'] for row in data['data']]
    assert scores == sorted(scores, reverse=True)



def test_ai_picks_endpoint_returns_valid_shape_for_all_modes():
    with TestClient(app) as client:
        for mode in ('swing', 'defensive', 'catalyst'):
            res = client.get(f'/api/ai-picks?mode={mode}&limit=3')
            assert res.status_code == 200
            data = res.json()
            assert data['mode'] == mode
            assert data['source'] in {'derived', 'no_data', 'db'}
            assert isinstance(data['data'], list)
