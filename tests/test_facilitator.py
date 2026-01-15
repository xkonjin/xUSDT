"""Tests for PaymentFacilitator - core settlement logic.

Covers all settlement methods:
- SettlementResult dataclass
- PaymentFacilitator initialization
- settle_ethereum_router (Ethereum path)
- settle_plasma_eip3009 (Plasma EIP-3009 transferWithAuthorization)
- settle_plasma_channel (batch channel receipts)
- settle_plasma_gasless_api (Plasma gasless relayer API)
- settle_plasma_with_fallback (gasless + fallback logic)

Run with:
    pytest tests/test_facilitator.py -v -p no:pytest_ethereum

Note: Due to namespace conflicts with the agent_local shim system used by
other tests (test_crypto.py), this test file should be run independently
or ensured to load before test_crypto.py when running the full suite.
"""

from __future__ import annotations

from dataclasses import fields
from unittest.mock import MagicMock, patch, PropertyMock
import pytest
from web3.exceptions import ContractLogicError, InvalidAddress, TimeExhausted

# Use agent_local shim to avoid namespace collisions (same pattern as test_crypto.py)
# This import also ensures agent.facilitator is registered in sys.modules for patching
from agent_local.facilitator import SettlementResult, PaymentFacilitator
import agent.facilitator  # Ensure module is registered for patch decorators


# =============================================================================
# FAKE TEST VALUES - These are deterministic dummy values for unit testing only
# They are intentionally repeating patterns to make it obvious they're not real
# =============================================================================

# Test addresses - valid checksummed Ethereum addresses (fake, repeating patterns)
ADDR_TOKEN = "0x1111111111111111111111111111111111111111"
ADDR_FROM = "0x2222222222222222222222222222222222222222"
ADDR_TO = "0x3333333333333333333333333333333333333333"
ADDR_RELAYER = "0x4444444444444444444444444444444444444444"
ADDR_MERCHANT = "0x5555555555555555555555555555555555555555"
ADDR_PAYER1 = "0x6666666666666666666666666666666666666666"
ADDR_PAYER2 = "0x7777777777777777777777777777777777777777"
ADDR_CHANNEL = "0x8888888888888888888888888888888888888888"
ADDR_ROUTER = "0x9999999999999999999999999999999999999999"
ADDR_USDT0 = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

# Fake private key pattern for mocks: "0x" + "11" * 32 = 0x111...111 (64 hex chars)
# This is NEVER used as a real key - only as a mock value


# =============================================================================
# Test SettlementResult dataclass
# =============================================================================


class TestSettlementResult:
    """Tests for SettlementResult dataclass."""

    def test_settlement_result_has_expected_fields(self):
        """Should have success, tx_hash, error, and receipt fields."""
        field_names = {f.name for f in fields(SettlementResult)}
        assert field_names == {"success", "tx_hash", "error", "receipt"}

    def test_settlement_result_success_case(self):
        """Should correctly store success case values."""
        result = SettlementResult(
            success=True,
            tx_hash="0x123abc",
            error=None,
            receipt={"status": 1, "blockNumber": 12345},
        )
        assert result.success is True
        assert result.tx_hash == "0x123abc"
        assert result.error is None
        assert result.receipt == {"status": 1, "blockNumber": 12345}

    def test_settlement_result_failure_case(self):
        """Should correctly store failure case values."""
        result = SettlementResult(
            success=False,
            tx_hash=None,
            error="Contract reverted",
            receipt=None,
        )
        assert result.success is False
        assert result.tx_hash is None
        assert result.error == "Contract reverted"
        assert result.receipt is None


# =============================================================================
# Test PaymentFacilitator initialization
# =============================================================================


class TestPaymentFacilitatorInit:
    """Tests for PaymentFacilitator.__init__."""

    @patch("agent.facilitator.Web3")
    @patch("agent.facilitator.settings")
    def test_init_creates_web3_providers(self, mock_settings, mock_web3_class):
        """Should create Web3 providers for ETH and Plasma."""
        mock_settings.ETH_RPC = "http://eth-rpc"
        mock_settings.PLASMA_RPC = "http://plasma-rpc"
        mock_settings.RELAYER_PRIVATE_KEY = "0x" + "11" * 32
        mock_settings.ROUTER_ADDRESS = ADDR_ROUTER
        mock_settings.USDT0_ADDRESS = ADDR_USDT0
        mock_settings.CHANNEL_ADDRESS = None

        mock_w3 = MagicMock()
        mock_w3.eth.account.from_key.return_value = MagicMock(address=ADDR_RELAYER)
        mock_w3.eth.contract.return_value = MagicMock()
        mock_web3_class.return_value = mock_w3
        mock_web3_class.HTTPProvider.return_value = MagicMock()
        mock_web3_class.is_address.return_value = True
        mock_web3_class.to_checksum_address.side_effect = lambda x: x

        facilitator = PaymentFacilitator()

        # Should create HTTPProvider for each RPC
        assert mock_web3_class.HTTPProvider.call_count == 2
        # Should create accounts from relayer key
        assert mock_w3.eth.account.from_key.call_count == 2

    @patch("agent.facilitator.Web3")
    @patch("agent.facilitator.settings")
    def test_init_handles_invalid_router_address(self, mock_settings, mock_web3_class):
        """Should handle invalid router address gracefully."""
        mock_settings.ETH_RPC = "http://eth-rpc"
        mock_settings.PLASMA_RPC = "http://plasma-rpc"
        mock_settings.RELAYER_PRIVATE_KEY = "0x" + "11" * 32
        mock_settings.ROUTER_ADDRESS = "invalid-address"
        mock_settings.USDT0_ADDRESS = ADDR_USDT0
        mock_settings.CHANNEL_ADDRESS = None

        mock_w3 = MagicMock()
        mock_w3.eth.account.from_key.return_value = MagicMock(address=ADDR_RELAYER)
        mock_w3.eth.contract.return_value = MagicMock()
        mock_web3_class.return_value = mock_w3
        mock_web3_class.HTTPProvider.return_value = MagicMock()
        mock_web3_class.is_address.return_value = False
        mock_web3_class.to_checksum_address.side_effect = lambda x: x

        facilitator = PaymentFacilitator()

        # Router should be None when address is invalid
        assert facilitator.router is None

    @patch("agent.facilitator.Web3")
    @patch("agent.facilitator.settings")
    def test_init_with_channel_address(self, mock_settings, mock_web3_class):
        """Should initialize channel contract when CHANNEL_ADDRESS is set."""
        mock_settings.ETH_RPC = "http://eth-rpc"
        mock_settings.PLASMA_RPC = "http://plasma-rpc"
        mock_settings.RELAYER_PRIVATE_KEY = "0x" + "11" * 32
        mock_settings.ROUTER_ADDRESS = ADDR_ROUTER
        mock_settings.USDT0_ADDRESS = ADDR_USDT0
        mock_settings.CHANNEL_ADDRESS = ADDR_CHANNEL

        mock_w3 = MagicMock()
        mock_w3.eth.account.from_key.return_value = MagicMock(address=ADDR_RELAYER)
        mock_channel = MagicMock()
        mock_w3.eth.contract.return_value = mock_channel
        mock_web3_class.return_value = mock_w3
        mock_web3_class.HTTPProvider.return_value = MagicMock()
        mock_web3_class.is_address.return_value = True
        mock_web3_class.to_checksum_address.side_effect = lambda x: x

        facilitator = PaymentFacilitator()

        # Channel should be initialized
        assert facilitator.channel is not None


