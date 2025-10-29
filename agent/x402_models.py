from __future__ import annotations

from typing import List, Optional, Literal, Union
from pydantic import BaseModel, Field


class PaymentOption(BaseModel):
    network: Literal["ethereum", "plasma"]
    chainId: int
    token: str
    tokenSymbol: str
    amount: str  # integer string in atomic units
    decimals: int
    recipient: str
    scheme: Literal[
        "erc20-gasless-router",  # Ethereum via PaymentRouter
        "eip3009-transfer-with-auth",  # Plasma via token EIP-3009 (direct pay)
        "eip3009-receive",  # Plasma via router (receiveWithAuthorization)
    ]
    routerContract: Optional[str] = None  # for ethereum option
    nonce: Optional[Union[str, int]] = None
    deadline: int
    nftCollection: Optional[str] = None


class PaymentRequired(BaseModel):
    type: Literal["payment-required"] = "payment-required"
    invoiceId: str
    timestamp: int
    paymentOptions: List[PaymentOption]
    description: Optional[str] = None


class Signature(BaseModel):
    v: int
    r: str
    s: str


class ChosenOption(BaseModel):
    network: Literal["ethereum", "plasma"]
    chainId: int
    token: str
    amount: str
    from_: str = Field(alias="from")
    to: str  # for Plasma-direct: token to; for router path: router address
    # EIP-712 (router) or EIP-3009 (token) fields
    nonce: Union[str, int]
    deadline: int
    # Plasma (EIP-3009) explicit bounds
    validAfter: Optional[int] = None
    validBefore: Optional[int] = None
    # Router NFT path
    toNFT: Optional[str] = None
    # For plasma EIP-3009, validAfter/validBefore naming is common; use deadline for simplicity


class PaymentSubmitted(BaseModel):
    type: Literal["payment-submitted"] = "payment-submitted"
    invoiceId: str
    chosenOption: ChosenOption
    signature: Signature
    scheme: Literal[
        "erc20-gasless-router",
        "eip3009-transfer-with-auth",
        "eip3009-receive",
    ]


class PaymentCompleted(BaseModel):
    type: Literal["payment-completed"] = "payment-completed"
    invoiceId: str
    txHash: str
    network: Literal["ethereum", "plasma"]
    status: Literal["confirmed", "failed"]
    receipt: Optional[dict] = None
    tokenId: Optional[int] = None


