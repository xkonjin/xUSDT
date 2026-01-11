"""
Polymarket Authentication Module

This module implements L1/L2 authentication for Polymarket CLOB API:
- L1 (Private Key): EIP-712 signatures for creating/deriving API credentials
- L2 (API Key): HMAC-SHA256 signatures for authenticated API requests

Authentication Flow:
1. L1 Auth: Sign EIP-712 message with private key → Get API credentials
2. L2 Auth: Use API credentials to sign requests with HMAC-SHA256

References:
- https://docs.polymarket.com/developers/CLOB/authentication
- TypeScript: https://github.com/Polymarket/clob-client/blob/main/src/signing/
- Python: https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/signing/
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import time
import logging
from dataclasses import dataclass
from typing import Optional, Dict, Any

from eth_account import Account
from eth_account.messages import encode_typed_data

logger = logging.getLogger(__name__)


# =============================================================================
# Constants
# =============================================================================

CLOB_API_HOST = "https://clob.polymarket.com"
POLYGON_CHAIN_ID = 137

# EIP-712 Domain for CLOB authentication
CLOB_AUTH_DOMAIN = {
    "name": "ClobAuthDomain",
    "version": "1",
    "chainId": POLYGON_CHAIN_ID,
}

# EIP-712 Types for CLOB authentication
CLOB_AUTH_TYPES = {
    "ClobAuth": [
        {"name": "address", "type": "address"},
        {"name": "timestamp", "type": "string"},
        {"name": "nonce", "type": "uint256"},
        {"name": "message", "type": "string"},
    ],
}

# Standard attestation message
ATTESTATION_MESSAGE = "This message attests that I control the given wallet"


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class ApiCredentials:
    """Polymarket L2 API credentials."""
    api_key: str
    secret: str
    passphrase: str
    
    def to_dict(self) -> Dict[str, str]:
        return {
            "apiKey": self.api_key,
            "secret": self.secret,
            "passphrase": self.passphrase,
        }


@dataclass
class L1Headers:
    """Headers for L1 authenticated requests."""
    address: str
    signature: str
    timestamp: str
    nonce: int
    
    def to_dict(self) -> Dict[str, str]:
        return {
            "POLY_ADDRESS": self.address,
            "POLY_SIGNATURE": self.signature,
            "POLY_TIMESTAMP": self.timestamp,
            "POLY_NONCE": str(self.nonce),
        }


@dataclass
class L2Headers:
    """Headers for L2 authenticated requests."""
    address: str
    signature: str
    timestamp: str
    api_key: str
    passphrase: str
    
    def to_dict(self) -> Dict[str, str]:
        return {
            "POLY_ADDRESS": self.address,
            "POLY_SIGNATURE": self.signature,
            "POLY_TIMESTAMP": self.timestamp,
            "POLY_API_KEY": self.api_key,
            "POLY_PASSPHRASE": self.passphrase,
        }


# =============================================================================
# L1 Authentication (EIP-712 Signature)
# =============================================================================

def create_l1_signature(
    private_key: str,
    timestamp: Optional[str] = None,
    nonce: int = 0,
) -> L1Headers:
    """
    Create L1 authentication headers using EIP-712 signature.
    
    This proves wallet ownership by signing a structured message.
    Used to create or derive L2 API credentials.
    
    Args:
        private_key: Wallet private key (hex string with 0x prefix)
        timestamp: Unix timestamp string (defaults to current time)
        nonce: Nonce for the signature (default 0)
    
    Returns:
        L1Headers with address, signature, timestamp, and nonce
    """
    if timestamp is None:
        timestamp = str(int(time.time()))
    
    # Get account from private key
    account = Account.from_key(private_key)
    address = account.address
    
    # Build EIP-712 message
    message_data = {
        "address": address,
        "timestamp": timestamp,
        "nonce": nonce,
        "message": ATTESTATION_MESSAGE,
    }
    
    # Create structured data for signing
    typed_data = {
        "types": {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
            ],
            **CLOB_AUTH_TYPES,
        },
        "primaryType": "ClobAuth",
        "domain": CLOB_AUTH_DOMAIN,
        "message": message_data,
    }
    
    # Sign the message
    signable = encode_typed_data(full_message=typed_data)
    signed = account.sign_message(signable)
    signature = signed.signature.hex()
    
    # Ensure 0x prefix
    if not signature.startswith("0x"):
        signature = "0x" + signature
    
    return L1Headers(
        address=address,
        signature=signature,
        timestamp=timestamp,
        nonce=nonce,
    )


# =============================================================================
# L2 Authentication (HMAC-SHA256)
# =============================================================================

def create_l2_signature(
    secret: str,
    timestamp: str,
    method: str,
    request_path: str,
    body: str = "",
) -> str:
    """
    Create HMAC-SHA256 signature for L2 authenticated requests.
    
    The signature is computed as:
    HMAC-SHA256(secret, timestamp + method + request_path + body)
    
    Args:
        secret: Base64-encoded API secret
        timestamp: Unix timestamp string
        method: HTTP method (GET, POST, DELETE)
        request_path: API endpoint path (e.g., /orders)
        body: Request body string (empty for GET)
    
    Returns:
        Base64-encoded HMAC signature
    """
    # Decode the secret
    secret_bytes = base64.b64decode(secret)
    
    # Create the message to sign
    message = timestamp + method.upper() + request_path + body
    message_bytes = message.encode("utf-8")
    
    # Compute HMAC-SHA256
    signature = hmac.new(secret_bytes, message_bytes, hashlib.sha256)
    
    # Return base64-encoded signature
    return base64.b64encode(signature.digest()).decode("utf-8")


def create_l2_headers(
    credentials: ApiCredentials,
    address: str,
    method: str,
    request_path: str,
    body: str = "",
    timestamp: Optional[str] = None,
) -> L2Headers:
    """
    Create L2 authentication headers for an API request.
    
    Args:
        credentials: API credentials (api_key, secret, passphrase)
        address: Wallet address
        method: HTTP method
        request_path: API endpoint path
        body: Request body (for POST/PUT)
        timestamp: Unix timestamp (defaults to current time)
    
    Returns:
        L2Headers ready for request
    """
    if timestamp is None:
        timestamp = str(int(time.time()))
    
    signature = create_l2_signature(
        secret=credentials.secret,
        timestamp=timestamp,
        method=method,
        request_path=request_path,
        body=body,
    )
    
    return L2Headers(
        address=address,
        signature=signature,
        timestamp=timestamp,
        api_key=credentials.api_key,
        passphrase=credentials.passphrase,
    )


# =============================================================================
# Credential Management
# =============================================================================

class AuthManager:
    """
    Manages Polymarket authentication credentials and signatures.
    
    Handles:
    - L1 signatures for credential creation
    - L2 signatures for authenticated requests
    - Credential caching
    """
    
    def __init__(
        self,
        private_key: str,
        funder_address: Optional[str] = None,
        signature_type: int = 2,  # Gnosis Safe by default
    ):
        """
        Initialize the auth manager.
        
        Args:
            private_key: Wallet private key
            funder_address: Address holding funds (proxy wallet)
            signature_type: 0=EOA, 1=POLY_PROXY, 2=GNOSIS_SAFE
        """
        self.account = Account.from_key(private_key)
        self.address = self.account.address
        self.funder_address = funder_address or self.address
        self.signature_type = signature_type
        self._credentials: Optional[ApiCredentials] = None
        
        logger.info(f"AuthManager initialized for address: {self.address}")
    
    @property
    def credentials(self) -> Optional[ApiCredentials]:
        """Get cached credentials if available."""
        return self._credentials
    
    def set_credentials(self, creds: ApiCredentials) -> None:
        """Set API credentials (after creation/derivation)."""
        self._credentials = creds
        logger.info("API credentials set")
    
    def get_l1_headers(self, nonce: int = 0) -> L1Headers:
        """Get L1 headers for creating/deriving API credentials."""
        return create_l1_signature(
            private_key=self.account.key.hex(),
            nonce=nonce,
        )
    
    def get_l2_headers(
        self,
        method: str,
        request_path: str,
        body: str = "",
    ) -> L2Headers:
        """
        Get L2 headers for an authenticated request.
        
        Raises:
            ValueError: If credentials not set
        """
        if self._credentials is None:
            raise ValueError("API credentials not set. Call set_credentials() first.")
        
        return create_l2_headers(
            credentials=self._credentials,
            address=self.address,
            method=method,
            request_path=request_path,
            body=body,
        )
    
    def to_client_config(self) -> Dict[str, Any]:
        """
        Get configuration for CLOB client initialization.
        
        Returns dict compatible with py-clob-client ClobClient constructor.
        """
        config = {
            "host": CLOB_API_HOST,
            "chain_id": POLYGON_CHAIN_ID,
            "key": self.account.key.hex(),
            "signature_type": self.signature_type,
            "funder": self.funder_address,
        }
        
        if self._credentials:
            config["creds"] = self._credentials.to_dict()
        
        return config


# =============================================================================
# Utility Functions
# =============================================================================

def parse_api_credentials(response: Dict[str, Any]) -> ApiCredentials:
    """
    Parse API credentials from CLOB API response.
    
    Args:
        response: JSON response from /auth/api-key or /auth/derive-api-key
    
    Returns:
        ApiCredentials object
    """
    return ApiCredentials(
        api_key=response["apiKey"],
        secret=response["secret"],
        passphrase=response["passphrase"],
    )


def validate_credentials(creds: ApiCredentials) -> bool:
    """
    Validate API credentials format.
    
    Checks:
    - api_key is UUID format
    - secret is base64-encoded
    - passphrase is non-empty
    """
    import re
    
    # UUID pattern
    uuid_pattern = re.compile(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        re.IGNORECASE
    )
    
    if not uuid_pattern.match(creds.api_key):
        logger.warning("Invalid API key format")
        return False
    
    try:
        base64.b64decode(creds.secret)
    except Exception:
        logger.warning("Invalid secret format (not base64)")
        return False
    
    if not creds.passphrase:
        logger.warning("Empty passphrase")
        return False
    
    return True