# =============================================================================
# Test settle_ethereum_router
# =============================================================================


class TestSettleEthereumRouter:
    """Tests for settle_ethereum_router method."""

    def _create_facilitator_with_mocks(self):
        """Helper to create facilitator with mocked dependencies."""
        with patch("agent.facilitator.Web3") as mock_web3_class, \
             patch("agent.facilitator.settings") as mock_settings:
            mock_settings.ETH_RPC = "http://eth-rpc"
            mock_settings.PLASMA_RPC = "http://plasma-rpc"
            mock_settings.RELAYER_PRIVATE_KEY = "0x" + "11" * 32
            mock_settings.ROUTER_ADDRESS = ADDR_ROUTER
            mock_settings.USDT0_ADDRESS = ADDR_USDT0
            mock_settings.CHANNEL_ADDRESS = None

            mock_w3 = MagicMock()
            mock_w3.eth.account.from_key.return_value = MagicMock(address=ADDR_RELAYER)
            mock_w3.eth.contract.return_value = MagicMock()
            mock_web3_class.return_value = mock_w3
            mock_web3_class.HTTPProvider.return_value = MagicMock()
            mock_web3_class.is_address.return_value = True
            mock_web3_class.to_checksum_address.side_effect = lambda x: x

            facilitator = PaymentFacilitator()
            return facilitator, mock_settings

    def test_settle_ethereum_router_success(self):
        """Should successfully settle via Ethereum router."""
        facilitator, mock_settings = self._create_facilitator_with_mocks()

        # Mock the router contract call
        mock_tx = {"from": ADDR_RELAYER, "nonce": 0}
        mock_signed = MagicMock()
        mock_signed.rawTransaction = b"raw_tx_bytes"

        facilitator.router = MagicMock()
        facilitator.router.functions.gaslessTransfer.return_value.build_transaction.return_value = mock_tx

        facilitator.w3_eth = MagicMock()
        facilitator.w3_eth.eth.get_transaction_count.return_value = 0
        facilitator.w3_eth.eth.account.sign_transaction.return_value = mock_signed
        facilitator.w3_eth.eth.send_raw_transaction.return_value = b"\x12\x34"
        facilitator.w3_eth.to_hex.return_value = "0x1234"
        facilitator.w3_eth.eth.wait_for_transaction_receipt.return_value = {"status": 1, "blockNumber": 100}
        facilitator.w3_eth.eth.block_number = 100

        with patch.object(facilitator, "_wait_for_receipt") as mock_wait:
            mock_wait.return_value = {"status": 1, "blockNumber": 100}

            result = facilitator.settle_ethereum_router(
                token=ADDR_TOKEN,
                from_addr=ADDR_FROM,
                to_addr=ADDR_TO,
                amount=1000000,
                deadline=2000000000,
                v=27,
                r="0x" + "aa" * 32,
                s="0x" + "bb" * 32,
            )

        assert result.success is True
        assert result.tx_hash == "0x1234"
        assert result.error is None

    def test_settle_ethereum_router_reverted(self):
        """Should handle reverted transaction."""
        facilitator, mock_settings = self._create_facilitator_with_mocks()

        mock_tx = {"from": ADDR_RELAYER, "nonce": 0}
        mock_signed = MagicMock()
        mock_signed.rawTransaction = b"raw_tx_bytes"

        facilitator.router = MagicMock()
        facilitator.router.functions.gaslessTransfer.return_value.build_transaction.return_value = mock_tx

        facilitator.w3_eth = MagicMock()
        facilitator.w3_eth.eth.get_transaction_count.return_value = 0
        facilitator.w3_eth.eth.account.sign_transaction.return_value = mock_signed
        facilitator.w3_eth.eth.send_raw_transaction.return_value = b"\x12\x34"
        facilitator.w3_eth.to_hex.return_value = "0x1234"

        with patch.object(facilitator, "_wait_for_receipt") as mock_wait:
            mock_wait.return_value = {"status": 0, "blockNumber": 100}  # status=0 means reverted

            result = facilitator.settle_ethereum_router(
                token=ADDR_TOKEN,
                from_addr=ADDR_FROM,
                to_addr=ADDR_TO,
                amount=1000000,
                deadline=2000000000,
                v=27,
                r="0x" + "aa" * 32,
                s="0x" + "bb" * 32,
            )

        assert result.success is False
        assert result.error == "reverted"

    def test_settle_ethereum_router_contract_logic_error(self):
        """Should handle ContractLogicError."""
        facilitator, _ = self._create_facilitator_with_mocks()

        facilitator.router = MagicMock()
        facilitator.router.functions.gaslessTransfer.return_value.build_transaction.side_effect = ContractLogicError(
            "execution reverted: insufficient allowance"
        )

        facilitator.w3_eth = MagicMock()
        facilitator.w3_eth.eth.get_transaction_count.return_value = 0

        result = facilitator.settle_ethereum_router(
            token=ADDR_TOKEN,
            from_addr=ADDR_FROM,
            to_addr=ADDR_TO,
            amount=1000000,
            deadline=2000000000,
            v=27,
            r="0x" + "aa" * 32,
            s="0x" + "bb" * 32,
        )

        assert result.success is False
        assert "insufficient allowance" in result.error

    def test_settle_ethereum_router_invalid_address(self):
        """Should handle InvalidAddress error."""
        facilitator, _ = self._create_facilitator_with_mocks()

        facilitator.router = MagicMock()
        facilitator.router.functions.gaslessTransfer.return_value.build_transaction.side_effect = InvalidAddress()

        facilitator.w3_eth = MagicMock()
        facilitator.w3_eth.eth.get_transaction_count.return_value = 0

        result = facilitator.settle_ethereum_router(
            token=ADDR_TOKEN,
            from_addr=ADDR_FROM,
            to_addr=ADDR_TO,
            amount=1000000,
            deadline=2000000000,
            v=27,
            r="0x" + "aa" * 32,
            s="0x" + "bb" * 32,
        )

        assert result.success is False

    def test_settle_ethereum_router_timeout(self):
        """Should handle TimeExhausted error."""
        facilitator, _ = self._create_facilitator_with_mocks()

        mock_tx = {"from": ADDR_RELAYER, "nonce": 0}
        mock_signed = MagicMock()
        mock_signed.rawTransaction = b"raw_tx_bytes"

        facilitator.router = MagicMock()
        facilitator.router.functions.gaslessTransfer.return_value.build_transaction.return_value = mock_tx

        facilitator.w3_eth = MagicMock()
        facilitator.w3_eth.eth.get_transaction_count.return_value = 0
        facilitator.w3_eth.eth.account.sign_transaction.return_value = mock_signed
        facilitator.w3_eth.eth.send_raw_transaction.return_value = b"\x12\x34"
        facilitator.w3_eth.to_hex.return_value = "0x1234"

        with patch.object(facilitator, "_wait_for_receipt") as mock_wait:
            mock_wait.side_effect = TimeExhausted("Transaction not mined within timeout")

            result = facilitator.settle_ethereum_router(
                token=ADDR_TOKEN,
                from_addr=ADDR_FROM,
                to_addr=ADDR_TO,
                amount=1000000,
                deadline=2000000000,
                v=27,
                r="0x" + "aa" * 32,
                s="0x" + "bb" * 32,
            )

        assert result.success is False
        assert "tx_timeout" in result.error


