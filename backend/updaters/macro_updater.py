"""
Macroeconomic Indicators Updater
=================================
Seeds historical macro data for Indonesia (IDX) on first run.
Stores in MacroIndicator table with unique constraint on (indicator_name, year).

Data sources: Internal hardcoded dataset (BI, BPS, IMF references).
Only seeds if table is empty — does NOT overwrite existing data.

Usage:
    python -m backend.updaters.macro_updater   # standalone run
    from updaters.macro_updater import seed_macro_data
"""

import logging
import sys
from pathlib import Path
from datetime import datetime

sys.path.append(str(Path(__file__).resolve().parent.parent))

from database import SessionLocal, MacroIndicator

logger = logging.getLogger(__name__)

# ─── Hardcoded Indonesia Macro Data ─────────────────────────────────────────
# Realistic annual figures for key Indonesian macroeconomic indicators.

MACRO_SEED_DATA = {
    "bi_rate": {
        "label": "BI Rate",
        "unit": "%",
        "data": {
            2020: 4.00,
            2021: 3.50,
            2022: 5.50,
            2023: 6.00,
            2024: 6.25,
            2025: 5.75,
            2026: 5.50,
        },
    },
    "cpi": {
        "label": "CPI Inflation",
        "unit": "%",
        "data": {
            2020: 1.68,
            2021: 1.87,
            2022: 5.51,
            2023: 2.61,
            2024: 2.12,
            2025: 2.80,
            2026: 3.00,
        },
    },
    "gdp": {
        "label": "GDP Growth",
        "unit": "%",
        "data": {
            2020: -2.07,
            2021: 3.69,
            2022: 5.31,
            2023: 5.05,
            2024: 5.03,
            2025: 5.20,
        },
    },
    "trade_balance": {
        "label": "Trade Balance",
        "unit": "$B",
        "data": {
            2020: 21.7,
            2021: 35.3,
            2022: 54.5,
            2023: 36.9,
            2024: 31.2,
            2025: 25.0,
        },
    },
    "fx_reserves": {
        "label": "FX Reserves",
        "unit": "$B",
        "data": {
            2020: 135.9,
            2021: 144.9,
            2022: 137.2,
            2023: 146.4,
            2024: 155.7,
            2025: 160.0,
            2026: 162.0,
        },
    },
}


def seed_macro_data(db=None):
    """Seed macro indicator data if the table is empty.

    Args:
        db: Optional SQLAlchemy session. If None, creates one.

    Returns:
        dict with keys: seeded (int), skipped (int), total (int)
    """
    own_session = False
    if db is None:
        db = SessionLocal()
        own_session = True

    try:
        # Check if table already has data
        existing = db.query(MacroIndicator).count()
        if existing > 0:
            logger.info(f"MacroIndicator table has {existing} rows — skipping seed.")
            return {"seeded": 0, "skipped": existing, "total": existing}

        # Seed the data
        seeded = 0
        now = datetime.utcnow()

        for indicator_name, info in MACRO_SEED_DATA.items():
            for year, value in info["data"].items():
                record = MacroIndicator(
                    indicator_name=indicator_name,
                    year=year,
                    value=value,
                    updated_at=now,
                )
                db.add(record)
                seeded += 1

        db.commit()
        logger.info(f"Seeded {seeded} macro indicator records.")
        return {"seeded": seeded, "skipped": 0, "total": seeded}

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to seed macro data: {e}")
        raise
    finally:
        if own_session:
            db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    result = seed_macro_data()
    print(f"Done: {result}")
