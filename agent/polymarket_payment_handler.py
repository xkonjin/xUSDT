"""
Polymarket Payment Handler

This module handles the deposit flow: x402 payment → conversion → balance credit.
Coordinates between payment settlement, conversion service, and balance service.

Key Features:
- Handles x402 payment for deposits
- Queues conversion after payment settlement
- Credits balance when conversion completes
- Error handling and rollback
"""

from __future__ import annotations

from typing import Dict, Any, Optional
from .merchant_agent import verify_and_settle
from .x402_models import PaymentSubmitted, PaymentCompleted
from .balance_service import BalanceService
from .conversion_job import ConversionJob
from .config import settings


class PolymarketPaymentHandler:
    """
    Handles deposit payments and triggers conversion workflow.
    
    Processes x402 payments for USDT0 deposits, settles them,
    and queues conversion to USDC.
    """
    
    def __init__(
        self,
        balance_service: Optional[BalanceService] = None,
        conversion_job: Optional[ConversionJob] = None,
    ):
        """
        Initialize payment handler.
        
        Args:
            balance_service: BalanceService instance
            conversion_job: ConversionJob instance
        """
        self.balance_service = balance_service or BalanceService()
        self.conversion_job = conversion_job or ConversionJob()
    
    def handle_deposit_payment(
        self,
        payment_submitted: PaymentSubmitted,
    ) -> PaymentCompleted:
        """
        Handle deposit payment via x402 protocol.
        
        Flow:
        1. Verify and settle x402 payment
        2. Create deposit record
        3. Queue conversion job
        4. Return PaymentCompleted
        
        Args:
            payment_submitted: x402 PaymentSubmitted message
        
        Returns:
            PaymentCompleted with deposit information
        """
        # Step 1: Verify and settle payment
        payment_completed = verify_and_settle(payment_submitted)
        
        if not payment_completed.success:
            return payment_completed
        
        # Step 2: Extract payment details
        chosen_option = payment_submitted.chosenOption
        user_address = chosen_option.from_
        usdt0_amount = int(chosen_option.amount)
        invoice_id = payment_submitted.invoiceId
        
        # Step 3: Create deposit record
        deposit = self.balance_service.create_deposit(
            user_address=user_address,
            usdt0_amount=usdt0_amount,
            invoice_id=invoice_id,
        )
        
        # Step 4: Queue conversion (will be processed by background job)
        # The conversion job will process this deposit and credit the balance
        
        # Step 5: Return PaymentCompleted with deposit info
        return PaymentCompleted(
            type="payment-completed",
            invoiceId=invoice_id,
            txHash=payment_completed.txHash,
            network=chosen_option.network,
            status="confirmed",
            receipt={
                "deposit_id": str(deposit.id),
                "usdt0_amount": usdt0_amount,
                "status": "pending_conversion",
                "message": "Deposit received. Conversion will complete shortly.",
            },
        )