# =============================================================================
# Test settle_plasma_eip3009
# =============================================================================


class TestSettlePlasmaEip3009:
    """Tests for settle_plasma_eip3009 method."""

    def _create_facilitator_with_mocks(self):
        """Helper to create facilitator with mocked dependencies."""
        with patch("agent.facilitator.Web3") as mock_web3_class, \
             patch("agent.facilitator.settings") as mock_settings:
            mock_settings.ETH_RPC = "http://eth-rpc"
            mock_settings.PLASMA_RPC = "http://plasma-rpc"
            mock_settings.RELAYER_PRIVATE_KEY = "0x" + "11" * 32
            mock_settings.ROUTER_ADDRESS = ADDR_ROUTER
            mock_settings.USDT0_ADDRESS = ADDR_USDT0
            mock_settings.CHANNEL_ADDRESS = None

            mock_w3 = MagicMock()
            mock_w3.eth.account.from_key.return_value = MagicMock(address=ADDR_RELAYER)
            mock_w3.eth.contract.return_value = MagicMock()
            mock_web3_class.return_value = mock_w3
            mock_web3_class.HTTPProvider.return_value = MagicMock()
            mock_web3_class.is_address.return_value = True
            mock_web3_class.to_checksum_address.side_effect = lambda x: x

            facilitator = PaymentFacilitator()
            return facilitator, mock_settings

    def test_settle_plasma_eip3009_success(self):
        """Should successfully settle via Plasma EIP-3009."""
        facilitator, mock_settings = self._create_facilitator_with_mocks()

        mock_tx = {"from": ADDR_RELAYER, "nonce": 0}
        mock_signed = MagicMock()
        mock_signed.rawTransaction = b"raw_tx_bytes"

        facilitator.usdt0_vrs = MagicMock()
        facilitator.usdt0_vrs.functions.transferWithAuthorization.return_value.build_transaction.return_value = mock_tx

        facilitator.w3_plasma = MagicMock()
        facilitator.w3_plasma.eth.get_transaction_count.return_value = 0
        facilitator.w3_plasma.eth.account.sign_transaction.return_value = mock_signed
        facilitator.w3_plasma.eth.send_raw_transaction.return_value = b"\x56\x78"
        facilitator.w3_plasma.to_hex.return_value = "0x5678"

        with patch.object(facilitator, "_wait_for_receipt") as mock_wait:
            mock_wait.return_value = {"status": 1, "blockNumber": 200}

            result = facilitator.settle_plasma_eip3009(
                from_addr=ADDR_FROM,
                to_addr=ADDR_TO,
                value=1000000,
                valid_after=1700000000,
                valid_before=1800000000,
                nonce32="0x" + "cc" * 32,
                v=28,
                r="0x" + "dd" * 32,
                s="0x" + "ee" * 32,
            )

        assert result.success is True
        assert result.tx_hash == "0x5678"
        assert result.error is None

    def test_settle_plasma_eip3009_normalizes_nonce(self):
        """Should normalize nonce without 0x prefix."""
        facilitator, _ = self._create_facilitator_with_mocks()

        mock_tx = {"from": ADDR_RELAYER, "nonce": 0}
        mock_signed = MagicMock()
        mock_signed.rawTransaction = b"raw_tx_bytes"

        facilitator.usdt0_vrs = MagicMock()
        facilitator.usdt0_vrs.functions.transferWithAuthorization.return_value.build_transaction.return_value = mock_tx

        facilitator.w3_plasma = MagicMock()
        facilitator.w3_plasma.eth.get_transaction_count.return_value = 0
        facilitator.w3_plasma.eth.account.sign_transaction.return_value = mock_signed
        facilitator.w3_plasma.eth.send_raw_transaction.return_value = b"\x56\x78"
        facilitator.w3_plasma.to_hex.return_value = "0x5678"

        with patch.object(facilitator, "_wait_for_receipt") as mock_wait:
            mock_wait.return_value = {"status": 1, "blockNumber": 200}

            # Nonce without 0x prefix
            result = facilitator.settle_plasma_eip3009(
                from_addr=ADDR_FROM,
                to_addr=ADDR_TO,
                value=1000000,
                valid_after=1700000000,
                valid_before=1800000000,
                nonce32="cc" * 32,  # No 0x prefix
                v=28,
                r="0x" + "dd" * 32,
                s="0x" + "ee" * 32,
            )

        assert result.success is True

    def test_settle_plasma_eip3009_reverted(self):
        """Should handle reverted transaction."""
        facilitator, _ = self._create_facilitator_with_mocks()

        mock_tx = {"from": ADDR_RELAYER, "nonce": 0}
        mock_signed = MagicMock()
        mock_signed.rawTransaction = b"raw_tx_bytes"

        facilitator.usdt0_vrs = MagicMock()
        facilitator.usdt0_vrs.functions.transferWithAuthorization.return_value.build_transaction.return_value = mock_tx

        facilitator.w3_plasma = MagicMock()
        facilitator.w3_plasma.eth.get_transaction_count.return_value = 0
        facilitator.w3_plasma.eth.account.sign_transaction.return_value = mock_signed
        facilitator.w3_plasma.eth.send_raw_transaction.return_value = b"\x56\x78"
        facilitator.w3_plasma.to_hex.return_value = "0x5678"

        with patch.object(facilitator, "_wait_for_receipt") as mock_wait:
            mock_wait.return_value = {"status": 0, "blockNumber": 200}

            result = facilitator.settle_plasma_eip3009(
                from_addr=ADDR_FROM,
                to_addr=ADDR_TO,
                value=1000000,
                valid_after=1700000000,
                valid_before=1800000000,
                nonce32="0x" + "cc" * 32,
                v=28,
                r="0x" + "dd" * 32,
                s="0x" + "ee" * 32,
            )

        assert result.success is False
        assert result.error == "reverted"

    def test_settle_plasma_eip3009_contract_error(self):
        """Should handle ContractLogicError."""
        facilitator, _ = self._create_facilitator_with_mocks()

        facilitator.usdt0_vrs = MagicMock()
        facilitator.usdt0_vrs.functions.transferWithAuthorization.return_value.build_transaction.side_effect = ContractLogicError(
            "FiatTokenV2: authorization is invalid"
        )

        facilitator.w3_plasma = MagicMock()
        facilitator.w3_plasma.eth.get_transaction_count.return_value = 0

        result = facilitator.settle_plasma_eip3009(
            from_addr=ADDR_FROM,
            to_addr=ADDR_TO,
            value=1000000,
            valid_after=1700000000,
            valid_before=1800000000,
            nonce32="0x" + "cc" * 32,
            v=28,
            r="0x" + "dd" * 32,
            s="0x" + "ee" * 32,
        )

        assert result.success is False
        assert "authorization is invalid" in result.error


