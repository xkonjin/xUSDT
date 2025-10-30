from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional, Dict, Any

from web3 import Web3
from web3.contract import Contract

from .config import settings


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
        except Exception:
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
            except Exception:
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
        except Exception as e:  # noqa: BLE001 - bubble error in response
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
        except Exception as e:  # noqa: BLE001
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
        except Exception as e:
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
        except Exception as e:  # noqa: BLE001
            return SettlementResult(success=False, tx_hash=None, error=str(e), receipt=None)


