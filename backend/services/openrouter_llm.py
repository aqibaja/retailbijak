from __future__ import annotations

import json
import re
import os
from typing import Any

import requests
from sqlalchemy.orm import Session

try:
    from database import UserSetting
except ModuleNotFoundError:
    from backend.database import UserSetting

OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
DEFAULT_STOCK_ANALYSIS_MODEL = 'google/gemma-4-26b-a4b-it'
DEFAULT_AI_PICKS_MODEL = 'google/gemma-4-26b-a4b-it'


def _setting(db: Session | None, key: str) -> str | None:
    if db is None:
        return None
    row = db.query(UserSetting).filter(UserSetting.key == key).first()
    value = (row.value if row else '') or ''
    value = value.strip()
    return value or None


def get_openrouter_config(db: Session | None = None) -> dict[str, Any]:
    api_key = _setting(db, 'openrouter_api_key') or os.getenv('OPENROUTER_API_KEY', '').strip() or None
    site_url = _setting(db, 'openrouter_site_url') or os.getenv('OPENROUTER_SITE_URL', '').strip() or None
    app_name = _setting(db, 'openrouter_app_name') or os.getenv('OPENROUTER_APP_NAME', 'RetailBijak').strip() or 'RetailBijak'
    stock_model = _setting(db, 'openrouter_stock_analysis_model') or os.getenv('OPENROUTER_STOCK_ANALYSIS_MODEL', DEFAULT_STOCK_ANALYSIS_MODEL).strip() or DEFAULT_STOCK_ANALYSIS_MODEL
    picks_model = _setting(db, 'openrouter_ai_picks_model') or os.getenv('OPENROUTER_AI_PICKS_MODEL', DEFAULT_AI_PICKS_MODEL).strip() or DEFAULT_AI_PICKS_MODEL
    return {
        'enabled': bool(api_key),
        'api_key': api_key,
        'site_url': site_url,
        'app_name': app_name,
        'stock_analysis_model': stock_model,
        'ai_picks_model': picks_model,
    }


def get_openrouter_runtime_status(config: dict[str, Any]) -> dict[str, str]:
    api_key = str(config.get('api_key') or '').strip()
    if not api_key:
        return {'state': 'disabled', 'message': 'OpenRouter belum dikonfigurasi.'}
    try:
        response = requests.get(f'{OPENROUTER_BASE_URL}/auth/key', headers={'Authorization': f'Bearer {api_key}'}, timeout=10)
        if response.status_code == 200:
            return {'state': 'ok', 'message': 'API key OpenRouter tervalidasi.'}
        data = {}
        try:
            data = response.json()
        except Exception:
            data = {}
        message = data.get('error', {}).get('message') or response.text or 'validasi key gagal'
        return {'state': 'invalid', 'message': f'API key OpenRouter ditolak provider: {message}'}
    except Exception as exc:
        return {'state': 'unknown', 'message': f'Validasi OpenRouter gagal: {exc}'}


def _chat_completion(*, api_key: str, model: str, system_prompt: str, user_prompt: str, site_url: str | None, app_name: str, timeout: int = 20) -> dict[str, Any]:
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
        'HTTP-Referer': site_url or 'https://retailbijak.rich27.my.id',
        'X-Title': app_name,
    }
    payload = {
        'model': model,
        'temperature': 0.2,
        'response_format': {'type': 'json_object'},
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt},
        ],
    }
    response = requests.post(f'{OPENROUTER_BASE_URL}/chat/completions', headers=headers, json=payload, timeout=timeout)
    try:
        data = response.json()
    except Exception:
        raw_body = (response.text or '').strip()
        json_start = raw_body.find('{')
        if json_start >= 0:
            try:
                data = json.loads(raw_body[json_start:])
            except Exception as exc:
                raise RuntimeError(f'gagal parse body OpenRouter: {exc}') from exc
        else:
            raise RuntimeError('respons OpenRouter kosong atau bukan JSON')
    if response.status_code >= 400:
        error = data.get('error') or {}
        metadata = error.get('metadata') or {}
        raw_message = metadata.get('raw') or error.get('message') or response.text or f'HTTP {response.status_code}'
        if response.status_code == 429:
            raise RuntimeError(f'RATE_LIMIT::{raw_message}')
        raise RuntimeError(raw_message)
    choices = data.get('choices') or []
    if not choices:
        error = data.get('error') or {}
        metadata = error.get('metadata') or {}
        raw_message = metadata.get('raw') or error.get('message') or 'respons OpenRouter tidak memuat choices'
        raise RuntimeError(raw_message)
    content = choices[0]['message']['content']
    if isinstance(content, list):
        content = ''.join(
            part.get('text', '') if isinstance(part, dict) else str(part)
            for part in content
        )
    content = str(content).strip()
    if not content:
        raise RuntimeError('respons OpenRouter kosong')
    try:
        parsed = json.loads(content)
    except Exception:
        match = re.search(r'\{.*\}', content, re.S)
        if not match:
            raise RuntimeError('konten OpenRouter bukan JSON valid')
        parsed = json.loads(match.group(0))
    parsed['_provider'] = data.get('provider')
    return parsed


