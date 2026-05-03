from __future__ import annotations

from datetime import date

from backend.ai_picks import build_ai_picks_fallback_payload
from backend.main import app
from backend.database import DailyAIPickReport
from fastapi.testclient import TestClient


KNOWN_MODES = ("swing", "defensive", "catalyst")
EXPLAINABILITY_KEYS = {
    'ticker', 'name', 'rank', 'score', 'confidence', 'horizon', 'fit_label',
    'reason_codes', 'reason_labels', 'risk_note', 'entry_style', 'entry_zone',
    'invalidation', 'target_zone', 'catalyst', 'source', 'latest_close',
    'change_pct', 'volume_ratio', 'bars_count', 'factor_scores', 'comparison_points',
}
ACTIONABLE_KEYS = {
    'ticker', 'thesis', 'entry_zone', 'stop_loss', 'take_profit', 'risk_reward', 'risk_notes', 'catalysts'
}


def test_daily_ai_pick_report_model_exposes_persistent_briefing_fields():
    columns = DailyAIPickReport.__table__.columns
    assert DailyAIPickReport.__tablename__ == 'daily_ai_pick_reports'
    for key in (
        'id', 'trading_date', 'generated_at', 'mode', 'market_bias', 'summary',
        'runtime_state', 'runtime_message', 'model', 'payload_json'
    ):
        assert key in columns


def test_ai_picks_endpoint_returns_expected_top_level_shape():
    with TestClient(app) as client:
        res = client.get('/api/ai-picks')

    assert res.status_code == 200
    data = res.json()
    assert set(data.keys()) == {
        'mode', 'trading_date', 'generated_at', 'as_of_label', 'updated_at', 'source', 'market_context',
        'market_bias', 'summary', 'freshness', 'data'
    }
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
    assert set(first['comparison_points'].keys()) == {
        'headline', 'technical_label', 'liquidity_label', 'fundamental_label', 'catalyst_label', 'risk_label', 'timing_label'
    }
    assert isinstance(first['latest_close'], (int, float))
    assert isinstance(first['change_pct'], (int, float))
    assert isinstance(first['volume_ratio'], (int, float))
    assert first['bars_count'] >= 30



def test_ai_picks_endpoint_returns_empty_ranked_rows_for_zero_or_negative_limit():
    with TestClient(app) as client:
        for limit in (0, -2):
            res = client.get(f'/api/ai-picks?mode=swing&limit={limit}')
            assert res.status_code == 200
            data = res.json()
            assert data['mode'] == 'swing'
            assert data['data'] == []
            assert data['summary']['featured_ticker'] is None



def test_ai_picks_endpoint_caps_excessive_limit_to_small_safe_window():
    with TestClient(app) as client:
        res = client.get('/api/ai-picks?mode=swing&limit=1000')

    assert res.status_code == 200
    data = res.json()
    assert len(data['data']) <= 20
    if data['data']:
        assert data['summary']['featured_ticker'] == data['data'][0]['ticker']



def test_ai_picks_endpoint_honors_limit_on_ranked_rows():
    with TestClient(app) as client:
        res = client.get('/api/ai-picks?mode=catalyst&limit=2')

    assert res.status_code == 200
    data = res.json()
    assert len(data['data']) <= 2
    if data['source'] == 'derived' and data['data']:
        assert len(data['data']) == 2
        assert [row['rank'] for row in data['data']] == [1, 2]



def test_ai_picks_endpoint_rows_include_actionable_daily_trade_fields():
    with TestClient(app) as client:
        res = client.get('/api/ai-picks?mode=swing&limit=3')

    assert res.status_code == 200
    data = res.json()
    if not data['data']:
        return
    first = data['data'][0]
    assert ACTIONABLE_KEYS.issubset(first.keys())
    assert first['thesis']
    assert first['entry_zone'] is not None
    assert first['stop_loss'] is not None
    assert first['take_profit'] is not None
    assert first['risk_reward']
    assert isinstance(first['catalysts'], list)
    assert first['risk_notes']



