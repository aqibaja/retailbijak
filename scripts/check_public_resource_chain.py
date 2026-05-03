#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import urlopen

BASE = 'https://retailbijak.rich27.my.id/'
INDEX_PATH = 'index.html'
CORE_PATHS = ['js/main.js', 'js/router.js', 'js/api.js']
ROUTE_VIEW_MARKERS = {
    'dashboard': ('js/views/dashboard.js', 'renderDashboard'),
    'stock': ('js/views/stock_detail.js', 'renderStockDetail'),
    'screener': ('js/views/screener.js', 'renderScreener'),
    'portfolio': ('js/views/portfolio.js', 'renderPortfolio'),
    'market': ('js/views/market.js', 'renderMarket'),
    'news': ('js/views/news.js', 'renderNews'),
    'settings': ('js/views/settings.js', 'renderSettings'),
    'help': ('js/views/help.js', 'renderHelp'),
}


def fetch_text(url: str) -> str:
    with urlopen(url, timeout=15) as resp:
        body = resp.read().decode('utf-8', errors='replace')
        if resp.status != 200:
            raise RuntimeError(f'{url} returned {resp.status}')
        return body


def extract(pattern: str, text: str, label: str) -> str:
    match = re.search(pattern, text)
    if not match:
        raise RuntimeError(f'missing {label}')
    return match.group(1)


def assert_contains(text: str, needle: str, label: str) -> None:
    if needle not in text:
        raise RuntimeError(f'{label} missing expected marker: {needle}')


def main() -> int:
    failures: list[str] = []
    try:
        index_url = urljoin(BASE, INDEX_PATH)
        index_text = fetch_text(index_url)
        assert_contains(index_text, 'js/main.js?v=', 'index.html')
        main_token = extract(r'js/main\.js\?v=([A-Za-z0-9_-]+)', index_text, 'main token')

        main_url = urljoin(BASE, f'js/main.js?v={main_token}')
        main_text = fetch_text(main_url)
        router_token = extract(r'\.\/router\.js\?v=([A-Za-z0-9_-]+)', main_text, 'router token')
        api_token = extract(r'\.\/api\.js\?v=([A-Za-z0-9_-]+)', main_text, 'api token')
        if router_token != main_token:
            raise RuntimeError(f'router token drift: main={main_token} router={router_token}')

        router_url = urljoin(BASE, f'js/router.js?v={router_token}')
        router_text = fetch_text(router_url)
        api_url = urljoin(BASE, f'js/api.js?v={api_token}')
        api_text = fetch_text(api_url)
        assert_contains(api_text, 'export async function apiFetch', 'api.js')
        assert_contains(router_text, 'renderDashboard', 'router.js')

        print(f'OK index.html main={main_token}')
        print(f'OK js/main.js?v={main_token} api={api_token}')
        print(f'OK js/router.js?v={router_token}')
        print(f'OK js/api.js?v={api_token}')

        for route_name, (asset_path, marker) in ROUTE_VIEW_MARKERS.items():
            pattern = rf'\.\/views\/{re.escape(asset_path.split("/")[-1])}\?v=([A-Za-z0-9_-]+)'
            view_token = extract(pattern, router_text, f'{route_name} token')
            view_url = urljoin(BASE, f'{asset_path}?v={view_token}')
            view_text = fetch_text(view_url)
            assert_contains(view_text, marker, asset_path)
            if "../api.js?v=" in view_text:
                assert_contains(view_text, f'../api.js?v={api_token}', asset_path)
            if "../main.js?v=" in view_text:
                assert_contains(view_text, f'../main.js?v={main_token}', asset_path)
            print(f'OK {route_name} {asset_path}?v={view_token}')
    except (HTTPError, URLError, TimeoutError, RuntimeError) as exc:
        failures.append(str(exc))
        print(f'FAIL {exc}', file=sys.stderr)

    if failures:
        print('\nFAIL: public resource chain check failed.', file=sys.stderr)
        return 1

    print('\nPASS: public resource chain OK.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