# =============================================================================
# Test settle_plasma_channel
# =============================================================================


class TestSettlePlasmaChannel:
    """Tests for settle_plasma_channel method."""

    def _create_facilitator_with_mocks(self, channel_address=None):
        """Helper to create facilitator with mocked dependencies."""
        with patch("agent.facilitator.Web3") as mock_web3_class, \
             patch("agent.facilitator.settings") as mock_settings:
            mock_settings.ETH_RPC = "http://eth-rpc"
            mock_settings.PLASMA_RPC = "http://plasma-rpc"
            mock_settings.RELAYER_PRIVATE_KEY = "0x" + "11" * 32
            mock_settings.ROUTER_ADDRESS = ADDR_ROUTER
            mock_settings.USDT0_ADDRESS = ADDR_USDT0
            mock_settings.CHANNEL_ADDRESS = channel_address

            mock_w3 = MagicMock()
            mock_w3.eth.account.from_key.return_value = MagicMock(address=ADDR_RELAYER)
            mock_w3.eth.contract.return_value = MagicMock()
            mock_web3_class.return_value = mock_w3
            mock_web3_class.HTTPProvider.return_value = MagicMock()
            mock_web3_class.is_address.return_value = True
            mock_web3_class.to_checksum_address.side_effect = lambda x: x

            facilitator = PaymentFacilitator()
            return facilitator, mock_settings

    def test_settle_plasma_channel_success(self):
        """Should successfully settle batch of channel receipts."""
        facilitator, _ = self._create_facilitator_with_mocks()

        mock_tx = {"from": ADDR_RELAYER, "nonce": 0}
        mock_signed = MagicMock()
        mock_signed.rawTransaction = b"raw_tx_bytes"

        mock_channel = MagicMock()
        mock_channel.functions.settleBatch.return_value.build_transaction.return_value = mock_tx

        facilitator.w3_plasma = MagicMock()
        facilitator.w3_plasma.eth.get_transaction_count.return_value = 0
        facilitator.w3_plasma.eth.account.sign_transaction.return_value = mock_signed
        facilitator.w3_plasma.eth.send_raw_transaction.return_value = b"\xab\xcd"
        facilitator.w3_plasma.to_hex.return_value = "0xabcd"
        facilitator.w3_plasma.eth.contract.return_value = mock_channel

        with patch.object(facilitator, "_wait_for_receipt") as mock_wait:
            mock_wait.return_value = {"status": 1, "blockNumber": 300}

            receipts = [
                {
                    "payer": ADDR_PAYER1,
                    "merchant": ADDR_MERCHANT,
                    "amount": 1000000,
                    "serviceId": "0x" + "11" * 32,
                    "nonce": "0x" + "22" * 32,
                    "expiry": 1800000000,
                },
                {
                    "payer": ADDR_PAYER2,
                    "merchant": ADDR_MERCHANT,
                    "amount": 2000000,
                    "serviceId": "0x" + "33" * 32,
                    "nonce": "0x" + "44" * 32,
                    "expiry": 1800000000,
                },
            ]
            signatures = ["0x" + "aa" * 65, "0x" + "bb" * 65]

            result = facilitator.settle_plasma_channel(
                receipts=receipts,
                signatures=signatures,
                channel_address=ADDR_CHANNEL,
            )

        assert result.success is True
        assert result.tx_hash == "0xabcd"

    def test_settle_plasma_channel_no_channel_configured(self):
        """Should return error when no channel is configured."""
        facilitator, _ = self._create_facilitator_with_mocks()
        facilitator.channel = None

        receipts = [{"payer": ADDR_PAYER1, "merchant": ADDR_MERCHANT, "amount": 1000000}]
        signatures = ["0x" + "aa" * 65]

        result = facilitator.settle_plasma_channel(
            receipts=receipts,
            signatures=signatures,
            channel_address=None,  # No explicit address
        )

        assert result.success is False
        assert result.error == "channel_not_configured"

    def test_settle_plasma_channel_uses_configured_channel(self):
        """Should use configured channel when no explicit address provided."""
        facilitator, _ = self._create_facilitator_with_mocks(channel_address=ADDR_CHANNEL)

        mock_tx = {"from": ADDR_RELAYER, "nonce": 0}
        mock_signed = MagicMock()
        mock_signed.rawTransaction = b"raw_tx_bytes"

        mock_channel = MagicMock()
        mock_channel.functions.settleBatch.return_value.build_transaction.return_value = mock_tx
        facilitator.channel = mock_channel

        facilitator.w3_plasma = MagicMock()
        facilitator.w3_plasma.eth.get_transaction_count.return_value = 0
        facilitator.w3_plasma.eth.account.sign_transaction.return_value = mock_signed
        facilitator.w3_plasma.eth.send_raw_transaction.return_value = b"\xef\x01"
        facilitator.w3_plasma.to_hex.return_value = "0xef01"

        with patch.object(facilitator, "_wait_for_receipt") as mock_wait:
            mock_wait.return_value = {"status": 1, "blockNumber": 400}

            receipts = [{"payer": ADDR_PAYER1, "merchant": ADDR_MERCHANT, "amount": 1000000}]
            signatures = ["0x" + "aa" * 65]

            result = facilitator.settle_plasma_channel(
                receipts=receipts,
                signatures=signatures,
                channel_address=None,  # Use configured channel
            )

        assert result.success is True
        mock_channel.functions.settleBatch.assert_called_once()

    def test_settle_plasma_channel_exception(self):
        """Should handle unexpected exceptions."""
        facilitator, _ = self._create_facilitator_with_mocks()

        mock_channel = MagicMock()
        mock_channel.functions.settleBatch.return_value.build_transaction.side_effect = Exception(
            "Unexpected error"
        )

        facilitator.w3_plasma = MagicMock()
        facilitator.w3_plasma.eth.get_transaction_count.return_value = 0
        facilitator.w3_plasma.eth.contract.return_value = mock_channel

        receipts = [{"payer": ADDR_PAYER1, "merchant": ADDR_MERCHANT, "amount": 1000000}]
        signatures = ["0x" + "aa" * 65]

        result = facilitator.settle_plasma_channel(
            receipts=receipts,
            signatures=signatures,
            channel_address=ADDR_CHANNEL,
        )

        assert result.success is False
        assert "Unexpected error" in result.error


