from __future__ import annotations

from datetime import date
from unittest.mock import Mock

from backend.services.idx_api_client import IDXApiClient, parse_idx_number


class DummyResponse:
    def __init__(self, payload, status_code=200, headers=None):
        self._payload = payload
        self.status_code = status_code
        self.headers = headers or {"content-type": "application/json"}
        self.text = str(payload)

    def json(self):
        return self._payload


def test_idx_client_initializes_session_before_idx_website_request():
    session = Mock()
    session.get.side_effect = [
        DummyResponse("<html>ok</html>", headers={"content-type": "text/html"}),
        DummyResponse([{"IndexCode": "COMPOSITE", "Current": "6.941,952"}]),
    ]
    client = IDXApiClient(base_url="https://www.idx.co.id", session=session, retries=1)

    resp = client.get_json("/primary/home/GetIndexList")

    assert resp.ok is True
    assert resp.data[0]["IndexCode"] == "COMPOSITE"
    assert session.get.call_args_list[0].args[0] == "https://www.idx.co.id/id"
    assert session.get.call_args_list[1].args[0] == "https://www.idx.co.id/primary/home/GetIndexList"
    assert session.get.call_args_list[1].kwargs["headers"]["X-Requested-With"] == "XMLHttpRequest"


def test_parse_idx_number_handles_indonesian_thousand_and_decimal_format():
    assert parse_idx_number("7.101,226") == 7101.226
    assert parse_idx_number("-2,24%") == -2.24
    assert parse_idx_number(1234.5) == 1234.5
    assert parse_idx_number("-") is None


def test_get_stock_summary_uses_idx_trading_summary_endpoint():
    session = Mock()
    session.get.side_effect = [
        DummyResponse("<html>ok</html>", headers={"content-type": "text/html"}),
        DummyResponse({
            "recordsTotal": 1,
            "data": [
                {
                    "StockCode": "BBCA",
                    "StockName": "Bank Central Asia Tbk.",
                    "Date": "2024-02-20T00:00:00",
                    "OpenPrice": 9000,
                    "High": 9200,
                    "Low": 8950,
                    "Close": 9150,
                    "Previous": 9000,
                    "Change": 150,
                    "Volume": 1000000,
                }
            ],
        }),
    ]
    client = IDXApiClient(base_url="https://www.idx.co.id", session=session, retries=1)

    rows = client.get_stock_summary(date(2024, 2, 20))

    assert rows[0]["StockCode"] == "BBCA"
    assert "TradingSummary/GetStockSummary?date=20240220" in session.get.call_args_list[1].args[0]
