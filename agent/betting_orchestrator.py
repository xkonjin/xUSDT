"""
Betting Orchestrator

This module coordinates the complete betting flow:
1. User submits prediction + bet amount (USDT0)
2. Validate user has sufficient USDT0 balance on Plasma
3. Convert USDT0 → USDC on Polygon (via conversion service)
4. Place order on Polymarket CLOB API
5. Store bet record with Polymarket order ID
6. Update prediction competition data

Key Features:
- End-to-end betting flow coordination
- Error handling and rollback logic
- Transaction monitoring
- Status tracking throughout the process
"""

from __future__ import annotations

from typing import Dict, Any, Optional, Tuple
from uuid import uuid4
from .polymarket_client import PolymarketClient
from .conversion_service import ConversionService
from .prediction_service import PredictionService
from .balance_service import BalanceService
from .liquidity_buffer_service import LiquidityBufferService
from .config import settings
from web3 import Web3


class BettingOrchestrator:
    """
    Orchestrates the complete betting flow from USDT0 deposit to Polymarket order.

    Coordinates between conversion service, Polymarket API, and prediction tracking.
    """

    def __init__(
        self,
        polymarket_client: Optional[PolymarketClient] = None,
        conversion_service: Optional[ConversionService] = None,
        prediction_service: Optional[PredictionService] = None,
        balance_service: Optional[BalanceService] = None,
        liquidity_buffer_service: Optional[LiquidityBufferService] = None,
        plasma_rpc: Optional[str] = None,
    ):
        """
        Initialize betting orchestrator.

        Args:
            polymarket_client: Polymarket API client (creates new if not provided)
            conversion_service: Conversion service (creates new if not provided)
            prediction_service: Prediction service (creates new if not provided)
            balance_service: Balance service (creates new if not provided)
            liquidity_buffer_service: Liquidity buffer service (creates new if not provided)
            plasma_rpc: Plasma RPC URL for balance checking
        """
        self.polymarket_client = polymarket_client or PolymarketClient()
        self.conversion_service = conversion_service or ConversionService()
        self.prediction_service = prediction_service or PredictionService()
        self.balance_service = balance_service or BalanceService()
        self.liquidity_buffer_service = (
            liquidity_buffer_service or LiquidityBufferService()
        )
        self.plasma_rpc = plasma_rpc or settings.PLASMA_RPC
        self.plasma_w3 = Web3(Web3.HTTPProvider(self.plasma_rpc))

    def place_bet_from_balance(
        self,
        user_address: str,
        market_id: str,
        market_question: str,
        outcome: str,
        bet_amount_usdc: int,
        token_id: str,
        predicted_price: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Place bet using pre-converted USDC balance (instant betting).

        Flow:
        1. Check user has sufficient USDC balance
        2. Check liquidity buffer has sufficient balance (global max bet limit)
        3. Deduct from user balance
        4. Deduct from liquidity buffer
        5. Create prediction record
        6. Place order on Polymarket immediately
        7. Update prediction with order details

        Args:
            user_address: User's wallet address
            market_id: Polymarket market ID
            market_question: Market question text
            outcome: Prediction outcome (YES/NO)
            bet_amount_usdc: Bet amount in USDC atomic units (6 decimals)
            token_id: Polymarket token ID (conditional token address)
            predicted_price: Optional predicted price (0-1)

        Returns:
            Dictionary with bet details

        Raises:
            ValueError: If insufficient balance or buffer
            Exception: If order placement fails
        """
        # Step 1: Check user balance
        user_balance_data = self.balance_service.get_balance(user_address)
        user_balance = user_balance_data["usdc_balance"]

        if user_balance < bet_amount_usdc:
            raise ValueError(
                f"Insufficient user balance: have {user_balance / 1_000_000:.2f} USDC, "
                f"need {bet_amount_usdc / 1_000_000:.2f} USDC"
            )

        # Step 2: Check liquidity buffer (global max bet limit)
        max_bet = self.liquidity_buffer_service.get_max_bet_amount(user_balance)
        if bet_amount_usdc > max_bet:
            buffer_status = self.liquidity_buffer_service.get_buffer_status()
            raise ValueError(
                f"Bet amount exceeds global maximum: {bet_amount_usdc / 1_000_000:.2f} USDC. "
                f"Maximum bet is {max_bet / 1_000_000:.2f} USDC "
                f"(buffer balance: {buffer_status['usdc_balance_formatted']:.2f} USDC)"
            )

        # Step 3: Deduct from user balance
        try:
            self.balance_service.deduct_balance(user_address, bet_amount_usdc)
        except ValueError as e:
            raise ValueError(f"Insufficient balance: {e}") from e

        # Step 4: Deduct from liquidity buffer
        try:
            self.liquidity_buffer_service.deduct_buffer(bet_amount_usdc)
        except ValueError as e:
            # Refund user balance if buffer check fails
            try:
                self.balance_service.add_balance(user_address, bet_amount_usdc)
            except Exception as refund_error:
                # CRITICAL: Log failed refund for manual reconciliation
                import logging

                logging.error(
                    f"CRITICAL: Failed to refund user {user_address} amount {bet_amount_usdc}: {refund_error}"
                )
            raise ValueError(f"Insufficient liquidity buffer: {e}") from e

        # Step 2: Create prediction record
        prediction = self.prediction_service.create_prediction(
            user_address=user_address,
            market_id=market_id,
            market_question=market_question,
            outcome=outcome,
            bet_amount_usdt0=bet_amount_usdc,  # Store USDC amount (equivalent for balance-based)
            bet_amount_usdc=bet_amount_usdc,
            predicted_price=predicted_price,
        )

        try:
            # Step 3: Determine order side and price
            side = "BUY" if outcome.upper() == "YES" else "BUY"  # Simplified

            # Use predicted price or current market price
            if predicted_price is None:
                orderbook = self.polymarket_client.get_orderbook(token_id)
                price = self._get_market_price(orderbook, side)
            else:
                price = str(predicted_price)

            # Step 4: Place order on Polymarket (instant, no conversion needed)
            size = str(
                bet_amount_usdc / 1_000_000
            )  # Convert from atomic units to tokens

            order_response = self.polymarket_client.place_order(
                token_id=token_id,
                side=side,
                size=size,
                price=price,
                order_type="LIMIT",
                client_order_id=str(prediction.id),
            )

            polymarket_order_id = order_response.get("order_id") or order_response.get(
                "id"
            )

            # Step 5: Update prediction with order details
            updated_prediction = self.prediction_service.update_prediction_order(
                prediction_id=str(prediction.id),
                polymarket_order_id=polymarket_order_id,
                bet_amount_usdc=bet_amount_usdc,
                status="placed",
            )

            return {
                "prediction_id": str(prediction.id),
                "polymarket_order_id": polymarket_order_id,
                "status": "placed",
                "usdc_amount": bet_amount_usdc,
                "order_response": order_response,
            }

        except Exception as e:
            import logging

            try:
                self.balance_service.add_balance(user_address, bet_amount_usdc)
            except Exception as refund_error:
                logging.error(
                    f"CRITICAL: Failed to refund user balance {user_address} amount {bet_amount_usdc}: {refund_error}"
                )

            try:
                self.liquidity_buffer_service.refund_buffer(bet_amount_usdc)
            except Exception as buffer_error:
                logging.error(
                    f"CRITICAL: Failed to refund buffer amount {bet_amount_usdc}: {buffer_error}"
                )

            try:
                self.prediction_service.update_prediction_order(
                    prediction_id=str(prediction.id),
                    polymarket_order_id="",
                    status="failed",
                )
            except Exception as update_error:
                logging.error(
                    f"Failed to update prediction status for {prediction.id}: {update_error}"
                )

            raise Exception(f"Bet placement failed: {e}") from e

    def place_bet(
        self,
        user_address: str,
        market_id: str,
        market_question: str,
        outcome: str,
        bet_amount_usdt0: int,
        token_id: str,
        predicted_price: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Legacy method: Execute complete betting flow with conversion.

        NOTE: This method is deprecated in favor of balance-based betting.
        Use place_bet_from_balance() for instant betting.

        Flow:
        1. Validate user has sufficient USDT0 balance
        2. Create prediction record
        3. Convert USDT0 → USDC
        4. Place order on Polymarket
        5. Update prediction with order details

        Args:
            user_address: User's wallet address
            market_id: Polymarket market ID
            market_question: Market question text
            outcome: Prediction outcome (YES/NO)
            bet_amount_usdt0: Bet amount in USDT0 atomic units (6 decimals)
            token_id: Polymarket token ID (conditional token address)
            predicted_price: Optional predicted price (0-1)

        Returns:
            Dictionary with bet details

        Raises:
            ValueError: If validation fails
            Exception: If conversion or order placement fails
        """
        # Step 1: Validate user balance
        self._validate_balance(user_address, bet_amount_usdt0)

        # Step 2: Create prediction record
        prediction = self.prediction_service.create_prediction(
            user_address=user_address,
            market_id=market_id,
            market_question=market_question,
            outcome=outcome,
            bet_amount_usdt0=bet_amount_usdt0,
            predicted_price=predicted_price,
        )

        try:
            # Step 3: Convert USDT0 → USDC
            conversion_result = self.conversion_service.convert_usdt0_to_usdc(
                usdt0_amount=bet_amount_usdt0,
                user_address=user_address,
            )

            usdc_amount = conversion_result["usdc_amount"]
            conversion_tx_hash = conversion_result.get("tx_hash")

            # Step 4: Determine order side and price
            side = "BUY" if outcome.upper() == "YES" else "BUY"

            if predicted_price is None:
                orderbook = self.polymarket_client.get_orderbook(token_id)
                price = self._get_market_price(orderbook, side)
            else:
                price = str(predicted_price)

            # Step 5: Place order on Polymarket
            size = str(usdc_amount / 1_000_000)

            order_response = self.polymarket_client.place_order(
                token_id=token_id,
                side=side,
                size=size,
                price=price,
                order_type="LIMIT",
                client_order_id=str(prediction.id),
            )

            polymarket_order_id = order_response.get("order_id") or order_response.get(
                "id"
            )

            # Step 6: Update prediction with order details
            updated_prediction = self.prediction_service.update_prediction_order(
                prediction_id=str(prediction.id),
                polymarket_order_id=polymarket_order_id,
                bet_amount_usdc=usdc_amount,
                conversion_tx_hash=conversion_tx_hash,
                status="placed",
            )

            return {
                "prediction_id": str(prediction.id),
                "polymarket_order_id": polymarket_order_id,
                "conversion_tx_hash": conversion_tx_hash,
                "status": "placed",
                "usdc_amount": usdc_amount,
                "order_response": order_response,
            }

        except Exception as e:
            try:
                self.prediction_service.update_prediction_order(
                    prediction_id=str(prediction.id),
                    polymarket_order_id="",
                    status="failed",
                )
            except:
                pass

            raise Exception(f"Bet placement failed: {e}") from e

    def _validate_balance(self, user_address: str, required_amount: int) -> None:
        """
        Validate user has sufficient USDT0 balance on Plasma.

        Args:
            user_address: User's wallet address
            required_amount: Required amount in USDT0 atomic units

        Raises:
            ValueError: If balance is insufficient
        """
        usdt0_address = settings.USDT0_ADDRESS

        # Get ERC-20 balance
        try:
            # ERC-20 balanceOf(address) function signature
            balance_of_abi = {
                "constant": True,
                "inputs": [{"name": "_owner", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "balance", "type": "uint256"}],
                "type": "function",
            }

            contract = self.plasma_w3.eth.contract(
                address=Web3.to_checksum_address(usdt0_address),
                abi=[balance_of_abi],
            )

            balance = contract.functions.balanceOf(
                Web3.to_checksum_address(user_address)
            ).call()

            if balance < required_amount:
                raise ValueError(
                    f"Insufficient USDT0 balance: have {balance}, need {required_amount}"
                )
        except Exception as e:
            raise ValueError(f"Failed to check balance: {e}") from e

    def _get_market_price(self, orderbook: Dict[str, Any], side: str) -> str:
        """
        Get current market price from orderbook.

        Args:
            orderbook: Orderbook data from Polymarket API
            side: Order side - "BUY" or "SELL"

        Returns:
            Price as string
        """
        # Extract best price from orderbook
        # Orderbook structure may vary - adjust based on actual API response
        if side == "BUY":
            # Use best ask (lowest sell price)
            asks = orderbook.get("asks", [])
            if asks and len(asks) > 0:
                return str(asks[0].get("price", "0.5"))
        else:
            # Use best bid (highest buy price)
            bids = orderbook.get("bids", [])
            if bids and len(bids) > 0:
                return str(bids[0].get("price", "0.5"))

        # Default to 0.5 if no orders available
        return "0.5"

    def check_order_status(self, prediction_id: str) -> Dict[str, Any]:
        """
        Check status of a placed bet.

        Args:
            prediction_id: Prediction UUID

        Returns:
            Dictionary with current status and order details
        """
        session = self.prediction_service.db.get_session()
        try:
            from .game_db import Prediction

            prediction = (
                session.query(Prediction).filter(Prediction.id == prediction_id).first()
            )

            if not prediction:
                raise ValueError(f"Prediction not found: {prediction_id}")

            # Get order status from Polymarket if order ID exists
            order_status = None
            if prediction.polymarket_order_id:
                try:
                    order_status = self.polymarket_client.get_order(
                        prediction.polymarket_order_id
                    )
                except Exception as e:
                    # Order may not exist or API error
                    pass

            return {
                "prediction_id": str(prediction.id),
                "status": prediction.status,
                "polymarket_order_id": prediction.polymarket_order_id,
                "order_status": order_status,
                "bet_amount_usdt0": prediction.bet_amount_usdt0,
                "bet_amount_usdc": prediction.bet_amount_usdc,
                "created_at": prediction.created_at.isoformat()
                if prediction.created_at
                else None,
            }
        finally:
            session.close()
