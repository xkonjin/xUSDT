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

## Architecture
- Smart contract (Ethereum): `contracts/PaymentRouter.sol`
  - EIP‑712 domain: `{ name: "PaymentRouter", version: "1", chainId, verifyingContract }`
  - Typehash: `Transfer(address token,address from,address to,uint256 amount,uint256 nonce,uint256 deadline)`
  - Stateless: never holds funds; executes `IERC20(token).transferFrom(from, to, amount)` if signature is valid
- Plasma (no router): call USD₮0 token’s `transferWithAuthorization` (EIP‑3009)
- Off-chain services (Python):
  - `agent/merchant_agent.py`: builds PaymentRequired (both networks), verifies + settles, returns PaymentCompleted
  - `agent/client_agent.py`: auto-selects best option, produces EIP‑712/EIP‑3009 signatures
  - `agent/facilitator.py`: submits on-chain transactions (router/USDT on Ethereum, EIP‑3009 on Plasma)
  - `agent/crypto.py`: typed‑data builders and signers

Repo map:
- contracts/PaymentRouter.sol — EIP‑712 router
- hardhat.config.js, scripts/deploy.js — build/deploy
- scripts/approve-usdt.js — approve router allowance from payer (Arbitrum/Ethereum)
- scripts/e2e-local-mock.js — full local E2E with MockUSDT (no real funds)
- agent/config.py — env-driven settings
- agent/*.py — agents, facilitator, crypto, models
- test_flow.py — end‑to‑end demo script
- requirements.txt — pinned Python deps

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
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7  # USD₮ (USDT) on Ethereum
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

# Safety (true skips chain submission)
DRY_RUN=true

# Preference flag (when true, prefer Plasma USD₮0 when configured)
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
- Plasma path: uses USD₮0 EIP‑3009; facilitator first tries bytes signature variant of `transferWithAuthorization`, then falls back to `(v,r,s)` signature when needed.

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

## Plasma quickstart (USD₮0 EIP‑3009)
1) Configure environment
```bash
PLASMA_RPC=https://rpc.plasma.to
PLASMA_CHAIN_ID=9745
USDT0_ADDRESS=0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb
USDT0_NAME=USDTe
USDT0_VERSION=1
PREFER_PLASMA=true
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
- USD₮0 (Plasma, EIP‑3009 `TransferWithAuthorization`): uses `from, to, value, validAfter, validBefore, nonce` with token’s domain (name, version, chainId, verifyingContract)

## Operational Guidance
- Nonces: router keeps `nonces[from]` (sequential). Clients should query via `eth_call` before signing; the contract enforces on-chain.
- Deadlines: keep short (e.g., 5–10 minutes) and reject expired authorizations server-side.
- Idempotency: map `invoiceId → txHash`; ignore duplicate submissions after confirmed settlement.
- Gas: relayer pays ETH gas for Ethereum; Plasma USD₮0 is gasless for transfers.

## Security
- Never commit private keys; use a secure vault in production
- Verify `to == MERCHANT_ADDRESS` server-side before submitting any on-chain call
- Enforce exact amount/decimals match; reject under/over‑payment
- Consider rate limits and minimums on Ethereum to cover gas

## Troubleshooting
- Invalid signature on Ethereum: ensure router `chainId` and `verifyingContract` match typed data; verify the current router nonce
- Invalid signature on Plasma: ensure `validAfter/validBefore/nonce` match exactly in both signature and settlement call
- USDT approval missing: approve router first from payer’s wallet

## Roadmap
- Permit2 support on Ethereum to remove initial approval
- Rich A2A SDK middleware adapters
- Extended unit/integration tests and CI

## References
- x402 protocol and examples: https://github.com/coinbase/x402
- Plasma network docs: https://docs.plasma.to/ • Explorer: https://plasmascan.to
- USDT (Ethereum) contract: 0xdAC17F958D2ee523a2206206994597C13D831ec7
 - USD₮0 (Plasma) contract: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb
