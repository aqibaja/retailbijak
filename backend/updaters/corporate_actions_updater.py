"""Corporate actions data seeder — IPO, rights issue, stock split, buyback.

Populates CalendarEvent table with synthetic but realistic corporate actions
for IDX stocks. Fallback when yfinance/IDX API not available.
"""
import logging
from datetime import date, timedelta
from random import choice, randint, uniform
from sqlalchemy.dialects.sqlite import insert as sqlite_upsert

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from database import SessionLocal, CalendarEvent

logger = logging.getLogger(__name__)

# Sample realistic corporate actions (based on actual IDX patterns)
CORPORATE_ACTIONS = [
    # IPOs (new listings)
    {"ticker": "AMMN", "title": "IPO — Saham PT Amman Mineral Internasional", "type": "ipo", "desc": "IPO sebanyak 3.15 miliar saham dengan harga Rp 1.700 - 2.100/saham. Masa penawaran: 1-7 Jun 2026."},
    {"ticker": "CUAN", "title": "IPO — Saham PT CUAN Mining Resources", "type": "ipo", "desc": "IPO sebanyak 1.2 miliar saham dengan harga Rp 1.500/saham."},
    {"ticker": "GOTO", "title": "IPO — Saham PT GoTo Gojek Tokopedia", "type": "ipo", "desc": "IPO terbesar di IDX. Harga Rp 338/saham."},
    {"ticker": "BYAN", "title": "IPO — Saham PT Bayan Resources", "type": "ipo", "desc": "IPO saham batu bara dengan kapitalisasi besar."},
    
    # Stock splits
    {"ticker": "BBCA", "title": "Stock Split 1:10 — PT Bank Central Asia", "type": "corporate", "desc": "Pemecahan nominal saham dari Rp 625 menjadi Rp 62.5 per saham."},
    {"ticker": "BBRI", "title": "Stock Split 1:5 — PT Bank Rakyat Indonesia", "type": "corporate", "desc": "Pemecahan nominal saham untuk meningkatkan likuiditas."},
    {"ticker": "TLKM", "title": "Stock Split 1:2 — PT Telkom Indonesia", "type": "corporate", "desc": "Pemecahan saham untuk memperluas basis investor."},
    
    # Rights issues
    {"ticker": "WIKA", "title": "HMETD — PT Wijaya Karya", "type": "rights", "desc": "Rights issue I dengan rasio 1:3. Harga pelaksanaan Rp 500/saham."},
    {"ticker": "ADHI", "title": "HMETD — PT Adhi Karya", "type": "rights", "desc": "Rights issue II dengan target dana Rp 2 triliun."},
    {"ticker": "PTPP", "title": "HMETD — PT PP (Persero)", "type": "rights", "desc": "PMHMETD untuk penguatan modal kerja."},
    
    # Buybacks
    {"ticker": "UNVR", "title": "Buyback — PT Unilever Indonesia", "type": "corporate", "desc": "Pembelian kembali saham hingga 2% dari modal ditempatkan."},
    {"ticker": "HMSP", "title": "Buyback — PT Hanjaya Mandala Sampoerna", "type": "corporate", "desc": "Buyback saham hingga Rp 1.5 triliun."},
    
    # Dividends
    {"ticker": "BBCA", "title": "Dividen Final FY2025 — PT Bank Central Asia", "type": "dividend", "desc": "Dividen tunai Rp 250 per saham. Cum-date: 10 Mei 2026."},
    {"ticker": "BBRI", "title": "Dividen Final FY2025 — PT Bank Rakyat Indonesia", "type": "dividend", "desc": "Dividen tunai Rp 175 per saham."},
    {"ticker": "BMRI", "title": "Dividen Final FY2025 — PT Bank Mandiri", "type": "dividend", "desc": "Dividen tunai Rp 350 per saham."},
    {"ticker": "TLKM", "title": "Dividen Final FY2025 — PT Telkom Indonesia", "type": "dividend", "desc": "Dividen tunai Rp 160 per saham."},
    {"ticker": "ASII", "title": "Dividen Final FY2025 — PT Astra International", "type": "dividend", "desc": "Dividen tunai Rp 300 per saham."},
    
    # Earnings
    {"ticker": "BBCA", "title": "Rapat Umum Pemegang Saham Tahunan", "type": "earnings", "desc": "RUPST untuk persetujuan laporan keuangan FY2025 dan pembagian dividen."},
    {"ticker": "BBRI", "title": "RUPST — Laporan Keuangan FY2025", "type": "earnings", "desc": "Paparan publik dan RUPST PT Bank Rakyat Indonesia."},
    {"ticker": "ADRO", "title": "RUPST — Laporan Keuangan FY2025", "type": "earnings", "desc": "RUPST dan paparan publik PT Adaro Energy."},
    {"ticker": "TLKM", "title": "Public Expose — Kinerja Q1 2026", "type": "earnings", "desc": "Paparan publik kuartal I 2026 PT Telkom Indonesia."},
]


def seed_corporate_actions(db, days_ahead: int = 180):
    """Seed corporate actions into CalendarEvent table with dates spread over next N days."""
    today = date.today()
    upserted = 0
    errors = 0
    
    for i, action in enumerate(CORPORATE_ACTIONS):
        # Spread across the next N days
        offset = int((i % len(CORPORATE_ACTIONS)) * (days_ahead / len(CORPORATE_ACTIONS)))
        event_date = today + timedelta(days=offset + randint(-3, 3))
        
        # Check if already exists
        existing = db.query(CalendarEvent).filter(
            CalendarEvent.ticker == action["ticker"],
            CalendarEvent.event_type == action["type"],
            CalendarEvent.title == action["title"],
        ).first()
        if existing:
            continue
        
        try:
            event = CalendarEvent(
                ticker=action["ticker"],
                title=action["title"],
                event_type=action["type"],
                event_date=event_date,
                description=action["desc"],
                source="seed",
            )
            db.add(event)
            upserted += 1
        except Exception as e:
            errors += 1
            logger.warning(f"Failed to seed {action['ticker']}: {e}")
    
    db.commit()
    logger.info(f"Seeded {upserted} corporate actions ({errors} errors)")
    return {"upserted": upserted, "errors": errors, "total": len(CORPORATE_ACTIONS)}


def run_update():
    """Run corporate actions seed — callable from scheduler."""
    db = SessionLocal()
    try:
        result = seed_corporate_actions(db)
        return result
    except Exception as e:
        logger.exception(f"Corporate actions seed failed: {e}")
        return {"error": str(e)}
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    result = run_update()
    print(result)
