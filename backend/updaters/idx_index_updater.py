"""
Updater & Seed: IDX Index Constituents (LQ45, IDX30, KOMPAS100, IDX80, IDXESGL)
Periode Feb-Jul 2026 (H1-2026).

Banyak overlap antar indeks — data di-hardcode sebagai Python dict.
Pattern: jalankan sebagai script terpisah atau panggil seed_index_constituents()
dari scheduler.
"""

import logging
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

sys.path.append(str(Path(__file__).resolve().parent.parent))

from database import StockIndex, SessionLocal
logger = logging.getLogger(__name__)

# ─── IDX Index Constituents — Periode Feb–Jul 2026 (H1-2026) ─────────────
# Semua ticker tanpa suffix .JK.
# Data: hardcode berdasarkan publikasi IDX periode H1-2026.

# --- LQ45 (45 saham paling likuid) ---
LQ45: list[str] = [
    "ADRO", "AKRA", "AMMN", "AMRT", "ANTM", "ARTO", "ASII", "ASRI",
    "BBCA", "BBNI", "BBRI", "BBTN", "BIRD", "BJBR", "BJTM", "BMRI",
    "BRPT", "BSDE", "BUKK", "BYAN", "CPIN", "CTRA", "DMAS", "EMTK",
    "ERAA", "ESSA", "EXCL", "GGRM", "GOTO", "HEAL", "HMSP", "ICBP",
    "INCO", "INDF", "INKP", "INTP", "ISAT", "JSMR", "KLBF", "MDKA",
    "MEDC", "MIKA", "MNCN", "MTDL", "MYOR",
]

# --- IDX30 (30 saham big-cap likuid) ---
# Semua ada di LQ45 kecuali TLKM
IDX30: list[str] = [
    "ADRO", "AMRT", "ANTM", "ASII", "BBCA", "BBNI", "BBRI", "BBTN",
    "BMRI", "BRPT", "BSDE", "BYAN", "CPIN", "CTRA", "DMAS", "EXCL",
    "GGRM", "HMSP", "ICBP", "INCO", "INDF", "INKP", "INTP", "KLBF",
    "MDKA", "MEDC", "MIKA", "MNCN", "MTDL", "TLKM",
]

# --- IDX80 (80 saham likuid) = LQ45 + IDX30 + 34 tambahan ---
IDX80_ADDITIONAL: list[str] = [
    "ACES", "ADHI", "ADMR", "AGII", "ARNA", "ASGR", "ASSA", "AUTO",
    "AVIA", "BFIN", "BISI", "BNGA", "BNLI", "BSSR", "BTPN", "BTPS",
    "BUMI", "CARE", "CMRY", "COAL", "CUAN", "ELSA", "ENRG", "EPMT",
    "GEMS", "GOOD", "HRUM", "INAF", "INDR", "JPFA", "KAEF", "KIJA",
    "KKGI", "LEAD",
]
IDX80: list[str] = sorted(set(LQ45) | set(IDX30) | set(IDX80_ADDITIONAL))

# --- KOMPAS100 (100 saham pilihan) = LQ45 + IDX30 + 54 tambahan ---
KOMPAS100_ADDITIONAL: list[str] = [
    "ACES", "ADHI", "ADMR", "AGII", "ARNA", "ASGR", "ASSA", "AUTO",
    "AVIA", "BFIN", "BISI", "BNGA", "BNLI", "BSSR", "BTPN", "BTPS",
    "BUMI", "CARE", "CMRY", "COAL", "CUAN", "ELSA", "ENRG", "EPMT",
    "GEMS", "GOOD", "HRUM", "ICOM", "IMAS", "INAF", "INDR", "INPC",
    "INPP", "IPCC", "IPCM", "ITMG", "JBMA", "JPFA", "JRPT", "JSKY",
    "JTPE", "KAEF", "KBLI", "KIJA", "KKGI", "KMTR", "KPIG", "KRAS",
    "LEAD", "LINK", "LPCK", "LPKR", "LPPF", "LSIP",
]
KOMPAS100: list[str] = sorted(set(LQ45) | set(IDX30) | set(KOMPAS100_ADDITIONAL))

