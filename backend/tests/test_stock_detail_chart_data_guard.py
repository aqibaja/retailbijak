from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DETAIL = ROOT / 'backend/routes/stock_detail.py'


def test_stock_detail_chart_data_uses_row_name_date_fallback():
    src = DETAIL.read_text(encoding='utf-8')
    assert "row_date = row.get('date', row.name)" in src
    assert "'date': row_date.isoformat() if hasattr(row_date, 'isoformat') else str(row_date)" in src
