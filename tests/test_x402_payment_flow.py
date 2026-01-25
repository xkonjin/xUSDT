import pytest
from unittest.mock import patch, MagicMock
import os
from decimal import Decimal

from agent.merchant_agent import build_payment_required, verify_and_settle, compute_protocol_fee
from agent.client_agent import ClientAgent
from agent_local.crypto import build_router_typed_data, build_eip3009_typed_data, random_nonce32

class TestX402PaymentProtocol:
    def test_build_payment_required(self):
        """Test building a payment required request"""
        amount = 1_000_000  # 1 USDT in atomic units
        req = build_payment_required(
            amount_atomic=amount, 
            description="Premium API access", 
            deadline_secs=600
        )
        
        assert req is not None
        assert req.amount_atomic == amount
        assert req.description == "Premium API access"
        assert req.deadline > 0

    @pytest.mark.parametrize("amount,expected_floor", [
        (10_000, 1500),  # Below threshold, expect floor fee
        (1_000_000, 1000),  # Standard percentage fee
    ])
    def test_protocol_fee_computation(self, amount, expected_floor):
        """Test protocol fee computation for different amounts"""
        fee, is_floor = compute_protocol_fee(amount, chain="plasma", mode="channel")
        
        assert fee == expected_floor
        assert isinstance(is_floor, bool)

    def test_client_agent_prepare_submission(self):
        """Test client agent payment submission preparation"""
        client = ClientAgent()
        req = build_payment_required(
            amount_atomic=1_000_000, 
            description="Test service", 
            deadline_secs=600
        )
        
        submitted = client.prepare_submission(req)
        
        assert submitted is not None
        assert submitted.payment_required == req
        assert submitted.signature is not None

    @patch('agent.merchant_agent.verify_and_settle')
    def test_verify_and_settle_mock(self, mock_settle):
        """Test verify and settle with mocking"""
        # Prepare mock submission
        req = build_payment_required(
            amount_atomic=1_000_000, 
            description="Mocked service", 
            deadline_secs=600
        )
        client = ClientAgent()
        submitted = client.prepare_submission(req)
        
        # Mock the settlement response
        mock_settle.return_value = MagicMock(
            status="completed",
            amount_atomic=1_000_000
        )
        
        # Perform settlement
        completed = verify_and_settle(submitted)
        
        assert completed is not None
        assert completed.status == "completed"

    def test_eip3009_typed_data_generation(self):
        """Test EIP-3009 typed data generation"""
        chain_id = 9745
        verifying_contract = "0x4444444444444444444444444444444444444444"
        
        td = build_eip3009_typed_data(
            token_name="USDTe",
            token_version="1",
            chain_id=chain_id,
            verifying_contract=verifying_contract,
            from_addr="0x1111111111111111111111111111111111111111",
            to_addr="0x2222222222222222222222222222222222222222",
            value=1_000_000,
            valid_after=1_700_000_000,
            valid_before=1_800_000_000,
            nonce32=random_nonce32(),
        )
        
        assert td is not None
        assert td['types']['EIP712Domain'] is not None
        assert td['domain']['chainId'] == chain_id

    @pytest.mark.integration
    def test_full_payment_flow_dry_run(self):
        """
        Integration test for full payment flow 
        Note: This is a dry run to avoid real transactions
        """
        os.environ["DRY_RUN"] = "true"
        
        # Simulate full payment flow
        amount = 1_000_000  # 1 USDT
        req = build_payment_required(
            amount_atomic=amount, 
            description="Integration test", 
            deadline_secs=600
        )
        
        client = ClientAgent()
        submitted = client.prepare_submission(req)
        
        # Verify key components of submission
        assert submitted is not None
        assert submitted.payment_required.amount_atomic == amount
        assert submitted.signature is not None

        # Clean up 
        del os.environ["DRY_RUN"]