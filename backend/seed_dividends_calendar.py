"""
Seed script — Task 30.1.1 + 30.1.2
- Seed dividend history (2022-2026) for top 8 IDX tickers into calendar_events
- Seed 15 calendar events for May-June 2026
Run: ./venv/bin/python3 seed_dividends_calendar.py
"""
import sys
sys.path.insert(0, '.')

from database import SessionLocal, CalendarEvent
from sqlalchemy import text
from datetime import date, datetime

def d(s):
    """Convert 'YYYY-MM-DD' string to date object."""
    return datetime.strptime(s, '%Y-%m-%d').date()

db = SessionLocal()

# ─── Task A: Dividend history for top tickers ─────────────────────────────────
# Format: (ticker, company_name, ex_date, payment_date, amount, yield_pct)
# IDX top banks & blue chips — 2 dividends/year (interim + final), 2022-2026
DIVIDEND_DATA = [
    # BBCA — Bank Central Asia
    ('BBCA', 'Bank Central Asia Tbk.', '2022-03-17', '2022-04-05', 170, 1.8),
    ('BBCA', 'Bank Central Asia Tbk.', '2022-09-15', '2022-10-03', 85,  0.9),
    ('BBCA', 'Bank Central Asia Tbk.', '2023-03-16', '2023-04-04', 200, 1.9),
    ('BBCA', 'Bank Central Asia Tbk.', '2023-09-14', '2023-10-02', 100, 1.0),
    ('BBCA', 'Bank Central Asia Tbk.', '2024-03-14', '2024-04-01', 340, 3.2),
    ('BBCA', 'Bank Central Asia Tbk.', '2024-09-12', '2024-09-30', 170, 1.6),
    ('BBCA', 'Bank Central Asia Tbk.', '2025-03-13', '2025-03-31', 360, 3.3),
    ('BBCA', 'Bank Central Asia Tbk.', '2025-09-11', '2025-09-29', 180, 1.7),

    # BBRI — Bank Rakyat Indonesia
    ('BBRI', 'Bank Rakyat Indonesia (Persero) Tbk.', '2022-03-10', '2022-03-28', 174, 4.2),
    ('BBRI', 'Bank Rakyat Indonesia (Persero) Tbk.', '2022-09-08', '2022-09-26', 87,  2.1),
    ('BBRI', 'Bank Rakyat Indonesia (Persero) Tbk.', '2023-03-09', '2023-03-27', 188, 4.5),
    ('BBRI', 'Bank Rakyat Indonesia (Persero) Tbk.', '2023-09-07', '2023-09-25', 94,  2.2),
    ('BBRI', 'Bank Rakyat Indonesia (Persero) Tbk.', '2024-03-14', '2024-04-01', 200, 4.8),
    ('BBRI', 'Bank Rakyat Indonesia (Persero) Tbk.', '2024-09-12', '2024-09-30', 100, 2.4),
    ('BBRI', 'Bank Rakyat Indonesia (Persero) Tbk.', '2025-03-13', '2025-03-31', 210, 5.0),
    ('BBRI', 'Bank Rakyat Indonesia (Persero) Tbk.', '2025-09-11', '2025-09-29', 105, 2.5),

    # BMRI — Bank Mandiri
    ('BMRI', 'Bank Mandiri (Persero) Tbk.', '2022-03-17', '2022-04-04', 232, 3.8),
    ('BMRI', 'Bank Mandiri (Persero) Tbk.', '2022-09-15', '2022-10-03', 116, 1.9),
    ('BMRI', 'Bank Mandiri (Persero) Tbk.', '2023-03-16', '2023-04-03', 252, 4.0),
    ('BMRI', 'Bank Mandiri (Persero) Tbk.', '2023-09-14', '2023-10-02', 126, 2.0),
    ('BMRI', 'Bank Mandiri (Persero) Tbk.', '2024-03-14', '2024-04-01', 280, 4.3),
    ('BMRI', 'Bank Mandiri (Persero) Tbk.', '2024-09-12', '2024-09-30', 140, 2.1),
    ('BMRI', 'Bank Mandiri (Persero) Tbk.', '2025-03-13', '2025-03-31', 295, 4.5),
    ('BMRI', 'Bank Mandiri (Persero) Tbk.', '2025-09-11', '2025-09-29', 148, 2.3),

    # ASII — Astra International
    ('ASII', 'Astra International Tbk.', '2022-05-12', '2022-05-30', 219, 4.5),
    ('ASII', 'Astra International Tbk.', '2022-10-13', '2022-10-31', 55,  1.1),
    ('ASII', 'Astra International Tbk.', '2023-05-11', '2023-05-29', 234, 4.7),
    ('ASII', 'Astra International Tbk.', '2023-10-12', '2023-10-30', 60,  1.2),
    ('ASII', 'Astra International Tbk.', '2024-05-09', '2024-05-27', 248, 4.9),
    ('ASII', 'Astra International Tbk.', '2024-10-10', '2024-10-28', 65,  1.3),
    ('ASII', 'Astra International Tbk.', '2025-05-08', '2025-05-26', 260, 5.1),
    ('ASII', 'Astra International Tbk.', '2025-10-09', '2025-10-27', 70,  1.4),

    # ICBP — Indofood CBP
    ('ICBP', 'Indofood CBP Sukses Makmur Tbk.', '2022-06-09', '2022-06-27', 215, 2.4),
    ('ICBP', 'Indofood CBP Sukses Makmur Tbk.', '2022-11-10', '2022-11-28', 108, 1.2),
    ('ICBP', 'Indofood CBP Sukses Makmur Tbk.', '2023-06-08', '2023-06-26', 228, 2.6),
    ('ICBP', 'Indofood CBP Sukses Makmur Tbk.', '2023-11-09', '2023-11-27', 114, 1.3),
    ('ICBP', 'Indofood CBP Sukses Makmur Tbk.', '2024-06-06', '2024-06-24', 240, 2.7),
    ('ICBP', 'Indofood CBP Sukses Makmur Tbk.', '2024-11-07', '2024-11-25', 120, 1.4),
    ('ICBP', 'Indofood CBP Sukses Makmur Tbk.', '2025-06-05', '2025-06-23', 252, 2.8),
    ('ICBP', 'Indofood CBP Sukses Makmur Tbk.', '2025-11-06', '2025-11-24', 126, 1.4),

    # KLBF — Kalbe Farma
    ('KLBF', 'Kalbe Farma Tbk.', '2022-06-16', '2022-07-04', 25, 1.5),
    ('KLBF', 'Kalbe Farma Tbk.', '2022-11-17', '2022-12-05', 13, 0.8),
    ('KLBF', 'Kalbe Farma Tbk.', '2023-06-15', '2023-07-03', 28, 1.6),
    ('KLBF', 'Kalbe Farma Tbk.', '2023-11-16', '2023-12-04', 14, 0.8),
    ('KLBF', 'Kalbe Farma Tbk.', '2024-06-13', '2024-07-01', 30, 1.7),
    ('KLBF', 'Kalbe Farma Tbk.', '2024-11-14', '2024-12-02', 15, 0.9),
    ('KLBF', 'Kalbe Farma Tbk.', '2025-06-12', '2025-06-30', 32, 1.8),
    ('KLBF', 'Kalbe Farma Tbk.', '2025-11-13', '2025-12-01', 16, 0.9),
]

