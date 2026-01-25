"""
Test X402 Protocol Schema Alignment

Validates that both Python and TypeScript schemas are compatible
and that both old/new formats work correctly.
"""

import sys
import os

# Add the parent directory to path to import agent modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Dict, Any
from agent.x402_models import (
    X402PaymentOption,
    X402PaymentRequired, 
    X402PaymentSubmitted,
    X402PaymentCompleted,
    X402Authorization,
    FeeBreakdown,
    # Legacy imports for backward compatibility
    PaymentOption,
    PaymentRequired,
    PaymentSubmitted,
    PaymentCompleted,
)


def test_payment_option_schema():
    """Test that payment options match expected structure."""
    option_data = {
        "network": "plasma",
        "chainId": 94204209,
        "token": "0x1234567890123456789012345678901234567890",
        "tokenSymbol": "USDT0",
        "tokenDecimals": 6,
        "amount": "1000000",
        "recipient": "0x0987654321098765432109876543210987654321",
        "scheme": "eip3009-transfer-with-auth",
        "description": "Test payment"
    }
    
    # Should work with new class
    option = X402PaymentOption(**option_data)
    assert option.tokenDecimals == 6
    assert option.network == "plasma"
    
    # Should work with legacy class (backward compatibility)
    legacy_option = PaymentOption(**option_data)
    assert legacy_option.tokenDecimals == 6


def test_payment_option_extended_fields():
    """Test extended fields for routing and fees."""
    option_data = {
        "network": "ethereum",
        "chainId": 1,
        "token": "0x1234567890123456789012345678901234567890",
        "tokenSymbol": "USDC",
        "tokenDecimals": 6,
        "amount": "1000000",
        "recipient": "0x0987654321098765432109876543210987654321",
        "scheme": "eip3009-transfer-with-auth",
        "routerContract": "0x1111111111111111111111111111111111111111",
        "nftCollection": "0x2222222222222222222222222222222222222222",
        "recommendedMode": "channel",
        "feeBreakdown": {
            "amount": "1000000",
            "percentBps": 50,
            "percentFee": "5000",
            "floorApplied": True,
            "totalFee": "10000"
        }
    }
    
    option = X402PaymentOption(**option_data)
    assert option.routerContract is not None
    assert option.feeBreakdown.percentBps == 50
    assert option.feeBreakdown.floorApplied is True


def test_payment_required_schema():
    """Test payment required message structure."""
    required_data = {
        "type": "payment-required",
        "version": "1.0",
        "invoiceId": "test-invoice-123",
        "timestamp": 1640995200,
        "paymentOptions": [{
            "network": "plasma",
            "chainId": 94204209,
            "token": "0x1234567890123456789012345678901234567890",
            "tokenSymbol": "USDT0",
            "tokenDecimals": 6,
            "amount": "1000000",
            "recipient": "0x0987654321098765432109876543210987654321",
            "scheme": "eip3009-transfer-with-auth"
        }],
        "description": "Payment for service",
        "metadata": {"service": "test", "version": "1.0"}
    }
    
    required = X402PaymentRequired(**required_data)
    assert required.version == "1.0"
    assert required.metadata["service"] == "test"
    assert len(required.paymentOptions) == 1


def test_new_authorization_format():
    """Test new unified authorization structure."""
    auth_data = {
        "from": "0x1111111111111111111111111111111111111111",
        "to": "0x2222222222222222222222222222222222222222", 
        "value": "1000000",
        "validAfter": 1640995200,
        "validBefore": 1640998800,
        "nonce": "0x1234567890123456789012345678901234567890123456789012345678901234",
        "v": 27,
        "r": "0x1234567890123456789012345678901234567890123456789012345678901234",
        "s": "0x1234567890123456789012345678901234567890123456789012345678901234"
    }
    
    auth = X402Authorization(**auth_data)
    assert auth.validAfter == 1640995200
    assert auth.nonce.startswith("0x")
    
    # Test in payment submission
    submission_data = {
        "type": "payment-submitted",
        "invoiceId": "test-invoice-123",
        "chosenOption": {
            "network": "plasma",
            "chainId": 94204209,
            "token": "0x1234567890123456789012345678901234567890",
            "tokenSymbol": "USDT0",
            "tokenDecimals": 6,
            "amount": "1000000",
            "recipient": "0x2222222222222222222222222222222222222222",
            "scheme": "eip3009-transfer-with-auth"
        },
        "authorization": auth_data
    }
    
    submission = X402PaymentSubmitted(**submission_data)
    assert submission.authorization.from_ == "0x1111111111111111111111111111111111111111"
    assert submission.authorization.value == "1000000"


def test_payment_completed_schema():
    """Test payment completed response."""
    completed_data = {
        "type": "payment-completed",
        "invoiceId": "test-invoice-123",
        "txHash": "0x1234567890123456789012345678901234567890123456789012345678901234",
        "network": "plasma",
        "chainId": 94204209,
        "status": "confirmed",
        "timestamp": 1640995200
    }
    
    completed = X402PaymentCompleted(**completed_data)
    assert completed.status == "confirmed"
    assert completed.chainId == 94204209
    assert completed.txHash.startswith("0x")


def test_backward_compatibility():
    """Test that legacy model names still work."""
    # Legacy PaymentOption should be alias to X402PaymentOption
    assert PaymentOption == X402PaymentOption
    assert PaymentRequired == X402PaymentRequired
    assert PaymentSubmitted == X402PaymentSubmitted
    assert PaymentCompleted == X402PaymentCompleted
    
    # Should be able to use them interchangeably
    option_data = {
        "network": "plasma",
        "chainId": 94204209,
        "token": "0x1234567890123456789012345678901234567890",
        "tokenSymbol": "USDT0",
        "tokenDecimals": 6,
        "amount": "1000000",
        "recipient": "0x0987654321098765432109876543210987654321",
        "scheme": "eip3009-transfer-with-auth"
    }
    
    new_option = X402PaymentOption(**option_data)
    legacy_option = PaymentOption(**option_data)
    
    assert new_option.model_dump() == legacy_option.model_dump()


def test_json_serialization():
    """Test that models serialize to JSON correctly."""
    option = X402PaymentOption(
        network="plasma",
        chainId=94204209,
        token="0x1234567890123456789012345678901234567890",
        tokenSymbol="USDT0", 
        tokenDecimals=6,
        amount="1000000",
        recipient="0x0987654321098765432109876543210987654321",
        scheme="eip3009-transfer-with-auth"
    )
    
    json_data = option.model_dump()
    
    # Should use proper field names in JSON
    assert "tokenDecimals" in json_data
    assert "decimals" not in json_data
    assert json_data["tokenDecimals"] == 6
    
    # Should be able to recreate from JSON
    recreated = X402PaymentOption(**json_data)
    assert recreated.tokenDecimals == 6


if __name__ == "__main__":
    # Run basic validation
    test_payment_option_schema()
    test_payment_option_extended_fields()
    test_payment_required_schema()
    test_new_authorization_format()
    test_payment_completed_schema()
    test_backward_compatibility()
    test_json_serialization()
    print("✅ All X402 schema alignment tests passed!")