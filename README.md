# xUSDT

xUSDT is an x402-compatible agent-to-agent (A2A) payment system that enables autonomous micropayments in USD₮ across two L1 networks:
- Ethereum mainnet: USD₮ (USDT contract) via gasless pull-payments using an EIP‑712 router
- Plasma Layer 1: USD₮0 via native EIP‑3009 `transferWithAuthorization`

References: x402 spec and examples [github.com/coinbase/x402](https://github.com/coinbase/x402), Plasma network docs [docs.plasma.to](https://docs.plasma.to/)

## Features
- x402-style 3-step handshake (Payment Required → Payment Submitted → Payment Completed)
- Multi-network options in a single invoice (Ethereum + Plasma)
- Ethereum: EIP‑712 signed authorizations executed by `PaymentRouter.sol` (pulls approved USDT)
- Plasma: EIP‑3009 gasless transfers via token `transferWithAuthorization`
- Replay protection (per‑payer nonces), deadlines, strict parameter binding
- Python agents (client/merchant) + facilitator for on-chain settlement

## Module overview
- agent/
  - client_agent.py — client-side flow: selects network, builds EIP‑712/EIP‑3009 payloads, submits payments
  - merchant_service.py — FastAPI server exposing x402 HTTP endpoints (`/premium`, `/pay`, `/premium-nft`, `/pay-nft`)
  - merchant_agent.py — verifies authorizations, computes fees, and coordinates settlement; returns PaymentCompleted
  - facilitator.py — on-chain caller for Ethereum router and Plasma EIP‑3009 transfers
  - crypto.py — typed-data builders, signature helpers, hashing utilities
  - minter.py — NFT minting helpers for the Plasma NFT receipt flow
  - x402_models.py — Pydantic models for x402-style request/response shapes
- contracts/
  - PaymentRouter.sol — Ethereum EIP‑712 “pull” router for USD₮
  - plasma/PlasmaPaymentRouter.sol — Plasma allowance-based settle with 0.1% protocol fee
  - plasma/PlasmaPaymentChannel.sol — channel receipts (EIP‑712), batch settle, 0.1% fee
  - plasma/PlasmaReceipt721.sol — ERC‑721 “receipt” NFT (onlyMinter) for paid purchases
  - plasma/MerchantNFTRouter.sol — pay‑and‑mint in a single Plasma tx (EIP‑3009)
- scripts/ — deploy and demo utilities
  - deploy.js, deploy_channel.js, deploy_nft.js, deploy_router.js — Hardhat deploys
  - approve-usdt.js — one‑time USDT allowance approval (payer → router)
  - local_channel_bootstrap.js — local JSON‑RPC bootstrap (token + channel)
  - e2e-local-mock.js — full local E2E with MockUSDT
  - client_http.py — HTTP client agent demo
- mcp/ — minimal MCP server exposing wallet-link + buy NFT tools for Claude
- test/ — Hardhat tests and fixtures
- tests/ — Python unit tests (fees/crypto) and `test_flow.py` end‑to‑end demo
- hardhat.config.js — Hardhat configuration
- requirements.txt — pinned Python dependencies

## Architecture
- Smart contract (Ethereum): `contracts/PaymentRouter.sol`
  - EIP‑712 domain: `{ name: "PaymentRouter", version: "1", chainId, verifyingContract }`
  - Typehash: `Transfer(address token,address from,address to,uint256 amount,uint256 nonce,uint256 deadline)`
  - Stateless: never holds funds; executes `IERC20(token).transferFrom(from, to, amount)` if signature is valid
- Plasma (direct or channel):
  - Direct: call USDT0 token’s `transferWithAuthorization` (EIP‑3009)
  - Channel-first: `contracts/plasma/PlasmaPaymentChannel.sol` amortizes micropayments with 0.1% protocol fee (no floor)
  - Direct settle with fee: `contracts/plasma/PlasmaPaymentRouter.sol` pulls tokens and deducts 0.1% to fee collector
- Off-chain services (Python):
  - `agent/merchant_agent.py`: builds PaymentRequired (both networks), verifies + settles, returns PaymentCompleted
  - `agent/client_agent.py`: auto-selects best option, produces EIP‑712/EIP‑3009 signatures
  - `agent/facilitator.py`: submits on-chain transactions (router/USDT on Ethereum, EIP‑3009 on Plasma)
  - `agent/crypto.py`: typed‑data builders and signers

### Sequence (Plasma USDT0)
```mermaid
sequenceDiagram
    participant C as Client Agent
    participant M as Merchant Service (HTTP)
    participant F as Facilitator
    participant P as Plasma (USDT0)

    C->>M: GET /premium
    M-->>C: 402 + PaymentRequired (Plasma-only when PREFER_PLASMA=true)
    C->>C: Build EIP-3009 typed data (domain=name/version/chainId/token)
    C->>M: POST /pay (PaymentSubmitted: v/r/s, nonce, validAfter/Before)
    M->>F: verify_and_settle()
    F->>P: transferWithAuthorization(from,to,value,validAfter,validBefore,nonce,v,r,s)
    P-->>F: Tx receipt (status=1, logs Transfer)
    F-->>M: Success with txHash
    M-->>C: 200 + PaymentCompleted (txHash, receipt)
```

### Components
```mermaid
flowchart LR
    C[Client Agent] -->|HTTP x402 JSON| M[Merchant Service]
    M -->|verify/settle| F[Facilitator]
    F -->|JSON-RPC| T[USDT0 EIP-3009 on Plasma]
```
## Directory quick map
- contracts/ — Solidity sources (Ethereum + Plasma)
- agent/ — Python agents and FastAPI service
- scripts/ — deployment + demo tooling (JS and Python)
- mcp/ — Claude MCP server for wallet link + NFT checkout
- test/, tests/ — JS and Python tests
- artifacts/, cache/ — Hardhat build outputs (generated)

## Requirements
- Node.js ≥ 18 (Hardhat), npm ≥ 9
- Python ≥ 3.9
- RPC endpoints:
  - Ethereum mainnet (INFURA/Alchemy or self-hosted)
  - Plasma RPC: `https://rpc.plasma.to` (chainId 9745)

## Install
```bash
# Python
python3 -m venv .venv && source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Node
npm install
npx hardhat compile
```

## Configure (.env)
```bash
ETH_RPC=
PLASMA_RPC=https://rpc.plasma.to

# Deployed router address (Ethereum)
ROUTER_ADDRESS=0xPaymentRouterAddress

# Token addresses
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7  # USDT on Ethereum
USDT0_ADDRESS=0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb  # USD₮0 on Plasma (TetherTokenOFTExtension)

# Chain IDs
ETH_CHAIN_ID=1
PLASMA_CHAIN_ID=9745

# Optional tokens domain overrides for EIP-3009 (use if token name/version are not callable)
USDT0_NAME=USDTe
USDT0_VERSION=1

# Merchant receiving address
MERCHANT_ADDRESS=0xYourMerchantEOA

# Keys (never commit real keys)
RELAYER_PRIVATE_KEY=0x...
CLIENT_PRIVATE_KEY=0x...

# Protocol fee (practical policy)
PLATFORM_FEE_BPS=10                 # 0.1%
FLOOR_SAFETY_FACTOR_BPS=150         # 1.5x multiplier for gas-cost floor (direct-only)
DIRECT_SETTLE_GAS_UNITS=120000      # estimated units for two transferFrom calls
DIRECT_SETTLE_FLOOR_ATOMIC=0        # static floor in token atomic units (set >0 after calibration)

# Safety (true skips chain submission)
DRY_RUN=true

# Preference flag (when true, prefer Plasma USDT0 when configured)
PREFER_PLASMA=false
```

## Build and Deploy (Ethereum)
1) Compile
```bash
npx hardhat compile
```
2) Deploy router (requires funded relayer key)
```bash
ETH_RPC=... RELAYER_PRIVATE_KEY=0x... npx hardhat run scripts/deploy.js --network mainnet
```
3) Set `ROUTER_ADDRESS` in `.env` to the deployed address
4) One‑time approval (payer → router): approve sufficient USDT allowance via wallet or script

