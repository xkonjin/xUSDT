# Environment Variable Setup for Plasma SDK Apps

This document describes the required and optional environment variables for each MVP application.

## Quick Start

1. Copy the example variables below to a `.env.local` file in each app directory
2. Fill in the required values (marked with ⚠️)
3. Start the development server with `npm run dev`

---

## Bill Split (Splitzy) - Port 3004

Location: `apps/bill-split/.env.local`

```bash
# ⚠️ REQUIRED: Privy Authentication
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret

# ⚠️ REQUIRED: Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/plasma_bills

# ⚠️ REQUIRED: Gasless Transfer Relayer
RELAYER_PRIVATE_KEY=0x...your-relayer-private-key

# OPTIONAL: External Relayer Service
PLASMA_RELAYER_API=https://api.plasmachain.io/gasless/relay
PLASMA_RELAYER_SECRET=your-relayer-secret

# OPTIONAL: AI Receipt Scanning (GPT-4 Vision)
OPENAI_API_KEY=sk-...your-openai-key

# OPTIONAL: App URL for shareable links
NEXT_PUBLIC_APP_URL=http://localhost:3004
```

---

## Plasma Stream - Port 3003

Location: `apps/plasma-stream/.env.local`

```bash
# ⚠️ REQUIRED: Privy Authentication
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret

# OPTIONAL: Enable demo mode with sample streams
DEMO_MODE=false

# OPTIONAL: Gasless Transfer (for production)
RELAYER_PRIVATE_KEY=0x...your-relayer-private-key
PLASMA_RELAYER_API=https://api.plasmachain.io/gasless/relay
PLASMA_RELAYER_SECRET=your-relayer-secret

# OPTIONAL: App URL
NEXT_PUBLIC_APP_URL=http://localhost:3003
```

**Note:** Plasma Stream currently runs in demo mode - streams are not persisted and no actual funds are transferred.

---

## Plasma Venmo - Port 3002

Location: `apps/plasma-venmo/.env.local`

```bash
# ⚠️ REQUIRED: Privy Authentication
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret

# ⚠️ REQUIRED: Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/plasma_venmo

# ⚠️ REQUIRED: Gasless Transfer Relayer
RELAYER_PRIVATE_KEY=0x...your-relayer-private-key

# OPTIONAL: External Relayer Service
PLASMA_RELAYER_API=https://api.plasmachain.io/gasless/relay
PLASMA_RELAYER_SECRET=your-relayer-secret

# OPTIONAL: App URL for shareable links
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

---

## SubKiller - Port 3001

Location: `apps/subkiller/.env.local`

```bash
# ⚠️ REQUIRED: Google OAuth (for Gmail access)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ⚠️ REQUIRED: NextAuth Configuration
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3001

# OPTIONAL: Privy Wallet (for payments)
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id

# OPTIONAL: Payment Merchant Address
NEXT_PUBLIC_MERCHANT_ADDRESS=0x...merchant-wallet
MERCHANT_ADDRESS=0x...merchant-wallet

# OPTIONAL: Gasless Transfer Relayer
PLASMA_RELAYER_API=https://api.plasmachain.io/gasless/relay
PLASMA_RELAYER_SECRET=your-relayer-secret

# OPTIONAL: AI Categorization (GPT-4o-mini)
OPENAI_API_KEY=sk-...your-openai-key

# OPTIONAL: App URL
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

---

## Getting Credentials

### Privy (Authentication)
1. Go to https://console.privy.io/
2. Create a new application
3. Copy the App ID and App Secret
4. Configure allowed login methods (email, phone, social)

### Google OAuth (SubKiller Gmail Access)
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable the Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3001/api/auth/callback/google`
6. Copy the Client ID and Client Secret

### Database (PostgreSQL)
1. Install PostgreSQL locally or use a cloud provider
2. Create a new database for each app that requires it
3. Run Prisma migrations: `npx prisma migrate dev`

### OpenAI (AI Features)
1. Go to https://platform.openai.com/
2. Create an API key
3. Add billing (API usage requires payment)

### Relayer Wallet
1. Create a new Ethereum wallet for the relayer
2. Fund it with ETH on Plasma mainnet for gas
3. Use the private key for RELAYER_PRIVATE_KEY

---

## Running All Apps

From the monorepo root (`plasma-sdk/`):

```bash
# Install dependencies
npm install

# Build packages
npm run build

# Run individual apps
npm run dev --workspace=@plasma-pay/venmo      # Port 3002
npm run dev --workspace=@plasma-pay/stream     # Port 3003
npm run dev --workspace=@plasma-pay/bill-split # Port 3004
npm run dev --workspace=@plasma-pay/subkiller  # Port 3001
```

Or run all apps in parallel:

```bash
turbo dev
```

