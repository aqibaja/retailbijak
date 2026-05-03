from backend.ai_picks import label_confidence, reason_labels_from_factors, score_pick


def test_score_pick_prefers_stronger_technical_and_liquidity_for_swing():
    stronger = score_pick(
        {
            'technical': 0.82,
            'liquidity': 0.78,
            'fundamental': 0.42,
            'catalyst': 0.35,
            'risk': 0.28,
            'volume_ratio': 1.7,
            'trend_ok': True,
            'rr_ok': True,
        },
        mode='swing',
    )
    weaker = score_pick(
        {
            'technical': 0.45,
            'liquidity': 0.33,
            'fundamental': 0.61,
            'catalyst': 0.35,
            'risk': 0.52,
            'volume_ratio': 0.9,
            'trend_ok': False,
            'rr_ok': False,
        },
        mode='swing',
    )

    assert stronger['score'] > weaker['score']
    assert stronger['fit_label']



def test_score_pick_prefers_higher_fundamental_and_lower_risk_for_defensive():
    stronger = score_pick(
        {
            'technical': 0.48,
            'liquidity': 0.62,
            'fundamental': 0.88,
            'catalyst': 0.22,
            'risk': 0.18,
            'quality_ok': True,
            'rr_ok': True,
        },
        mode='defensive',
    )
    weaker = score_pick(
        {
            'technical': 0.56,
            'liquidity': 0.51,
            'fundamental': 0.41,
            'catalyst': 0.22,
            'risk': 0.67,
            'quality_ok': False,
            'rr_ok': False,
        },
        mode='defensive',
    )

    assert stronger['score'] > weaker['score']
    assert stronger['fit_label']



def test_score_pick_prefers_catalyst_strength_for_catalyst_mode():
    stronger = score_pick(
        {
            'technical': 0.51,
            'liquidity': 0.55,
            'fundamental': 0.44,
            'catalyst': 0.91,
            'risk': 0.31,
            'catalyst_ok': True,
            'volume_ratio': 1.5,
        },
        mode='catalyst',
    )
    weaker = score_pick(
        {
            'technical': 0.68,
            'liquidity': 0.55,
            'fundamental': 0.44,
            'catalyst': 0.15,
            'risk': 0.31,
            'catalyst_ok': False,
            'volume_ratio': 1.0,
        },
        mode='catalyst',
    )

    assert stronger['score'] > weaker['score']
    assert stronger['fit_label']



def test_label_confidence_is_clamped_to_eligible_range():
    high = label_confidence(
        96.0,
        {
            'fundamental': 0.85,
            'catalyst': 0.8,
            'risk': 0.1,
            'liquidity': 0.8,
        },
    )
    low = label_confidence(
        12.0,
        {
            'fundamental': 0.0,
            'catalyst': 0.0,
            'risk': 1.0,
            'liquidity': 0.1,
        },
    )

    assert 35 <= low <= 95
    assert 35 <= high <= 95
    assert high > low



def test_reason_labels_are_never_empty_for_eligible_pick():
    labels = reason_labels_from_factors(
        {
            'technical': 0.72,
            'liquidity': 0.81,
            'fundamental': 0.65,
            'catalyst': 0.4,
            'risk': 0.22,
            'trend_ok': True,
            'rr_ok': True,
            'volume_ratio': 1.4,
        },
        mode='swing',
    )

    assert isinstance(labels, list)
    assert labels
    assert all(isinstance(label, str) and label.strip() for label in labels)
