# Copyright (c) 2025
#
# Configuration module for agent services.
# Centralizes network settings, contract addresses, and private keys
# via environment variables for secure, flexible deployments.

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # RPC endpoints
    ETH_RPC: str = Field(..., description="Ethereum mainnet RPC URL")
    PLASMA_RPC: str = Field(
        default="https://rpc.plasma.to", description="Plasma mainnet RPC URL"
    )

    # Chain IDs
    ETH_CHAIN_ID: int = Field(default=1)
    PLASMA_CHAIN_ID: int = Field(default=9745)
    # Feature flags
    PREFER_PLASMA: bool = Field(default=False, description="Prefer Plasma for payments when true")

    # Token addresses
    USDT_ADDRESS: str = Field(
        default="0xdAC17F958D2ee523a2206206994597C13D831ec7",
        description="USDT on Ethereum mainnet (6 decimals)",
    )
    USDT0_ADDRESS: str = Field(
        default="0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
        description="USD₮0 token on Plasma mainnet (official TetherTokenOFTExtension)",
    )
    # Optional EIP-3009 domain overrides (if token doesn't expose name/version)
    USDT0_NAME: str = Field(default="USDTe", description="USD₮0 token name for EIP-3009 domain")
    USDT0_VERSION: str = Field(default="1", description="USD₮0 token version for EIP-3009 domain")

    # Router (Ethereum)
    ROUTER_ADDRESS: str = Field(
        default="0xPaymentRouterAddress",
        description="Deployed PaymentRouter address on Ethereum",
    )

    # Merchant receiving address (same EOA can be used on both networks)
    MERCHANT_ADDRESS: str = Field(..., description="Merchant/receiver address")

    # Keys for off-chain signing and relaying (DO NOT COMMIT REAL KEYS)
    RELAYER_PRIVATE_KEY: str = Field(
        ..., description="Private key for relayer merchant/facilitator EOA"
    )
    CLIENT_PRIVATE_KEY: str = Field(
        ..., description="Private key for client agent EOA (test/demo)"
    )

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()  # Singleton-style settings object


