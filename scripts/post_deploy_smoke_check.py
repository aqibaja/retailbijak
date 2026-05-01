#!/usr/bin/env python3
from __future__ import annotations

import sys
from urllib.error import URLError, HTTPError
from urllib.request import urlopen

BASE = 'http://127.0.0.1:8000'
TARGETS = [
    ('/api/health', 'status'),
    ('/api/settings', None),
    ('/api/watchlist', None),
    ('/api/portfolio', None),
    ('/', 'RetailBijak'),
]


def fetch(path: str) -> str:
    with urlopen(f'{BASE}{path}', timeout=10) as resp:
        body = resp.read().decode('utf-8', errors='replace')
        if resp.status != 200:
            raise RuntimeError(f'{path} returned {resp.status}')
        return body


def main() -> int:
    failures: list[str] = []
    for path, needle in TARGETS:
        try:
            body = fetch(path)
            if needle and needle not in body:
                failures.append(f'{path} missing expected marker: {needle}')
                print(f'FAIL {path} missing marker {needle}', file=sys.stderr)
                continue
            print(f'OK {path}')
        except (HTTPError, URLError, TimeoutError, RuntimeError) as exc:
            failures.append(f'{path}: {exc}')
            print(f'FAIL {path}: {exc}', file=sys.stderr)

    if failures:
        print('\nFAIL: post-deploy smoke check failed.', file=sys.stderr)
        return 1

    print('\nPASS: post-deploy smoke check OK.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