# =============================================================================
# Test settle_plasma_gasless_api
# =============================================================================


class TestSettlePlasmaGaslessApi:
    """Tests for settle_plasma_gasless_api method."""

    def _create_facilitator_with_mocks(self):
        """Helper to create facilitator with mocked dependencies."""
        with patch("agent.facilitator.Web3") as mock_web3_class, \
             patch("agent.facilitator.settings") as mock_settings:
            mock_settings.ETH_RPC = "http://eth-rpc"
            mock_settings.PLASMA_RPC = "http://plasma-rpc"
            mock_settings.RELAYER_PRIVATE_KEY = "0x" + "11" * 32
            mock_settings.ROUTER_ADDRESS = ADDR_ROUTER
            mock_settings.USDT0_ADDRESS = ADDR_USDT0
            mock_settings.CHANNEL_ADDRESS = None
            mock_settings.PLASMA_RELAYER_URL = "https://api.plasma.to"
            mock_settings.PLASMA_RELAYER_SECRET = "test-secret"

            mock_w3 = MagicMock()
            mock_w3.eth.account.from_key.return_value = MagicMock(address=ADDR_RELAYER)
            mock_w3.eth.contract.return_value = MagicMock()
            mock_web3_class.return_value = mock_w3
            mock_web3_class.HTTPProvider.return_value = MagicMock()
            mock_web3_class.is_address.return_value = True
            mock_web3_class.to_checksum_address.side_effect = lambda x: x

            facilitator = PaymentFacilitator()
            return facilitator, mock_settings

    @patch("agent.facilitator.requests")
    @patch("agent.facilitator.settings")
    def test_settle_plasma_gasless_api_success(self, mock_settings, mock_requests):
        """Should successfully submit to gasless API and poll for confirmation."""
        facilitator, _ = self._create_facilitator_with_mocks()

        mock_settings.PLASMA_RELAYER_SECRET = "test-secret"
        mock_settings.PLASMA_RELAYER_URL = "https://api.plasma.to"

        # Mock initial submission response
        mock_submit_response = MagicMock()
        mock_submit_response.status_code = 200
        mock_submit_response.ok = True
        mock_submit_response.json.return_value = {"id": "submission-123", "status": "queued"}

        # Mock status poll response
        mock_status_response = MagicMock()
        mock_status_response.ok = True
        mock_status_response.json.return_value = {
            "status": "confirmed",
            "txHash": "0xgasless123",
            "gasUsed": 50000,
        }

        mock_requests.post.return_value = mock_submit_response
        mock_requests.get.return_value = mock_status_response

        with patch("agent.facilitator.time.sleep"):  # Skip actual sleep
            result = facilitator.settle_plasma_gasless_api(
                from_addr=ADDR_FROM,
                to_addr=ADDR_TO,
                value=1000000,
                valid_after=1700000000,
                valid_before=1800000000,
                nonce32="0x" + "cc" * 32,
                signature="0x" + "ff" * 65,
                user_ip="192.168.1.1",
            )

        assert result.success is True
        assert result.tx_hash == "0xgasless123"
        assert result.receipt["gasless"] is True

    @patch("agent.facilitator.requests")
    @patch("agent.facilitator.settings")
    def test_settle_plasma_gasless_api_rate_limited(self, mock_settings, mock_requests):
        """Should handle rate limit (429) response."""
        facilitator, _ = self._create_facilitator_with_mocks()

        mock_settings.PLASMA_RELAYER_SECRET = "test-secret"
        mock_settings.PLASMA_RELAYER_URL = "https://api.plasma.to"

        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.headers = {"content-type": "application/json"}
        mock_response.json.return_value = {
            "error": {"message": "Daily limit reached for address"}
        }

        mock_requests.post.return_value = mock_response

        result = facilitator.settle_plasma_gasless_api(
            from_addr=ADDR_FROM,
            to_addr=ADDR_TO,
            value=1000000,
            valid_after=1700000000,
            valid_before=1800000000,
            nonce32="0x" + "cc" * 32,
            signature="0x" + "ff" * 65,
            user_ip="192.168.1.1",
        )

        assert result.success is False
        assert "RATE_LIMIT_EXCEEDED" in result.error
        assert result.receipt["rate_limited"] is True

    @patch("agent.facilitator.settings")
    def test_settle_plasma_gasless_api_no_secret_configured(self, mock_settings):
        """Should return error when PLASMA_RELAYER_SECRET not configured."""
        facilitator, _ = self._create_facilitator_with_mocks()

        mock_settings.PLASMA_RELAYER_SECRET = None

        result = facilitator.settle_plasma_gasless_api(
            from_addr=ADDR_FROM,
            to_addr=ADDR_TO,
            value=1000000,
            valid_after=1700000000,
            valid_before=1800000000,
            nonce32="0x" + "cc" * 32,
            signature="0x" + "ff" * 65,
        )

        assert result.success is False
        assert "PLASMA_RELAYER_SECRET not configured" in result.error

    @patch("agent.facilitator.requests")
    @patch("agent.facilitator.settings")
    def test_settle_plasma_gasless_api_http_error(self, mock_settings, mock_requests):
        """Should handle HTTP error response."""
        facilitator, _ = self._create_facilitator_with_mocks()

        mock_settings.PLASMA_RELAYER_SECRET = "test-secret"
        mock_settings.PLASMA_RELAYER_URL = "https://api.plasma.to"

        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.ok = False
        mock_response.text = "Internal Server Error"

        mock_requests.post.return_value = mock_response

        result = facilitator.settle_plasma_gasless_api(
            from_addr=ADDR_FROM,
            to_addr=ADDR_TO,
            value=1000000,
            valid_after=1700000000,
            valid_before=1800000000,
            nonce32="0x" + "cc" * 32,
            signature="0x" + "ff" * 65,
        )

        assert result.success is False
        assert "500" in result.error

    @patch("agent.facilitator.requests")
    @patch("agent.facilitator.settings")
    def test_settle_plasma_gasless_api_timeout(self, mock_settings, mock_requests):
        """Should handle request timeout."""
        import requests as real_requests

        facilitator, _ = self._create_facilitator_with_mocks()

        mock_settings.PLASMA_RELAYER_SECRET = "test-secret"
        mock_settings.PLASMA_RELAYER_URL = "https://api.plasma.to"

        mock_requests.post.side_effect = real_requests.exceptions.Timeout("Connection timed out")
        mock_requests.exceptions = real_requests.exceptions

        result = facilitator.settle_plasma_gasless_api(
            from_addr=ADDR_FROM,
            to_addr=ADDR_TO,
            value=1000000,
            valid_after=1700000000,
            valid_before=1800000000,
            nonce32="0x" + "cc" * 32,
            signature="0x" + "ff" * 65,
        )

        assert result.success is False
        assert "timed out" in result.error

    @patch("agent.facilitator.requests")
    @patch("agent.facilitator.settings")
    def test_settle_plasma_gasless_api_transaction_failed(self, mock_settings, mock_requests):
        """Should handle transaction failure from status poll."""
        facilitator, _ = self._create_facilitator_with_mocks()

        mock_settings.PLASMA_RELAYER_SECRET = "test-secret"
        mock_settings.PLASMA_RELAYER_URL = "https://api.plasma.to"

        mock_submit_response = MagicMock()
        mock_submit_response.status_code = 200
        mock_submit_response.ok = True
        mock_submit_response.json.return_value = {"id": "submission-123", "status": "queued"}

        mock_status_response = MagicMock()
        mock_status_response.ok = True
        mock_status_response.json.return_value = {
            "status": "failed",
            "txHash": "0xfailed123",
            "error": "Authorization expired",
        }

        mock_requests.post.return_value = mock_submit_response
        mock_requests.get.return_value = mock_status_response

        with patch("agent.facilitator.time.sleep"):
            result = facilitator.settle_plasma_gasless_api(
                from_addr=ADDR_FROM,
                to_addr=ADDR_TO,
                value=1000000,
                valid_after=1700000000,
                valid_before=1800000000,
                nonce32="0x" + "cc" * 32,
                signature="0x" + "ff" * 65,
            )

        assert result.success is False
        assert result.error == "Authorization expired"

    @patch("agent.facilitator.requests")
    @patch("agent.facilitator.settings")
    def test_settle_plasma_gasless_api_normalizes_nonce(self, mock_settings, mock_requests):
        """Should normalize nonce without 0x prefix."""
        facilitator, _ = self._create_facilitator_with_mocks()

        mock_settings.PLASMA_RELAYER_SECRET = "test-secret"
        mock_settings.PLASMA_RELAYER_URL = "https://api.plasma.to"

        mock_submit_response = MagicMock()
        mock_submit_response.status_code = 200
        mock_submit_response.ok = True
        mock_submit_response.json.return_value = {"id": "submission-123", "status": "queued"}

        mock_status_response = MagicMock()
        mock_status_response.ok = True
        mock_status_response.json.return_value = {"status": "confirmed", "txHash": "0xok"}

        mock_requests.post.return_value = mock_submit_response
        mock_requests.get.return_value = mock_status_response

        with patch("agent.facilitator.time.sleep"):
            result = facilitator.settle_plasma_gasless_api(
                from_addr=ADDR_FROM,
                to_addr=ADDR_TO,
                value=1000000,
                valid_after=1700000000,
                valid_before=1800000000,
                nonce32="cc" * 32,  # Without 0x prefix
                signature="0x" + "ff" * 65,
            )

        # Check that nonce was normalized in the request
        call_args = mock_requests.post.call_args
        json_data = call_args.kwargs.get("json") or call_args[1].get("json")
        assert json_data["authorization"]["nonce"].startswith("0x")


