# Changelog

All notable changes will be documented in this file.

## 2025-10-29 — Plasma NFT flow and MCP tools

### Added
- ERC‑721 contract for Plasma:
  - `contracts/plasma/NFTPlasma.sol` (owner‑only `safeMint(to, uri)` + `Minted` event).
- Deploy script:
  - `scripts/deploy_nft.js` (Hardhat, ethers v6 `waitForDeployment()`), prints deployed address.
- Plasma minter module:
  - `agent/minter.py` executes `safeMint` and decodes `Minted` to return `token_id` and tx hash.
- Merchant API:
  - `GET /product/{sku}` returns Plasma‑only `PaymentRequired` (when `PREFER_PLASMA=true`).
  - `GET /invoice/{invoice_id}` returns `{status: "pending"}` or the stored `PaymentCompleted`.
- Settlement + minting:
  - `agent/merchant_agent.verify_and_settle` mints NFT to payer after confirmed Plasma payment and returns `tokenId` in `PaymentCompleted`.
  - In‑memory idempotency map keyed by `invoiceId` to return the same result on duplicate submits.
- Models:
  - `agent/x402_models.PaymentCompleted.tokenId` (optional) to carry minted token id.
- MCP server:
  - `mcp/` with tools for Claude/agents: `wallet_link_start`, `wallet_link_status`, `get_wallet_address`, `buy_nft`, `get_invoice_status`.
  - WalletConnect v2 integration for `eth_signTypedData_v4` (EIP‑3009) and HTTP calls to the merchant.
- Documentation:
  - README updates: MCP usage, new endpoints, end‑to‑end Plasma + MCP quickstart.

### Changed
- README restructured to include Plasma MCP quickstart and “What’s new” section.

### Fixed
- Hardhat deploy script updated for ethers v6 (`waitForDeployment()` + `getAddress()`).
- Python 3.9 compatibility in `agent/config.py` by replacing `str | None` with `Optional[str]`.

### Notes
- Live deployment requires:
  - `PLASMA_RPC`, `RELAYER_PRIVATE_KEY` (funded), `MERCHANT_ADDRESS`, `NFT_CONTRACT`.
  - Optional EIP‑3009 domain overrides: `USDT0_NAME`, `USDT0_VERSION`.
  - MCP requires `WC_PROJECT_ID`.
- Reference for conventions and related tooling: [https://github.com/coinbase](https://github.com/coinbase)
