# xUSDT — x402 Agent-to-Agent Payments on Plasma & Ethereum

A production-ready reference implementation for **x402-style agent-to-agent payments** with a complete **Trillionaire Toy Store Game** built on top. This project demonstrates dual-network payment processing (Ethereum + Plasma Layer 1) using EIP-712 and EIP-3009 standards, combined with an engaging NFT-based gaming experience.

## 🎯 Overview

**xUSDT** implements the [x402 payment protocol](https://github.com/coinbase/x402) for seamless agent-to-agent transactions:

- **Ethereum**: USD₮ via EIP-712 gasless router (pull payments)
- **Plasma Layer 1**: USD₮0 via EIP-3009 `transferWithAuthorization` (push payments)

The project includes a full-stack **Trillionaire Toy Store Game** where players:
- Purchase NFT toys using x402 payments
- Play skill-based games to earn points
- Compete on leaderboards for weekly prizes
- Strategically equip toys to maximize multipliers
- Trade toys in a dynamic marketplace

## ✨ Features

### Payment System (x402 Protocol)
- ✅ **x402 Handshake**: PaymentRequired → PaymentSubmitted → PaymentCompleted
- ✅ **Dual-network invoices**: Ethereum + Plasma with fee hints
- ✅ **EIP-712 signing**: Gasless payment authorization
- ✅ **EIP-3009 support**: Transfer with authorization on Plasma
- ✅ **Merchant FastAPI service**: Production-ready payment processing
- ✅ **Settlement orchestrator**: Automated transaction verification and settlement
- ✅ **NFT receipt minting**: Optional ERC-721 receipts for payments

### Game System
- ✅ **7 game types**: Reaction Time, Dice Roll, Memory Match, Precision Click, Pattern Recognition, Card Draw, Wheel Spin
- ✅ **NFT toy collection**: Purchase and collect rare toys with unique stats
- ✅ **Strategic squad system**: Equip up to 3 toys for gameplay bonuses
- ✅ **Daily bonuses**: Rotating "Games of the Day" with toy-specific multipliers
- ✅ **Weekly prizes**: Automated USDT0 distribution to top players
- ✅ **Leaderboards**: Weekly, monthly, and all-time rankings
- ✅ **Marketplace**: Buy and sell toys based on daily bonuses
- ✅ **Player profiles**: Wallet-based identity with nickname registration
- ✅ **Inventory management**: Equip/unequip toys with visual feedback

### Technical Stack
- **Backend**: FastAPI (Python) with SQLAlchemy + Alembic migrations
- **Frontend**: Next.js 16 with React 19, TypeScript, Framer Motion
- **Blockchain**: Solidity contracts (Hardhat), Web3.py, ethers.js
- **Database**: PostgreSQL (Vercel Postgres compatible)
- **Caching**: Redis/Upstash for session and leaderboard data
- **Deployment**: Vercel-ready with serverless functions and cron jobs

## 🚀 Quick Start

### Prerequisites
- Python 3.10+ with `pip`
- Node.js 18+ with `npm`
- PostgreSQL database (or Vercel Postgres)
- Redis instance (or Upstash Redis)
- Wallet with USDT0 on Plasma network

### 1. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd xUSDT

# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies (root)
npm ci

# Install Next.js dependencies
cd v0 && npm ci && cd ..
```

### 2. Configure Environment

Copy `env.example` to `.env` and configure:

```bash
# Blockchain Configuration
ETH_RPC=https://ethereum.publicnode.com
PLASMA_RPC=https://rpc.plasma.to
ETH_CHAIN_ID=1
PLASMA_CHAIN_ID=9745

# Token Addresses
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
USDT0_ADDRESS=0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb
USDT0_NAME=USDTe
USDT0_VERSION=1

# Merchant Configuration
MERCHANT_ADDRESS=0xYourMerchantEOA
RELAYER_PRIVATE_KEY=0x...  # Never commit!
CLIENT_PRIVATE_KEY=0x...   # Never commit!

# Payment Preferences
PREFER_PLASMA=true
PLATFORM_FEE_BPS=10

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Redis
REDIS_URL=redis://...  # or UPSTASH_REDIS_REST_URL for Upstash

# Cron Jobs (Vercel)
CRON_SECRET=your-secret-key

# NFT Configuration (Optional)
NFT_CONTRACT=0x...
NFT_BASE_URI=https://...
NFT_MINT_ON_PAY=false
```

### 3. Initialize Database

```bash
# Run migrations and seed initial data
python scripts/init_db.py
```

This will:
- Create all database tables (players, toys, games, inventory, etc.)
- Seed the toy catalog with initial NFT toys
- Set up daily bonus rotation tables

### 4. Start Services

**Terminal 1 - Merchant Service (FastAPI):**
```bash
export PYTHONPATH=.
uvicorn agent.merchant_service:app --host 127.0.0.1 --port 8000
```

**Terminal 2 - Next.js Frontend:**
```bash
cd v0 && npm run dev
# Open http://localhost:3000
```

### 5. Play the Game

1. **Connect Wallet**: Visit `http://localhost:3000/onboard` and connect your Rabby wallet
2. **Register**: Choose a nickname and complete onboarding
3. **Purchase Toys**: Visit `/marketplace` and buy toys using x402 payments
4. **Equip Toys**: Go to `/inventory` and equip up to 3 toys
5. **Play Games**: Visit `/play` and select a game (check "Games of the Day" for bonuses!)
6. **Earn Points**: Complete games to earn points and climb the leaderboard
7. **Check Rankings**: Visit `/leaderboard` to see your position

## 📖 Architecture

### System Overview

```mermaid
flowchart TB
    subgraph "Frontend (Next.js)"
        UI[React UI] --> API[API Routes]
        API --> DB[(PostgreSQL)]
        API --> Redis[(Redis)]
    end
    
    subgraph "Backend (FastAPI)"
        Merchant[Merchant Service] --> Facilitator[Settlement Orchestrator]
        Merchant --> GameDB[(Game Database)]
    end
    
    subgraph "Blockchain"
        Facilitator --> Plasma[Plasma USDT0]
        Facilitator --> Ethereum[Ethereum USDT]
        UI --> Wallet[Rabby Wallet]
    end
    
    UI --> Merchant
    Wallet --> Plasma
    Wallet --> Ethereum
```

### Payment Flow (EIP-3009)

```mermaid
sequenceDiagram
    participant U as User/Browser
    participant N as Next.js API
    participant M as Merchant (FastAPI)
    participant F as Facilitator
    participant P as Plasma (USDT0)

    U->>N: GET /api/premium (or game endpoint)
    N->>M: GET /premium
    M-->>N: 402 PaymentRequired (invoiceId, amount, deadline)
    N-->>U: 402 PaymentRequired
    
    U->>U: Sign EIP-3009 (eth_signTypedData_v4)
    U->>N: POST /api/pay (PaymentSubmitted)
    N->>M: POST /pay
    
    M->>F: verify_and_settle()
    F->>P: transferWithAuthorization(...)
    P-->>F: Transaction receipt
    F-->>M: PaymentCompleted (txHash)
    M-->>N: PaymentCompleted
    N-->>U: PaymentCompleted
    
    U->>N: GET /api/premium?invoiceId=...
    N->>M: GET /premium?invoiceId=...
    M-->>N: 200 OK (resource granted)
    N-->>U: 200 OK
```

### Game Flow

```mermaid
sequenceDiagram
    participant P as Player
    participant UI as Next.js UI
    participant API as API Routes
    participant DB as Database
    participant BC as Blockchain

    P->>UI: Connect Wallet
    UI->>API: POST /api/game/players/register
    API->>DB: Create player record
    
    P->>UI: Browse Marketplace
    UI->>API: GET /api/game/toys
    API->>DB: Fetch toy catalog
    
    P->>UI: Purchase Toy
    UI->>BC: x402 Payment Flow
    BC-->>UI: PaymentCompleted
    UI->>API: POST /api/game/toys/purchase
    API->>DB: Add toy to inventory
    
    P->>UI: Equip Toys
    UI->>API: POST /api/game/players/[address]/inventory/equip
    API->>DB: Update equipped slots
    
    P->>UI: Play Game
    UI->>API: POST /api/game/games/start
    API->>DB: Create game session
    
    P->>UI: Submit Result
    UI->>API: POST /api/game/games/submit
    API->>DB: Calculate points (with multipliers)
    API->>DB: Update leaderboard
    API-->>UI: Points earned
```

## 🔌 API Reference

### Merchant Service (FastAPI)

**Base URL**: `http://127.0.0.1:8000`

#### Health Check
```http
GET /health
```
Returns: `{ "ok": true, "ts": 1234567890 }`

#### Request Invoice (402 Payment Required)
```http
GET /premium
GET /premium?invoiceId=<existing-invoice-id>
```
- Returns `402 PaymentRequired` with invoice details
- Returns `200 OK` if `invoiceId` is provided and payment confirmed

#### Submit Payment
```http
POST /pay
Content-Type: application/json

{
  "type": "payment-submitted",
  "invoiceId": "...",
  "chosenOption": {
    "network": "plasma",
    "amount": "100000",
    "token": "USDT0",
    ...
  },
  "signature": {
    "v": 27,
    "r": "0x...",
    "s": "0x..."
  },
  "scheme": "eip3009-transfer-with-auth"
}
```

#### Check Invoice Status
```http
GET /invoice/{invoiceId}
```
Returns: `{ "status": "pending" | "confirmed", ... }`

### Game API (Next.js)

**Base URL**: `http://localhost:3000/api`

#### Toys
- `GET /game/toys` - List all available toys
- `GET /game/toys/[id]/invoice` - Get payment invoice for toy
- `POST /game/toys/purchase` - Purchase toy after payment

#### Players
- `POST /game/players/register` - Register new player
- `GET /game/players/[address]` - Get player profile
- `GET /game/players/[address]/inventory` - Get player inventory
- `POST /game/players/[address]/inventory/equip` - Equip toy
- `POST /game/players/[address]/inventory/unequip` - Unequip toy

#### Games
- `POST /game/games/start` - Start game session
- `POST /game/games/submit` - Submit game result
- `GET /game/games-of-the-day` - Get today's featured games and bonuses
- `GET /game/daily-bonuses` - Get all daily bonuses

#### Leaderboard
- `GET /game/leaderboard?period=weekly|monthly|alltime` - Get rankings

#### Cron Jobs (Vercel)
- `GET /cron/daily-bonuses` - Generate daily bonuses (runs at midnight UTC)
- `GET /cron/weekly-prizes` - Distribute weekly prizes (runs weekly)

## 🎮 Game Mechanics

### Toy System

**Rarity Tiers:**
- **Common**: Base stats ~10-20 per category
- **Rare**: Base stats ~15-30 per category (1.5x multiplier)
- **Epic**: Base stats ~20-40 per category (2.0x multiplier)
- **Legendary**: Base stats ~30-60 per category (3.0x multiplier)

**Equipping System:**
- Players can equip up to **3 toys** simultaneously
- Only equipped toys provide bonuses during gameplay
- Toys can be equipped/unequipped freely at any time

### Multiplier System

**Base Multiplier** (Always Active):
```
Base Multiplier = 1.0 + (Sum of all equipped toys' stats × 0.01)
```
- Applies to ALL games
- Rewards players with strong toy collections
- 1% per stat point

**Daily Multiplier** (Game-Specific):
```
Daily Multiplier = Highest multiplier from equipped toys matching current game
```
- Only applies to "Games of the Day"
- Ranges from 1.5x to 3.0x
- Requires matching toy bonus for the current game

**Final Points Calculation:**
```
Final Points = Base Points × Toy Multiplier × Daily Bonus Multiplier × Wager Multiplier
```

### Games of the Day

Each day at midnight UTC:
- **2 random games** are selected as "Games of the Day"
- **3-5 toy types** receive bonuses for those games
- Players who equip matching toys get daily multipliers
- Marketplace prices fluctuate based on daily bonuses

See [TOY_GAME_MECHANICS.md](./TOY_GAME_MECHANICS.md) for detailed strategy guide.

## 📁 Project Structure

```
xUSDT/
├── agent/                    # FastAPI backend services
│   ├── merchant_service.py   # Main FastAPI app (x402 endpoints)
│   ├── merchant_agent.py    # Payment logic and invoice management
│   ├── facilitator.py       # Settlement orchestrator (blockchain interaction)
│   ├── crypto.py            # EIP-712/EIP-3009 signing and verification
│   ├── game_service.py      # Game logic and point calculations
│   ├── marketplace_service.py  # Marketplace operations
│   ├── game_db.py           # Database models (SQLAlchemy)
│   ├── config.py            # Configuration management (Pydantic Settings)
│   ├── x402_models.py       # x402 protocol message models
│   ├── migrations/          # Alembic database migrations
│   │   ├── 001_initial_schema.py
│   │   ├── 002_seed_toys.py
│   │   └── 003_add_game_specific_bonuses.py
│   └── games/
│       └── game_engine.py   # Game engine implementations
│
├── contracts/               # Solidity smart contracts
│   ├── PaymentRouter.sol    # EIP-712 gasless router (Ethereum)
│   ├── MockUSDT.sol        # Mock USDT for testing
│   └── plasma/
│       ├── PlasmaPaymentRouter.sol    # Plasma payment router
│       └── PlasmaPaymentChannel.sol   # Payment channels
│
├── v0/                      # Next.js frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/         # API routes (Next.js serverless functions)
│   │   │   │   ├── game/    # Game API endpoints
│   │   │   │   └── cron/    # Cron job endpoints
│   │   │   ├── play/        # Game selection page
│   │   │   ├── inventory/  # Inventory management page
│   │   │   ├── marketplace/ # Marketplace page
│   │   │   ├── leaderboard/ # Leaderboard page
│   │   │   └── onboard/     # Player onboarding
│   │   ├── components/
│   │   │   ├── games/       # Game component implementations
│   │   │   └── ui/          # Reusable UI components
│   │   └── lib/
│   │       ├── api/         # API client utilities
│   │       ├── wallet.ts    # Wallet connection logic
│   │       └── toys.ts      # Toy data utilities
│   └── __tests__/           # Jest + Playwright tests
│
├── scripts/                 # Utility scripts
│   ├── init_db.py          # Database initialization
│   ├── deploy.js            # Contract deployment
│   └── client_http.py       # HTTP client examples
│
├── tests/                   # Python tests (pytest)
│   ├── test_crypto.py       # Crypto/signing tests
│   └── test_fees.py         # Fee calculation tests
│
├── test/                    # Hardhat contract tests
│   ├── PaymentRouter.spec.js
│   └── PlasmaPaymentChannel.spec.js
│
├── requirements.txt         # Python dependencies
├── package.json             # Node.js dependencies (Hardhat)
├── hardhat.config.js        # Hardhat configuration
├── vercel.json              # Vercel deployment config
└── env.example              # Environment variable template
```

## 🛠️ Development

### Running Tests

**Python Tests:**
```bash
pytest tests/
```

**Contract Tests:**
```bash
npm test
```

**Frontend Tests:**
```bash
cd v0
npm run test          # Unit tests (Jest)
npm run test:e2e      # E2E tests (Playwright)
npm run test:all      # All tests
```

### Database Migrations

**Create new migration:**
```bash
cd agent
alembic revision --autogenerate -m "description"
```

**Apply migrations:**
```bash
alembic upgrade head
```

**Rollback:**
```bash
alembic downgrade -1
```

### Compiling Contracts

```bash
npm run build  # or: npx hardhat compile
```

### Code Quality

**Python:**
- Follow PEP 8 style guide
- Use type hints
- Add docstrings for public functions

**TypeScript:**
- Use strict mode
- Follow ESLint rules (Next.js config)
- Add JSDoc comments for complex functions

## 🚢 Deployment

### Vercel Deployment

1. **Set up Vercel Postgres**:
   - Create database in Vercel dashboard
   - Copy `DATABASE_URL` to environment variables

2. **Set up Upstash Redis**:
   - Create Redis instance in Upstash
   - Copy `UPSTASH_REDIS_REST_URL` to environment variables

3. **Configure Environment Variables**:
   - Add all variables from `env.example` to Vercel project settings
   - Set `CRON_SECRET` for cron job authentication

4. **Deploy**:
   ```bash
   vercel --prod
   ```

5. **Run Migrations**:
   ```bash
   # After deployment, run migrations via Vercel CLI or script
   python scripts/init_db.py
   ```

6. **Verify Cron Jobs**:
   - Check Vercel dashboard → Cron Jobs
   - Verify `/api/cron/daily-bonuses` runs daily at midnight UTC
   - Verify `/api/cron/weekly-prizes` runs weekly

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment guide.

## 🔒 Security Notes

### Private Keys
- **Never commit private keys** to version control
- `.gitignore` excludes `.env` files
- Use environment variables or secure key management in production
- `RELAYER_PRIVATE_KEY` and `CLIENT_PRIVATE_KEY` are sensitive

### Payment Security
- Server validates `recipient == MERCHANT_ADDRESS`
- Amount, decimals, and deadlines are verified
- EIP-712 signatures prevent replay attacks
- Nonce tracking prevents duplicate payments

### API Security
- Cron jobs require `CRON_SECRET` authentication
- Database queries use parameterized statements (SQLAlchemy)
- CORS configured for production domains
- Rate limiting recommended for production

## 📚 Documentation

- **[TOY_GAME_MECHANICS.md](./TOY_GAME_MECHANICS.md)** - Detailed game mechanics and strategy guide
- **[GAME_IMPLEMENTATION_SUMMARY.md](./GAME_IMPLEMENTATION_SUMMARY.md)** - Game system implementation details
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment guide for Vercel
- **[x402 Specification](https://github.com/coinbase/x402)** - Official x402 protocol documentation
- **[Plasma Documentation](https://docs.plasma.to/)** - Plasma blockchain documentation

## 🐛 Troubleshooting

### Payment Issues

**402 Payment Required loops:**
- Ensure you POST a valid `PaymentSubmitted` with correct signature
- Check that signature deadline hasn't expired
- Verify wallet has sufficient USDT0 balance

**ERC20: transfer amount exceeds balance:**
- Fund payer wallet with enough USDT0 on Plasma network
- Check token address is correct (`USDT0_ADDRESS`)

**422 from `/pay`:**
- Ensure `PaymentSubmitted` includes all required fields
- Verify `chosenOption` matches invoice options
- Check signature format (v, r, s fields)

### Database Issues

**Migration errors:**
- Ensure PostgreSQL is running and accessible
- Check `DATABASE_URL` is correct
- Run `alembic upgrade head` to apply pending migrations

**Connection errors:**
- Verify database credentials
- Check network connectivity
- Ensure database allows connections from your IP

### Frontend Issues

**Wallet connection fails:**
- Ensure Rabby wallet extension is installed
- Check browser console for errors
- Verify network is set to Plasma (Chain ID 9745)

**API errors:**
- Check merchant service is running on port 8000
- Verify API routes are correctly configured
- Check browser network tab for detailed error messages

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make changes with clear commits
3. Add tests for new functionality
4. Update documentation as needed
5. Submit pull request with description

## 📄 License

ISC License

## 🙏 Acknowledgments

- [x402 Protocol](https://github.com/coinbase/x402) by Coinbase
- [Plasma](https://plasma.to/) Layer 1 blockchain
- [OpenZeppelin](https://openzeppelin.com/) for secure smart contracts

---

**© 2025** — Built with ❤️ for the x402 ecosystem

**Plasma** is a Layer 1 blockchain. Use **USD₮/USD₮0** naming consistently throughout.
