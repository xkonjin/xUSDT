# xUSDT — x402 Agent-to-Agent Payments on Plasma

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
[![Hardhat](https://img.shields.io/badge/hardhat-2.26+-yellow.svg)](https://hardhat.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-teal.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black.svg)](https://nextjs.org/)

> Production-leaning reference implementation for x402-style agent-to-agent payments, enabling seamless USD₮/USD₮0 transactions across Ethereum and Plasma Layer 1.

🔗 **References**: [x402 Specification](https://github.com/coinbase/x402) | [Plasma Documentation](https://docs.plasma.to)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

xUSDT implements the [x402 payment protocol](https://github.com/coinbase/x402) for agent-to-agent (A2A) payments, supporting dual-network settlements:

- **Ethereum**: USD₮ via EIP-712 gasless router (pull payments)
- **Plasma (Layer 1)**: USD₮0 via EIP-3009 `transferWithAuthorization` (push payments)

The protocol enables machines and services to autonomously negotiate and execute payments without human intervention, using cryptographically signed authorizations.

### Supported Payment Flows

| Network | Token | Mechanism | Gasless | Status |
|---------|-------|-----------|---------|--------|
| Ethereum | USD₮ | EIP-712 Router | ✅ Relayer | ✅ Production |
| Plasma | USD₮0 | EIP-3009 | ✅ Gasless API | ✅ Production |
| Plasma | USD₮0 | NFT Receipt + Payment | ✅ Gasless API | ✅ Production |
| Arbitrum | USD₮ | Router (planned) | ✅ Relayer | 🚧 Beta |

---

## ✨ Key Features

### Core Payment Infrastructure
- **x402 Protocol Compliance**: Full implementation of PaymentRequired → PaymentSubmitted → PaymentCompleted handshake
- **Dual-Network Support**: Seamless payments on Ethereum and Plasma Layer 1
- **Gasless Transactions**: Plasma gasless API eliminates gas fees for users
- **EIP-3009 Integration**: Native support for `transferWithAuthorization` and `receiveWithAuthorization`

### Developer Experience
- **Drop-in SDK**: JavaScript SDK for easy frontend integration (`/sdk.js`)
- **FastAPI Backend**: High-performance Python merchant service with auto-generated docs
- **Next.js Demo App**: Complete reference implementation with wallet connection
- **Type Safety**: Full TypeScript support across frontend and SDK

### Advanced Features
- **NFT Receipts**: Automatic ERC-721 minting on successful payments
- **Payment Channels**: Batch settlement support for high-frequency micropayments
- **Rate Limiting**: Built-in protection against abuse (slowapi)
- **Polymarket Integration**: Prediction market betting via CLOB API
- **Plasma Predictions**: Native prediction market on Plasma chain

### Security & Reliability
- **Rate Limiting**: Per-endpoint rate limits (10-30 requests/minute)
- **Signature Verification**: EIP-712 typed data validation
- **Reentrancy Protection**: OpenZeppelin security standards
- **Environment Validation**: Pydantic settings with lazy loading
- **Transaction Receipts**: Persistent storage with fallback mechanisms

---

## 🏗️ Architecture

### System Overview

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        Browser[Browser/Wallet]
        SDK[Plasma SDK]
    end
    
    subgraph Frontend["Frontend Layer"]
        NextJS[Next.js v0 App]
        APIRoutes[API Routes /api/*]
    end
    
    subgraph Backend["Backend Layer"]
        FastAPI[FastAPI Merchant Service]
        Facilitator[Settlement Facilitator]
        Polymarket[Polymarket Router]
        Predictions[Predictions Router]
    end
    
    subgraph Blockchain["Blockchain Layer"]
        Plasma[Plasma L1<br/>USD₮0 / EIP-3009]
        Ethereum[Ethereum<br/>USD₮ / EIP-712]
        Polygon[Polygon<br/>Polymarket CTF]
    end
    
    subgraph Contracts["Smart Contracts"]
        Router[PaymentRouter]
        NFTRouter[MerchantNFTRouter]
        Channel[PlasmaPaymentChannel]
        ReceiptNFT[PlasmaReceipt721]
    end
    
    subgraph SDKLayer["Plasma SDK Monorepo"]
        Core[@plasma-pay/core]
        X402[@plasma-pay/x402]
        FacilitatorPkg[@plasma-pay/facilitator]
        Apps[Apps: Venmo, Predictions, Split, Stream]
    end
    
    Browser --> NextJS
    SDK --> APIRoutes
    NextJS --> APIRoutes
    APIRoutes --> FastAPI
    FastAPI --> Facilitator
    FastAPI --> Polymarket
    FastAPI --> Predictions
    Facilitator --> Plasma
    Facilitator --> Ethereum
    Polymarket --> Polygon
    Plasma --> Contracts
    Ethereum --> Router
    SDKLayer --> Client
```

### Payment Flow Sequence

```mermaid
sequenceDiagram
    participant U as User/Wallet
    participant UI as Next.js UI
    participant API as API Routes
    participant M as Merchant Service
    participant F as Facilitator
    subgraph Blockchain
        P as Plasma Network
        E as Ethereum
    end

    U->>UI: Request Premium Content
    UI->>API: GET /api/premium
    API->>M: GET /premium
    M-->>API: 402 PaymentRequired<br/>(amount, deadline, nonce)
    API-->>UI: 402 PaymentRequired
    UI-->>U: Show Payment Dialog
    
    U->>U: Sign EIP-3009/EIP-712<br/>(eth_signTypedData_v4)
    U->>UI: Submit Signature
    UI->>API: POST /api/pay
    API->>M: POST /pay
    M->>F: verify_and_settle()
    
    alt Plasma Network
        F->>P: transferWithAuthorization()
        P-->>F: Transaction Receipt
    else Ethereum Network
        F->>E: gaslessTransfer()
        E-->>F: Transaction Receipt
    end
    
    F-->>M: SettlementResult
    M-->>API: PaymentCompleted
    API-->>UI: PaymentCompleted
    UI-->>U: Content Unlocked
```

### Component Architecture

```mermaid
flowchart LR
    subgraph "Smart Contracts (Solidity)"
        PR[PaymentRouter.sol]
        PVR[PaymentRouter.v2.sol]
        MUSDT[MockUSDT.sol]
        PNR[PlasmaReceipt721.sol]
        MNR[MerchantNFTRouter.sol]
        PPC[PlasmaPaymentChannel.sol]
    end
    
    subgraph "Backend Services (Python)"
        MS[merchant_service.py<br/>FastAPI App]
        FAC[facilitator.py<br/>Settlement Logic]
        MA[merchant_agent.py<br/>Payment Logic]
        CA[client_agent.py<br/>Client SDK]
        PM[polymarket/<br/>Prediction Markets]
        PRED[predictions/<br/>Native Predictions]
    end
    
    subgraph "Frontend (TypeScript/React)"
        V0[v0/ Next.js App]
        CHECKOUT[checkout/page.tsx]
        COMPONENTS[UI Components]
        LIB[lib/ Helpers]
    end
    
    subgraph "SDK Monorepo"
        CORE[@plasma-pay/core]
        X402P[@plasma-pay/x402]
        FACP[@plasma-pay/facilitator]
        VENMO[plasma-venmo App]
        PREDAPP[plasma-predictions App]
    end
    
    PR --> MS
    MNR --> FAC
    MS --> FAC
    MS --> MA
    MS --> PM
    MS --> PRED
    MA --> CA
    V0 --> MS
    COMPONENTS --> LIB
    CORE --> VENMO
    X402P --> PREDAPP
```

---

## 🛠️ Tech Stack

### Smart Contracts
| Technology | Version | Purpose |
|------------|---------|---------|
| Solidity | ^0.8.24 | Smart contract language |
| Hardhat | ^2.26.3 | Development environment |
| OpenZeppelin | ^4.9.6 | Security standards |
| Ethers.js | ^6 | Blockchain interaction |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11+ | Runtime |
| FastAPI | ^0.115.5 | Web framework |
| Web3.py | ^6.19.0 | Ethereum interaction |
| Pydantic | ^2.7.1 | Data validation |
| SlowAPI | ^0.1.9 | Rate limiting |
| Uvicorn | ^0.32.0 | ASGI server |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | ^16.0.0 | React framework |
| React | ^19.2.0 | UI library |
| TypeScript | ^5.0.0 | Type safety |
| Viem | ^2.9.4 | Web3 interactions |
| Framer Motion | ^12.23.24 | Animations |
| Sentry | ^10.38.0 | Error tracking |

### SDK & Tools
| Technology | Version | Purpose |
|------------|---------|---------|
| pnpm | 10.0.0 | Package manager |
| Turbo | ^2.3.0 | Monorepo tasks |
| Playwright | ^1.48.0 | E2E testing |
| ESLint | ^8.57.1 | Code linting |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- pnpm (for SDK monorepo)
- A wallet with test USD₮0 on Plasma

### 10-Minute Demo

1. **Start the Merchant Service** (Plasma network):
```bash
# Set environment variables
export PYTHONPATH=.
export PLASMA_RPC=https://rpc.plasma.to
export PLASMA_CHAIN_ID=9745
export ETH_RPC=https://ethereum.publicnode.com
export MERCHANT_ADDRESS=0xYourMerchantAddress
export RELAYER_PRIVATE_KEY=0xYourRelayerKey
export CLIENT_PRIVATE_KEY=0xYourClientKey
export PREFER_PLASMA=true

# Start the server
uvicorn agent.merchant_service:app --host 127.0.0.1 --port 8000
```

2. **Start the Next.js Frontend**:
```bash
cd v0 && npm run dev
# Open http://localhost:3000/checkout
```

3. **In the UI**:
   - Connect your wallet
   - Click "Request Resource" (402 response)
   - Sign the EIP-3009 authorization
   - Re-request to see 200 when unlocked

### API Quick Test

Request an invoice:
```bash
curl -s "http://127.0.0.1:8000/premium" | jq
```

Submit payment (after signing):
```bash
curl -s -X POST "http://127.0.0.1:8000/pay" \
  -H 'content-type: application/json' \
  -d '{
    "type": "payment-submitted",
    "invoiceId": "...",
    "chosenOption": {...},
    "signature": {"v": 27, "r": "0x...", "s": "0x..."},
    "scheme": "eip3009-transfer-with-auth"
  }' | jq
```

---

## 📦 Installation

### Clone and Setup

```bash
# Clone the repository
git clone https://github.com/xkonjin/xUSDT.git
cd xUSDT

# Setup Python environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Install contract dependencies
npm ci

# Setup frontend
cd v0 && npm ci && cd ..

# Setup SDK monorepo (optional)
cd plasma-sdk && pnpm install && cd ..
```

### Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your values (see [Configuration](#configuration) for details).

---

## ⚙️ Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ETH_RPC` | Ethereum mainnet RPC URL | `https://ethereum.publicnode.com` |
| `PLASMA_RPC` | Plasma L1 RPC URL | `https://rpc.plasma.to` |
| `PLASMA_CHAIN_ID` | Plasma chain ID | `9745` |
| `USDT_ADDRESS` | USDT on Ethereum | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |
| `USDT0_ADDRESS` | USD₮0 on Plasma | `0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb` |
| `MERCHANT_ADDRESS` | Your merchant EOA | `0x...` |
| `RELAYER_PRIVATE_KEY` | Relayer private key | `0x...` |
| `CLIENT_PRIVATE_KEY` | Test client key | `0x...` |
| `ROUTER_ADDRESS` | PaymentRouter contract | `0x...` |

### Optional Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PREFER_PLASMA` | Prefer Plasma for payments | `false` |
| `NFT_MINT_ON_PAY` | Mint NFT receipts | `false` |
| `CHANNEL_ADDRESS` | Payment channel contract | `null` |
| `PLASMA_RELAYER_SECRET` | Gasless API secret | `null` |
| `USE_GASLESS_API` | Enable gasless transactions | `true` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000` |

### Frontend Environment Variables (v0/.env.local)

```env
NEXT_PUBLIC_PLASMA_RPC=https://rpc.plasma.to
NEXT_PUBLIC_PLASMA_CHAIN_ID=9745
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional integrations
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OPENAI_API_KEY=sk-xxxxxxxx
```

---

## 📖 Usage

### Using the Drop-in SDK

Include the SDK on any webpage:
```html
<input id="cart-total" value="0.10" />
<button data-plasma-pay 
        data-server="http://127.0.0.1:8000" 
        data-amount-selector="#cart-total">
  Pay with Plasma
</button>

<script src="http://127.0.0.1:8000/sdk.js" data-server="http://127.0.0.1:8000"></script>
```

### Programmatic JavaScript Integration

```javascript
async function plasmaPayTotal(serverBase, amountDec) {
  if (!window.ethereum) throw new Error('No wallet available');
  const [buyer] = await ethereum.request({ method: 'eth_requestAccounts' });

  // 1. Build typed data
  const checkout = await fetch(serverBase + '/router/checkout_total', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ buyer, amountDecimal: amountDec })
  }).then(r => r.json());

  // 2. Check allowance and approve if needed
  // ... allowance check code ...

  // 3. Sign and relay
  const signature = await ethereum.request({
    method: 'eth_signTypedData_v4',
    params: [buyer, JSON.stringify({
      domain: checkout.domain,
      types: checkout.types,
      primaryType: 'Transfer',
      message: checkout.message
    })]
  });

  const result = await fetch(serverBase + '/router/relay_total', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      buyer,
      amount: checkout.amount,
      deadline: checkout.deadline,
      signature
    })
  }).then(r => r.json());

  return result;
}
```

### Running Tests

```bash
# Smart contract tests
npx hardhat test

# Python backend tests
pytest

# Frontend type checking
cd v0 && npm run typecheck

# SDK tests
cd plasma-sdk && pnpm test
```

### Contract Deployment

```bash
# Compile contracts
npm run build

# Deploy to Plasma
npx hardhat run deploy/deploy.js --network plasma

# Deploy to Ethereum mainnet
npx hardhat run deploy/deploy.js --network mainnet
```

---

## 🔌 API Reference

### Merchant Endpoints

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| GET | `/health` | Health check | - |
| GET | `/premium` | Get premium invoice (402) | 30/min |
| GET | `/product/{sku}` | Get product invoice | - |
| POST | `/pay` | Submit payment | 10/min |
| GET | `/invoice/{id}` | Check invoice status | - |
| POST | `/router/checkout_total` | Build EIP-712 data | - |
| POST | `/router/relay_total` | Relay signed tx | 5/min |
| GET | `/premium-nft` | NFT payment invoice | 30/min |
| POST | `/pay-nft` | Submit NFT payment | 10/min |

### Channel Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/channel/receipt` | Submit signed receipt |
| POST | `/channel/settle` | Batch settle receipts |
| GET | `/channel/diag` | Channel diagnostics |

### Polymarket Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/polymarket/markets` | List active markets |
| GET | `/polymarket/markets/{id}` | Market details |
| POST | `/polymarket/predict` | Submit prediction |
| GET | `/polymarket/predictions` | Prediction history |

### Predictions Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/predictions/markets` | List Plasma markets |
| POST | `/predictions/bet` | Place bet (gasless) |
| POST | `/predictions/cashout` | Cash out position |
| GET | `/predictions/bets` | User's bets |
| GET | `/predictions/leaderboard` | Top predictors |

### Message Schemas (x402 Protocol)

**PaymentRequired**:
```json
{
  "type": "payment-required",
  "invoiceId": "uuid",
  "timestamp": 1234567890,
  "paymentOptions": [...],
  "description": "Premium API access"
}
```

**PaymentSubmitted**:
```json
{
  "type": "payment-submitted",
  "invoiceId": "uuid",
  "chosenOption": {...},
  "signature": {"v": 27, "r": "0x...", "s": "0x..."},
  "scheme": "eip3009-transfer-with-auth"
}
```

**PaymentCompleted**:
```json
{
  "type": "payment-completed",
  "invoiceId": "uuid",
  "txHash": "0x...",
  "network": "plasma",
  "status": "confirmed",
  "receipt": {...}
}
```

---

## 📁 Project Structure

```
xUSDT/
├── agent/                      # Python FastAPI backend
│   ├── merchant_service.py     # Main API endpoints
│   ├── facilitator.py          # Settlement orchestration
│   ├── merchant_agent.py       # Payment logic
│   ├── client_agent.py         # Client SDK
│   ├── x402_models.py          # Pydantic models
│   ├── config.py               # Environment configuration
│   ├── crypto.py               # EIP-712 helpers
│   ├── polymarket/             # Polymarket integration
│   ├── predictions/            # Plasma predictions
│   └── static/                 # SDK files (sdk.js, demo.html)
├── contracts/                  # Solidity smart contracts
│   ├── PaymentRouter.sol       # Main payment router
│   ├── PaymentRouter.v2.sol    # V2 with enhancements
│   ├── MockUSDT.sol            # Test token
│   └── plasma/                 # Plasma-specific contracts
│       ├── PlasmaReceipt721.sol
│       ├── MerchantNFTRouter.sol
│       └── PlasmaPaymentChannel.sol
├── v0/                         # Next.js demo application
│   ├── src/app/                # App router pages
│   │   ├── api/                # API route handlers
│   │   ├── checkout/           # Checkout page
│   │   └── lib/                # Helper libraries
│   └── src/components/         # React components
├── plasma-sdk/                 # SDK monorepo
│   ├── packages/               # Core packages
│   │   ├── core/               # @plasma-pay/core
│   │   ├── x402/               # @plasma-pay/x402
│   │   ├── facilitator/        # Settlement helpers
│   │   └── ...                 # Additional packages
│   └── apps/                   # Example applications
│       ├── plasma-venmo/       # Venmo-like P2P payments
│       ├── plasma-predictions/ # Prediction markets
│       ├── bill-split/         # Bill splitting app
│       └── ...                 # Additional apps
├── deploy/                     # Deployment scripts
├── scripts/                    # Utility scripts
├── tests/                      # Python tests
├── test/                       # Hardhat tests
├── requirements.txt            # Python dependencies
├── package.json                # Node.js dependencies
├── hardhat.config.js           # Hardhat configuration
└── README.md                   # This file
```

---

## 🔐 Security

### Best Practices
- **Never commit private keys**: `.gitignore` excludes `.env`
- **Rate limiting**: All sensitive endpoints have rate limits
- **Input validation**: Pydantic models validate all inputs
- **Signature verification**: EIP-712 signatures validated on-chain
- **CORS restrictions**: Configurable allowed origins
- **Recipient validation**: Server checks `recipient == MERCHANT_ADDRESS`

### Contract Security
- OpenZeppelin standards for all contracts
- Reentrancy guards on payment functions
- Access control for admin functions
- Deadline validation to prevent replay attacks
- Nonce tracking to prevent double-spending

### Audit Status
- Security audit completed (see `SECURITY_AUDIT.md`)
- EIP-3009 robustness analysis (see `EIP3009_ROBUSTNESS.md`)
- Known issues tracked in GitHub Issues

---

## 🧪 Troubleshooting

| Issue | Solution |
|-------|----------|
| 402 loops | You haven't submitted a valid PaymentSubmitted yet. Sign again within the deadline. |
| ERC20: transfer amount exceeds balance | Fund your payer wallet with enough USDT0. |
| 422 from `/pay` | Payload missing fields. Send full PaymentSubmitted object. |
| 500 from `/pay` | Check server logs. Web3 types are normalized for JSON safety. |
| Rate limit exceeded | Wait before retrying. Limits: 10/min for /pay, 30/min for /premium. |
| Gasless API failure | Check PLASMA_RELAYER_SECRET configuration. Falls back to relayer wallet. |

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `pytest` and `npx hardhat test`
5. Run linting: `npm run lint` and `solhint 'contracts/**/*.sol'`
6. Commit with conventional commits: `git commit -m "feat: add amazing feature"`
7. Push to your fork: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Commit Convention
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style (formatting, semicolons, etc)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Build process or auxiliary tool changes

### Code Style
- Python: PEP 8 with Black formatter
- Solidity: Solhint with OpenZeppelin style
- TypeScript: ESLint with Next.js config

### Testing Requirements
- All new features must include tests
- Maintain >80% code coverage
- E2E tests for UI flows using Playwright

---

## 📜 License

This project is licensed under the [ISC License](https://opensource.org/licenses/ISC).

```
Copyright (c) 2025

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

---

## 🙏 Acknowledgments

- [Coinbase x402](https://github.com/coinbase/x402) - The x402 payment protocol specification
- [Plasma](https://plasma.to) - Layer 1 blockchain for stablecoin payments
- [OpenZeppelin](https://openzeppelin.com) - Security standards for smart contracts
- [Polymarket](https://polymarket.com) - Prediction market integration

---

## 📞 Support

- **Documentation**: [Plasma Docs](https://docs.plasma.to)
- **Issues**: [GitHub Issues](https://github.com/xkonjin/xUSDT/issues)
- **Discussions**: [GitHub Discussions](https://github.com/xkonjin/xUSDT/discussions)

---

<p align="center">
  Built with ❤️ for the future of agent-to-agent payments
</p>
