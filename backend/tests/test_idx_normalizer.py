from backend.services.idx_normalizer import normalize_stock_payload


def test_normalize_stock_payload_maps_common_fields():
    payload = {
        "data": {
            "close": "1000",
            "change_pct": "2.5",
            "market_cap": "123000000",
            "per": "10.2",
            "pbv": "1.8",
            "roe": "14.1",
            "roa": "7.0",
            "dividend_yield": "2.2",
            "volume": "100000",
        }
    }
    row = normalize_stock_payload("bbca.jk", payload)
    assert row["ticker"] == "BBCA"
    assert row["close"] == 1000.0
    assert row["market_cap"] == 123000000.0
    assert row["volume"] == 100000
