from backend.routes.shared_market_summary_helpers import _parse_sector_snapshot_payload


def test_parse_sector_snapshot_prefers_seriesdata_y_values():
    payload = {
        "date": "2026-04-30",
        "title": "Jakarta Composite Index and Sectoral Indices Movement",
        "series": [
            {
                "seriesName": "IDX Sector Energy",
                "seriesData": [
                    {"x": "2026-04-01", "y": 1.25, "value": 1.25},
                    {"x": "2026-04-30", "y": -3.5, "value": -3.5},
                ],
            },
            {
                "seriesName": "IDX Sector Infrastructure",
                "seriesData": [
                    {"x": "2026-04-30", "y": 0.0, "value": 0.0},
                ],
            },
        ],
    }

    data, updated_at = _parse_sector_snapshot_payload(payload)

    assert updated_at == "2026-04-30"
    assert data == [
        {"sector": "IDX Sector Energy", "count": 2, "market_cap": 0.0, "change_pct": -3.5},
        {"sector": "IDX Sector Infrastructure", "count": 1, "market_cap": 0.0, "change_pct": 0.0},
    ]


def test_parse_sector_snapshot_supports_flat_rows():
    payload = {
        "date": "2026-04-30",
        "data": [
            {"SectorName": "Energy", "Count": 10, "ChangePct": -1.2, "MarketCap": 1000},
            {"sector": "Finance", "count": 3, "change_pct": 0.5, "market_cap": 200},
        ],
    }

    data, updated_at = _parse_sector_snapshot_payload(payload)

    assert updated_at == "2026-04-30"
    assert data == [
        {"sector": "Energy", "count": 10, "market_cap": 1000.0, "change_pct": -1.2},
        {"sector": "Finance", "count": 3, "market_cap": 200.0, "change_pct": 0.5},
    ]
