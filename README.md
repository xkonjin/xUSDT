# xUSDT — x402 Agent-to-Agent Payments on Plasma

x402 payment protocol implementation for autonomous USD₮/USD₮0 transactions. Dual-network: Ethereum (EIP-712 gasless router) + Plasma L1 (EIP-3009 transferWithAuthorization). Contains consumer apps: **Plenmo** (gasless P2P payments) and **Splitzy** (bill splitting).

```mermaid
flowchart TD
    subgraph "Consumer Apps (plasma-sdk/apps)"
        VENMO[plasma-venmo<br/>Plenmo P2P]
        SPLIT[bill-split<br/>Splitzy]
        PRED[plasma-predictions]
        STREAM[plasma-stream]
    end

    subgraph "Frontend (v0/ Next.js 16)"
        CHECKOUT[/checkout]
        APIROUTES[API Routes /api/*]
        CLIENT[wallet connect UI]
    end

    subgraph "Backend (agent/ FastAPI :8000)"
        MS[merchant_service.py]
        FAC[facilitator.py<br/>settlement logic]
        MA[merchant_agent.py<br/>invoice builder]
        PM[polymarket/ router]
        PREDI[predictions/ router]
        SDK_JS[/sdk.js drop-in]
    end

    subgraph "Smart Contracts (contracts/)"
        PR[PaymentRouter.sol<br/>EIP-712 gasless]
        MNR[MerchantNFTRouter.sol<br/>+ ERC-721 receipts]
        PPC[PlasmaPaymentChannel.sol<br/>batch settlement]
    end

    subgraph "Blockchain"
        ETH[Ethereum<br/>USD₮ · EIP-712]
        PLASMA[Plasma L1 :9745<br/>USD₮0 · EIP-3009]
        POLY[Polygon<br/>Polymarket CTF]
    end

    VENMO & SPLIT --> APIROUTES
    CHECKOUT --> APIROUTES
    CLIENT --> APIROUTES
    APIROUTES --> MS
    MS --> FAC & MA & PM & PREDI
    FAC --> ETH & PLASMA
    PM --> POLY
    PLASMA --> MNR & PPC
    ETH --> PR
    SDK_JS --> CLIENT
```

**Payment flow:** `GET /premium` → 402 PaymentRequired → wallet signs EIP-3009/EIP-712 → `POST /pay` → facilitator settles on-chain → 200 content unlocked.

## Quick Start

```bash
# Backend (Plasma network)
export PLASMA_RPC=https://rpc.plasma.to PLASMA_CHAIN_ID=9745
export MERCHANT_ADDRESS=0x... RELAYER_PRIVATE_KEY=0x... CLIENT_PRIVATE_KEY=0x...
pip install -r requirements.txt
uvicorn agent.merchant_service:app --host 127.0.0.1 --port 8000

# Frontend
cd v0 && npm install && npm run dev
# open http://localhost:3000/checkout

# Contracts
npm install && npx hardhat test
npx hardhat run deploy/deploy.js --network plasma

# SDK monorepo
cd plasma-sdk && pnpm install && pnpm test
```

## Stack

| Component     | Tech                                                                  |
| ------------- | --------------------------------------------------------------------- |
| Backend       | Python 3.11+, FastAPI, Web3.py, SlowAPI                               |
| Frontend      | Next.js 16, React 19, TypeScript, Viem                                |
| Contracts     | Solidity ^0.8.24, Hardhat, OpenZeppelin                               |
| SDK           | pnpm monorepo, Turbo, @plasma-pay/\* packages                         |
| Consumer apps | plasma-venmo (Plenmo), bill-split (Splitzy), plasma-predictions       |
| Payments      | EIP-712 router (ETH), EIP-3009 (Plasma gasless), ERC-721 NFT receipts |
| Testing       | pytest, Hardhat, Playwright                                           |
