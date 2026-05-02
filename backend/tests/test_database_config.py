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
