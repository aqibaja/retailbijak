"""Response factory — standardized API response shapes for all endpoints.

Every endpoint should return one of these shapes so the frontend can
always parse the response without guessing field names.
"""
from __future__ import annotations

from typing import Any


def ok(
    data: Any,
    source: str,
    count: int | None = None,
    **meta: Any,
) -> dict[str, Any]:
    """Successful response with data."""
    result: dict[str, Any] = {
        "status": "ok",
        "source": source,
        "data": data,
    }
    if count is not None:
        result["count"] = count
    result.update(meta)
    return result


def empty(
    source: str,
    message: str = "No data available",
    **meta: Any,
) -> dict[str, Any]:
    """Empty but valid response — no error, just nothing to show."""
    result: dict[str, Any] = {
        "status": "empty",
        "source": source,
        "data": [],
        "count": 0,
        "message": message,
    }
    result.update(meta)
    return result


def error(
    message: str,
    source: str,
    status_code: int | None = None,
    **meta: Any,
) -> dict[str, Any]:
    """Error response — something went wrong."""
    result: dict[str, Any] = {
        "status": "error",
        "source": source,
        "data": None,
        "error": message,
    }
    if status_code is not None:
        result["status_code"] = status_code
    result.update(meta)
    return result


def paginated(
    data: list[Any],
    source: str,
    total: int = 0,
    page: int = 1,
    page_size: int = 20,
    **meta: Any,
) -> dict[str, Any]:
    """Paginated list response."""
    result: dict[str, Any] = {
        "status": "ok" if data else "empty",
        "source": source,
        "data": data,
        "count": len(data),
        "total": total,
        "page": page,
        "page_size": page_size,
    }
    result.update(meta)
    return result
