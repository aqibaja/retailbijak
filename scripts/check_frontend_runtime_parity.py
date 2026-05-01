#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import sys
from pathlib import Path

REPO_FRONTEND = Path('/home/rich27/retailbijak/frontend')
RUNTIME_FRONTEND = Path('/opt/swingaq/frontend')
CORE_ASSETS = [
    'index.html',
    'style.css',
    'js/main.js',
    'js/router.js',
    'js/api.js',
    'js/theme.js',
]
ROUTED_VIEW_ASSETS = [
    'js/views/dashboard.js',
    'js/views/stock_detail.js',
    'js/views/screener.js',
    'js/views/portfolio.js',
    'js/views/market.js',
    'js/views/news.js',
    'js/views/settings.js',
    'js/views/help.js',
]
ALL_ASSETS = CORE_ASSETS + ROUTED_VIEW_ASSETS


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    mismatches: list[str] = []
    for rel in ALL_ASSETS:
        repo_file = REPO_FRONTEND / rel
        runtime_file = RUNTIME_FRONTEND / rel
        if not repo_file.exists():
            mismatches.append(f'MISSING repo:{rel}')
            continue
        if not runtime_file.exists():
            mismatches.append(f'MISSING runtime:{rel}')
            continue
        repo_hash = sha256(repo_file)
        runtime_hash = sha256(runtime_file)
        status = 'OK' if repo_hash == runtime_hash else 'MISMATCH'
        print(f'{status} {rel} repo={repo_hash[:12]} runtime={runtime_hash[:12]}')
        if repo_hash != runtime_hash:
            mismatches.append(rel)

    if mismatches:
        print('\nFAIL: repo/runtime frontend parity mismatch detected.', file=sys.stderr)
        for item in mismatches:
            print(f' - {item}', file=sys.stderr)
        return 1

    print('\nPASS: repo/runtime frontend parity OK.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