# =============================================================================
# Test settle_plasma_with_fallback
# =============================================================================


class TestSettlePlasmaWithFallback:
    """Tests for settle_plasma_with_fallback method."""

    def _create_facilitator_with_mocks(self):
        """Helper to create facilitator with mocked dependencies."""
        with patch("agent.facilitator.Web3") as mock_web3_class, \
             patch("agent.facilitator.settings") as mock_settings:
            mock_settings.ETH_RPC = "http://eth-rpc"
            mock_settings.PLASMA_RPC = "http://plasma-rpc"
            mock_settings.RELAYER_PRIVATE_KEY = "0x" + "11" * 32
            mock_settings.ROUTER_ADDRESS = ADDR_ROUTER
            mock_settings.USDT0_ADDRESS = ADDR_USDT0
            mock_settings.CHANNEL_ADDRESS = None
            mock_settings.PLASMA_RELAYER_URL = "https://api.plasma.to"
            mock_settings.PLASMA_RELAYER_SECRET = "test-secret"
            mock_settings.USE_GASLESS_API = True

            mock_w3 = MagicMock()
            mock_w3.eth.account.from_key.return_value = MagicMock(address=ADDR_RELAYER)
            mock_w3.eth.contract.return_value = MagicMock()
            mock_web3_class.return_value = mock_w3
            mock_web3_class.HTTPProvider.return_value = MagicMock()
            mock_web3_class.is_address.return_value = True
            mock_web3_class.to_checksum_address.side_effect = lambda x: x

            facilitator = PaymentFacilitator()
            return facilitator, mock_settings

    @patch("agent.facilitator.settings")
    def test_fallback_uses_gasless_when_successful(self, mock_settings):
        """Should use gasless API result when successful."""
        facilitator, _ = self._create_facilitator_with_mocks()

        mock_settings.USE_GASLESS_API = True
        mock_settings.PLASMA_RELAYER_SECRET = "test-secret"

        gasless_result = SettlementResult(
            success=True,
            tx_hash="0xgasless-success",
            error=None,
            receipt={"gasless": True},
        )

        with patch.object(facilitator, "settle_plasma_gasless_api", return_value=gasless_result):
            result = facilitator.settle_plasma_with_fallback(
                from_addr=ADDR_FROM,
                to_addr=ADDR_TO,
                value=1000000,
                valid_after=1700000000,
                valid_before=1800000000,
                nonce32="0x" + "cc" * 32,
                v=28,
                r="0x" + "dd" * 32,
                s="0x" + "ee" * 32,
            )

        assert result.success is True
        assert result.tx_hash == "0xgasless-success"
        assert result.receipt["gasless"] is True

    @patch("agent.facilitator.settings")
    def test_fallback_to_eip3009_on_gasless_failure(self, mock_settings):
        """Should fall back to EIP-3009 when gasless fails."""
        facilitator, _ = self._create_facilitator_with_mocks()

        mock_settings.USE_GASLESS_API = True
        mock_settings.PLASMA_RELAYER_SECRET = "test-secret"

        gasless_result = SettlementResult(
            success=False,
            tx_hash=None,
            error="Gasless API error",
            receipt=None,
        )

        eip3009_result = SettlementResult(
            success=True,
            tx_hash="0xeip3009-fallback",
            error=None,
            receipt={"status": 1},
        )

        with patch.object(facilitator, "settle_plasma_gasless_api", return_value=gasless_result), \
             patch.object(facilitator, "settle_plasma_eip3009", return_value=eip3009_result):
            result = facilitator.settle_plasma_with_fallback(
                from_addr=ADDR_FROM,
                to_addr=ADDR_TO,
                value=1000000,
                valid_after=1700000000,
                valid_before=1800000000,
                nonce32="0x" + "cc" * 32,
                v=28,
                r="0x" + "dd" * 32,
                s="0x" + "ee" * 32,
            )

        assert result.success is True
        assert result.tx_hash == "0xeip3009-fallback"

    @patch("agent.facilitator.settings")
    def test_fallback_on_rate_limit(self, mock_settings):
        """Should fall back to EIP-3009 when rate limited."""
        facilitator, _ = self._create_facilitator_with_mocks()

        mock_settings.USE_GASLESS_API = True
        mock_settings.PLASMA_RELAYER_SECRET = "test-secret"

        gasless_result = SettlementResult(
            success=False,
            tx_hash=None,
            error="RATE_LIMIT_EXCEEDED: Daily limit reached",
            receipt={"rate_limited": True},
        )

        eip3009_result = SettlementResult(
            success=True,
            tx_hash="0xeip3009-after-ratelimit",
            error=None,
            receipt={"status": 1},
        )

        with patch.object(facilitator, "settle_plasma_gasless_api", return_value=gasless_result), \
             patch.object(facilitator, "settle_plasma_eip3009", return_value=eip3009_result):
            result = facilitator.settle_plasma_with_fallback(
                from_addr=ADDR_FROM,
                to_addr=ADDR_TO,
                value=1000000,
                valid_after=1700000000,
                valid_before=1800000000,
                nonce32="0x" + "cc" * 32,
                v=28,
                r="0x" + "dd" * 32,
                s="0x" + "ee" * 32,
            )

        assert result.success is True
        assert result.tx_hash == "0xeip3009-after-ratelimit"

    @patch("agent.facilitator.settings")
    def test_skip_gasless_when_disabled(self, mock_settings):
        """Should skip gasless API when USE_GASLESS_API is False."""
        facilitator, _ = self._create_facilitator_with_mocks()

        mock_settings.USE_GASLESS_API = False
        mock_settings.PLASMA_RELAYER_SECRET = "test-secret"

        eip3009_result = SettlementResult(
            success=True,
            tx_hash="0xdirect-eip3009",
            error=None,
            receipt={"status": 1},
        )

        with patch.object(facilitator, "settle_plasma_gasless_api") as mock_gasless, \
             patch.object(facilitator, "settle_plasma_eip3009", return_value=eip3009_result):
            result = facilitator.settle_plasma_with_fallback(
                from_addr=ADDR_FROM,
                to_addr=ADDR_TO,
                value=1000000,
                valid_after=1700000000,
                valid_before=1800000000,
                nonce32="0x" + "cc" * 32,
                v=28,
                r="0x" + "dd" * 32,
                s="0x" + "ee" * 32,
            )

        # Gasless should not be called
        mock_gasless.assert_not_called()
        assert result.success is True
        assert result.tx_hash == "0xdirect-eip3009"

    @patch("agent.facilitator.settings")
    def test_skip_gasless_when_no_secret(self, mock_settings):
        """Should skip gasless API when no secret is configured."""
        facilitator, _ = self._create_facilitator_with_mocks()

        mock_settings.USE_GASLESS_API = True
        mock_settings.PLASMA_RELAYER_SECRET = None

        eip3009_result = SettlementResult(
            success=True,
            tx_hash="0xdirect-no-secret",
            error=None,
            receipt={"status": 1},
        )

        with patch.object(facilitator, "settle_plasma_gasless_api") as mock_gasless, \
             patch.object(facilitator, "settle_plasma_eip3009", return_value=eip3009_result):
            result = facilitator.settle_plasma_with_fallback(
                from_addr=ADDR_FROM,
                to_addr=ADDR_TO,
                value=1000000,
                valid_after=1700000000,
                valid_before=1800000000,
                nonce32="0x" + "cc" * 32,
                v=28,
                r="0x" + "dd" * 32,
                s="0x" + "ee" * 32,
            )

        # Gasless should not be called when no secret
        mock_gasless.assert_not_called()
        assert result.success is True

    @patch("agent.facilitator.settings")
    def test_fallback_constructs_signature_correctly(self, mock_settings):
        """Should correctly reconstruct full signature from v,r,s for gasless API."""
        facilitator, _ = self._create_facilitator_with_mocks()

        mock_settings.USE_GASLESS_API = True
        mock_settings.PLASMA_RELAYER_SECRET = "test-secret"

        captured_signature = []

        def capture_gasless_call(**kwargs):
            captured_signature.append(kwargs.get("signature"))
            return SettlementResult(success=True, tx_hash="0x", error=None, receipt={})

        with patch.object(facilitator, "settle_plasma_gasless_api", side_effect=capture_gasless_call):
            facilitator.settle_plasma_with_fallback(
                from_addr=ADDR_FROM,
                to_addr=ADDR_TO,
                value=1000000,
                valid_after=1700000000,
                valid_before=1800000000,
                nonce32="0x" + "cc" * 32,
                v=28,
                r="0x" + "dd" * 32,
                s="0x" + "ee" * 32,
            )

        # Signature should be: r + s + v (without 0x prefixes for r,s)
        expected = "0x" + "dd" * 32 + "ee" * 32 + "1c"  # 1c is hex(28)
        assert captured_signature[0] == expected
