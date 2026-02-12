from __future__ import annotations

import uuid
from typing import Tuple, Dict, Any

from eth_account import Account
from eth_account.messages import encode_typed_data
from web3 import Web3


def build_router_typed_data(
    *,
    chain_id: int,
    verifying_contract: str,
    token: str,
    from_addr: str,
    to_addr: str,
    amount: int,
    nonce: int,
    deadline: int,
) -> Dict[str, Any]:
    """EIP-712 typed data for PaymentRouter.gaslessTransfer.

    Types:
      Transfer(address token,address from,address to,uint256 amount,uint256 nonce,uint256 deadline)
    """
    typed_data = {
        "types": {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
            "Transfer": [
                {"name": "token", "type": "address"},
                {"name": "from", "type": "address"},
                {"name": "to", "type": "address"},
                {"name": "amount", "type": "uint256"},
                {"name": "nonce", "type": "uint256"},
                {"name": "deadline", "type": "uint256"},
            ],
        },
        "primaryType": "Transfer",
        "domain": {
            "name": "PaymentRouter",
            "version": "1",
            "chainId": chain_id,
            "verifyingContract": Web3.to_checksum_address(verifying_contract),
        },
        "message": {
            "token": Web3.to_checksum_address(token),
            "from": Web3.to_checksum_address(from_addr),
            "to": Web3.to_checksum_address(to_addr),
            "amount": int(amount),
            "nonce": int(nonce),
            "deadline": int(deadline),
        },
    }
    return typed_data


def sign_typed_data(private_key: str, typed_data: Dict[str, Any]) -> Tuple[int, str, str]:
    """Sign structured data (EIP-712) with a private key.

    Returns (v, r_hex, s_hex)
    """
    signable = encode_typed_data(full_message=typed_data)
    signed = Account.sign_message(signable, private_key=private_key)
    return signed.v, Web3.to_hex(signed.r), Web3.to_hex(signed.s)


def _normalize_bytes32(value: Any) -> bytes:
    if isinstance(value, (bytes, bytearray)):
        b = bytes(value)
        if len(b) != 32:
            raise ValueError("bytes32 must be 32 bytes")
        return b
    if isinstance(value, str):
        s = value[2:] if value.startswith("0x") else value
        if len(s) != 64:
            raise ValueError("hex string for bytes32 must be 64 nybbles")
        return bytes.fromhex(s)
    raise TypeError("bytes32 value must be hex string or 32-byte sequence")


def build_eip3009_typed_data(
    *,
    token_name: str,
    token_version: str,
    chain_id: int,
    verifying_contract: str,
    from_addr: str,
    to_addr: str,
    value: int,
    valid_after: int,
    valid_before: int,
    nonce32: str,
) -> Dict[str, Any]:
    """Build EIP-3009 TransferWithAuthorization typed data for tokens like USD₮0.

    struct TransferWithAuthorization {
        address from;
        address to;
        uint256 value;
        uint256 validAfter;
        uint256 validBefore;
        bytes32 nonce;
    }
    """
    # Ensure nonce is bytes32 for EIP-3009 hashing
    try:
        nonce_bytes = _normalize_bytes32(nonce32)
    except Exception:
        # fallback: keep as-is to avoid hard failure in DRY_RUN
        nonce_bytes = nonce32

    typed_data = {
        "types": {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
            "TransferWithAuthorization": [
                {"name": "from", "type": "address"},
                {"name": "to", "type": "address"},
                {"name": "value", "type": "uint256"},
                {"name": "validAfter", "type": "uint256"},
                {"name": "validBefore", "type": "uint256"},
                {"name": "nonce", "type": "bytes32"},
            ],
        },
        "primaryType": "TransferWithAuthorization",
        "domain": {
            "name": token_name,
            "version": token_version,
            "chainId": chain_id,
            "verifyingContract": Web3.to_checksum_address(verifying_contract),
        },
        "message": {
            "from": Web3.to_checksum_address(from_addr),
            "to": Web3.to_checksum_address(to_addr),
            "value": int(value),
            "validAfter": int(valid_after),
            "validBefore": int(valid_before),
            "nonce": nonce_bytes,
        },
    }
    return typed_data


def random_nonce32() -> str:
    """Return a random 32-byte hex nonce string suitable for EIP-3009."""
    return Web3.to_hex(uuid.uuid4().bytes + uuid.uuid4().bytes)[:66]


def build_eip3009_receive_typed_data(
    *,
    token_name: str,
    token_version: str,
    chain_id: int,
    verifying_contract: str,
    from_addr: str,
    to_addr: str,
    value: int,
    valid_after: int,
    valid_before: int,
    nonce32: str,
) -> Dict[str, Any]:
    """Build EIP-3009 ReceiveWithAuthorization typed data.

    struct ReceiveWithAuthorization {
        address from;
        address to;
        uint256 value;
        uint256 validAfter;
        uint256 validBefore;
        bytes32 nonce;
    }
    """
    try:
        nonce_bytes = _normalize_bytes32(nonce32)
    except Exception:
        nonce_bytes = nonce32

    typed_data = {
        "types": {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
            "ReceiveWithAuthorization": [
                {"name": "from", "type": "address"},
                {"name": "to", "type": "address"},
                {"name": "value", "type": "uint256"},
                {"name": "validAfter", "type": "uint256"},
                {"name": "validBefore", "type": "uint256"},
                {"name": "nonce", "type": "bytes32"},
            ],
        },
        "primaryType": "ReceiveWithAuthorization",
        "domain": {
            "name": token_name,
            "version": token_version,
            "chainId": chain_id,
            "verifyingContract": Web3.to_checksum_address(verifying_contract),
        },
        "message": {
            "from": Web3.to_checksum_address(from_addr),
            "to": Web3.to_checksum_address(to_addr),
            "value": int(value),
            "validAfter": int(valid_after),
            "validBefore": int(valid_before),
            "nonce": nonce_bytes,
        },
    }
    return typed_data


def build_channel_receipt_typed_data(
    *,
    chain_id: int,
    verifying_contract: str,
    payer: str,
    merchant: str,
    amount: int,
    service_id_hex32: str,
    nonce32: str,
    expiry: int,
) -> Dict[str, Any]:
    """Build EIP-712 typed data for PlasmaPaymentChannel.Receipt.

    struct Receipt {
      address payer;
      address merchant;
      uint256 amount;
      bytes32 serviceId;
      bytes32 nonce;
      uint64  expiry;
    }
    """
    try:
        nonce_bytes = _normalize_bytes32(nonce32)
    except Exception:
        nonce_bytes = nonce32
    try:
        service_bytes = _normalize_bytes32(service_id_hex32)
    except Exception:
        service_bytes = service_id_hex32

    typed_data = {
        "types": {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
            "Receipt": [
                {"name": "payer", "type": "address"},
                {"name": "merchant", "type": "address"},
                {"name": "amount", "type": "uint256"},
                {"name": "serviceId", "type": "bytes32"},
                {"name": "nonce", "type": "bytes32"},
                {"name": "expiry", "type": "uint64"},
            ],
        },
        "primaryType": "Receipt",
        "domain": {
            "name": "PlasmaPaymentChannel",
            "version": "1",
            "chainId": chain_id,
            "verifyingContract": Web3.to_checksum_address(verifying_contract),
        },
        "message": {
            "payer": Web3.to_checksum_address(payer),
            "merchant": Web3.to_checksum_address(merchant),
            "amount": int(amount),
            "serviceId": service_bytes,
            "nonce": nonce_bytes,
            "expiry": int(expiry),
        },
    }
    return typed_data


