from __future__ import annotations


def _sqlite_datetime_literal(value):
    if value is None:
        return None
    if hasattr(value, "strftime"):
        return value.strftime("%Y-%m-%d %H:%M:%S.%f")
    return str(value)
