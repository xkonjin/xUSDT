from __future__ import annotations

from typing import List, Optional, Literal, Union, Dict, Any
from pydantic import BaseModel, Field


class X402PaymentOption(BaseModel):
    """Payment option offered by the server - aligned with TypeScript"""
    network: str
    chainId: int
    token: str  # Address
    tokenSymbol: str
    tokenDecimals: int  # Renamed from 'decimals' to match TypeScript
    amount: str
    recipient: str  # Address
    scheme: Literal['eip3009-transfer-with-auth', 'eip3009-receive-with-auth', 'direct-transfer']
    description: Optional[str] = None
    
    # Extended fields from Python implementation (optional for compatibility)
    routerContract: Optional[str] = None  # for ethereum option
    nftCollection: Optional[str] = None
    recommendedMode: Optional[Literal["channel", "direct"]] = None
    feeBreakdown: Optional["FeeBreakdown"] = None


class X402PaymentRequired(BaseModel):
    """Payment Required response (HTTP 402) - aligned with TypeScript"""
    type: Literal["payment-required"] = "payment-required"
    version: Literal["1.0"] = "1.0"
    invoiceId: str
    timestamp: int
    paymentOptions: List[X402PaymentOption]
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None  # Added from TypeScript


class FeeBreakdown(BaseModel):
    """Fee breakdown structure (Python extension)"""
    # Original requested amount in atomic units
    amount: str
    # Protocol fee percent in basis points (e.g., 10 = 0.1%)
    percentBps: int
    # Fee from percent only (before any floor), as integer string
    percentFee: str
    # Whether a dynamic floor was applied
    floorApplied: bool = False
    # Final total fee (max(percentFee, floor))
    totalFee: str


class X402Authorization(BaseModel):
    """Payment authorization data - matches TypeScript structure"""
    from_: str = Field(alias="from")  # Address
    to: str  # Address
    value: str
    validAfter: int
    validBefore: int
    nonce: str  # Hex
    v: int
    r: str  # Hex
    s: str  # Hex


class X402PaymentSubmitted(BaseModel):
    """Payment submitted by client - aligned with TypeScript"""
    type: Literal["payment-submitted"] = "payment-submitted"
    invoiceId: str
    chosenOption: X402PaymentOption
    authorization: X402Authorization


class X402PaymentCompleted(BaseModel):
    """Payment completed response - aligned with TypeScript"""
    type: Literal["payment-completed"] = "payment-completed"
    invoiceId: str
    txHash: str  # Hash
    network: str
    chainId: int
    status: Literal["pending", "confirmed", "failed"]
    timestamp: int


# Legacy models for backward compatibility
PaymentOption = X402PaymentOption
PaymentRequired = X402PaymentRequired
PaymentSubmitted = X402PaymentSubmitted  
PaymentCompleted = X402PaymentCompleted


class Signature(BaseModel):
    """Legacy signature model for backward compatibility"""
    v: int
    r: str
    s: str


class ChosenOption(BaseModel):
    """Legacy chosen option model for backward compatibility"""
    network: str
    chainId: int
    token: str
    amount: str
    from_: str = Field(alias="from")
    to: str
    nonce: str
    deadline: Optional[int] = None
    validAfter: Optional[int] = None
    validBefore: Optional[int] = None
    toNFT: Optional[str] = None


