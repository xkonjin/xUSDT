"""
USDT0 to USDC Conversion Service

This module handles conversion of USDT0 (Plasma) to USDC (Polygon) for Polymarket betting.
Supports multiple conversion methods: DEX aggregator (1inch), bridge, or CEX.

Key Features:
- DEX aggregator integration (1inch API) for token swaps
- Bridge integration for cross-chain transfers
- Automatic rate calculation and slippage protection
- Transaction monitoring and confirmation

Note: In production, this service requires a funded wallet on Polygon with USDC
to facilitate conversions. The service acts as a liquidity provider.
"""

from __future__ import annotations

import time
from typing import Dict, Any, Optional, Tuple
from decimal import Decimal
from web3 import Web3
from eth_account import Account
import requests
from .config import settings


class ConversionService:
    """
    Service for converting USDT0 (Plasma) to USDC (Polygon).
    
    Handles the conversion flow:
    1. User deposits USDT0 on Plasma
    2. Service swaps/bridges to USDC on Polygon
    3. USDC is used for Polymarket orders
    
    Currently implements DEX aggregator method (1inch) as primary strategy.
    """
    
    def __init__(
        self,
        conversion_method: Optional[str] = None,
        polygon_rpc: Optional[str] = None,
        dex_aggregator_url: Optional[str] = None,
        conversion_private_key: Optional[str] = None,
    ):
        """
        Initialize conversion service.
        
        Args:
            conversion_method: Conversion method - "dex", "bridge", or "cex" (defaults to settings)
            polygon_rpc: Polygon RPC URL (defaults to settings.POLYGON_RPC)
            dex_aggregator_url: DEX aggregator API URL (defaults to settings.DEX_AGGREGATOR_URL)
            conversion_private_key: Private key for conversion wallet (must hold USDC on Polygon)
        """
        self.conversion_method = conversion_method or settings.CONVERSION_METHOD
        self.polygon_rpc = polygon_rpc or settings.POLYGON_RPC
        self.dex_aggregator_url = (dex_aggregator_url or settings.DEX_AGGREGATOR_URL).rstrip("/")
        self.conversion_private_key = conversion_private_key or settings.CONVERSION_PRIVATE_KEY
        
        # Initialize Web3 for Polygon
        self.w3 = Web3(Web3.HTTPProvider(self.polygon_rpc))
        
        # Initialize account if private key provided
        self.conversion_account = None
        if self.conversion_private_key:
            self.conversion_account = Account.from_key(self.conversion_private_key)
    
    def get_quote(
        self,
        from_token: str,
        to_token: str,
        amount: int,
        slippage: float = 1.0,
    ) -> Dict[str, Any]:
        """
        Get conversion quote from 1inch DEX aggregator.
        
        Args:
            from_token: Source token address (USDT0 on Plasma - note: may need bridge first)
            to_token: Destination token address (USDC on Polygon)
            amount: Amount to convert in token's smallest unit (wei)
            slippage: Maximum slippage percentage (default: 1.0%)
        
        Returns:
            Quote dictionary with expected output amount, gas estimate, etc.
        
        Note:
            This assumes USDT0 is already bridged to Polygon or uses a wrapped version.
            In practice, you may need to bridge USDT0 from Plasma to Polygon first,
            then swap to USDC. This is a simplified version.
        """
        if self.conversion_method != "dex":
            raise ValueError(f"Quote not available for conversion method: {self.conversion_method}")
        
        # 1inch API endpoint for quote
        url = f"{self.dex_aggregator_url}/quote"
        
        params = {
            "fromTokenAddress": from_token,
            "toTokenAddress": to_token,
            "amount": str(amount),
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            quote = response.json()
            
            # Calculate minimum output with slippage
            expected_output = int(quote["toTokenAmount"])
            min_output = int(expected_output * (100 - slippage) / 100)
            
            return {
                "from_token": from_token,
                "to_token": to_token,
                "from_amount": amount,
                "to_amount": expected_output,
                "min_to_amount": min_output,
                "estimated_gas": quote.get("estimatedGas", 0),
                "slippage": slippage,
            }
        except requests.RequestException as e:
            raise Exception(f"Failed to get conversion quote: {e}")
    
    def get_swap_data(
        self,
        from_token: str,
        to_token: str,
        amount: int,
        from_address: str,
        slippage: float = 1.0,
    ) -> Dict[str, Any]:
        """
        Get swap transaction data from 1inch aggregator.
        
        Args:
            from_token: Source token address
            to_token: Destination token address
            amount: Amount to swap in token's smallest unit
            from_address: Address that will execute the swap
            slippage: Maximum slippage percentage
        
        Returns:
            Swap transaction data including calldata, gas estimate, etc.
        """
        if self.conversion_method != "dex":
            raise ValueError(f"Swap not available for conversion method: {self.conversion_method}")
        
        url = f"{self.dex_aggregator_url}/swap"
        
        params = {
            "fromTokenAddress": from_token,
            "toTokenAddress": to_token,
            "amount": str(amount),
            "fromAddress": from_address,
            "slippage": slippage,
            "disableEstimate": "false",
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise Exception(f"Failed to get swap data: {e}")
    
    def execute_swap(
        self,
        from_token: str,
        to_token: str,
        amount: int,
        slippage: float = 1.0,
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Execute token swap on Polygon using 1inch aggregator.
        
        Args:
            from_token: Source token address (must be on Polygon)
            to_token: Destination token address (USDC on Polygon)
            amount: Amount to swap in token's smallest unit
            slippage: Maximum slippage percentage
        
        Returns:
            Tuple of (transaction_hash, transaction_receipt)
        
        Raises:
            ValueError: If conversion account not configured
            Exception: If swap execution fails
        """
        if not self.conversion_account:
            raise ValueError("Conversion private key must be configured to execute swaps")
        
        if self.conversion_method != "dex":
            raise ValueError(f"Swap execution not available for conversion method: {self.conversion_method}")
        
        from_address = self.conversion_account.address
        
        # Get swap transaction data
        swap_data = self.get_swap_data(from_token, to_token, amount, from_address, slippage)
        
        # Build transaction
        tx = {
            "from": from_address,
            "to": swap_data["tx"]["to"],
            "data": swap_data["tx"]["data"],
            "value": int(swap_data["tx"]["value"], 16),
            "gas": int(swap_data["tx"]["gas"], 16),
            "gasPrice": int(swap_data["tx"]["gasPrice"], 16),
            "nonce": self.w3.eth.get_transaction_count(from_address),
        }
        
        # Sign transaction
        signed_tx = self.conversion_account.sign_transaction(tx)
        
        # Send transaction
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        # Wait for confirmation
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
        
        if receipt.status != 1:
            raise Exception(f"Swap transaction failed: {tx_hash.hex()}")
        
        return tx_hash.hex(), receipt
    
    def convert_usdt0_to_usdc(
        self,
        usdt0_amount: int,
        user_address: str,
        slippage: float = 1.0,
    ) -> Dict[str, Any]:
        """
        Convert USDT0 to USDC for Polymarket betting.
        
        This is a high-level method that coordinates the conversion flow.
        In practice, this may involve:
        1. Bridging USDT0 from Plasma to Polygon (if needed)
        2. Swapping bridged token to USDC on Polygon
        3. Returning USDC amount and transaction details
        
        Args:
            usdt0_amount: Amount of USDT0 in atomic units (6 decimals)
            user_address: User's wallet address (for tracking)
            slippage: Maximum slippage percentage
        
        Returns:
            Dictionary with conversion details:
            - usdc_amount: Amount of USDC received (atomic units, 6 decimals)
            - tx_hash: Transaction hash
            - method: Conversion method used
            - rate: Effective conversion rate
        
        Note:
            This is a simplified implementation. In production, you would:
            - Handle Plasma→Polygon bridging
            - Manage liquidity pools
            - Implement rate caching
            - Add error recovery
        """
        # For now, assume we have a wrapped USDT0 on Polygon or use a bridge
        # In production, implement actual bridging logic here
        
        # Placeholder: This would bridge USDT0 from Plasma to Polygon
        # For MVP, we'll assume the conversion service wallet already has USDC
        # and we're doing a direct swap or using a liquidity pool
        
        # Get USDC address on Polygon
        usdc_address = settings.USDC_POLYGON_ADDRESS
        
        # Note: In reality, you'd need to:
        # 1. Bridge USDT0 from Plasma to Polygon (or use wrapped version)
        # 2. Get the bridged token address
        # 3. Swap bridged token to USDC
        
        # For MVP, we'll return a mock conversion
        # In production, implement actual conversion logic
        
        return {
            "usdt0_amount": usdt0_amount,
            "usdc_amount": usdt0_amount,  # 1:1 for stablecoins (simplified)
            "tx_hash": "0x0000000000000000000000000000000000000000000000000000000000000000",  # Placeholder
            "method": self.conversion_method,
            "rate": 1.0,  # 1:1 rate (simplified)
            "slippage": slippage,
            "status": "pending",  # Would be "completed" after actual conversion
        }
    
    def estimate_conversion_rate(
        self,
        usdt0_amount: int,
    ) -> Dict[str, Any]:
        """
        Estimate conversion rate and output amount without executing.
        
        Args:
            usdt0_amount: Amount of USDT0 in atomic units
        
        Returns:
            Dictionary with rate estimate and expected output
        """
        # For stablecoins, rate is approximately 1:1
        # In production, fetch actual rate from DEX/bridge
        
        return {
            "usdt0_amount": usdt0_amount,
            "estimated_usdc_amount": usdt0_amount,  # 1:1 for stablecoins
            "rate": 1.0,
            "slippage_estimate": 0.1,  # Typical slippage for stablecoin swaps
            "method": self.conversion_method,
        }

