"""Remove the redundant zero-stake prefix from the shared BET hint only."""

BEFORE = "Money.amountBig(selectedStake)===0n?'0 G · 的中 +10 G · 外れ・引分 ±0 G'"
AFTER = "Money.amountBig(selectedStake)===0n?'的中 +10 G · 外れ・引分 ±0 G'"


def patch(source):
    if BEFORE not in source:
        assert source.count(AFTER) == 1, "Expected the single zero-stake hint"
        return source
    assert source.count(BEFORE) == 1, "Expected the single zero-stake hint"
    assert AFTER not in source, "Both old and new zero-stake hints are present"
    return source.replace(BEFORE, AFTER, 1)
