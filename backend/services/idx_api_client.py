from __future__ import annotations

import os
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import urljoin

import requests


@dataclass
class IDXApiResponse:
    ok: bool
    status_code: int | None
    data: Any
    error: str | None = None


class IDXApiClient:
    """Small IDX-API adapter with retry + safe fallback.

    Base URL is configurable via IDX_API_BASE_URL. Endpoint paths are passed
    explicitly so the adapter can work with whatever exact IDX-API contract
    is available in the environment.
    """

    def __init__(self, base_url: str | None = None, timeout: int = 20, retries: int = 3, backoff: float = 0.75):
        self.base_url = (base_url or os.getenv("IDX_API_BASE_URL", "")).rstrip("/")
        self.timeout = timeout
        self.retries = retries
        self.backoff = backoff

    def _full_url(self, path: str) -> str:
        if path.startswith("http://") or path.startswith("https://"):
            return path
        if not self.base_url:
            raise ValueError("IDX_API_BASE_URL is not configured")
        return urljoin(self.base_url + "/", path.lstrip("/"))

    def get_json(self, path: str, params: dict[str, Any] | None = None) -> IDXApiResponse:
        url = self._full_url(path)
        last_error: str | None = None

        for attempt in range(1, self.retries + 1):
            try:
                resp = requests.get(url, params=params, timeout=self.timeout)
                if resp.status_code >= 400:
                    last_error = f"HTTP {resp.status_code}"
                else:
                    return IDXApiResponse(ok=True, status_code=resp.status_code, data=resp.json())
            except Exception as exc:  # noqa: BLE001 - safe adapter wrapper
                last_error = str(exc)

            if attempt < self.retries:
                time.sleep(self.backoff * attempt)

        return IDXApiResponse(ok=False, status_code=None, data=None, error=last_error)

    def get_many(self, paths: list[str]) -> dict[str, IDXApiResponse]:
        return {path: self.get_json(path) for path in paths}


_default_client: IDXApiClient | None = None


def get_idx_client() -> IDXApiClient:
    global _default_client
    if _default_client is None:
        _default_client = IDXApiClient()
    return _default_client
