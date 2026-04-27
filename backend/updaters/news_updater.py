import logging
import feedparser
from datetime import datetime
from email.utils import parsedate_to_datetime

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, News
from sqlalchemy.dialects.sqlite import insert

logger = logging.getLogger(__name__)

RSS_FEEDS = {
    "CNBC Indonesia": "https://www.cnbcindonesia.com/market/rss",
    "Kontan": "https://investasi.kontan.co.id/rss"
}

def update_news():
    """Fetch latest news from RSS feeds and store them in database."""
    logger.info("Starting news update from RSS feeds...")
    db = SessionLocal()
    
    try:
        all_news = []
        
        for source_name, url in RSS_FEEDS.items():
            logger.info(f"Fetching RSS feed from {source_name}: {url}")
            feed = feedparser.parse(url)
            
            # Get latest 20 entries
            for entry in feed.entries[:20]:
                try:
                    # Parse published date
                    if hasattr(entry, 'published'):
                        pub_date = parsedate_to_datetime(entry.published)
                        # Remove timezone info for sqlite storing
                        if pub_date.tzinfo is not None:
                            pub_date = pub_date.replace(tzinfo=None)
                    else:
                        pub_date = datetime.utcnow()
                        
                    # Extract summary and handle missing fields
                    summary = entry.get('summary', '')
                    
                    news_item = {
                        "id": entry.link,
                        "title": entry.title,
                        "link": entry.link,
                        "published_at": pub_date,
                        "source": source_name,
                        "summary": summary
                    }
                    all_news.append(news_item)
                except Exception as e:
                    logger.warning(f"Failed to parse an entry from {source_name}: {e}")
                    
        if all_news:
            # Upsert into DB
            stmt = insert(News).values(all_news)
            stmt = stmt.on_conflict_do_update(
                index_elements=['id'],
                set_={
                    "title": stmt.excluded.title,
                    "published_at": stmt.excluded.published_at,
                    "summary": stmt.excluded.summary
                }
            )
            db.execute(stmt)
            db.commit()
            logger.info(f"Successfully saved/updated {len(all_news)} news items.")
            
    except Exception as e:
        logger.error(f"Error fetching news: {e}")
        db.rollback()
    finally:
        db.close()
        logger.info("News update finished.")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    update_news()
