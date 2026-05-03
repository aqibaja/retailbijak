from fastapi.testclient import TestClient

from backend.main import app


def test_stock_analysis_endpoint_optionally_includes_llm_payload(monkeypatch):
    from backend.routes import stock_detail

    def fake_llm_payload(*, ticker, row, analysis):
        return {
            'status': 'ok',
            'model': 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
            'summary': f'{ticker} layak dipantau',
            'bullets': ['momentum membaik', 'risiko terukur'],
        }

    monkeypatch.setattr(stock_detail, 'build_stock_analysis_llm_payload', fake_llm_payload)

    with TestClient(app) as client:
        res = client.get('/api/stocks/BBCA/analysis?llm=1')

    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'ok'
    assert data['source'] == 'scanner_engine'
    assert data['llm']['status'] == 'ok'
    assert data['llm']['model'] == 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'
    assert data['llm']['summary']
