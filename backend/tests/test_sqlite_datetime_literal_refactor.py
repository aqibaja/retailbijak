from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAIN = ROOT / 'backend/main.py'
MODULE = ROOT / 'backend/routes/shared_sqlite_helpers.py'


def test_sqlite_datetime_literal_is_moved_out_of_main():
    src = MAIN.read_text(encoding='utf-8')
    assert 'def _sqlite_datetime_literal(' not in src
    assert MODULE.exists()


def test_sqlite_datetime_literal_module_contains_the_helper():
    src = MODULE.read_text(encoding='utf-8')
    assert 'def _sqlite_datetime_literal(' in src
    assert 'return value.strftime("%Y-%m-%d %H:%M:%S.%f")' in src