def build_stock_chat_llm_payload(*, ticker: str, message: str, technical: dict | None = None,
                                   fundamental: dict | None = None, news: list | None = None,
                                   db: Session | None = None) -> dict[str, Any]:
    """Chat AI untuk stock detail — tanya apa saja tentang saham."""
    config = get_openrouter_config(db)
    model = config['stock_analysis_model']
    runtime = get_openrouter_runtime_status(config)

    if not config['enabled']:
        return {
            'status': 'disabled',
            'model': model,
            'reply': None,
            'runtime_state': runtime['state'],
            'runtime_message': runtime['message'],
        }

    # Build context string from technical, fundamental, news
    context_parts = []
    if technical:
        tech_indicators = technical.get('indicators', {})
        rsi = tech_indicators.get('rsi', {}).get('value', '—')
        macd = tech_indicators.get('macd', {}).get('status', '—')
        trend = tech_indicators.get('trend', {}).get('status', '—')
        atr = tech_indicators.get('atr', {}).get('value', '—')
        volume_ratio = tech_indicators.get('volume', {}).get('ratio', '—')
        sr = tech_indicators.get('support_resistance', {})
        support = sr.get('support_20d', '—')
        resistance = sr.get('resistance_20d', '—')
        rating = technical.get('rating', 'NETRAL')
        score = technical.get('score', 50)
        context_parts.append(
            f'TEKNIKAL: Rating {rating} (Skor {score}). '
            f'RSI {rsi}, MACD {macd}, Trend {trend}, '
            f'ATR {atr}, Volume {volume_ratio}x rata-rata. '
            f'Support {support}, Resistance {resistance}.'
        )
    if fundamental:
        context_parts.append(
            f'FUNDAMENTAL: PE {fundamental.get("trailing_pe", "—")}x, '
            f'PB {fundamental.get("price_to_book", "—")}x, '
            f'ROE {fundamental.get("roe", "—")}%, '
            f'DER {fundamental.get("debt_to_equity", "—")}.'
        )
    if news:
        news_str = '; '.join([f'{n.get("title","")} ({n.get("published_at","")})' for n in news[:3]])
        context_parts.append(f'BERITA: {news_str}')

    context = '\n'.join(context_parts) if context_parts else 'Data saham terbatas.'

    system_prompt = (
        f'Kamu analis saham IDX yang ramah dan ringkas. Jawab dalam Bahasa Indonesia. '
        f'Gunakan data berikut untuk menjawab pertanyaan tentang {ticker}:\n{context}\n\n'
        f'Beri jawaban yang informatif tapi tidak panjang lebar. '
        f'Jika ditanya entry/stop/target, beri angka spesifik berdasarkan data teknikal. '
        f'Jika ditanya rekomendasi, sertakan disclaimer singkat. '
        f'BALASAN HARUS JSON DENGAN KEY "reply": "jawaban teks biasa".'
    )

    try:
        parsed = _chat_completion(
            api_key=config['api_key'],
            model=model,
            system_prompt=system_prompt,
            user_prompt=message,
            site_url=config['site_url'],
            app_name=config['app_name'],
        )
        reply = str(parsed.get('summary') or parsed.get('reply') or parsed.get('response') or '').strip()
        if not reply:
            reply = 'Maaf, saya belum bisa memberikan jawaban untuk pertanyaan itu saat ini.'
        return {
            'status': 'ok',
            'model': model,
            'reply': reply,
            'provider': parsed.get('_provider'),
            'runtime_state': runtime['state'],
            'runtime_message': runtime['message'],
        }
    except Exception as exc:
        message_str = str(exc)
        is_rate_limited = message_str.startswith('RATE_LIMIT::') or 'rate-limit' in message_str.lower()
        fallback = runtime['message'] if runtime['state'] in {'invalid', 'unknown'} else (
            f'LLM sementara kena rate limit: {message_str.split("RATE_LIMIT::", 1)[-1]}'
            if is_rate_limited else f'Gagal memproses chat: {message_str}'
        )
        return {
            'status': 'error',
            'model': model,
            'reply': fallback,
            'runtime_state': 'rate_limited' if is_rate_limited else (runtime['state'] if runtime['state'] != 'ok' else 'unknown'),
            'runtime_message': fallback,
        }


# ─── Stock Analysis LLM ──────────────────────────


