from __future__ import annotations

import os
import time
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any
from urllib.parse import urljoin

import requests


IDX_WEBSITE_BASE_URL = "https://www.idx.co.id"


@dataclass
class IDXApiResponse:
    ok: bool
    status_code: int | None
    data: Any
    error: str | None = None


def parse_idx_number(value: Any) -> float | None:
    if value in (None, "", "-", "--"):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace("%", "")
    if not text or text in {"-", "--"}:
        return None
    # IDX uses Indonesian format: 7.101,226 and -2,24%
    text = text.replace(".", "").replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return None


class IDXApiClient:
    """IDX website JSON adapter with session/cookie initialization.

    NeaByteLab/IDX-API uses www.idx.co.id internal JSON endpoints. Those
    endpoints need browser-like headers and a warmed session from /id before
    calling /primary/* or /support/* endpoints.
    """

    browser_headers = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
        "Referer": "https://www.idx.co.id/",
        "Upgrade-Insecure-Requests": "1",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
    }

    def __init__(
        self,
        base_url: str | None = None,
        timeout: int = 20,
        retries: int = 3,
        backoff: float = 0.75,
        session: requests.Session | None = None,
    ):
        self.base_url = (base_url or os.getenv("IDX_API_BASE_URL", IDX_WEBSITE_BASE_URL)).rstrip("/")
        self.timeout = timeout
        self.retries = retries
        self.backoff = backoff
        self.session = session or requests.Session()
        self._session_ready = False

    def _full_url(self, path: str) -> str:
        if path.startswith("http://") or path.startswith("https://"):
            return path
        if not self.base_url:
            raise ValueError("IDX_API_BASE_URL is not configured")
        return urljoin(self.base_url + "/", path.lstrip("/"))

    def ensure_session(self) -> None:
        if self._session_ready or "idx.co.id" not in self.base_url:
            return
        url = self._full_url("/id")
        self.session.get(url, headers=self.browser_headers, timeout=self.timeout)
        self._session_ready = True
        time.sleep(0.2)

    def get_json(self, path: str, params: dict[str, Any] | None = None) -> IDXApiResponse:
        if "idx.co.id" in self._full_url(path):
            self.ensure_session()
        url = self._full_url(path)
        last_error: str | None = None
        last_status: int | None = None

        for attempt in range(1, self.retries + 1):
            try:
                resp = self.session.get(url, params=params, headers=self.browser_headers, timeout=self.timeout)
                last_status = resp.status_code
                if resp.status_code >= 400:
                    last_error = f"HTTP {resp.status_code}"
                else:
                    return IDXApiResponse(ok=True, status_code=resp.status_code, data=resp.json())
            except Exception as exc:  # noqa: BLE001
                last_error = str(exc)

            if attempt < self.retries:
                time.sleep(self.backoff * attempt)

        return IDXApiResponse(ok=False, status_code=last_status, data=None, error=last_error)

    def get_many(self, paths: list[str]) -> dict[str, IDXApiResponse]:
        return {path: self.get_json(path) for path in paths}

    def get_stock_summary(self, target_date: date | datetime | str | None = None) -> list[dict[str, Any]]:
        if target_date is None:
            target_date = date.today()
        if isinstance(target_date, datetime):
            date_str = target_date.strftime("%Y%m%d")
        elif isinstance(target_date, date):
            date_str = target_date.strftime("%Y%m%d")
        else:
            date_str = str(target_date).replace("-", "")
        resp = self.get_json(f"/primary/TradingSummary/GetStockSummary?date={date_str}")
        if not resp.ok or not isinstance(resp.data, dict):
            return []
        data = resp.data.get("data")
        return data if isinstance(data, list) else []

    def get_index_summary(self, target_date: date | datetime | str | None = None, start: int = 0, length: int = 9999) -> list[dict[str, Any]]:
        if target_date is None:
            target_date = date.today()
        if isinstance(target_date, datetime):
            date_str = target_date.strftime("%Y%m%d")
        elif isinstance(target_date, date):
            date_str = target_date.strftime("%Y%m%d")
        else:
            date_str = str(target_date).replace("-", "")
        resp = self.get_json(f"/primary/TradingSummary/GetIndexSummary?lang=id&date={date_str}&start={start}&length={length}")
        if not resp.ok or not isinstance(resp.data, dict):
            return []
        data = resp.data.get("data")
        return data if isinstance(data, list) else []

    def get_securities_stock(self, start: int = 0, length: int = 9999) -> list[dict[str, Any]]:
        resp = self.get_json(f"/primary/StockData/GetSecuritiesStock?start={start}&length={length}&code=&sector=&board=")
        if not resp.ok or not isinstance(resp.data, dict):
            return []
        data = resp.data.get("data")
        return data if isinstance(data, list) else []

    def get_stock_screener(self) -> list[dict[str, Any]]:
        resp = self.get_json("/support/stock-screener/api/v1/stock-screener/get?Sector=&SubSector=")
        if not resp.ok or not isinstance(resp.data, dict):
            return []
        data = resp.data.get("results")
        return data if isinstance(data, list) else []


_default_client: IDXApiClient | None = None


def get_idx_client() -> IDXApiClient:
    global _default_client
    if _default_client is None:
        _default_client = IDXApiClient()
    return _default_client
