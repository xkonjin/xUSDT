from __future__ import annotations

from eth_account import Account
from eth_account.messages import encode_structured_data

from agent_local.crypto import build_router_typed_data, build_eip3009_typed_data, random_nonce32


def test_eip712_router_sign_and_recover():
    acct = Account.create()
    chain_id = 42161
    verifying_contract = "0x1111111111111111111111111111111111111111"

    td = build_router_typed_data(
        chain_id=chain_id,
        verifying_contract=verifying_contract,
        token="0x2222222222222222222222222222222222222222",
        from_addr=acct.address,
        to_addr="0x3333333333333333333333333333333333333333",
        amount=1_000_000,
        nonce=0,
        deadline=2_000_000_000,
    )
    msg = encode_structured_data(primitive=td)
    sig = Account.sign_message(msg, private_key=acct.key)
    recovered = Account.recover_message(msg, signature=sig.signature)
    assert recovered == acct.address


def test_eip3009_sign_and_recover():
    acct = Account.create()
    chain_id = 9745
    verifying_contract = "0x4444444444444444444444444444444444444444"

    td = build_eip3009_typed_data(
        token_name="USDTe",
        token_version="1",
        chain_id=chain_id,
        verifying_contract=verifying_contract,
        from_addr=acct.address,
        to_addr="0x5555555555555555555555555555555555555555",
        value=1_000_000,
        valid_after=1_700_000_000,
        valid_before=1_800_000_000,
        nonce32=random_nonce32(),
    )
    msg = encode_structured_data(primitive=td)
    sig = Account.sign_message(msg, private_key=acct.key)
    recovered = Account.recover_message(msg, signature=sig.signature)
    assert recovered == acct.address


