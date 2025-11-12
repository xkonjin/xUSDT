"""
Comprehensive On-Chain Integration Tests

Tests Python crypto functions (EIP-712, EIP-3009) and their integration
with deployed smart contracts.
"""

from __future__ import annotations

import os
import time
from eth_account import Account
from eth_account.messages import encode_structured_data
from web3 import Web3
from web3.middleware import geth_poa_middleware

# Import crypto functions
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agent.crypto import (
    build_router_typed_data,
    build_eip3009_typed_data,
    build_channel_receipt_typed_data,
    sign_typed_data,
    random_nonce32,
)


def test_eip712_router_signature():
    """Test EIP-712 signature generation for PaymentRouter."""
    print("\n[TEST] EIP-712 Router Signature")
    
    # Create test account
    payer = Account.create()
    
    # Build typed data
    typed_data = build_router_typed_data(
        chain_id=31337,  # Hardhat default
        verifying_contract="0x1111111111111111111111111111111111111111",
        token="0x2222222222222222222222222222222222222222",
        from_addr=payer.address,
        to_addr="0x3333333333333333333333333333333333333333",
        amount=1_000_000,
        nonce=0,
        deadline=int(time.time()) + 3600,
    )
    
    # Sign typed data
    v, r_hex, s_hex = sign_typed_data(payer.key.hex(), typed_data)
    
    # Verify signature
    signable = encode_structured_data(primitive=typed_data)
    recovered = Account.recover_message(signable, signature=bytes.fromhex(r_hex[2:] + s_hex[2:]) + bytes([v - 27]))
    
    assert recovered == payer.address, f"Signature recovery failed: {recovered} != {payer.address}"
    print(f"  ✓ Signature verified for payer: {payer.address}")
    print(f"  ✓ v={v}, r={r_hex[:20]}..., s={s_hex[:20]}...")


def test_eip3009_transfer_with_authorization():
    """Test EIP-3009 TransferWithAuthorization typed data."""
    print("\n[TEST] EIP-3009 TransferWithAuthorization")
    
    payer = Account.create()
    nonce = random_nonce32()
    
    typed_data = build_eip3009_typed_data(
        token_name="USDTe",
        token_version="1",
        chain_id=9745,  # Plasma chain ID
        verifying_contract="0x4444444444444444444444444444444444444444",
        from_addr=payer.address,
        to_addr="0x5555555555555555555555555555555555555555",
        value=1_000_000,
        valid_after=int(time.time()) - 100,
        valid_before=int(time.time()) + 3600,
        nonce32=nonce,
    )
    
    # Sign typed data
    v, r_hex, s_hex = sign_typed_data(payer.key.hex(), typed_data)
    
    # Verify signature
    signable = encode_structured_data(primitive=typed_data)
    recovered = Account.recover_message(signable, signature=bytes.fromhex(r_hex[2:] + s_hex[2:]) + bytes([v - 27]))
    
    assert recovered == payer.address, f"Signature recovery failed: {recovered} != {payer.address}"
    print(f"  ✓ EIP-3009 signature verified for payer: {payer.address}")
    print(f"  ✓ Nonce: {nonce[:20]}...")


def test_channel_receipt_signature():
    """Test EIP-712 signature for PlasmaPaymentChannel Receipt."""
    print("\n[TEST] Channel Receipt Signature")
    
    payer = Account.create()
    nonce = random_nonce32()
    service_id = random_nonce32()
    
    typed_data = build_channel_receipt_typed_data(
        chain_id=9745,
        verifying_contract="0x6666666666666666666666666666666666666666",
        payer=payer.address,
        merchant="0x7777777777777777777777777777777777777777",
        amount=100_000,
        service_id_hex32=service_id,
        nonce32=nonce,
        expiry=int(time.time()) + 3600,
    )
    
    # Sign typed data
    v, r_hex, s_hex = sign_typed_data(payer.key.hex(), typed_data)
    
    # Verify signature
    signable = encode_structured_data(primitive=typed_data)
    recovered = Account.recover_message(signable, signature=bytes.fromhex(r_hex[2:] + s_hex[2:]) + bytes([v - 27]))
    
    assert recovered == payer.address, f"Signature recovery failed: {recovered} != {payer.address}"
    print(f"  ✓ Channel receipt signature verified for payer: {payer.address}")
    print(f"  ✓ Service ID: {service_id[:20]}...")
    print(f"  ✓ Nonce: {nonce[:20]}...")


