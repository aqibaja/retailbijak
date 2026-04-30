import importlib


def test_idx_daily_sync_imports_from_backend_cwd(monkeypatch):
    module = importlib.import_module('jobs.idx_daily_sync')
    result = module.run_idx_daily_sync([])
    assert result['ok'] == 0
    assert result['failed'] == 0


def test_scheduler_registers_idx_daily_sync_job():
    import scheduler
    job_ids = {job.id for job in scheduler.scheduler.get_jobs()}
    # clear stale jobs from prior imports, init_scheduler should add idempotently
    sched = scheduler.init_scheduler()
    job_ids = {job.id for job in sched.get_jobs()}
    assert 'idx_daily_sync' in job_ids
    if sched.running:
        sched.shutdown(wait=False)