## Run the Demo
Dry run (no transactions broadcast):
```bash
source .venv/bin/activate
python test_flow.py
```
Live ETH flow (broadcasts via router):
```bash
DRY_RUN=false ETH_RPC=... ROUTER_ADDRESS=0x... MERCHANT_ADDRESS=0x... \
RELAYER_PRIVATE_KEY=0x... CLIENT_PRIVATE_KEY=0x... python test_flow.py
```

Notes:
- Ethereum path: payer must have approved the router; relayer pays gas
- Plasma path: uses USDT0 EIP‑3009; facilitator first tries bytes signature variant of `transferWithAuthorization`, then falls back to `(v,r,s)` signature when needed.

## Arbitrum (cheaper gas) quickstart
1) Deploy router to Arbitrum
```bash
ETH_RPC=https://arb1.arbitrum.io/rpc RELAYER_PRIVATE_KEY=0x... npx hardhat run scripts/deploy.js --network arbitrum
```
2) Approve once (payer → router) on Arbitrum USDT
```bash
ETH_RPC=https://arb1.arbitrum.io/rpc \
CLIENT_PRIVATE_KEY=0x... \
USDT_ADDRESS=0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9 \
ROUTER_ADDRESS=0xDeployedRouter \
node scripts/approve-usdt.js
```
3) Live payment
```bash
DRY_RUN=false \
ETH_RPC=https://arb1.arbitrum.io/rpc ETH_CHAIN_ID=42161 \
USDT_ADDRESS=0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9 \
ROUTER_ADDRESS=0xDeployedRouter \
MERCHANT_ADDRESS=0xYourMerchant \
RELAYER_PRIVATE_KEY=0x... CLIENT_PRIVATE_KEY=0x... \
python test_flow.py
```

