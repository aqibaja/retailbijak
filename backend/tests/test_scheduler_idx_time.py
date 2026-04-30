from apscheduler.triggers.cron import CronTrigger

from backend.scheduler import jkt_tz


def test_idx_daily_sync_schedule_is_8am_jakarta():
    trigger = CronTrigger(hour=8, minute=0, timezone=jkt_tz)
    assert str(trigger.fields[5]) == "8"
    assert str(trigger.fields[6]) == "0"
    assert str(trigger.timezone) == "Asia/Jakarta"
