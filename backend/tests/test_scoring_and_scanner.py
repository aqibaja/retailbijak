from backend.services.scoring.swing import score_swing
from backend.services.scoring.valuation import score_valuation, estimate_fair_value
from backend.services.scoring.gorengan import score_gorengan
from backend.services.scoring.dividend import score_dividend
from backend.services.scanner_engine import scan_universe


def test_swing_score_boosts_breakout_and_volume():
    result = score_swing({"trend_score": 40, "volume_spike": 2.5, "breakout": True, "liquidity_score": 60, "volatility_score": 40})
    assert result["score"] >= 70
    assert result["label"] == "strong"


def test_valuation_estimates_fair_value():
    fv = estimate_fair_value(1000, per=10, pbv=1)
    assert fv is not None
    assert fv > 1000


def test_valuation_score_marks_cheap_when_metrics_good():
    result = score_valuation({"price": 1000, "per": 8, "pbv": 1.2, "roe": 18})
    assert result["score"] >= 70
    assert result["label"] == "cheap"


def test_gorengan_score_rises_on_small_cap_spike():
    result = score_gorengan({"market_cap": 500_000_000_000, "volume_spike": 3.2, "volatility_score": 80, "per": 50, "pbv": 8})
    assert result["score"] >= 70
    assert result["label"] == "high"


def test_dividend_score_rewards_yield_and_consistency():
    result = score_dividend({"dividend_yield": 5.5, "dividend_consistency": 4, "payout_ratio": 50})
    assert result["score"] >= 70
    assert result["label"] == "attractive"


def test_scanner_filters_and_sorts():
    rows = [
        {"ticker": "AAA", "price": 1000, "per": 8, "pbv": 1.2, "roe": 18, "volume_spike": 2.5, "trend_score": 60, "breakout": True, "market_cap": 2_000_000_000_000, "dividend_yield": 2.5, "dividend_consistency": 3},
        {"ticker": "BBB", "price": 500, "per": 50, "pbv": 8, "roe": 2, "volume_spike": 3.0, "market_cap": 300_000_000_000, "volatility_score": 85},
    ]
    out = scan_universe(rows)
    assert out[0]["ticker"] in {"AAA", "BBB"}
    assert any(item["ticker"] == "BBB" for item in out)
