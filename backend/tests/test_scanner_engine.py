from __future__ import annotations

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.scanner_engine import analyze_stock, scan_universe


def sample_row(**overrides):
    base = {
        'ticker': 'BBCA',
        'name': 'Bank Central Asia Tbk.',
        'price': 1000,
        'per': 10,
        'pbv': 2,
        'roe': 20,
        'roa': 10,
        'market_cap': 1000000,
        'dividend_yield': 3,
        'volume_spike': 1.5,
        'trend_score': 75,
        'liquidity_score': 50,
        'volatility_score': 40,
        'breakout': True,
    }
    base.update(overrides)
    return base


def test_analyze_stock_has_expected_keys():
    result = analyze_stock(sample_row())
    assert result['ticker'] == 'BBCA'
    assert 'swing' in result
    assert 'valuation' in result
    assert 'gorengan' in result
    assert 'dividend' in result
    assert 'signal' in result
    assert isinstance(result['tags'], list)


def test_analyze_stock_signal_contains_rr_and_entry():
    result = analyze_stock(sample_row(price=1200, breakout=False, trend_score=60))
    signal = result['signal']
    assert 'entry' in signal
    assert 'target' in signal
    assert 'stopLoss' in signal
    assert 'rr' in signal


def test_scan_universe_sorts_by_quality():
    rows = [
        sample_row(ticker='AAA', trend_score=80, volume_spike=2.0, breakout=True),
        sample_row(ticker='BBB', trend_score=30, volume_spike=0.8, breakout=False),
    ]
    result = scan_universe(rows)
    assert len(result) == 2
    assert result[0]['ticker'] == 'AAA'


def test_scan_universe_filter_rule():
    rows = [
        sample_row(ticker='AAA', trend_score=80, volume_spike=2.0, breakout=True),
        sample_row(ticker='BBB', trend_score=30, volume_spike=0.8, breakout=False),
    ]
    result = scan_universe(rows, rule='swing_breakout')
    assert all(item['ticker'] == 'AAA' for item in result)


def test_analyze_stock_tags_are_reasonable():
    result = analyze_stock(sample_row(volume_spike=3.0, breakout=True, trend_score=90))
    assert 'swing_breakout' in result['tags'] or 'low_risk' in result['tags']
