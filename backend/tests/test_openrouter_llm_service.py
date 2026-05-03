from backend.services import openrouter_llm


class DummyResponse:
    def __init__(self, status_code, payload=None, text=None):
        self.status_code = status_code
        self._payload = payload
        self.text = text if text is not None else str(payload)

    def json(self):
        if self._payload is None:
            raise ValueError('no json payload')
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f'HTTP {self.status_code}')



def test_build_ai_picks_llm_payload_surfaces_rate_limit_message(monkeypatch):
    monkeypatch.setattr(openrouter_llm, 'get_openrouter_config', lambda db=None: {
        'enabled': True,
        'api_key': '***',
        'site_url': 'https://retailbijak.rich27.my.id',
        'app_name': 'RetailBijak',
        'stock_analysis_model': 'openai/gpt-oss-120b:free',
        'ai_picks_model': 'openai/gpt-oss-120b:free',
    })
    monkeypatch.setattr(openrouter_llm, 'get_openrouter_runtime_status', lambda config: {
        'state': 'ok',
        'message': 'API key OpenRouter tervalidasi.',
    })
    monkeypatch.setattr(openrouter_llm.requests, 'post', lambda *args, **kwargs: DummyResponse(429, {
        'error': {
            'message': 'Provider returned error',
            'code': 429,
            'metadata': {
                'raw': 'openai/gpt-oss-120b:free is temporarily rate-limited upstream. Please retry shortly.',
                'provider_name': 'OpenInference',
            },
        },
    }))

    payload = openrouter_llm.build_ai_picks_llm_payload(
        mode='swing',
        picks=[{'ticker': 'BUMI', 'score': 80.3, 'confidence': 80}],
        market_context={'tone': 'defensive'},
        db=None,
    )

    assert payload['status'] == 'error'
    assert payload['runtime_state'] == 'rate_limited'
    assert 'rate limit' in payload['runtime_message'].lower()
    assert 'temporarily rate-limited upstream' in payload['summary']


def test_build_ai_picks_llm_payload_handles_leading_whitespace_body(monkeypatch):
    monkeypatch.setattr(openrouter_llm, 'get_openrouter_config', lambda db=None: {
        'enabled': True,
        'api_key': '***',
        'site_url': 'https://retailbijak.rich27.my.id',
        'app_name': 'RetailBijak',
        'stock_analysis_model': 'openai/gpt-oss-120b:free',
        'ai_picks_model': 'openai/gpt-oss-120b:free',
    })
    monkeypatch.setattr(openrouter_llm, 'get_openrouter_runtime_status', lambda config: {
        'state': 'ok',
        'message': 'API key OpenRouter tervalidasi.',
    })
    monkeypatch.setattr(openrouter_llm.requests, 'post', lambda *args, **kwargs: DummyResponse(200, {
        'provider': 'OpenInference',
        'choices': [{
            'message': {
                'content': '\n\n  {"summary":"ringkas","market_bias":"netral","pick_notes":{"BBCA":"leader defensif"}}  '
            }
        }],
    }))

    payload = openrouter_llm.build_ai_picks_llm_payload(
        mode='swing',
        picks=[{'ticker': 'BBCA', 'score': 80.3, 'confidence': 80}],
        market_context={'tone': 'defensive'},
        db=None,
    )

    assert payload['status'] == 'ok'
    assert payload['summary'] == 'ringkas'
    assert payload['pick_notes']['BBCA'] == 'leader defensif'
    assert payload['provider'] == 'OpenInference'


def test_build_ai_picks_llm_payload_handles_prefixed_json_body(monkeypatch):
    monkeypatch.setattr(openrouter_llm, 'get_openrouter_config', lambda db=None: {
        'enabled': True,
        'api_key': '***',
        'site_url': 'https://retailbijak.rich27.my.id',
        'app_name': 'RetailBijak',
        'stock_analysis_model': 'openai/gpt-oss-120b:free',
        'ai_picks_model': 'openai/gpt-oss-120b:free',
    })
    monkeypatch.setattr(openrouter_llm, 'get_openrouter_runtime_status', lambda config: {
        'state': 'ok',
        'message': 'API key OpenRouter tervalidasi.',
    })
    monkeypatch.setattr(openrouter_llm.requests, 'post', lambda *args, **kwargs: DummyResponse(
        200,
        None,
        text='\n\n debug trace\n{\"provider\":\"OpenInference\",\"choices\":[{\"message\":{\"content\":\"{\\\"summary\\\":\\\"ringkas\\\",\\\"market_bias\\\":\\\"netral\\\",\\\"pick_notes\\\":{\\\"BBCA\\\":\\\"leader defensif\\\"}}\"}}]}'
    ))

    payload = openrouter_llm.build_ai_picks_llm_payload(
        mode='swing',
        picks=[{'ticker': 'BBCA', 'score': 80.3, 'confidence': 80}],
        market_context={'tone': 'defensive'},
        db=None,
    )

    assert payload['status'] == 'ok'
    assert payload['summary'] == 'ringkas'
    assert payload['provider'] == 'OpenInference'


def test_build_ai_picks_llm_payload_handles_non_json_content(monkeypatch):
    monkeypatch.setattr(openrouter_llm, 'get_openrouter_config', lambda db=None: {
        'enabled': True,
        'api_key': '***',
        'site_url': 'https://retailbijak.rich27.my.id',
        'app_name': 'RetailBijak',
        'stock_analysis_model': 'openai/gpt-oss-120b:free',
        'ai_picks_model': 'openai/gpt-oss-120b:free',
    })
    monkeypatch.setattr(openrouter_llm, 'get_openrouter_runtime_status', lambda config: {
        'state': 'ok',
        'message': 'API key OpenRouter tervalidasi.',
    })
    monkeypatch.setattr(openrouter_llm.requests, 'post', lambda *args, **kwargs: DummyResponse(200, {
        'provider': 'OpenInference',
        'choices': [{'message': {'content': 'plain text only'}}],
    }))

    payload = openrouter_llm.build_ai_picks_llm_payload(
        mode='swing',
        picks=[{'ticker': 'BBCA', 'score': 80.3, 'confidence': 80}],
        market_context={'tone': 'defensive'},
        db=None,
    )

    assert payload['status'] == 'error'
    assert payload['runtime_state'] == 'unknown'
    assert 'bukan JSON valid' in payload['summary']
