from fastapi.testclient import TestClient

from backend.main import app


def test_scanner_stream_route_still_works_via_main_app():
    with TestClient(app) as client:
        with client.stream('GET', '/api/scan?timeframe=1d') as response:
            assert response.status_code == 200
            assert response.headers['content-type'].startswith('text/event-stream')
