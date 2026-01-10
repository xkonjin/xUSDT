# Splitzy Telegram Bot

A Telegram bot for bill splitting that uses AI to scan receipts, generates QR codes for payment, and accepts payments from any blockchain.

## Features

- **Receipt Scanning**: Send a photo of your receipt and AI extracts all items
- **Smart Splitting**: Split bills equally or assign items to specific people
- **QR Code Generation**: Generate payment QR codes for each participant
- **Cross-Chain Payments**: Accept payments from any chain via Jumper/deBridge
- **Zero Gas Fees**: All payments settle on Plasma USDT0 with zero gas

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Telegram      │     │   Splitzy Bot   │     │   Plasma Chain  │
│   User          │────▶│   (grammY)      │────▶│   (USDT0)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │
        │                        ▼
        │               ┌─────────────────┐
        │               │  OpenAI Vision  │
        │               │     (OCR)       │
        │               └─────────────────┘
        │
        ▼
┌─────────────────┐     ┌─────────────────┐
│  Payment Page   │────▶│  Bridge APIs    │
│  (QR Scan)      │     │  Jumper/deBridge│
└─────────────────┘     └─────────────────┘
```

## Setup

1. **Create a Telegram bot** via [@BotFather](https://t.me/BotFather)

2. **Install dependencies**:
   ```bash
   cd plasma-sdk/apps/splitzy-bot
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Required environment variables**:
   - `TELEGRAM_BOT_TOKEN` - Bot token from BotFather
   - `OPENAI_API_KEY` - For receipt scanning

5. **Run in development**:
   ```bash
   npm run dev
   ```

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and introduction |
| `/split` | Start a new bill split |
| `/wallet` | Connect or view your wallet |
| `/history` | View past bill splits |
| `/help` | Show available commands |
| `/cancel` | Cancel current operation |

## User Flow

### Bill Creator
1. Send receipt photo → Bot extracts items
2. Choose split count → Bot calculates shares
3. Name participants or get anonymous QR codes
4. Share QR codes with friends
5. Receive payments in your Plasma wallet

### Payer
1. Scan QR code or open payment link
2. Connect wallet (any chain supported)
3. Select token to pay with
4. Confirm payment
5. Bridge handles conversion to USDT0

## Project Structure

```
splitzy-bot/
├── src/
│   ├── index.ts           # Bot entry point
│   ├── types.ts           # Type definitions
│   ├── handlers/
│   │   ├── commands.ts    # /start, /help, etc.
│   │   ├── photo.ts       # Receipt photo handler
│   │   ├── split.ts       # Bill splitting flow
│   │   └── wallet.ts      # Wallet connection
│   └── services/
│       ├── ocr.ts         # OpenAI Vision OCR
│       ├── qr.ts          # QR code generator
│       ├── payment.ts     # Payment intent management
│       └── bridges/
│           ├── jumper.ts     # Li.Fi API client
│           ├── debridge.ts   # deBridge API client
│           └── aggregator.ts # Bridge aggregator
├── package.json
└── tsconfig.json
```

## Development

### Type Check
```bash
npm run typecheck
```

### Build
```bash
npm run build
```

### Run Production
```bash
npm start
```

## Webhook Deployment

For production, use webhooks instead of polling:

1. Set `TELEGRAM_WEBHOOK_URL` in environment
2. Set `TELEGRAM_WEBHOOK_SECRET` for verification
3. Deploy to a server with HTTPS
4. Bot will auto-configure webhook on start

## Database

The bot uses the shared `@plasma-pay/db` package with SQLite:

- `PaymentIntent` - Tracks pending payments
- `TelegramWallet` - Maps Telegram users to wallets
- `Bill` - Bill data with items and participants

## Bridge Integration

### Jumper (Li.Fi)
- Supports 20+ chains
- Best for EVM cross-chain swaps
- API: https://docs.li.fi/

### deBridge
- Fast execution
- Good Solana support
- API: https://docs.dln.trade/

The aggregator fetches quotes from both and selects the best rate.

## License

Private - Part of Plasma SDK

