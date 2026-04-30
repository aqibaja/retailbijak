from __future__ import annotations

from datetime import date

from backend.jobs.idx_daily_sync import sync_idx_stock_summary


class FakeClient:
    def get_stock_summary(self, target_date):
        assert target_date == date(2024, 2, 20)
        return [
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
            },
            {
                "StockCode": "GOTO",
                "StockName": "GoTo Gojek Tokopedia Tbk.",
                "Date": "2024-02-20T00:00:00",
                "OpenPrice": 80,
                "High": 82,
                "Low": 78,
                "Close": 81,
                "Previous": 80,
                "Change": 1,
                "Volume": 2000000,
            },
        ]


class EmptyThenDataClient:
    def __init__(self):
        self.calls = []

    def get_stock_summary(self, target_date):
        self.calls.append(target_date)
        if target_date == date(2024, 2, 21):
            return []
        if target_date == date(2024, 2, 20):
            return [
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
            ]
        return []


def test_sync_idx_stock_summary_bulk_upserts_stocks_and_ohlcv(isolated_db_session):
    result = sync_idx_stock_summary(client=FakeClient(), target_date=date(2024, 2, 20), multi_day=False)

    assert result["ok"] == 2
    assert result["failed"] == 0
    assert result["data_date"] == "2024-02-20"

    from backend.database import OHLCVDaily, Stock

    db = isolated_db_session()
    try:
        assert db.query(Stock).filter_by(ticker="BBCA").one().name == "Bank Central Asia Tbk."
        ohlcv = db.query(OHLCVDaily).filter_by(ticker="GOTO").one()
        assert ohlcv.close == 81
        assert ohlcv.volume == 2000000
    finally:
        db.close()


def test_sync_idx_stock_summary_falls_back_to_previous_trading_day(isolated_db_session):
    client = EmptyThenDataClient()

    result = sync_idx_stock_summary(client=client, target_date=date(2024, 2, 21), fallback_days=3, multi_day=False)

    assert result["ok"] == 1
    assert result["failed"] == 0
    assert result["data_date"] == "2024-02-20"
    assert client.calls == [date(2024, 2, 21), date(2024, 2, 20)]
