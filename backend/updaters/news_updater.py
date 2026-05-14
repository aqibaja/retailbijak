import logging
import feedparser
import re
from datetime import datetime
from email.utils import parsedate_to_datetime

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from database import SessionLocal, News
except ModuleNotFoundError:
    from backend.database import SessionLocal, News
from sqlalchemy.dialects.sqlite import insert

logger = logging.getLogger(__name__)

RSS_FEEDS = {
    "CNBC Indonesia": "https://www.cnbcindonesia.com/market/rss",
    "Kontan": "https://investasi.kontan.co.id/rss"
}

def _extract_image_url(entry) -> str | None:
    """Extract image URL from RSS entry via media:content, enclosure, or summary HTML."""
    # 1. media:content (media RSS)
    if hasattr(entry, 'media_content') and entry.media_content:
        for media in entry.media_content:
            if media.get('url') and media.get('medium') in ('image', None):
                return media['url']
    # 2. enclosures
    if hasattr(entry, 'enclosures') and entry.enclosures:
        for enc in entry.enclosures:
            url = enc.get('href') or enc.get('url')
            mime = (enc.get('type') or '').lower()
            if url and ('image' in mime or not mime):
                return url
    # 3. media:thumbnail
    if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
        for thumb in entry.media_thumbnail:
            if thumb.get('url'):
                return thumb['url']
    # 4. Extract first <img> from summary HTML
    summary = entry.get('summary', '') or entry.get('description', '') or ''
    if '<img' in summary:
        m = re.search(r'<img\s[^>]*src=["\']([^"\']+)["\']', summary)
        if m:
            return m.group(1)
    # 5. Kontan-specific: content:encoded often has image
    if hasattr(entry, 'content') and entry.content:
        for c in entry.content:
            if c.get('value') and '<img' in c['value']:
                m = re.search(r'<img\s[^>]*src=["\']([^"\']+)["\']', c['value'])
                if m:
                    return m.group(1)
    return None

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
                        "summary": summary,
                        "image_url": _extract_image_url(entry)
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
                    "summary": stmt.excluded.summary,
                    "image_url": stmt.excluded.image_url
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