## Plasma quickstart (USDT0 EIP‑3009)
1) Configure environment
```bash
PLASMA_RPC=https://rpc.plasma.to
PLASMA_CHAIN_ID=9745
USDT0_ADDRESS=0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb
USDT0_NAME=USDTe
USDT0_VERSION=1
PREFER_PLASMA=true
# Optional amount (atomic units; default 1000000 = 1 USDT0)
PAY_AMOUNT_ATOMIC=100000
```
2) Dry run (no tx broadcast):
```bash
source .venv/bin/activate
python test_flow.py
```
3) Live:
```bash
DRY_RUN=false PLASMA_RPC=https://rpc.plasma.to PLASMA_CHAIN_ID=9745 \
USDT0_ADDRESS=0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb \
USDT0_NAME=USDTe USDT0_VERSION=1 PREFER_PLASMA=true \
MERCHANT_ADDRESS=0xYourMerchant RELAYER_PRIVATE_KEY=0x... CLIENT_PRIVATE_KEY=0x... \
python test_flow.py
```
The facilitator will call `transferWithAuthorization(from,to,value,validAfter,validBefore,nonce,signature bytes)` and fall back to `(v,r,s)` if needed.

### Plasma-only mode
When `PREFER_PLASMA=true`, the Ethereum option is omitted from PaymentRequired, avoiding any need to set `ROUTER_ADDRESS`.

### Amount control
`PAY_AMOUNT_ATOMIC` lets you choose the payment amount in token units (6 decimals). For example:
```bash
PAY_AMOUNT_ATOMIC=100000  # 0.1 USDT0
```

## Agent-to-Agent over HTTP (x402-style)
Start merchant server (FastAPI):
```bash
source .venv/bin/activate
python -m uvicorn agent.merchant_service:app --host 0.0.0.0 --port 8000
```
Run client agent:
```bash
MERCHANT_URL=http://127.0.0.1:8000 python scripts/client_http.py
```

## Browser UI quickstart (v0)
This repo bundles a Next.js demo at `v0/` to exercise the flow from a browser with a real wallet.

1) Start merchant (Plasma, live or dry-run)
```bash
# In repo root
source .venv/bin/activate
PYTHONNOUSERSITE=1 PYTHONPATH=. \
ETH_RPC=https://ethereum.publicnode.com \
PLASMA_RPC=https://rpc.plasma.to \
MERCHANT_ADDRESS=0x000000000000000000000000000000000000dEaD \
RELAYER_PRIVATE_KEY=0x1111...1111 \
CLIENT_PRIVATE_KEY=0x2222...2222 \
PREFER_PLASMA=true \
DRY_RUN=false \
python -m uvicorn agent.merchant_service:app --host 127.0.0.1 --port 8000
```

2) Start the Next.js app
```bash
cd v0
npm run dev
# open http://localhost:3000
```

3) Test the flow
- Merchant page: set Merchant URL to `http://127.0.0.1:8000` → Health should be green.
- Client page:
  - Click “Request resource (402)” → shows PaymentRequired (Plasma option).
  - Click “Sign & Pay (EIP‑3009)” → your wallet will request an `eth_signTypedData_v4` signature.
  - After success, click “Request resource (402)” again → the app passes `invoiceId` to `/premium` and shows a 200 “Resource” block when unlocked.

Endpoints used by the UI:
- `GET /api/health` → proxies to merchant `/health` (avoids CORS).
- `GET /api/premium?merchantUrl=...&invoiceId=...&sku?=...` → proxies to merchant `/premium` (and `/product/{sku}`) with optional `invoiceId` to unlock content.
- `POST /api/pay { merchantUrl, payload }` → proxies to merchant `/pay`.

