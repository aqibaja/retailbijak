from pathlib import Path

STYLE = Path('/home/rich27/retailbijak/frontend/style.css')


def test_mobile_theme_overrides_are_scoped_per_theme():
    content = STYLE.read_text(encoding='utf-8')
    assert '@media (max-width: 767px) {' in content
    assert '[data-theme="dark"] .topbar {' in content
    assert '[data-theme="dark"] .bottom-nav {' in content
    assert '[data-theme="dark"] .panel, [data-theme="dark"] .card' in content
    assert '[data-theme="dark"] body,' in content
    assert ':root:not([data-theme="light"]) body {' in content
    mobile_block = content.split('@media (max-width: 767px) {', 1)[1].split('[data-theme="light"] body {', 1)[0]
    assert '\n  .topbar {' not in mobile_block
    assert '\n  .bottom-nav {' not in mobile_block
    assert '\n  body {' not in mobile_block


def test_light_theme_has_explicit_dashboard_hero_override():
    content = STYLE.read_text(encoding='utf-8')
    assert '[data-theme="light"] .dash-hero-pro {' in content
    assert '[data-theme="light"] .dash-quote-card {' in content
