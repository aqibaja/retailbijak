from __future__ import annotations

from fastapi import APIRouter

try:
    from scheduler import scheduler
except ModuleNotFoundError:
    from backend.scheduler import scheduler

router = APIRouter()


@router.get('/api/health')
def health():
    return {'status': 'ok', 'version': '1.0.0'}


@router.get('/api/scheduler-health')
def scheduler_health():
    jobs = []
    try:
        for job in scheduler.get_jobs():
            next_run = job.next_run_time.isoformat() if job.next_run_time else None
            jobs.append({
                'id': job.id,
                'name': job.name,
                'next_run_time': next_run,
                'trigger': str(job.trigger),
            })
        return {'status': 'ok', 'source': 'apscheduler', 'count': len(jobs), 'data': jobs}
    except Exception as exc:
        return {'status': 'error', 'source': 'apscheduler', 'count': 0, 'data': [], 'error': str(exc)}


@router.get('/api/scheduler-jobs')
def scheduler_jobs():
    try:
        return {'status': 'ok', 'source': 'apscheduler', 'count': len(scheduler.get_jobs()), 'data': [j.id for j in scheduler.get_jobs()]}
    except Exception as exc:
        return {'status': 'error', 'source': 'apscheduler', 'count': 0, 'data': [], 'error': str(exc)}
