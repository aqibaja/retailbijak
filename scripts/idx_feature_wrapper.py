#!/usr/bin/env python3
"""Wrapper for hourly IDX/retailbijak progress checks.

The script inspects repo state and prints a compact backlog suggestion.
Cron prompt should use this output to create one new actionable task.
"""
from __future__ import annotations

from pathlib import Path
import subprocess
import json

ROOT = Path('/home/rich27/.hermes/profiles/coder/home/retailbijak')


def run(cmd: list[str]) -> str:
    return subprocess.check_output(cmd, cwd=ROOT, text=True).strip()


def main() -> None:
    try:
        status = run(['git', 'status', '--short'])
    except Exception as exc:
        status = f'git status failed: {exc}'

    try:
        last_commit = run(['git', 'rev-parse', '--short', 'HEAD'])
    except Exception:
        last_commit = 'unknown'

    planning = ROOT / 'planning' / 'idx-api-retailbijak-24h-plan.md'
    plan_exists = planning.exists()

    backlog = {
        'repo': str(ROOT),
        'last_commit': last_commit,
        'dirty': bool(status),
        'status': status.splitlines()[:20] if status else [],
        'plan_exists': plan_exists,
        'recommended_next_task': 'Continue API integration: wire backend analysis endpoints to frontend dashboard/detail/scanner and keep fallback states alive.',
    }
    print(json.dumps(backlog, ensure_ascii=False))


if __name__ == '__main__':
    main()
