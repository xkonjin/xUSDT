# CLAUDE.md — xUSDT

x402 agent-to-agent payment protocol on Ethereum + Plasma L1. Contains the merchant backend, consumer app SDK, smart contracts, and Next.js demo.

## Commands

```bash
# Backend
pip install -r requirements.txt
PYTHONPATH=. uvicorn agent.merchant_service:app --host 127.0.0.1 --port 8000

# Frontend (Next.js demo)
cd v0 && npm install && npm run dev     # http://localhost:3000
cd v0 && npm run build && npm run typecheck

# Smart contracts
npm install
npx hardhat compile
npx hardhat test
npx hardhat run deploy/deploy.js --network plasma
npx hardhat run deploy/deploy.js --network mainnet

# SDK monorepo
cd plasma-sdk && pnpm install
pnpm test
pnpm run build

# Tests
pytest                              # Python backend
npx hardhat test                    # Solidity
cd plasma-sdk && pnpm test          # SDK
cd v0 && npm run typecheck          # TypeScript
```

## Architecture

### Repo Layout

| Directory              | Purpose                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `agent/`               | FastAPI merchant service — invoice, settle, polymarket, predictions                |
| `contracts/`           | Solidity: PaymentRouter, MerchantNFTRouter, PlasmaPaymentChannel, PlasmaReceipt721 |
| `v0/`                  | Next.js 16 demo app — checkout flow, wallet connect                                |
| `plasma-sdk/packages/` | `@plasma-pay/core`, `@plasma-pay/x402`, `@plasma-pay/facilitator`                  |
| `plasma-sdk/apps/`     | plasma-venmo (Plenmo), bill-split (Splitzy), plasma-predictions, plasma-stream     |
| `deploy/`              | Hardhat deploy scripts                                                             |
| `tests/`               | Python backend tests                                                               |
| `test/`                | Hardhat contract tests                                                             |

### Payment Networks

| Network                | Token | Mechanism                          | Gas          |
| ---------------------- | ----- | ---------------------------------- | ------------ |
| Ethereum               | USD₮  | EIP-712 typed data, relayer wallet | Relayer pays |
| Plasma L1 (chain 9745) | USD₮0 | EIP-3009 transferWithAuthorization | Gasless API  |

### x402 Protocol Flow

```
Client: GET /premium
Server: 402 PaymentRequired { invoiceId, paymentOptions, deadline, nonce }
Client: sign EIP-3009 or EIP-712 typed data (eth_signTypedData_v4)
Client: POST /pay { type: "payment-submitted", invoiceId, chosenOption, signature, scheme }
Server: facilitator.verify_and_settle() → on-chain tx
Server: 200 { type: "payment-completed", txHash, network }
```

### Key Agent Files

| File                        | Purpose                                                              |
| --------------------------- | -------------------------------------------------------------------- |
| `agent/merchant_service.py` | FastAPI app — `/premium`, `/pay`, `/router/*`, `/channel/*`          |
| `agent/facilitator.py`      | Settlement orchestration — routes to Plasma or Ethereum              |
| `agent/merchant_agent.py`   | Invoice builder, payment verification                                |
| `agent/x402_models.py`      | Pydantic models: PaymentRequired, PaymentSubmitted, PaymentCompleted |
| `agent/config.py`           | Pydantic settings with lazy loading                                  |
| `agent/crypto.py`           | EIP-712 typed data helpers                                           |
| `agent/predictions/`        | Plasma native prediction markets router                              |
| `agent/polymarket/`         | Polymarket CLOB integration (Polygon)                                |
| `agent/static/sdk.js`       | Drop-in browser SDK                                                  |

### Smart Contracts

| Contract                   | Purpose                            |
| -------------------------- | ---------------------------------- |
| `PaymentRouter.sol`        | EIP-712 gasless router (Ethereum)  |
| `MerchantNFTRouter.sol`    | Router + ERC-721 receipt minting   |
| `PlasmaPaymentChannel.sol` | Batch settlement for micropayments |
| `PlasmaReceipt721.sol`     | NFT receipt token                  |
| `MockUSDT.sol`             | Test token                         |

### Rate Limits

| Endpoint                   | Limit  |
| -------------------------- | ------ |
| `GET /premium`             | 30/min |
| `POST /pay`                | 10/min |
| `POST /router/relay_total` | 5/min  |

## Key Env Vars

| Var                     | Purpose                                               |
| ----------------------- | ----------------------------------------------------- |
| `ETH_RPC`               | Ethereum RPC (e.g. `https://ethereum.publicnode.com`) |
| `PLASMA_RPC`            | Plasma RPC (`https://rpc.plasma.to`)                  |
| `PLASMA_CHAIN_ID`       | `9745`                                                |
| `USDT_ADDRESS`          | USD₮ on Ethereum                                      |
| `USDT0_ADDRESS`         | USD₮0 on Plasma                                       |
| `MERCHANT_ADDRESS`      | Merchant EOA                                          |
| `RELAYER_PRIVATE_KEY`   | Pays gas on Ethereum path                             |
| `CLIENT_PRIVATE_KEY`    | Test client key                                       |
| `ROUTER_ADDRESS`        | Deployed PaymentRouter                                |
| `PREFER_PLASMA`         | Default network preference                            |
| `NFT_MINT_ON_PAY`       | Mint ERC-721 on settlement                            |
| `PLASMA_RELAYER_SECRET` | Gasless API auth                                      |

## Consumer Apps (plasma-sdk/apps)

| App                  | Codename | Description                     |
| -------------------- | -------- | ------------------------------- |
| `plasma-venmo`       | Plenmo   | Gasless P2P stablecoin payments |
| `bill-split`         | Splitzy  | Group bill splitting            |
| `plasma-predictions` | —        | Prediction markets              |
| `plasma-stream`      | —        | Streaming micropayments         |

## Anti-Patterns

- Never commit private keys — `.env` is in `.gitignore`
- Never use the same nonce twice — nonce manager tracks used nonces
- Never skip signature verification — `facilitator.py` checks `recipient == MERCHANT_ADDRESS`
- `PaymentSubmitted` must include full object — 422 if fields missing
- Gasless API fallback: if `PLASMA_RELAYER_SECRET` missing, falls back to relayer wallet (slower)
- Reentrancy: all payment functions have OpenZeppelin guards — never bypass them
- Deadline in `transferWithAuthorization` is block timestamp — allow 10-minute window minimum