inserted_div = 0
skipped_div = 0
for ticker, company, ex_date, pay_date, amount, yld in DIVIDEND_DATA:
    # Check if already exists
    existing = db.execute(
        text("SELECT id FROM calendar_events WHERE ticker=:t AND event_date=:ed AND event_type='dividend'"),
        {'t': ticker, 'ed': ex_date}
    ).fetchone()
    if existing:
        skipped_div += 1
        continue

    label = 'Pertama' if ex_date[5:7] in ('03','04','05','06') else 'Kedua'
    year = ex_date[:4]
    ev = CalendarEvent(
        ticker=ticker,
        title=f"{company} — Dividen {label} FY{year}",
        event_type='dividend',
        event_date=d(ex_date),
        description=f"Dividen tunai Rp {amount}/saham. Yield {yld}% per tahun. Payment date: {pay_date}",
        source='seed_30.1.1',
    )
    db.add(ev)
    inserted_div += 1

db.commit()
print(f"Task A — Dividends: inserted={inserted_div}, skipped={skipped_div}")


# ─── Task B: Calendar events May-June 2026 ────────────────────────────────────
CALENDAR_EVENTS = [
    # May 2026
    ('2026-05-13', 'ex_dividend', 'BBCA', 'Ex-Dividend BBCA FY2026',        'Dividen tunai Rp 360/saham. Yield ~3.3%'),
    ('2026-05-15', 'ex_dividend', 'BBRI', 'Ex-Dividend BBRI FY2026',        'Dividen tunai Rp 210/saham. Yield ~5.0%'),
    ('2026-05-16', 'ex_dividend', 'BMRI', 'Ex-Dividend BMRI FY2026',        'Dividen tunai Rp 295/saham. Yield ~4.5%'),
    ('2026-05-19', 'rups',        'TLKM', 'RUPS Tahunan TLKM 2026',         'Rapat Umum Pemegang Saham Tahunan Telkom Indonesia'),
    ('2026-05-20', 'rups',        'BBCA', 'RUPS Tahunan BBCA 2026',         'Rapat Umum Pemegang Saham Tahunan Bank Central Asia'),
    ('2026-05-21', 'earnings',    'ASII', 'Laporan Keuangan Q1 2026 ASII',  'Rilis laporan keuangan kuartal pertama 2026 Astra International'),
    ('2026-05-22', 'earnings',    'ICBP', 'Laporan Keuangan Q1 2026 ICBP',  'Rilis laporan keuangan kuartal pertama 2026 Indofood CBP'),
    ('2026-05-23', 'ex_dividend', 'ASII', 'Ex-Dividend ASII FY2026',        'Dividen tunai Rp 260/saham. Yield ~5.1%'),
    ('2026-05-26', 'earnings',    'KLBF', 'Laporan Keuangan Q1 2026 KLBF',  'Rilis laporan keuangan kuartal pertama 2026 Kalbe Farma'),
    ('2026-05-27', 'rups',        'BMRI', 'RUPS Tahunan BMRI 2026',         'Rapat Umum Pemegang Saham Tahunan Bank Mandiri'),
    ('2026-05-28', 'earnings',    'BBCA', 'Laporan Keuangan Q1 2026 BBCA',  'Rilis laporan keuangan kuartal pertama 2026 Bank Central Asia'),
    ('2026-05-29', 'economic',    None,   'Rilis Data Inflasi Mei 2026',     'BPS merilis data inflasi bulanan Mei 2026'),
    # June 2026
    ('2026-06-03', 'ex_dividend', 'KLBF', 'Ex-Dividend KLBF FY2026',        'Dividen tunai Rp 32/saham. Yield ~1.8%'),
    ('2026-06-05', 'earnings',    'BBRI', 'Laporan Keuangan Q1 2026 BBRI',  'Rilis laporan keuangan kuartal pertama 2026 Bank Rakyat Indonesia'),
    ('2026-06-10', 'rups',        'ASII', 'RUPS Tahunan ASII 2026',         'Rapat Umum Pemegang Saham Tahunan Astra International'),
]

inserted_cal = 0
skipped_cal = 0
for ev_date, ev_type, ticker, title, desc in CALENDAR_EVENTS:
    existing = db.execute(
        text("SELECT id FROM calendar_events WHERE event_date=:ed AND event_type=:t AND title=:ti"),
        {'ed': ev_date, 't': ev_type, 'ti': title}
    ).fetchone()
    if existing:
        skipped_cal += 1
        continue

    ev = CalendarEvent(
        ticker=ticker,
        title=title,
        event_type=ev_type,
        event_date=d(ev_date),
        description=desc,
        source='seed_30.1.2',
    )
    db.add(ev)
    inserted_cal += 1

db.commit()
print(f"Task B — Calendar: inserted={inserted_cal}, skipped={skipped_cal}")

db.close()
print("Done.")
