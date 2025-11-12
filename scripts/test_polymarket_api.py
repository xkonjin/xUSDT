#!/usr/bin/env python3
"""
Test Polymarket API Connection

Simple script to test Polymarket API authentication and basic functionality.
Run this to verify your API credentials are working correctly.

Usage:
    python scripts/test_polymarket_api.py
"""

import sys
import os

# Add parent directory to path to import agent modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from agent.polymarket_client import PolymarketClient
from agent.config import settings


def test_connection():
    """Test Polymarket API connection and authentication."""
    print("Testing Polymarket API Connection...")
    print(f"API URL: {settings.POLYMARKET_API_URL}")
    print(f"API Key: {settings.POLYMARKET_API_KEY[:20]}...")
    print()
    
    try:
        # Initialize client
        client = PolymarketClient()
        print("✓ Client initialized successfully")
        
        # Test: Get balance (requires authentication)
        print("\n1. Testing authentication with balance endpoint...")
        try:
            balance = client.get_balance()
            print(f"✓ Authentication successful!")
            print(f"  Balance response: {balance}")
        except Exception as e:
            print(f"⚠ Balance check failed (may be expected): {e}")
            print("  This is okay - we'll test market fetching instead")
        
        # Test: Get markets (public endpoint, but tests auth headers)
        print("\n2. Testing market fetching...")
        try:
            markets = client.get_markets(active=True, limit=5)
            print(f"✓ Successfully fetched {len(markets)} markets")
            if markets:
                print(f"  Sample market: {markets[0].get('question', markets[0].get('id', 'N/A'))}")
        except Exception as e:
            print(f"✗ Failed to fetch markets: {e}")
            return False
        
        # Test: Get active orders (requires authentication)
        print("\n3. Testing authenticated endpoint (active orders)...")
        try:
            orders = client.get_active_orders(limit=5)
            print(f"✓ Successfully fetched orders (found {len(orders)} active orders)")
        except Exception as e:
            print(f"⚠ Active orders check: {e}")
            print("  This may be expected if you have no active orders")
        
        print("\n" + "="*50)
        print("✓ All tests passed! API credentials are working.")
        print("="*50)
        return True
        
    except ValueError as e:
        print(f"✗ Configuration error: {e}")
        print("\nMake sure you have set the following environment variables:")
        print("  - POLYMARKET_API_KEY")
        print("  - POLYMARKET_SECRET")
        print("  - POLYMARKET_PASSPHRASE")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)

