#!/bin/bash

# Plenmo Pre-Flight Check Script
# Verifies all requirements before Vercel deployment

set -e

echo "======================================"
echo "Plenmo Pre-Flight Check"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        exit 1
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Initialize error flag
ERRORS=0

# 1. Check Node version
echo "1. Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    print_status 0 "Node.js version: $(node -v)"
else
    print_status 1 "Node.js version must be 18 or higher (found: $(node -v))"
fi

# 2. Check npm
echo ""
echo "2. Checking npm..."
if command -v npm &> /dev/null; then
    print_status 0 "npm version: $(npm -v)"
else
    print_status 1 "npm not found"
fi

# 3. Check git
echo ""
echo "3. Checking git..."
if command -v git &> /dev/null; then
    print_status 0 "git version: $(git --version | cut -d' ' -f3)"
else
    print_status 1 "git not found"
fi

# 4. Check git status
echo ""
echo "4. Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Git working directory is not clean"
    echo "  Uncommitted changes:"
    git status --short
    ERRORS=$((ERRORS+1))
else
    print_status 0 "Git working directory is clean"
fi

# 5. Check current branch
echo ""
echo "5. Checking current branch..."
CURRENT_BRANCH=$(git branch --show-current)
echo "  Current branch: $CURRENT_BRANCH"
if [ "$CURRENT_BRANCH" = "main" ]; then
    print_status 0 "On main branch"
else
    print_warning "Not on main branch (current: $CURRENT_BRANCH)"
    ERRORS=$((ERRORS+1))
fi

# 6. Check dependencies
echo ""
echo "6. Checking dependencies..."
if [ -d "node_modules" ]; then
    print_status 0 "Dependencies installed"

    # Check critical packages
    echo "  Checking critical packages..."

    if [ -d "node_modules/@upstash/redis" ]; then
        print_status 0 "  @upstash/redis installed"
    else
        print_warning "  @upstash/redis not found (rate limiting may not work)"
        ERRORS=$((ERRORS+1))
    fi

    if [ -d "node_modules/next" ]; then
        print_status 0 "  Next.js installed"
    else
        print_status 1 "  Next.js not found"
    fi
else
    print_warning "Dependencies not installed"
    ERRORS=$((ERRORS+1))
fi

# 7. Check required files
echo ""
echo "7. Checking required files..."
REQUIRED_FILES=(
    "package.json"
    "next.config.mjs"
    "vercel.json"
    ".vercelignore"
    ".gitignore"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status 0 "  $file exists"
    else
        print_status 1 "  $file not found"
    fi
done

# 8. Check configuration files
echo ""
echo "8. Checking configuration files..."

if grep -q "transpilePackages" next.config.mjs; then
    print_status 0 "  next.config.mjs: transpilePackages configured"
else
    print_warning "  next.config.mjs: transpilePackages not found"
    ERRORS=$((ERRORS+1))
fi

if grep -q "installCommand" vercel.json; then
    print_status 0 "  vercel.json: installCommand configured"
else
    print_warning "  vercel.json: installCommand not found"
    ERRORS=$((ERRORS+1))
fi

# 9. Check environment variables
echo ""
echo "9. Checking environment variables..."
ENV_VARS=(
    "NEXT_PUBLIC_PRIVY_APP_ID"
    "PRIVY_APP_SECRET"
    "RELAYER_ADDRESS"
    "RELAYER_PRIVATE_KEY"
    "MERCHANT_ADDRESS"
    "DATABASE_URL"
    "RESEND_API_KEY"
    "NEXT_PUBLIC_APP_URL"
)

if [ -f ".env.production.local" ]; then
    print_status 0 "  .env.production.local exists"
    echo "  Checking environment variables..."

    for var in "${ENV_VARS[@]}"; do
        if grep -q "^$var=" .env.production.local; then
            print_status 0 "    $var is set"
        else
            print_warning "    $var is not set"
            ERRORS=$((ERRORS+1))
        fi
    done
else
    print_warning ".env.production.local not found (okay for CI/CD)"
    echo "  Note: Environment variables should be set in Vercel Dashboard"
fi

# 10. Check security
echo ""
echo "10. Checking security..."

if [ -f ".env.local" ]; then
    print_warning ".env.local file exists (ensure it's gitignored)"
    if grep -q ".env.local" .gitignore; then
        print_status 0 "  .env.local is gitignored"
    else
        print_status 1 "  .env.local is NOT gitignored"
        ERRORS=$((ERRORS+1))
    fi
fi

# 11. Check Redis setup
echo ""
echo "11. Checking Redis setup..."

if grep -q "@upstash/redis" package.json; then
    print_status 0 "  @upstash/redis in package.json"
else
    print_warning "  @upstash/redis not in package.json"
    ERRORS=$((ERRORS+1))
fi

if [ -f "src/lib/rate-limiter-redis.ts" ]; then
    print_status 0 "  rate-limiter-redis.ts exists"
else
    print_warning "  rate-limiter-redis.ts not found"
    ERRORS=$((ERRORS+1))
fi

# 12. Summary
echo ""
echo "======================================"
echo "Pre-Flight Check Summary"
echo "======================================"
echo ""

if [ $ERRORS -eq 0 ]; then
    print_status 0 "All checks passed! Ready for deployment"
    echo ""
    echo "You can now deploy to Vercel:"
    echo "  ./scripts/deploy-vercel.sh"
    echo "  or"
    echo "  vercel --prod"
    echo ""
    exit 0
else
    print_status 1 "Found $ERRORS issue(s) that need to be resolved"
    echo ""
    echo "Please fix the issues above before deploying."
    echo ""
    exit 1
fi