Notes:
- The merchant `/premium` now accepts `?invoiceId=...` and returns 200 with a JSON payload when the referenced invoice is confirmed. Otherwise it returns 402 with a fresh PaymentRequired.
- Nonce handling: the browser ensures the nonce from PaymentRequired is 0x‑prefixed 32‑byte hex before signing, to match backend expectations.

### Channel-first live local test (recommended)
This exercises the 0.1% fee with channel batching and no floor.

```bash
# 1) Start a local JSON-RPC node
npx hardhat node

# 2) In a new terminal, bootstrap token + channel and open a funded channel (prints exports)
CLIENT_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
RELAYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
npx hardhat run scripts/local_channel_bootstrap.js --network localhost

# 3) Export the printed env (PLASMA_RPC, CHANNEL_ADDRESS, MERCHANT_ADDRESS, RELAYER_PRIVATE_KEY, CLIENT_PRIVATE_KEY)
export ETH_RPC=http://127.0.0.1:8545
export PLASMA_CHAIN_ID=31337
export PREFER_PLASMA=true

# 4) Start the merchant server in this shell (inherits CHANNEL_ADDRESS)
python -m uvicorn agent.merchant_service:app --host 127.0.0.1 --port 8000

# 5) In another shell, run the client (channel-first)
PYTHONPATH=. USE_CHANNEL=true MERCHANT_URL=http://127.0.0.1:8000 python scripts/client_http.py
# Expected: { ok: true, txHash: 0x..., settled: 1 }
```

Notes:
- The client embeds `channel` and `chainId` in the receipt so the server verifies the exact EIP‑712 domain.
- If you re-deploy a channel, re-export the new `CHANNEL_ADDRESS` and restart the server.
- For direct on-chain settles (no channel), keep `PLATFORM_FEE_BPS=10` and calibrate `DIRECT_SETTLE_FLOOR_ATOMIC` before enabling a floor.

## MCP server (Claude tools) for Plasma NFT checkout

This repo includes a minimal MCP server that lets Claude link a wallet and say “buy NFT”. It uses WalletConnect v2 to link any EVM wallet and completes payment + mint on Plasma via the HTTP endpoints above.

Prereqs:
- Node.js ≥ 18
- Env: `WC_PROJECT_ID` (WalletConnect Cloud), `MERCHANT_URL` (default `http://127.0.0.1:8000`)
- Merchant must be running with Plasma config and `NFT_CONTRACT` set.

Install and run:
```bash
cd mcp
npm install
WC_PROJECT_ID=... MERCHANT_URL=http://127.0.0.1:8000 npm start
# In Claude, add this MCP as a custom tool (stdio). Call tools:
# - wallet_link_start → returns a WC URI (also printed as a QR in logs)
# - wallet_link_status → { status, address }
# - get_wallet_address → { address }
# - buy_nft { sku: "premium" } → returns PaymentCompleted with txHash and tokenId
```

Notes:
- The server builds EIP‑3009 typed data for Plasma USDT0 and requests an `eth_signTypedData_v4` signature from the linked wallet. It then POSTs `/pay` to the merchant.
- Configure token domain overrides if your USDT0 token does not expose name/version on-chain: set `USDT0_NAME` and `USDT0_VERSION`.

References
- Coinbase org (x402, agentkit, payments-mcp, etc.): [https://github.com/coinbase](https://github.com/coinbase)
Flow:
1) GET /premium → returns 402 with PaymentRequired (Plasma-only if `PREFER_PLASMA=true`)
2) Client signs (EIP-3009) and POST /pay with PaymentSubmitted
3) Server settles on Plasma and returns PaymentCompleted with txHash

## x402 Message Shapes
PaymentRequired (server → client):
```json
{
  "type": "payment-required",
  "invoiceId": "uuid-12345",
  "timestamp": 1704067200,
  "paymentOptions": [
    {
      "network": "ethereum",
      "chainId": 1,
      "token": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      "tokenSymbol": "USDT",
      "amount": "5000000",
      "decimals": 6,
      "recipient": "0xMerchant",
      "scheme": "erc20-gasless-router",
      "routerContract": "0xRouter",
      "nonce": 0,
      "deadline": 1704067500
    },
    {
      "network": "plasma",
      "chainId": 9745,
      "token": "0xUSDT0",
      "tokenSymbol": "USDT0",
      "amount": "5000000",
      "decimals": 6,
      "recipient": "0xMerchant",
      "scheme": "eip3009-transfer-with-auth",
      "nonce": "0x…32bytes",
      "deadline": 1704067500
    }
  ],
  "description": "Payment for premium API access"
}
```

