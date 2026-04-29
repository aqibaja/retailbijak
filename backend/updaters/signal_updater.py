import logging
from datetime import datetime

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, Signal
from sqlalchemy.dialects.sqlite import insert

from scanner import VALID_TIMEFRAMES

logger = logging.getLogger(__name__)

def update_signals():
    """Signal pre-computation is disabled to avoid Yahoo OHLCV fetch spam."""
    logger.info("Signal pre-computation disabled (Yahoo OHLCV fetch turned off).")
    return

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    update_signals()
