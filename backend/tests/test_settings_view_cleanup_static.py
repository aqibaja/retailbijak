from pathlib import Path

FRONTEND_SETTINGS_VIEW = Path('/home/rich27/retailbijak/frontend/js/views/settings.js')


def test_settings_view_does_not_use_legacy_status_injection_selector():
    content = FRONTEND_SETTINGS_VIEW.read_text()
    assert "document.createElement('div')" not in content
    assert "root.querySelector('.col-span-8 .flex.justify-between.items-center.pt-2')" not in content
    assert "const status = document.createElement('div');" not in content