# --- IDX ESG Leaders (30 saham ESG terbaik) ---
# Semua ada di LQ45/IDX30
IDXESGL: list[str] = [
    "ADRO", "AKRA", "AMMN", "AMRT", "ANTM", "ASII", "BBCA", "BBNI",
    "BBRI", "BBTN", "BJBR", "BJTM", "BMRI", "BRPT", "BSDE", "BYAN",
    "CPIN", "CTRA", "DMAS", "EXCL", "GGRM", "HMSP", "ICBP", "INCO",
    "INDF", "INKP", "INTP", "JSMR", "KLBF", "TLKM",
]

# ─── Index metadata ─────────────────────────────────────────────────────
INDEX_META: dict[str, dict] = {
    "LQ45": {
        "name": "LQ45",
        "full_name": "Indeks LQ45",
        "description": "45 saham paling likuid dan berkapitalisasi besar di IDX.",
        "constituent_count": 45,
    },
    "IDX30": {
        "name": "IDX30",
        "full_name": "Indeks IDX30",
        "description": "30 saham berkapitalisasi besar dengan likuiditas tinggi.",
        "constituent_count": 30,
    },
    "KOMPAS100": {
        "name": "KOMPAS100",
        "full_name": "Indeks KOMPAS100",
        "description": "100 saham pilihan hasil kerjasama IDX dengan Harian Kompas.",
        "constituent_count": 100,
    },
    "IDX80": {
        "name": "IDX80",
        "full_name": "Indeks IDX80",
        "description": "80 saham dengan likuiditas dan kapitalisasi pasar yang baik.",
        "constituent_count": 80,
    },
    "IDXESGL": {
        "name": "IDXESGL",
        "full_name": "Indeks IDX ESG Leaders",
        "description": "30 saham dengan kinerja ESG terbaik di IDX.",
        "constituent_count": 30,
    },
}

INDEX_CONSTITUENTS: dict[str, list[str]] = {
    "LQ45": LQ45,
    "IDX30": IDX30,
    "KOMPAS100": KOMPAS100,
    "IDX80": IDX80,
    "IDXESGL": IDXESGL,
}


def seed_index_constituents(db: Session | None = None, period: str = "H1-2026") -> dict:
    """
    Seed/update index constituents into DB.
    Clears existing data for the given period first, then bulk inserts.
    Returns summary dict.
    """
    close_session = False
    if db is None:
        db = SessionLocal()
        close_session = True

    try:
        # Clear existing data for this period
        deleted = db.query(StockIndex).filter(
            StockIndex.period == period
        ).delete()
        logger.info("Deleted %d existing rows for period %s", deleted, period)

        # Bulk insert
        rows_to_insert = []
        now = datetime.utcnow()
        for index_name, tickers in INDEX_CONSTITUENTS.items():
            for ticker in tickers:
                rows_to_insert.append({
                    "index_name": index_name,
                    "ticker": ticker,
                    "period": period,
                    "created_at": now,
                })

        db.bulk_insert_mappings(StockIndex, rows_to_insert)
        db.commit()

        result = {
            "status": "ok",
            "period": period,
            "total_constituents": len(rows_to_insert),
            "indices": {
                name: len(tickers)
                for name, tickers in INDEX_CONSTITUENTS.items()
            },
        }
        logger.info("Seeded %d index constituent rows", len(rows_to_insert))
        return result

    except Exception as e:
        db.rollback()
        logger.error("Failed to seed index constituents: %s", e)
        return {"status": "error", "message": str(e)}
    finally:
        if close_session:
            db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    result = seed_index_constituents()
    print(f"Seed result: {result}")
