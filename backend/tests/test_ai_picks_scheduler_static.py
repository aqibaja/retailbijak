from pathlib import Path

ROOT = Path('/home/rich27/retailbijak')
SCHEDULER = ROOT / 'backend/scheduler.py'


def test_scheduler_registers_daily_ai_picks_job_at_8am_jakarta():
    content = SCHEDULER.read_text()
    assert 'generate_and_store_daily_ai_pick_report' in content
    assert 'id="daily_ai_picks"' in content or "id='daily_ai_picks'" in content
    assert "day_of_week='mon-fri'" in content
    assert 'hour=8' in content or "hour='8'" in content
    assert 'minute=0' in content or "minute='0'" in content
