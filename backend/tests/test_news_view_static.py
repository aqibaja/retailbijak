from pathlib import Path


FRONTEND_NEWS_VIEW = Path('/home/rich27/retailbijak/frontend/js/views/news.js')
FRONTEND_STYLE = Path('/home/rich27/retailbijak/frontend/style.css')


def test_news_view_uses_compact_header_and_editorial_news_cards():
    content = FRONTEND_NEWS_VIEW.read_text()
    assert 'news-header' in content
    assert 'news-count' in content
    assert 'news-card' in content
    assert 'news-image-wrap' in content
    assert 'news-meta' in content
    assert 'news-image-fallback' in content


def test_news_view_styles_define_card_shell_and_mobile_policies():
    content = FRONTEND_STYLE.read_text()
    assert '.news-header {' in content
    assert '.news-grid {' in content
    assert '.news-card {' in content
    assert '.news-content {' in content
    assert '.news-image-wrap {' in content
    assert '.news-meta {' in content
    assert '@media (max-width: 768px) {' in content