def test_ai_picks_endpoint_exposes_daily_briefing_freshness_metadata():
    with TestClient(app) as client:
        res = client.get('/api/ai-picks?mode=swing&limit=3')

    assert res.status_code == 200
    data = res.json()
    assert 'trading_date' in data
    assert 'generated_at' in data
    assert 'as_of_label' in data
    assert 'freshness' in data
    assert set(data['freshness'].keys()) == {'label', 'is_stale', 'generated_at'}



def test_ai_picks_endpoint_optionally_includes_llm_payload(monkeypatch):
    from backend import ai_picks as ai_picks_module

    def fake_llm_payload(*, mode, picks, market_context):
        return {
            'status': 'ok',
            'model': 'openai/gpt-oss-120b:free',
            'summary': f'{mode} picks siap dibaca',
            'pick_notes': {'BBCA': 'leader defensif'},
            'runtime_state': 'ok',
            'runtime_message': 'API key OpenRouter tervalidasi.',
        }

    monkeypatch.setattr(ai_picks_module, 'build_ai_picks_llm_payload', fake_llm_payload)

    with TestClient(app) as client:
        res = client.get('/api/ai-picks?mode=swing&limit=2&llm=1')

    assert res.status_code == 200
    data = res.json()
    assert data['llm']['status'] == 'ok'
    assert data['llm']['model'] == 'openai/gpt-oss-120b:free'
    assert data['llm']['summary']
    assert data['llm']['runtime_state'] == 'ok'
    assert data['llm']['runtime_message'] == 'API key OpenRouter tervalidasi.'


def test_ai_picks_endpoint_surfaces_invalid_runtime_message(monkeypatch):
    from backend import ai_picks as ai_picks_module

    def fake_llm_payload(*, mode, picks, market_context, db=None):
        return {
            'status': 'error',
            'model': 'openai/gpt-oss-120b:free',
            'summary': 'API key OpenRouter ditolak provider: User not found.',
            'pick_notes': {},
            'runtime_state': 'invalid',
            'runtime_message': 'API key OpenRouter ditolak provider: User not found.',
        }

    monkeypatch.setattr(ai_picks_module, 'build_ai_picks_llm_payload', fake_llm_payload)

    with TestClient(app) as client:
        res = client.get('/api/ai-picks?mode=swing&limit=2&llm=1')

    assert res.status_code == 200
    data = res.json()
    assert data['llm']['status'] == 'error'
    assert data['llm']['runtime_state'] == 'invalid'
    assert data['llm']['runtime_message'] == 'API key OpenRouter ditolak provider: User not found.'
    assert data['llm']['summary'] == 'API key OpenRouter ditolak provider: User not found.'


def test_ai_picks_endpoint_surfaces_rate_limit_runtime_message(monkeypatch):
    from backend import ai_picks as ai_picks_module

    def fake_llm_payload(*, mode, picks, market_context, db=None):
        return {
            'status': 'error',
            'model': 'openai/gpt-oss-120b:free',
            'summary': 'LLM sementara kena rate limit upstream: openai/gpt-oss-120b:free is temporarily rate-limited upstream.',
            'pick_notes': {},
            'runtime_state': 'rate_limited',
            'runtime_message': 'LLM sementara kena rate limit upstream: openai/gpt-oss-120b:free is temporarily rate-limited upstream.',
        }

    monkeypatch.setattr(ai_picks_module, 'build_ai_picks_llm_payload', fake_llm_payload)

    with TestClient(app) as client:
        res = client.get('/api/ai-picks?mode=swing&limit=2&llm=1')

    assert res.status_code == 200
    data = res.json()
    assert data['llm']['status'] == 'error'
    assert data['llm']['runtime_state'] == 'rate_limited'
    assert 'rate limit' in data['llm']['runtime_message'].lower()
    assert 'temporarily rate-limited upstream' in data['llm']['summary']



def test_ai_picks_fallback_payload_keeps_stable_no_data_summary_defaults():
    data = build_ai_picks_fallback_payload('defensive')

    assert data['summary'] == {
        'candidates_analyzed': 0,
        'eligible_count': 0,
        'featured_ticker': None,
    }
    assert data['market_context']['tone'] in {'unknown', 'bullish', 'neutral', 'defensive'}
    assert data['market_context']['breadth_label']
    assert data['trading_date'] in {None, str(date.today())}
