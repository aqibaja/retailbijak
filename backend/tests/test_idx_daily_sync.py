from backend.jobs.idx_daily_sync import run_idx_daily_sync


def test_sync_handles_empty_ticker_list():
    result = run_idx_daily_sync([])
    assert result["ok"] == 0
    assert result["failed"] == 0
    assert "synced_at" in result
