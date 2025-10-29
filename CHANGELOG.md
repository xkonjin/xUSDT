# Changelog

All notable changes will be documented in this file.

## 2025-10-29 — Plasma NFT on payment (router) + HTTP hardening

### Added
- Plasma router NFT path (atomic settlement + mint):
  - `contracts/plasma/PlasmaReceipt721.sol` (Smiley Receipt ERC‑721 with `onlyMinter`).
  - `contracts/plasma/MerchantNFTRouter.sol` with `payAndMintReceiveAuth` (bytes) and `payAndMintVRS` (v/r/s).
- Client/Server wiring:
  - Client signs EIP‑3009 ReceiveWithAuthorization to the router (typed data domain = token name/version/chainId/address).
  - Merchant `/pay-nft` accepts `PaymentSubmitted`, assembles 65‑byte signature as `r||s||v` (r,s 32‑byte left‑pad), calls the router.
- Endpoints:
  - `GET /premium-nft` (402) and `POST /pay-nft` (returns `PaymentCompleted`).
- Deployment (Plasma mainnet):
  - Router: `0x3fB9F749f17634312Cb2C1d3340061A504DDC991`
  - NFT: `0xD4d9640F089DE66D00ff0242BFFE1a4377c71b50`
  - USD₮0: `0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb`
  - Treasury: `0xdec34d821a100ae7a632caf36161c5651d0d5df9`
- Example tx: `0xe01c98a8d6ff4fc5e01157197fd01b5562c4021e5d9d77ac8a8afbb91d43d4f8` (status 1).

### Changed
- README expanded with router NFT path, deployed addresses, and runbook.

### Fixed
- EIP‑3009 signature assembly for bytes path (`r||s||v`) with 32‑byte left‑padding for r/s to satisfy token signature checks.
- Merchant `/pay-nft` response serialization: convert web3 AttributeDict/HexBytes to JSON‑safe primitives and always return JSONResponse.
- Start‑up config validation: document required `ETH_RPC` and `MERCHANT_ADDRESS` env.

### Notes
- Payer must hold ≥ 0.01 USDT₀ for the demo SKU; router enforces exact price.
- Optional: fall back to VRS path using `transferWithAuthorization(to=treasury)`.
- Reference: [https://github.com/coinbase](https://github.com/coinbase)
