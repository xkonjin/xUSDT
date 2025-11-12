#!/bin/bash

# Trillionaire Toy Store - Deployment Script
# This script deploys the game to Vercel

set -e

echo "🚀 Trillionaire Toy Store - Deployment Script"
echo "=============================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "⚠️  Not logged in to Vercel. Please run: vercel login"
    echo "   Opening browser for login..."
    vercel login
fi

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
V0_DIR="$PROJECT_DIR/v0"

echo ""
echo "📦 Building application..."
cd "$V0_DIR"
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""
echo "🌐 Deploying to Vercel..."
cd "$PROJECT_DIR"

# Deploy to production
vercel --prod --yes

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set up environment variables in Vercel Dashboard"
echo "2. Run database migrations"
echo "3. Seed toy catalog"
echo "4. Verify deployment at your Vercel URL"
echo ""
echo "🔗 View deployment: https://vercel.com/dashboard"

