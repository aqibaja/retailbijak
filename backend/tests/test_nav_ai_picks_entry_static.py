from pathlib import Path

INDEX_HTML = Path('/home/rich27/retailbijak/frontend/index.html')


def test_sidebar_has_ai_picks_nav_item():
    index = INDEX_HTML.read_text()
    # Guard 1: sidebar contains a link to #ai-picks
    assert 'href="#ai-picks"' in index
    # Must be inside the sidebar section (aside.sidebar > nav)
    sidebar_start = index.index('<aside class="sidebar">')
    sidebar_end = index.index('</aside>', sidebar_start)
    sidebar_section = index[sidebar_start:sidebar_end]
    assert 'href="#ai-picks"' in sidebar_section


def test_sidebar_ai_picks_has_data_view():
    index = INDEX_HTML.read_text()
    # Guard 2: AI Picks sidebar item has data-view="ai-picks" for active state
    sidebar_start = index.index('<aside class="sidebar">')
    sidebar_end = index.index('</aside>', sidebar_start)
    sidebar_section = index[sidebar_start:sidebar_end]
    assert 'data-view="ai-picks"' in sidebar_section


def test_sidebar_ai_picks_has_tooltip():
    index = INDEX_HTML.read_text()
    # Guard 3: AI Picks sidebar item has data-tooltip="AI Picks"
    sidebar_start = index.index('<aside class="sidebar">')
    sidebar_end = index.index('</aside>', sidebar_start)
    sidebar_section = index[sidebar_start:sidebar_end]
    assert 'data-tooltip="AI Picks"' in sidebar_section


def test_sidebar_ai_picks_uses_sparkles_icon():
    index = INDEX_HTML.read_text()
    # Guard 4: AI Picks sidebar item uses lucide sparkles icon
    nav_start = index.index('<nav class="flex-col')
    nav_end = index.index('</nav>', nav_start)
    nav_section = index[nav_start:nav_end]
    # Find the ai-picks link within nav
    assert 'data-view="ai-picks"' in nav_section
    assert 'data-lucide="sparkles"' in nav_section


def test_bottom_nav_has_ai_picks_item():
    index = INDEX_HTML.read_text()
    # Guard 5: bottom-nav contains a link to #ai-picks
    bottom_nav_start = index.index('<nav class="bottom-nav">')
    bottom_nav_end = index.index('</nav>', bottom_nav_start)
    bottom_nav = index[bottom_nav_start:bottom_nav_end]
    assert 'href="#ai-picks"' in bottom_nav
    assert 'data-view="ai-picks"' in bottom_nav


def test_bottom_nav_ai_picks_has_short_label():
    index = INDEX_HTML.read_text()
    # Guard 6: bottom-nav AI Picks item has a short "AI" label
    bottom_nav_start = index.index('<nav class="bottom-nav">')
    bottom_nav_end = index.index('</nav>', bottom_nav_start)
    bottom_nav = index[bottom_nav_start:bottom_nav_end]
    # Find the ai-picks link and check it contains <span>AI</span>
    ai_picks_start = bottom_nav.index('href="#ai-picks"')
    ai_picks_end = bottom_nav.index('</a>', ai_picks_start)
    ai_picks_item = bottom_nav[ai_picks_start:ai_picks_end]
    assert '<span>AI</span>' in ai_picks_item
