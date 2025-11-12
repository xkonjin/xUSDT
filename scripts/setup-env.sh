#!/bin/bash

# Environment Setup Script for Vercel Deployment
# This script helps set up environment variables

set -e

echo "🔧 Trillionaire Toy Store - Environment Setup"
echo "=============================================="
echo ""

# Check if .env.local exists
if [ ! -f "v0/.env.local" ]; then
    echo "📝 Creating .env.local file..."
    cat > v0/.env.local << 'EOF'
# Database (Vercel Postgres)
DATABASE_URL=

# Redis (Upstash)
REDIS_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Blockchain
PLASMA_RPC=https://rpc.plasma.to
PLASMA_CHAIN_ID=9745
USDT0_ADDRESS=0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb
TOY_NFT_CONTRACT_ADDRESS=

# Merchant
MERCHANT_ADDRESS=
RELAYER_PRIVATE_KEY=
CLIENT_PRIVATE_KEY=

# Cron Jobs
CRON_SECRET=

# Optional
GAME_API_URL=http://127.0.0.1:8001
MERCHANT_URL=http://127.0.0.1:8000
EOF
    echo "✅ Created v0/.env.local"
else
    echo "ℹ️  .env.local already exists"
fi

echo ""
echo "📋 Please fill in the following environment variables:"
echo "   1. DATABASE_URL - Your PostgreSQL connection string"
echo "   2. REDIS_URL or UPSTASH_REDIS_REST_URL/TOKEN - Your Redis connection"
echo "   3. CRON_SECRET - A random secret string for cron job authentication"
echo "   4. MERCHANT_ADDRESS - Your merchant wallet address"
echo ""
echo "💡 You can also set these in Vercel Dashboard → Settings → Environment Variables"
echo ""

