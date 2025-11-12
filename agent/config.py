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

    # Game database (supports Vercel Postgres DATABASE_URL)
    GAME_DATABASE_URL: Optional[str] = Field(
        default=None, description="PostgreSQL connection URL for game database. Falls back to DATABASE_URL env var."
    )
    
    # Vercel Postgres support
    DATABASE_URL: Optional[str] = Field(
        default=None, description="Vercel Postgres connection URL (used if GAME_DATABASE_URL not set)"
    )
    
    # Redis for caching
    REDIS_URL: Optional[str] = Field(
        default=None, description="Redis connection URL for caching (e.g., redis://localhost:6379)"
    )
    
    # NFT contract for toys
    TOY_NFT_CONTRACT_ADDRESS: Optional[str] = Field(
        default=None, description="ERC-721 NFT contract address for toys on Plasma"
    )
    
    # Polymarket API Configuration
    POLYMARKET_API_KEY: str = Field(
        default="", description="Polymarket API key for CLOB API authentication"
    )
    POLYMARKET_SECRET: str = Field(
        default="", description="Polymarket API secret for signature generation"
    )
    POLYMARKET_PASSPHRASE: str = Field(
        default="", description="Polymarket API passphrase for authentication"
    )
    POLYMARKET_API_URL: str = Field(
        default="https://clob.polymarket.com", description="Polymarket CLOB API base URL"
    )
    POLYMARKET_BUILDER_KEY: Optional[str] = Field(
        default=None, description="Polymarket Builder Program key for order attribution"
    )
    
    # Polygon Network Configuration (for USDC conversion)
    POLYGON_RPC: str = Field(
        default="https://polygon-rpc.com", description="Polygon mainnet RPC URL"
    )
    POLYGON_CHAIN_ID: int = Field(default=137, description="Polygon mainnet chain ID")
    USDC_POLYGON_ADDRESS: str = Field(
        default="0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        description="USDC token address on Polygon (6 decimals)",
    )
    
    # Conversion Service Configuration
    CONVERSION_METHOD: str = Field(
        default="dex", description="Conversion method: 'bridge', 'dex', or 'cex'"
    )
    DEX_AGGREGATOR_URL: str = Field(
        default="https://api.1inch.io/v5.0/137",
        description="DEX aggregator API URL (1inch) for token swaps",
    )
    BRIDGE_CONTRACT_ADDRESS: Optional[str] = Field(
        default=None, description="Bridge contract address for cross-chain transfers"
    )
    CONVERSION_PRIVATE_KEY: Optional[str] = Field(
        default=None, description="Private key for conversion service wallet (must hold USDC on Polygon)"
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


