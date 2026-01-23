from __future__ import annotations

import logging
import time
import requests
from dataclasses import dataclass
from typing import Optional, Dict, Any

from web3 import Web3
from web3.contract import Contract
from web3.exceptions import (
    ContractLogicError,
    InvalidAddress,
    TimeExhausted,
    TransactionNotFound,
)

from .config import settings

# Configure logger for settlement operations
logger = logging.getLogger(__name__)


ROUTER_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "token", "type": "address"},
            {"internalType": "address", "name": "from", "type": "address"},
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"},
            {"internalType": "uint256", "name": "deadline", "type": "uint256"},
            {"internalType": "uint8", "name": "v", "type": "uint8"},
            {"internalType": "bytes32", "name": "r", "type": "bytes32"},
            {"internalType": "bytes32", "name": "s", "type": "bytes32"},
        ],
        "name": "gaslessTransfer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]


EIP3009_ABI_BYTES = [
    {
        "inputs": [
            {"internalType": "address", "name": "from", "type": "address"},
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "value", "type": "uint256"},
            {"internalType": "uint256", "name": "validAfter", "type": "uint256"},
            {"internalType": "uint256", "name": "validBefore", "type": "uint256"},
            {"internalType": "bytes32", "name": "nonce", "type": "bytes32"},
            {"internalType": "bytes", "name": "signature", "type": "bytes"},
        ],
        "name": "transferWithAuthorization",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "from", "type": "address"},
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "value", "type": "uint256"},
            {"internalType": "uint256", "name": "validAfter", "type": "uint256"},
            {"internalType": "uint256", "name": "validBefore", "type": "uint256"},
            {"internalType": "bytes32", "name": "nonce", "type": "bytes32"},
            {"internalType": "bytes", "name": "signature", "type": "bytes"},
        ],
        "name": "receiveWithAuthorization",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]

EIP3009_ABI_VRS = [
    {
        "inputs": [
            {"internalType": "address", "name": "from", "type": "address"},
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "value", "type": "uint256"},
            {"internalType": "uint256", "name": "validAfter", "type": "uint256"},
            {"internalType": "uint256", "name": "validBefore", "type": "uint256"},
            {"internalType": "bytes32", "name": "nonce", "type": "bytes32"},
            {"internalType": "uint8", "name": "v", "type": "uint8"},
            {"internalType": "bytes32", "name": "r", "type": "bytes32"},
            {"internalType": "bytes32", "name": "s", "type": "bytes32"},
        ],
        "name": "transferWithAuthorization",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]


@dataclass
class SettlementResult:
    success: bool
    tx_hash: Optional[str]
    error: Optional[str]
    receipt: Optional[Dict[str, Any]]


