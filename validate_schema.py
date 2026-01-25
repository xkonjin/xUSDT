#!/usr/bin/env python3
"""
Simple validation script for X402 schema alignment
"""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from agent.x402_models import (
        X402PaymentOption,
        X402PaymentRequired,
        X402PaymentSubmitted,
        X402Authorization,
        FeeBreakdown,
        # Legacy imports
        PaymentOption,
        PaymentRequired,
        PaymentSubmitted,
    )
    print("✅ Successfully imported all X402 models")
    
    # Test basic instantiation
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
    print(f"✅ Created X402PaymentOption with tokenDecimals: {option.tokenDecimals}")
    
    # Test legacy compatibility
    legacy_option = PaymentOption(
        network="plasma",
        chainId=94204209,
        token="0x1234567890123456789012345678901234567890",
        tokenSymbol="USDT0",
        tokenDecimals=6,
        amount="1000000",
        recipient="0x0987654321098765432109876543210987654321",
        scheme="eip3009-transfer-with-auth"
    )
    print(f"✅ Legacy PaymentOption compatibility works")
    
    # Test payment required
    required = X402PaymentRequired(
        invoiceId="test-123",
        timestamp=1640995200,
        paymentOptions=[option]
    )
    print(f"✅ Created X402PaymentRequired with {len(required.paymentOptions)} options")
    
    # Test authorization
    auth = X402Authorization(
        **{
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
    )
    print(f"✅ Created X402Authorization with nonce: {auth.nonce[:10]}...")
    
    # Test payment submission
    submission = X402PaymentSubmitted(
        invoiceId="test-123",
        chosenOption=option,
        authorization=auth
    )
    print(f"✅ Created X402PaymentSubmitted with authorization structure")
    
    print("\n🎉 All schema validations passed! The X402 protocol schemas are aligned.")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Missing dependencies. Install with: pip install pydantic")
    sys.exit(1)
except Exception as e:
    print(f"❌ Validation error: {e}")
    sys.exit(1)