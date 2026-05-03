from __future__ import annotations

import importlib
import sys


def _reload_database_module(monkeypatch):
    monkeypatch.delitem(sys.modules, 'backend.database', raising=False)
    return importlib.import_module('backend.database')


def test_database_uses_default_runtime_sqlite_path(monkeypatch):
    monkeypatch.delenv('SQLALCHEMY_DATABASE_URL', raising=False)

    database = _reload_database_module(monkeypatch)

    assert database.SQLALCHEMY_DATABASE_URL == 'sqlite:////opt/swingaq/backend/swingaq.db'


def test_database_url_can_be_overridden_by_env(monkeypatch):
    monkeypatch.setenv('SQLALCHEMY_DATABASE_URL', 'sqlite:////tmp/retailbijak-test.db')

    database = _reload_database_module(monkeypatch)

    assert database.SQLALCHEMY_DATABASE_URL == 'sqlite:////tmp/retailbijak-test.db'


def test_database_defines_daily_ai_pick_report_model(monkeypatch):
    database = _reload_database_module(monkeypatch)

    assert hasattr(database, 'DailyAIPickReport')
    model = database.DailyAIPickReport
    columns = model.__table__.columns
    assert model.__tablename__ == 'daily_ai_pick_reports'
    assert 'trading_date' in columns
    assert 'generated_at' in columns
    assert 'payload_json' in columns