PaymentSubmitted (client → server):
```json
{
  "type": "payment-submitted",
  "invoiceId": "uuid-12345",
  "chosenOption": {
    "network": "ethereum",
    "chainId": 1,
    "token": "0xdAC…",
    "amount": "5000000",
    "from": "0xClient",
    "to": "0xMerchant",
    "nonce": 0,
    "deadline": 1704067500
  },
  "signature": { "v": 27, "r": "0x…", "s": "0x…" },
  "scheme": "erc20-gasless-router"
}
```

PaymentCompleted (server → client):
```json
{
  "type": "payment-completed",
  "invoiceId": "uuid-12345",
  "txHash": "0x…",
  "network": "ethereum",
  "status": "confirmed",
  "receipt": { "blockNumber": 123456, "gasUsed": 76543 }
}
```

## EIP‑712 / EIP‑3009 Details
- Router (Ethereum, typed data `Transfer`): binds token, from, to, amount, nonce, deadline to prevent parameter tampering and replay
- USDT0 (Plasma, EIP‑3009 `TransferWithAuthorization`): uses `from, to, value, validAfter, validBefore, nonce` with token’s domain (name, version, chainId, verifyingContract)

## Operational Guidance
- Nonces: router keeps `nonces[from]` (sequential). Clients should query via `eth_call` before signing; the contract enforces on-chain.
- Deadlines: keep short (e.g., 5–10 minutes) and reject expired authorizations server-side.
- Idempotency: map `invoiceId → txHash`; ignore duplicate submissions after confirmed settlement.
- Gas: relayer pays ETH gas for Ethereum; Plasma USDT0 is gasless for transfers.

## Security
- Never commit private keys; use a secure vault in production
- Verify `to == MERCHANT_ADDRESS` server-side before submitting any on-chain call
- Enforce exact amount/decimals match; reject under/over‑payment
- Consider rate limits and minimums on Ethereum to cover gas

### Bullet‑proofing checklist
- Signature domains
  - EIP‑712: chainId and verifyingContract must match deployed router (if used)
  - EIP‑3009: use the token’s on-chain name/version where exposed; otherwise allow explicit overrides
- Nonces and expiry
  - Router: fetch `nonces[from]` via eth_call before signing; enforce increment on-chain
  - EIP‑3009: generate 32‑byte nonce; include `validAfter`/`validBefore`; allow small clock drift
- Payload validation
  - Strictly bind token/from/to/amount/nonce/deadline in signatures
  - Check `recipient == MERCHANT_ADDRESS`
  - Optionally pre‑check `balanceOf(from) >= amount` on Plasma to fail fast
- Transport & idempotency
  - Use `invoiceId` mapping to ignore duplicates after success
  - Map reverts to structured x402 error fields (invalid_signature, expired, insufficient_funds, nonce_mismatch, etc.)
- Observability
  - Log txHash and minimal receipt fields; redact secrets; structure logs by invoiceId
- Malleability & recovery
  - Router uses OZ ECDSA.recover; EIP‑3009 is validated by token contract
- Amount controls
  - `PAY_AMOUNT_ATOMIC` env to cap or choose payment size (supports micros)

## What’s new (Plasma NFT flow)
- Atomic router-based NFT on payment (Plasma):
  - `contracts/plasma/PlasmaReceipt721.sol` (Smiley Receipt ERC‑721 with `onlyMinter`).
  - `contracts/plasma/MerchantNFTRouter.sol` accepts EIP‑3009 authorizations and mints the NFT in the same transaction.
  - Router paths:
    - `payAndMintReceiveAuth(from, toNFT, value, validAfter, validBefore, nonce, signatureBytes)` using token.receiveWithAuthorization(to=router)
    - `payAndMintVRS(from, toNFT, value, validAfter, validBefore, nonce, v, r, s)` using token.transferWithAuthorization(to=treasury)
  - FastAPI endpoints for the router flow:
    - `GET /premium-nft` → 402 PaymentRequired for 0.01 USDT0 (10,000 atomic), scheme `eip3009-receive`, includes `routerContract` and `nftCollection`.
    - `POST /pay-nft` → settles via router and returns `PaymentCompleted` with `txHash` and a JSON‑safe receipt.
  - Client agent signs EIP‑3009 ReceiveWithAuthorization typed data to the router; server assembles a 65‑byte signature as `r||s||v` (r/s left‑padded to 32 bytes).

