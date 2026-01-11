"""
Authentication middleware for Plasma Predictions API

Supports two authentication modes:
1. Privy JWT verification (for authenticated users)
2. EIP-712 signature verification (for on-chain operations)
"""

import os
import jwt
import time
from typing import Optional
from functools import wraps
from fastapi import Header, HTTPException, Request, Depends
from eth_account.messages import encode_defunct, encode_typed_data
from eth_account import Account

# Privy configuration
PRIVY_APP_ID = os.environ.get("PRIVY_APP_ID", "")
PRIVY_VERIFICATION_KEY = os.environ.get("PRIVY_VERIFICATION_KEY", "")

async def get_optional_user(
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> Optional[str]:
    """
    Extract user address from Authorization header if present.
    Returns None if no auth header or invalid token.
    """
    if not authorization:
        return None
    
    try:
        if authorization.startswith("Bearer "):
            token = authorization[7:]
            return verify_privy_token(token)
    except Exception:
        return None
    
    return None


async def require_auth(
    authorization: str = Header(..., alias="Authorization")
) -> str:
    """
    Require valid authentication. Returns user address.
    Raises HTTPException if not authenticated.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    if authorization.startswith("Bearer "):
        token = authorization[7:]
        user_address = verify_privy_token(token)
        if user_address:
            return user_address
    
    raise HTTPException(status_code=401, detail="Invalid or expired token")


def verify_privy_token(token: str) -> Optional[str]:
    """
    Verify a Privy JWT token and extract the user address.
    """
    if not PRIVY_VERIFICATION_KEY:
        # In development, decode without verification
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            return payload.get("sub", "").replace("did:privy:", "")
        except jwt.DecodeError:
            return None
    
    try:
        payload = jwt.decode(
            token,
            PRIVY_VERIFICATION_KEY,
            algorithms=["ES256"],
            audience=PRIVY_APP_ID,
        )
        # Privy subject is "did:privy:<user_id>" or wallet address
        sub = payload.get("sub", "")
        if sub.startswith("did:privy:"):
            # Extract wallet from linked accounts
            linked_accounts = payload.get("linked_accounts", [])
            for account in linked_accounts:
                if account.get("type") == "wallet":
                    return account.get("address", "").lower()
            return sub.replace("did:privy:", "")
        return sub.lower()
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def verify_eip712_signature(
    message: dict,
    signature: str,
    expected_signer: str
) -> bool:
    """
    Verify an EIP-712 typed data signature.
    """
    try:
        # Encode the typed data
        encoded = encode_typed_data(full_message=message)
        
        # Recover the signer
        recovered = Account.recover_message(encoded, signature=signature)
        
        return recovered.lower() == expected_signer.lower()
    except Exception:
        return False


def verify_eip3009_authorization(
    authorization: dict,
    signature: dict,
) -> bool:
    """
    Verify an EIP-3009 TransferWithAuthorization signature.
    
    Args:
        authorization: Dict with from, to, value, validAfter, validBefore, nonce
        signature: Dict with v, r, s
    
    Returns:
        True if signature is valid for the authorization
    """
    # Check time bounds
    now = int(time.time())
    valid_after = int(authorization.get("validAfter", 0))
    valid_before = int(authorization.get("validBefore", 0))
    
    if now < valid_after or now > valid_before:
        return False
    
    # Build typed data for EIP-3009
    domain = {
        "name": authorization.get("tokenName", "USDTe"),
        "version": authorization.get("tokenVersion", "1"),
        "chainId": authorization.get("chainId", 9745),
        "verifyingContract": authorization.get("tokenAddress", ""),
    }
    
    message_types = {
        "TransferWithAuthorization": [
            {"name": "from", "type": "address"},
            {"name": "to", "type": "address"},
            {"name": "value", "type": "uint256"},
            {"name": "validAfter", "type": "uint256"},
            {"name": "validBefore", "type": "uint256"},
            {"name": "nonce", "type": "bytes32"},
        ]
    }
    
    message = {
        "from": authorization["from"],
        "to": authorization["to"],
        "value": int(authorization["value"]),
        "validAfter": valid_after,
        "validBefore": valid_before,
        "nonce": authorization["nonce"],
    }
    
    typed_data = {
        "types": {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
            **message_types,
        },
        "primaryType": "TransferWithAuthorization",
        "domain": domain,
        "message": message,
    }
    
    # Reconstruct signature
    v = int(signature.get("v", 0))
    r = signature.get("r", "")
    s = signature.get("s", "")
    
    if isinstance(r, str) and r.startswith("0x"):
        r = bytes.fromhex(r[2:])
    if isinstance(s, str) and s.startswith("0x"):
        s = bytes.fromhex(s[2:])
    
    sig_bytes = r + s + bytes([v])
    
    return verify_eip712_signature(typed_data, sig_bytes.hex(), authorization["from"])
