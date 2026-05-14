import logging

logger = logging.getLogger(__name__)


def update_signals():
    """Signal pre-computation is disabled to avoid Yahoo OHLCV fetch spam."""
    logger.info("Signal pre-computation disabled (Yahoo OHLCV fetch turned off).")
    return


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    update_signals()