def build_stock_analysis_llm_payload(*, ticker: str, row: dict[str, Any], analysis: dict[str, Any], db: Session | None = None) -> dict[str, Any]:
    config = get_openrouter_config(db)
    model = config['stock_analysis_model']
    runtime = get_openrouter_runtime_status(config)
    if not config['enabled']:
        return {
            'status': 'disabled',
            'model': model,
            'summary': runtime['message'],
            'bullets': [],
            'runtime_state': runtime['state'],
            'runtime_message': runtime['message'],
        }

    system_prompt = (
        'Kamu analis saham IDX yang ringkas. Jawab hanya JSON valid dengan key: '
        'summary (string), bullets (array 2-4 string), risk_note (string), action_bias (string).'
    )
    user_prompt = json.dumps({
        'ticker': ticker,
        'snapshot': row,
        'analysis': analysis,
    }, ensure_ascii=False)
    try:
        parsed = _chat_completion(
            api_key=config['api_key'],
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            site_url=config['site_url'],
            app_name=config['app_name'],
        )
        return {
            'status': 'ok',
            'model': model,
            'summary': str(parsed.get('summary') or '').strip(),
            'bullets': [str(item) for item in (parsed.get('bullets') or []) if str(item).strip()][:4],
            'risk_note': str(parsed.get('risk_note') or '').strip(),
            'action_bias': str(parsed.get('action_bias') or '').strip(),
            'provider': parsed.get('_provider'),
            'runtime_state': runtime['state'],
            'runtime_message': runtime['message'],
        }
    except Exception as exc:
        message = str(exc)
        is_rate_limited = message.startswith('RATE_LIMIT::') or 'rate-limit' in message.lower() or 'rate limit' in message.lower() or '429' in message
        fallback_message = runtime['message'] if runtime['state'] in {'invalid', 'unknown'} else (
            f"LLM sementara kena rate limit upstream: {message.split('RATE_LIMIT::', 1)[-1]}" if is_rate_limited else f'LLM gagal: {message}'
        )
        return {
            'status': 'error',
            'model': model,
            'summary': fallback_message,
            'bullets': [],
            'runtime_state': 'rate_limited' if is_rate_limited else (runtime['state'] if runtime['state'] != 'ok' else 'unknown'),
            'runtime_message': fallback_message,
        }


def build_ai_picks_llm_payload(*, mode: str, picks: list[dict[str, Any]], market_context: dict[str, Any], db: Session | None = None) -> dict[str, Any]:
    config = get_openrouter_config(db)
    model = config['ai_picks_model']
    runtime = get_openrouter_runtime_status(config)
    if not config['enabled']:
        return {
            'status': 'disabled',
            'model': model,
            'summary': runtime['message'],
            'pick_notes': {},
            'runtime_state': runtime['state'],
            'runtime_message': runtime['message'],
        }

    compact_picks = [
        {
            'ticker': row.get('ticker'),
            'score': row.get('score'),
            'confidence': row.get('confidence'),
            'fit_label': row.get('fit_label'),
            'reason_labels': row.get('reason_labels'),
            'entry_zone': row.get('entry_zone'),
            'target_zone': row.get('target_zone'),
            'invalidation': row.get('invalidation'),
        }
        for row in picks[:5]
    ]
    system_prompt = (
        'Kamu kurator ide saham IDX yang ringkas. Jawab hanya JSON valid dengan key: '
        'summary (string), market_bias (string), pick_notes (object ticker->short note).'
    )
    user_prompt = json.dumps({
        'mode': mode,
        'market_context': market_context,
        'picks': compact_picks,
    }, ensure_ascii=False)
    try:
        parsed = _chat_completion(
            api_key=config['api_key'],
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            site_url=config['site_url'],
            app_name=config['app_name'],
        )
        raw_notes = parsed.get('pick_notes') or {}
        pick_notes = {str(k): str(v) for k, v in raw_notes.items() if str(k).strip() and str(v).strip()}
        return {
            'status': 'ok',
            'model': model,
            'summary': str(parsed.get('summary') or '').strip(),
            'market_bias': str(parsed.get('market_bias') or '').strip(),
            'pick_notes': pick_notes,
            'provider': parsed.get('_provider'),
            'runtime_state': runtime['state'],
            'runtime_message': runtime['message'],
        }
    except Exception as exc:
        message = str(exc)
        is_rate_limited = message.startswith('RATE_LIMIT::') or 'rate-limit' in message.lower() or 'rate limit' in message.lower() or '429' in message
        fallback_message = runtime['message'] if runtime['state'] in {'invalid', 'unknown'} else (
            f"LLM sementara kena rate limit upstream: {message.split('RATE_LIMIT::', 1)[-1]}" if is_rate_limited else f'LLM gagal: {message}'
        )
        return {
            'status': 'error',
            'model': model,
            'summary': fallback_message,
            'pick_notes': {},
            'runtime_state': 'rate_limited' if is_rate_limited else (runtime['state'] if runtime['state'] != 'ok' else 'unknown'),
            'runtime_message': fallback_message,
        }