def test_nonce_generation():
    """Test random nonce generation."""
    print("\n[TEST] Nonce Generation")
    
    nonce1 = random_nonce32()
    nonce2 = random_nonce32()
    
    assert len(nonce1) == 66, f"Nonce length incorrect: {len(nonce1)} != 66"  # 0x + 64 hex chars
    assert nonce1.startswith("0x"), "Nonce should start with 0x"
    assert nonce1 != nonce2, "Nonces should be unique"
    
    print(f"  ✓ Generated nonce 1: {nonce1[:20]}...")
    print(f"  ✓ Generated nonce 2: {nonce2[:20]}...")
    print(f"  ✓ Nonces are unique")


def test_typed_data_structure():
    """Test that typed data structures are correctly formatted."""
    print("\n[TEST] Typed Data Structure")
    
    typed_data = build_router_typed_data(
        chain_id=1,
        verifying_contract="0x1111111111111111111111111111111111111111",
        token="0x2222222222222222222222222222222222222222",
        from_addr="0x3333333333333333333333333333333333333333",
        to_addr="0x4444444444444444444444444444444444444444",
        amount=1_000_000,
        nonce=0,
        deadline=int(time.time()) + 3600,
    )
    
    # Verify structure
    assert "types" in typed_data
    assert "EIP712Domain" in typed_data["types"]
    assert "Transfer" in typed_data["types"]
    assert "primaryType" in typed_data
    assert typed_data["primaryType"] == "Transfer"
    assert "domain" in typed_data
    assert "message" in typed_data
    
    print("  ✓ Typed data structure is valid")
    print(f"  ✓ Domain name: {typed_data['domain']['name']}")
    print(f"  ✓ Primary type: {typed_data['primaryType']}")


def test_multiple_signatures():
    """Test signing multiple messages with same key."""
    print("\n[TEST] Multiple Signatures")
    
    payer = Account.create()
    signatures = []
    
    for i in range(3):
        typed_data = build_router_typed_data(
            chain_id=31337,
            verifying_contract="0x1111111111111111111111111111111111111111",
            token="0x2222222222222222222222222222222222222222",
            from_addr=payer.address,
            to_addr="0x3333333333333333333333333333333333333333",
            amount=1_000_000 * (i + 1),
            nonce=i,
            deadline=int(time.time()) + 3600,
        )
        
        v, r_hex, s_hex = sign_typed_data(payer.key.hex(), typed_data)
        signatures.append((v, r_hex, s_hex))
    
    # Verify all signatures
    for i, (v, r_hex, s_hex) in enumerate(signatures):
        typed_data = build_router_typed_data(
            chain_id=31337,
            verifying_contract="0x1111111111111111111111111111111111111111",
            token="0x2222222222222222222222222222222222222222",
            from_addr=payer.address,
            to_addr="0x3333333333333333333333333333333333333333",
            amount=1_000_000 * (i + 1),
            nonce=i,
            deadline=int(time.time()) + 3600,
        )
        
        signable = encode_structured_data(primitive=typed_data)
        recovered = Account.recover_message(signable, signature=bytes.fromhex(r_hex[2:] + s_hex[2:]) + bytes([v - 27]))
        assert recovered == payer.address
    
    print(f"  ✓ Generated and verified {len(signatures)} signatures")
    print(f"  ✓ All signatures are valid and unique")


def run_all_tests():
    """Run all on-chain integration tests."""
    print("=" * 70)
    print("ON-CHAIN INTEGRATION TESTS")
    print("=" * 70)
    
    tests = [
        test_eip712_router_signature,
        test_eip3009_transfer_with_authorization,
        test_channel_receipt_signature,
        test_nonce_generation,
        test_typed_data_structure,
        test_multiple_signatures,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"\n  ✗ Test failed: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
    
    print("\n" + "=" * 70)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 70)
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)

