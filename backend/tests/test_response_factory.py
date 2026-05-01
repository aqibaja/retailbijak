"""Tests for idx_response_factory — verify all response shapes are consistent."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.idx_response_factory import ok, empty, error, paginated


def test_ok_basic():
    r = ok([{"a": 1}], source="db")
    assert r["status"] == "ok"
    assert r["source"] == "db"
    assert r["data"] == [{"a": 1}]


def test_ok_with_count():
    r = ok([], source="idx", count=0)
    assert r["count"] == 0


def test_ok_with_meta():
    r = ok("x", source="test", updated_at="2026-01-01", symbol="IHSG")
    assert r["updated_at"] == "2026-01-01"
    assert r["symbol"] == "IHSG"


def test_empty_default():
    r = empty("no_data")
    assert r["status"] == "empty"
    assert r["data"] == []
    assert r["count"] == 0
    assert r["message"] == "No data available"


def test_empty_custom_message():
    r = empty("idx_announcement", message="IDX returned no announcements")
    assert r["message"] == "IDX returned no announcements"


def test_error_basic():
    r = error("timeout", "idx_api")
    assert r["status"] == "error"
    assert r["error"] == "timeout"
    assert r["data"] is None


def test_error_with_status_code():
    r = error("not found", "api", status_code=404)
    assert r["status_code"] == 404


def test_paginated_with_data():
    r = paginated([1, 2, 3], source="db", total=10, page=2, page_size=3)
    assert r["status"] == "ok"
    assert r["count"] == 3
    assert r["total"] == 10
    assert r["page"] == 2


def test_paginated_empty():
    r = paginated([], source="db")
    assert r["status"] == "empty"
    assert r["count"] == 0


def test_all_shapes_have_required_keys():
    """Every response must have status, source, data."""
    for fn, args in [
        (ok, ([], "x")),
        (empty, ("x",)),
        (error, ("x", "x")),
        (paginated, ([], "x")),
    ]:
        r = fn(*args)
        assert "status" in r, f"{fn.__name__} missing 'status'"
        assert "source" in r, f"{fn.__name__} missing 'source'"
        assert "data" in r, f"{fn.__name__} missing 'data'"