Deployed demo (Plasma mainnet):
- Chain ID: 9745, RPC: `https://rpc.plasma.to`
- USDT0 token: `0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb`
- Treasury (merchant): `0xdec34d821a100ae7a632caf36161c5651d0d5df9`
- PlasmaReceipt721: `0xD4d9640F089DE66D00ff0242BFFE1a4377c71b50`
- MerchantNFTRouter: `0x3fB9F749f17634312Cb2C1d3340061A504DDC991`
- Example tx hashes:
  - `0xd4b3fd31b15fb48005d06ae3c71ed990f37f1ef48333b714baacaaa824b8f518` (confirmed)
  - `0xe01c98a8d6ff4fc5e01157197fd01b5562c4021e5d9d77ac8a8afbb91d43d4f8` (confirmed)

Server serialization hardening:
- `/pay-nft` now returns JSONResponse and converts web3 AttributeDict/HexBytes to JSON‑safe primitives to avoid 500s from pydantic serialization.

### New endpoints
- `GET /premium-nft` → 402 PaymentRequired (Plasma EIP‑3009 router option) for a 0.01 USDT0 NFT.
- `POST /pay-nft` → processes `PaymentSubmitted` signed for ReceiveWithAuthorization; on success, calls the router to forward funds to treasury and mints the Smiley NFT.
- `GET /invoice/{invoice_id}` → returns `{ status: "pending" }` or the stored `PaymentCompleted`.

### MCP tools (Claude)
- `wallet_link_start` → returns a WalletConnect URI; also prints QR in server logs.
- `wallet_link_status` → `{ status, address }`.
- `get_wallet_address` → `{ address }`.
- `buy_nft` `{ sku, merchantUrl? }` → performs EIP‑3009 signing via WalletConnect and calls `/pay`.
- `get_invoice_status` `{ invoiceId, merchantUrl? }` → polls `/invoice/{id}`.

## End‑to‑end quickstart (Plasma + MCP)
1) Deploy NFT
```bash
npx hardhat run scripts/deploy_nft.js --network plasma
# Copy the printed address to NFT_CONTRACT
```
2) Configure and run merchant
```bash
export PLASMA_RPC=https://rpc.plasma.to
export PLASMA_CHAIN_ID=9745
export ETH_RPC=https://ethereum.publicnode.com
export ETH_CHAIN_ID=1
export USDT0_ADDRESS=0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb
export USDT0_NAME=USDTe
export USDT0_VERSION=1
export PREFER_PLASMA=true
export RELAYER_PRIVATE_KEY=0x...
export CLIENT_PRIVATE_KEY=0x...
export MERCHANT_ADDRESS=0xYourMerchant
export NFT_CONTRACT=0xDeployedNft
uvicorn agent.merchant_service:app --host 0.0.0.0 --port 8000
```
3) Run MCP server
```bash
cd mcp && npm install
WC_PROJECT_ID=... MERCHANT_URL=http://127.0.0.1:8000 npm start
```
4) In Claude (with the MCP attached)
- `wallet_link_start` → show QR in logs, connect wallet
- `wallet_link_status`
- `buy_nft { "sku": "premium" }`
- `get_invoice_status { "invoiceId": "..." }`

## v0 demo plan (UI-assisted showcase)
Goal: a v0 app that demonstrates end‑to‑end x402 payments on Plasma.

### Pages / flows
- Merchant dashboard
  - Shows current configuration (Plasma RPC, token address, merchant address)
  - Button: “Start merchant server” (or show deployed URL)
- Client demo
  - Inputs: Merchant URL, amount (atomic or decimals), payer key (local only)
  - Button 1: “Request resource” → displays PaymentRequired JSON
  - Button 2: “Sign & Pay” → constructs EIP‑3009, POSTs /pay, shows tx hash
- Explorer linkouts
  - Link to Plasma explorer with tx hash

### Backend wiring
- Reuse `agent/merchant_service.py` as the merchant endpoint
- Reuse `scripts/client_http.py` logic inside the v0 server action or via client API call
- Provide env controls for PREFER_PLASMA, USDT0_ADDRESS, PAY_AMOUNT_ATOMIC

### Hardening for v0
- Never transmit private keys to the server (sign in the browser or local worker)
- If server‑side signing is necessary for demo, restrict to test values and clearly warn users
- Redact secrets in logs; show only tx hashes and minimal receipts
