"""
BrokerSummary Updater — generate synthetic broker flow data from OHLCV.

Since IDX broker data is not freely available via API, this updater
creates realistic synthetic broker summaries by distributing OHLCV
volume across typical IDX broker categories.

Broker codes simulated:
- INST1-5 (institutional) — 60% of volume
- RTL1-3 (retail) — 25% of volume
- ASNG1-2 (foreign) — 15% of volume

Runs daily at 05:30 via APScheduler.
"""

import logging
import random
from datetime import datetime, timezone
from sqlalchemy import text

try:
    from database import BrokerSummary, OHLCVDaily, Stock, SessionLocal
except ModuleNotFoundError:
    from backend.database import BrokerSummary, OHLCVDaily, Stock, SessionLocal

logger = logging.getLogger(__name__)

# Broker definitions
BROKER_DEFS = [
    # (code, name, type, weight)
    ("INST1", "Mandiri Sekuritas", "institutional", 0.20),
    ("INST2", "BCA Sekuritas", "institutional", 0.15),
    ("INST3", "Danareksa Sekuritas", "institutional", 0.10),
    ("INST4", "CLSA Indonesia", "institutional", 0.08),
    ("INST5", "UBS Sekuritas", "institutional", 0.07),
    ("RTL1", "Indo Premier Sekuritas", "retail", 0.12),
    ("RTL2", "Trimegah Sekuritas", "retail", 0.08),
    ("RTL3", "Mirae Asset Sekuritas", "retail", 0.05),
    ("ASNG1", "CGS-CIMB Sekuritas", "foreign", 0.08),
    ("ASNG2", "JP Morgan", "foreign", 0.07),
]

def seed_broker_summary(target_date=None, top_n=100):
    """
    Generate synthetic broker summary for top N stocks by volume.
    Clears existing data for target_date first.
    Returns summary dict.
    """
    db = SessionLocal()
    try:
        if target_date is None:
            target_date = datetime.now(timezone.utc).date()

        # Clear existing data for this date
        db.query(BrokerSummary).filter(
            BrokerSummary.date == target_date
        ).delete()
        db.commit()

        # Prioritize blue chip tickers, then fill with most-active
        BLUE_CHIPS = [
            'BBCA','BBRI','BMRI','TLKM','ASII','UNVR','KLBF','ICBP','PGAS','SMGR',
            'ANTM','PTBA','ADRO','INDF','GGRM','HMSP','JSMR','WIKA','WSKT','BSDE',
            'CPIN','JPFA','MAPI','LSIP','AALI','EXCL','ISAT','TBIG','TOWR','MNCN',
            'GOTO','BUKA','EMTK','MDKA','AMMN','BRPT','TPIA','INKP','INTP','SMCB',
        ]
        # Use date with most rows (avoid sparse future dates)
        from sqlalchemy import func as sqlfunc
        best_date_row = db.execute(
            text("SELECT date, COUNT(*) as cnt FROM ohlcv_daily GROUP BY date ORDER BY cnt DESC LIMIT 1")
        ).fetchone()
        best_date = best_date_row[0] if best_date_row else None

        latest_ohlcv = (
            db.query(OHLCVDaily)
            .filter(OHLCVDaily.date == best_date)
            .order_by(OHLCVDaily.volume.desc())
            .limit(top_n * 3)
            .all()
        ) if best_date else []

        # Get unique tickers — blue chips first
        seen = set()
        all_tickers = []
        # Add blue chips first
        for t in BLUE_CHIPS:
            if t not in seen and len(all_tickers) < top_n:
                seen.add(t)
                all_tickers.append(t)
        # Fill remainder from OHLCV
        for row in latest_ohlcv:
            if row.ticker not in seen and len(all_tickers) < top_n:
                seen.add(row.ticker)
                all_tickers.append(row.ticker)
        
        if not all_tickers:
            # Fallback: get any stocks
            all_tickers = [row.ticker for row in db.query(OHLCVDaily).distinct(OHLCVDaily.ticker).limit(top_n).all()]

        if not all_tickers:
            # Fallback: get stock list
            all_tickers = [row.ticker for row in db.query(Stock).limit(top_n).all()]

        logger.info(f"Seeding broker summary for {len(all_tickers)} tickers on {target_date}")

        # Get OHLCV data for these tickers
        ohlcv_rows = (
            db.query(OHLCVDaily)
            .filter(OHLCVDaily.ticker.in_(all_tickers))
            .filter(OHLCVDaily.date <= target_date)
            .order_by(OHLCVDaily.date.desc())
            .all()
        )

        # Latest OHLCV per ticker
        latest_ohlcv_map = {}
        for row in ohlcv_rows:
            if row.ticker not in latest_ohlcv_map:
                latest_ohlcv_map[row.ticker] = row

        total_records = 0
        base_date = datetime.combine(target_date, datetime.min.time())
        
        for ticker in all_tickers:
            ohlcv = latest_ohlcv_map.get(ticker)
            if not ohlcv:
                continue

            volume = ohlcv.volume or random.randint(500000, 5000000)
            close = ohlcv.close or 1000
            value = volume * close

            # Distribute volume across brokers
            for broker_code, broker_name, broker_type, weight in BROKER_DEFS:
                broker_volume = int(volume * weight * random.uniform(0.7, 1.3))
                broker_value = broker_volume * close * random.uniform(0.9, 1.1)
                
                # Random buy/sell split
                buy_ratio = random.uniform(0.3, 0.7)
                buy_vol = int(broker_volume * buy_ratio)
                sell_vol = broker_volume - buy_vol
                buy_val = broker_value * buy_ratio
                sell_val = broker_value * (1 - buy_ratio)

                record = BrokerSummary(
                    ticker=ticker,
                    date=base_date,
                    broker_code=broker_code,
                    buy_volume=buy_vol,
                    sell_volume=sell_vol,
                    net_volume=buy_vol - sell_vol,
                    buy_value=round(buy_val, 2),
                    sell_value=round(sell_val, 2),
                    net_value=round(buy_val - sell_val, 2),
                )
                db.add(record)
                total_records += 1

            # Add some randomness for smaller brokers
            if random.random() < 0.3:
                extra_code = random.choice(["INST6", "RTL4", "ASNG3", "DBST", "GSCO"])
                extra_weight = random.uniform(0.01, 0.03)
                extra_vol = int(volume * extra_weight)
                extra_val = extra_vol * close
                buy_vol = int(extra_vol * random.uniform(0.3, 0.7))
                record = BrokerSummary(
                    ticker=ticker,
                    date=base_date,
                    broker_code=extra_code,
                    buy_volume=buy_vol,
                    sell_volume=extra_vol - buy_vol,
                    net_volume=buy_vol - (extra_vol - buy_vol),
                    buy_value=round(extra_val * buy_vol / extra_vol, 2),
                    sell_value=round(extra_val * (extra_vol - buy_vol) / extra_vol, 2),
                    net_value=round(extra_val * (2 * buy_vol - extra_vol) / extra_vol, 2),
                )
                db.add(record)
                total_records += 1

        db.commit()
        logger.info(f"Seeded {total_records} broker summary records for {len(all_tickers)} tickers")
        return {
            "status": "ok",
            "tickers": len(all_tickers),
            "records": total_records,
            "date": str(target_date),
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Broker summary seed failed: {e}")
        return {"status": "error", "error": str(e)}
    finally:
        db.close()


def update_broker_summary():
    """Scheduler-friendly wrapper."""
    return seed_broker_summary()
