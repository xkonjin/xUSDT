from agent_local.merchant_agent import compute_protocol_fee


def test_compute_protocol_fee_percent_only():
    # 10 bps of 1_000_000 = 1000
    fee, floor = compute_protocol_fee(1_000_000, chain="plasma", mode="channel")
    assert fee == 1000
    assert floor is False


def test_compute_protocol_fee_floor_applied(monkeypatch):
    # Force a static floor of 1500 atomic units
    import sys
    import agent_local.merchant_agent as ma

    class Dummy:
        DIRECT_SETTLE_FLOOR_ATOMIC = 1500
        PLATFORM_FEE_BPS = 10

    # Patch the underlying module referenced by compute_protocol_fee
    monkeypatch.setattr(sys.modules['agent.merchant_agent'], "settings", Dummy(), raising=False)

    # 10 bps of 10_000 = 10; floor=1500, expect floor
    fee, floor = compute_protocol_fee(10_000, chain="plasma", mode="direct")
    assert fee == 1500
    assert floor is True


