from __future__ import annotations

import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@pytest.fixture
def isolated_db_session(monkeypatch, tmp_path):
    from backend import database
    from backend.jobs import idx_daily_sync

    db_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    database.Base.metadata.create_all(bind=engine)

    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", TestingSessionLocal)
    try:
        import database as top_database
        monkeypatch.setattr(top_database, "engine", engine)
        monkeypatch.setattr(top_database, "SessionLocal", TestingSessionLocal)
    except Exception:
        pass
    try:
        import main as app_main
        monkeypatch.setattr(app_main, "engine", engine)
        monkeypatch.setattr(app_main, "SessionLocal", TestingSessionLocal)
        def override_get_db():
            db = TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()
        app_main.app.dependency_overrides[app_main.get_db] = override_get_db
    except Exception:
        pass
    monkeypatch.setattr(idx_daily_sync, "SessionLocal", TestingSessionLocal)

    return TestingSessionLocal
