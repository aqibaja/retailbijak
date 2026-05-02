from fastapi.testclient import TestClient

from backend.main import app


def test_system_routes_still_work_via_main_app():
    with TestClient(app) as client:
        health = client.get('/api/health')
        scheduler_health = client.get('/api/scheduler-health')
        scheduler_jobs = client.get('/api/scheduler-jobs')

    assert health.status_code == 200
    assert health.json()['status'] == 'ok'
    assert health.json()['version'] == '1.0.0'

    assert scheduler_health.status_code == 200
    payload = scheduler_health.json()
    assert payload['source'] == 'apscheduler'
    assert 'count' in payload
    assert 'data' in payload

    assert scheduler_jobs.status_code == 200
    payload = scheduler_jobs.json()
    assert payload['source'] == 'apscheduler'
    assert 'count' in payload
    assert 'data' in payload
