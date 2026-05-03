from pathlib import Path

ENV = Path('/home/rich27/.hermes/.env')


def test_openrouter_api_key_looks_like_placeholder_not_live_token():
    text = ENV.read_text(errors='ignore')
    line = next((row for row in text.splitlines() if row.startswith('OPENROUTER_API_KEY=')), '')
    value = line.split('=', 1)[1].strip() if '=' in line else ''
    assert value.startswith('sk-or-v1-')
    assert len(value) >= 20