class PaymentFacilitator:
    def __init__(self) -> None:
        self.w3_eth = Web3(Web3.HTTPProvider(settings.ETH_RPC))
        self.w3_plasma = Web3(Web3.HTTPProvider(settings.PLASMA_RPC))

        self.eth_account = self.w3_eth.eth.account.from_key(settings.RELAYER_PRIVATE_KEY)
        self.plasma_account = self.w3_plasma.eth.account.from_key(settings.RELAYER_PRIVATE_KEY)

        # Router is only needed for Ethereum path; tolerate missing/placeholder address
        self.router: Optional[Contract] = None
        try:
            if settings.ROUTER_ADDRESS and Web3.is_address(settings.ROUTER_ADDRESS):
                self.router = self.w3_eth.eth.contract(
                    address=Web3.to_checksum_address(settings.ROUTER_ADDRESS), abi=ROUTER_ABI
                )
        except (ValueError, InvalidAddress) as e:
            logger.warning("Failed to initialize router contract: %s", e)
            self.router = None
        # Construct both ABI variants for compatibility
        self.usdt0_bytes: Contract = self.w3_plasma.eth.contract(
            address=Web3.to_checksum_address(settings.USDT0_ADDRESS), abi=EIP3009_ABI_BYTES
        )
        self.usdt0_vrs: Contract = self.w3_plasma.eth.contract(
            address=Web3.to_checksum_address(settings.USDT0_ADDRESS), abi=EIP3009_ABI_VRS
        )
        # NFT Router (optional)
        self.router_nft: Contract | None = None
        # Channel (optional)
        self.channel: Contract | None = None
        if getattr(settings, "CHANNEL_ADDRESS", None):
            channel_abi = [
                {
                    "inputs": [
                        {
                            "components": [
                                {"internalType": "address", "name": "payer", "type": "address"},
                                {"internalType": "address", "name": "merchant", "type": "address"},
                                {"internalType": "uint256", "name": "amount", "type": "uint256"},
                                {"internalType": "bytes32", "name": "serviceId", "type": "bytes32"},
                                {"internalType": "bytes32", "name": "nonce", "type": "bytes32"},
                                {"internalType": "uint64", "name": "expiry", "type": "uint64"},
                            ],
                            "internalType": "struct PlasmaPaymentChannel.Receipt[]",
                            "name": "receipts",
                            "type": "tuple[]",
                        },
                        {"internalType": "bytes[]", "name": "signatures", "type": "bytes[]"},
                    ],
                    "name": "settleBatch",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function",
                }
            ]
            try:
                self.channel = self.w3_plasma.eth.contract(
                    address=Web3.to_checksum_address(settings.CHANNEL_ADDRESS), abi=channel_abi
                )
            except (ValueError, InvalidAddress) as e:
                logger.warning("Failed to initialize channel contract: %s", e)
                self.channel = None

    def _wait_for_receipt(self, w3: Web3, tx_hash: str, confirmations: int = 1) -> Dict[str, Any]:
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        # Simple confirm loop; production can use websockets/subscriptions
        if confirmations > 1:
            target = receipt.blockNumber + confirmations - 1
            while w3.eth.block_number < target:
                time.sleep(1.0)
        return dict(receipt)

    def settle_ethereum_router(
        self,
        *,
        token: str,
        from_addr: str,
        to_addr: str,
        amount: int,
        deadline: int,
        v: int,
        r: str,
        s: str,
    ) -> SettlementResult:
        try:
            tx = self.router.functions.gaslessTransfer(
                Web3.to_checksum_address(token),
                Web3.to_checksum_address(from_addr),
                Web3.to_checksum_address(to_addr),
                int(amount),
                int(deadline),
                int(v),
                r,
                s,
            ).build_transaction(
                {
                    "from": self.eth_account.address,
                    "nonce": self.w3_eth.eth.get_transaction_count(self.eth_account.address),
                }
            )
            signed = self.w3_eth.eth.account.sign_transaction(tx, private_key=settings.RELAYER_PRIVATE_KEY)
            tx_hash = self.w3_eth.to_hex(self.w3_eth.eth.send_raw_transaction(signed.rawTransaction))
            receipt = self._wait_for_receipt(self.w3_eth, tx_hash, confirmations=1)
            status = receipt.get("status", 0) == 1
            return SettlementResult(success=status, tx_hash=tx_hash, error=None if status else "reverted", receipt=receipt)
        except (ContractLogicError, InvalidAddress) as e:
            logger.warning("Ethereum router settlement failed: %s", e)
            return SettlementResult(success=False, tx_hash=None, error=str(e), receipt=None)
        except (TimeExhausted, TransactionNotFound) as e:
            logger.warning("Ethereum router tx timeout/not found: %s", e)
            return SettlementResult(success=False, tx_hash=None, error=f"tx_timeout: {e}", receipt=None)
        except Exception as e:
            logger.exception("Unexpected error in Ethereum router settlement")
            return SettlementResult(success=False, tx_hash=None, error=str(e), receipt=None)

    def settle_plasma_eip3009(
        self,
        *,
        from_addr: str,
        to_addr: str,
        value: int,
        valid_after: int,
        valid_before: int,
        nonce32: str,
        v: int,
        r: str,
        s: str,
    ) -> SettlementResult:
        try:
            # Use (v,r,s) variant explicitly per deployed token interface
            # Normalize nonce to 0x-prefixed bytes32 hex
            nonce_hex = nonce32 if (isinstance(nonce32, str) and nonce32.startswith("0x")) else ("0x" + str(nonce32))
            tx = self.usdt0_vrs.functions.transferWithAuthorization(
                Web3.to_checksum_address(from_addr),
                Web3.to_checksum_address(to_addr),
                int(value),
                int(valid_after),
                int(valid_before),
                nonce_hex,
                int(v),
                r,
                s,
            ).build_transaction(
                {
                    "from": self.plasma_account.address,
                    "nonce": self.w3_plasma.eth.get_transaction_count(self.plasma_account.address),
                }
            )

            signed = self.w3_plasma.eth.account.sign_transaction(tx, private_key=settings.RELAYER_PRIVATE_KEY)
            tx_hash = self.w3_plasma.to_hex(self.w3_plasma.eth.send_raw_transaction(signed.rawTransaction))
            receipt = self._wait_for_receipt(self.w3_plasma, tx_hash, confirmations=1)
            status = receipt.get("status", 0) == 1
            return SettlementResult(success=status, tx_hash=tx_hash, error=None if status else "reverted", receipt=receipt)
        except (ContractLogicError, InvalidAddress) as e:
            logger.warning("Plasma EIP-3009 settlement failed: %s", e)
            return SettlementResult(success=False, tx_hash=None, error=str(e), receipt=None)
        except (TimeExhausted, TransactionNotFound) as e:
            logger.warning("Plasma EIP-3009 tx timeout/not found: %s", e)
            return SettlementResult(success=False, tx_hash=None, error=f"tx_timeout: {e}", receipt=None)
        except Exception as e:
            logger.exception("Unexpected error in Plasma EIP-3009 settlement")
            return SettlementResult(success=False, tx_hash=None, error=str(e), receipt=None)

    def settle_plasma_pay_and_mint(
        self,
        *,
        router_address: str,
        from_addr: str,
        to_nft: str,
        value: int,
        valid_after: int,
        valid_before: int,
        nonce32: str,
        v: int | None = None,
        r: str | None = None,
        s: str | None = None,
        signature_bytes: str | None = None,
    ) -> SettlementResult:
        try:
            abi = [
                {
                    "inputs": [
                        {"internalType": "address", "name": "from", "type": "address"},
                        {"internalType": "address", "name": "toNFT", "type": "address"},
                        {"internalType": "uint256", "name": "value", "type": "uint256"},
                        {"internalType": "uint256", "name": "validAfter", "type": "uint256"},
                        {"internalType": "uint256", "name": "validBefore", "type": "uint256"},
                        {"internalType": "bytes32", "name": "nonce", "type": "bytes32"},
                        {"internalType": "bytes", "name": "signature", "type": "bytes"},
                    ],
                    "name": "payAndMintReceiveAuth",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function",
                },
                {
                    "inputs": [
                        {"internalType": "address", "name": "from", "type": "address"},
                        {"internalType": "address", "name": "toNFT", "type": "address"},
                        {"internalType": "uint256", "name": "value", "type": "uint256"},
                        {"internalType": "uint256", "name": "validAfter", "type": "uint256"},
                        {"internalType": "uint256", "name": "validBefore", "type": "uint256"},
                        {"internalType": "bytes32", "name": "nonce", "type": "bytes32"},
                        {"internalType": "uint8", "name": "v", "type": "uint8"},
                        {"internalType": "bytes32", "name": "r", "type": "bytes32"},
                        {"internalType": "bytes32", "name": "s", "type": "bytes32"},
                    ],
                    "name": "payAndMintVRS",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function",
                },
            ]
            router = self.w3_plasma.eth.contract(address=Web3.to_checksum_address(router_address), abi=abi)
            nonce_hex = nonce32 if (isinstance(nonce32, str) and nonce32.startswith("0x")) else ("0x" + str(nonce32))
            if signature_bytes:
                tx = router.functions.payAndMintReceiveAuth(
                    Web3.to_checksum_address(from_addr),
                    Web3.to_checksum_address(to_nft),
                    int(value),
                    int(valid_after),
                    int(valid_before),
                    nonce_hex,
                    Web3.to_bytes(hexstr=signature_bytes),
                ).build_transaction(
                    {"from": self.plasma_account.address, "nonce": self.w3_plasma.eth.get_transaction_count(self.plasma_account.address)}
                )
            else:
                tx = router.functions.payAndMintVRS(
                    Web3.to_checksum_address(from_addr),
                    Web3.to_checksum_address(to_nft),
                    int(value),
                    int(valid_after),
                    int(valid_before),
                    nonce_hex,
                    int(v or 0),
                    r or "0x",
                    s or "0x",
                ).build_transaction(
                    {"from": self.plasma_account.address, "nonce": self.w3_plasma.eth.get_transaction_count(self.plasma_account.address)}
                )

            signed = self.w3_plasma.eth.account.sign_transaction(tx, private_key=settings.RELAYER_PRIVATE_KEY)
            tx_hash = self.w3_plasma.to_hex(self.w3_plasma.eth.send_raw_transaction(signed.rawTransaction))
            receipt = self._wait_for_receipt(self.w3_plasma, tx_hash, confirmations=1)
            status = receipt.get("status", 0) == 1
            return SettlementResult(success=status, tx_hash=tx_hash, error=None if status else "reverted", receipt=receipt)
        except (ContractLogicError, InvalidAddress) as e:
            logger.warning("Plasma pay-and-mint settlement failed: %s", e)
            return SettlementResult(success=False, tx_hash=None, error=str(e), receipt=None)
        except (TimeExhausted, TransactionNotFound) as e:
            logger.warning("Plasma pay-and-mint tx timeout/not found: %s", e)
            return SettlementResult(success=False, tx_hash=None, error=f"tx_timeout: {e}", receipt=None)
        except Exception as e:
            logger.exception("Unexpected error in Plasma pay-and-mint settlement")
            return SettlementResult(success=False, tx_hash=None, error=str(e), receipt=None)

    def settle_plasma_channel(self, receipts: list[dict], signatures: list[str], channel_address: str | None = None) -> SettlementResult:
        """Batch-settle channel receipts on Plasma.

        `receipts` is a list of dicts matching the Solidity struct fields.
        `signatures` are 0x-prefixed bytes signatures for the EIP-712 receipts.
        """
        # Prefer explicit address if provided; else fall back to configured channel
        if channel_address:
            channel_abi = [
                {
                    "inputs": [
                        {
                            "components": [
                                {"internalType": "address", "name": "payer", "type": "address"},
                                {"internalType": "address", "name": "merchant", "type": "address"},
                                {"internalType": "uint256", "name": "amount", "type": "uint256"},
                                {"internalType": "bytes32", "name": "serviceId", "type": "bytes32"},
                                {"internalType": "bytes32", "name": "nonce", "type": "bytes32"},
                                {"internalType": "uint64", "name": "expiry", "type": "uint64"},
                            ],
                            "internalType": "struct PlasmaPaymentChannel.Receipt[]",
                            "name": "receipts",
                            "type": "tuple[]",
                        },
                        {"internalType": "bytes[]", "name": "signatures", "type": "bytes[]"},
                    ],
                    "name": "settleBatch",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function",
                }
            ]
            channel = self.w3_plasma.eth.contract(address=Web3.to_checksum_address(channel_address), abi=channel_abi)
        else:
            if self.channel is None:
                return SettlementResult(success=False, tx_hash=None, error="channel_not_configured", receipt=None)
            channel = self.channel
        try:
            tx = channel.functions.settleBatch(receipts, signatures).build_transaction(
                {
                    "from": self.plasma_account.address,
                    "nonce": self.w3_plasma.eth.get_transaction_count(self.plasma_account.address),
                }
            )
            signed = self.w3_plasma.eth.account.sign_transaction(tx, private_key=settings.RELAYER_PRIVATE_KEY)
            tx_hash = self.w3_plasma.to_hex(self.w3_plasma.eth.send_raw_transaction(signed.rawTransaction))
            receipt = self._wait_for_receipt(self.w3_plasma, tx_hash, confirmations=1)
            status = receipt.get("status", 0) == 1
            return SettlementResult(success=status, tx_hash=tx_hash, error=None if status else "reverted", receipt=receipt)
        except (ContractLogicError, InvalidAddress) as e:
            logger.warning("Channel settlement failed: %s", e)
            return SettlementResult(success=False, tx_hash=None, error=str(e), receipt=None)
        except (TimeExhausted, TransactionNotFound) as e:
            logger.warning("Channel tx timeout/not found: %s", e)
            return SettlementResult(success=False, tx_hash=None, error=f"tx_timeout: {e}", receipt=None)
        except Exception as e:
            logger.exception("Unexpected error in channel settlement")
            return SettlementResult(success=False, tx_hash=None, error=str(e), receipt=None)

    # -------------------------------------------------------------------------
    # Plasma Gasless API Settlement
    # -------------------------------------------------------------------------
    # Uses the Plasma gasless relayer at https://api.plasma.to to execute
    # EIP-3009 transfers without the RELAYER paying gas. Plasma pays instead.
    # Rate limits: 10 tx/day per address, 10,000 USDT0/day, 20 tx/day per IP.
    # -------------------------------------------------------------------------

    def settle_plasma_gasless_api(
        self,
        *,
        from_addr: str,
        to_addr: str,
        value: int,
        valid_after: int,
        valid_before: int,
        nonce32: str,
        signature: str,
        user_ip: str = "unknown",
    ) -> SettlementResult:
        """Submit a signed EIP-3009 authorization to the Plasma gasless API.

        This method enables FREE transactions where Plasma covers the gas cost.
        The signature should be the full 0x-prefixed bytes signature (not v,r,s).

        Args:
            from_addr: The sender's address (who signed the authorization)
            to_addr: The recipient's address
            value: Amount in atomic units (6 decimals for USDT0)
            valid_after: Unix timestamp after which the authorization is valid
            valid_before: Unix timestamp before which the authorization is valid
            nonce32: 32-byte hex nonce (0x-prefixed)
            signature: Full EIP-712 signature (0x-prefixed, 65 bytes hex)
            user_ip: User's IP address for rate limiting (forwarded from frontend)

        Returns:
            SettlementResult with success status and tx_hash if successful
        """
        # Check if gasless API is configured
        if not getattr(settings, "PLASMA_RELAYER_SECRET", None):
            return SettlementResult(
                success=False,
                tx_hash=None,
                error="PLASMA_RELAYER_SECRET not configured; falling back to RELAYER wallet",
                receipt=None,
            )

        # Normalize nonce to 0x-prefixed
        nonce_hex = nonce32 if nonce32.startswith("0x") else f"0x{nonce32}"

        try:
            # Submit to Plasma gasless API
            # API expects: POST /submit with authorization object and signature
            response = requests.post(
                f"{settings.PLASMA_RELAYER_URL}/submit",
                headers={
                    "X-Internal-Secret": settings.PLASMA_RELAYER_SECRET,
                    "X-User-IP": user_ip,
                    "Content-Type": "application/json",
                },
                json={
                    "authorization": {
                        "from": Web3.to_checksum_address(from_addr),
                        "to": Web3.to_checksum_address(to_addr),
                        "value": str(value),
                        "validAfter": str(valid_after),
                        "validBefore": str(valid_before),
                        "nonce": nonce_hex,
                    },
                    "signature": signature,
                },
                timeout=30,
            )

            # Handle API response
            if response.status_code == 429:
                # Rate limit exceeded - return specific error for fallback handling
                error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                return SettlementResult(
                    success=False,
                    tx_hash=None,
                    error=f"RATE_LIMIT_EXCEEDED: {error_data.get('error', {}).get('message', 'Daily limit reached')}",
                    receipt={"rate_limited": True, "details": error_data},
                )

            if not response.ok:
                error_text = response.text
                return SettlementResult(
                    success=False,
                    tx_hash=None,
                    error=f"Gasless API error ({response.status_code}): {error_text}",
                    receipt=None,
                )

            # Success - parse the response
            result = response.json()
            submission_id = result.get("id")
            status = result.get("status", "queued")

            # Poll for confirmation (the API returns immediately with queued status)
            # Wait up to 60 seconds for confirmation
            tx_hash = None
            final_status = status
            for _ in range(30):
                time.sleep(2)
                status_response = requests.get(
                    f"{settings.PLASMA_RELAYER_URL}/status/{submission_id}",
                    headers={"X-Internal-Secret": settings.PLASMA_RELAYER_SECRET},
                    timeout=10,
                )
                if status_response.ok:
                    status_data = status_response.json()
                    final_status = status_data.get("status", "pending")
                    tx_hash = status_data.get("txHash")

                    if final_status == "confirmed":
                        return SettlementResult(
                            success=True,
                            tx_hash=tx_hash,
                            error=None,
                            receipt={
                                "gasless": True,
                                "submission_id": submission_id,
                                "gas_used": status_data.get("gasUsed"),
                            },
                        )
                    elif final_status == "failed":
                        return SettlementResult(
                            success=False,
                            tx_hash=tx_hash,
                            error=status_data.get("error", "Transaction failed"),
                            receipt={"gasless": True, "submission_id": submission_id},
                        )
                    # Continue polling for pending/queued/submitted statuses

            # Timeout - return partial result
            return SettlementResult(
                success=False,
                tx_hash=tx_hash,
                error=f"Timeout waiting for confirmation (last status: {final_status})",
                receipt={"gasless": True, "submission_id": submission_id, "status": final_status},
            )

        except requests.exceptions.Timeout:
            logger.warning("Gasless API request timed out")
            return SettlementResult(
                success=False,
                tx_hash=None,
                error="Gasless API request timed out",
                receipt=None,
            )
        except requests.exceptions.RequestException as e:
            logger.warning("Gasless API connection error: %s", e)
            return SettlementResult(
                success=False,
                tx_hash=None,
                error=f"Gasless API connection error: {str(e)}",
                receipt=None,
            )
        except Exception as e:
            logger.exception("Unexpected error in gasless API settlement")
            return SettlementResult(
                success=False,
                tx_hash=None,
                error=f"Gasless API unexpected error: {str(e)}",
                receipt=None,
            )

    def settle_plasma_with_fallback(
        self,
        *,
        from_addr: str,
        to_addr: str,
        value: int,
        valid_after: int,
        valid_before: int,
        nonce32: str,
        v: int,
        r: str,
        s: str,
        user_ip: str = "unknown",
    ) -> SettlementResult:
        """Smart settlement: tries gasless API first, falls back to RELAYER wallet.

        This is the recommended method for Plasma EIP-3009 settlements. It:
        1. Attempts the FREE gasless API if configured and enabled
        2. Falls back to RELAYER wallet execution if gasless fails

        Args:
            from_addr: Sender address
            to_addr: Recipient address
            value: Amount in atomic units
            valid_after: Unix timestamp after which valid
            valid_before: Unix timestamp before which valid
            nonce32: 32-byte nonce
            v, r, s: Signature components
            user_ip: User IP for rate limiting

        Returns:
            SettlementResult with success status
        """
        # Check if gasless API should be used
        use_gasless = getattr(settings, "USE_GASLESS_API", True)
        has_secret = getattr(settings, "PLASMA_RELAYER_SECRET", None)

        if use_gasless and has_secret:
            # Reconstruct full signature from v,r,s for gasless API
            # Format: r (32 bytes) + s (32 bytes) + v (1 byte)
            r_hex = r[2:] if r.startswith("0x") else r
            s_hex = s[2:] if s.startswith("0x") else s
            v_hex = format(v, "02x")
            full_signature = f"0x{r_hex}{s_hex}{v_hex}"

            gasless_result = self.settle_plasma_gasless_api(
                from_addr=from_addr,
                to_addr=to_addr,
                value=value,
                valid_after=valid_after,
                valid_before=valid_before,
                nonce32=nonce32,
                signature=full_signature,
                user_ip=user_ip,
            )

            if gasless_result.success:
                return gasless_result

            # Log the gasless failure but continue to fallback
            # Check if we should fallback (don't fallback on certain errors)
            error_msg = gasless_result.error or ""
            if "RATE_LIMIT_EXCEEDED" in error_msg:
                # Rate limited - still try fallback since RELAYER wallet isn't limited
                pass
            elif "not configured" in error_msg.lower():
                # Expected - no secret configured
                pass
            # For other errors, log but continue to fallback

        # Fallback: use RELAYER wallet to execute directly
        return self.settle_plasma_eip3009(
            from_addr=from_addr,
            to_addr=to_addr,
            value=value,
            valid_after=valid_after,
            valid_before=valid_before,
            nonce32=nonce32,
            v=v,
            r=r,
            s=s,
        )


