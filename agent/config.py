# Copyright (c) 2025
#
# Configuration module for agent services.
# Centralizes network settings, contract addresses, and private keys
# via environment variables for secure, flexible deployments.

from __future__ import annotations

from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


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
    NFT_MINT_ON_PAY: bool = Field(default=False, description="When true, mint an NFT receipt after successful Plasma payment")

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

    # Plasma channel & router (optional)
    CHANNEL_ADDRESS: Optional[str] = Field(
        default=None, description="Deployed PlasmaPaymentChannel address on Plasma"
    )
    PLASMA_FEE_COLLECTOR: Optional[str] = Field(
        default=None, description="Protocol fee collector on Plasma"
    )

    # -------------------------------------------------------------------------
    # Plasma Gasless API Configuration
    # -------------------------------------------------------------------------
    # The Plasma gasless relayer API enables free transactions where Plasma pays
    # gas instead of the RELAYER wallet. Rate limits: 10 tx/day per address,
    # 10,000 USDT0 daily volume, 20 tx/day per IP. Minimum: 1 USDT0.
    # API Docs: https://api.plasma.to (internal-only, requires secret)
    # -------------------------------------------------------------------------
    PLASMA_RELAYER_URL: str = Field(
        default="https://api.plasma.to",
        description="Plasma gasless relayer API base URL"
    )
    PLASMA_RELAYER_SECRET: Optional[str] = Field(
        default=None,
        description="Internal secret for authenticating with Plasma gasless API (X-Internal-Secret header)"
    )
    USE_GASLESS_API: bool = Field(
        default=True,
        description="When true, use Plasma gasless API for free tx; falls back to RELAYER wallet if unavailable"
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

    # Protocol fee parameters
    PLATFORM_FEE_BPS: int = Field(
        default=10, description="Protocol fee in basis points (10 = 0.1%)"
    )
    FLOOR_SAFETY_FACTOR_BPS: int = Field(
        default=150,
        description="Multiplier for gas-cost floor as basis points (150 = 1.5x)",
    )
    # Estimated gas units for a direct on-chain settle via router (two transferFrom calls)
    DIRECT_SETTLE_GAS_UNITS: int = Field(default=120000)
    # Optional precomputed floor in token atomic units when no price feed is configured
    DIRECT_SETTLE_FLOOR_ATOMIC: int = Field(
        default=0,
        description="Static floor in token atomic units; overrides computed floor when >0",
    )

    # Pydantic v2 settings config
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")


@lru_cache(maxsize=1)
def _load_settings() -> Settings:
    """Load and cache Settings once. Avoids import-time validation failures in tests.
    """
    return Settings()


class _LazySettingsProxy:
    def __getattr__(self, name: str):  # type: ignore[override]
        return getattr(_load_settings(), name)


# Backwards-compatible import style: `from agent.config import settings`
# This proxy defers environment validation until first attribute access.
settings = _LazySettingsProxy()  # type: ignore[assignment]


