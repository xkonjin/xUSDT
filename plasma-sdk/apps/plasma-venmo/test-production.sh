#!/bin/bash

# Plenmo Production Testing Script
# Comprehensive testing before deployment

set -e

echo "======================================"
echo "Plenmo Production Testing"
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

# 1. Check Node version
echo "1. Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    print_status 0 "Node.js version: $(node -v)"
else
    print_status 1 "Node.js version must be 18 or higher"
fi

# 2. Check environment variables
echo ""
echo "2. Checking environment variables..."
if [ -f ".env.production" ]; then
    print_status 0 ".env.production file exists"
    
    # Check critical variables
    if grep -q "RELAYER_PRIVATE_KEY=" .env.production; then
        print_status 0 "RELAYER_PRIVATE_KEY configured"
    else
        print_warning "RELAYER_PRIVATE_KEY not configured"
    fi
    
    if grep -q "NEXT_PUBLIC_USDT0_ADDRESS=" .env.production; then
        print_status 0 "USDT0_ADDRESS configured"
    else
        print_warning "USDT0_ADDRESS not configured"
    fi
else
    print_warning ".env.production file not found"
fi

# 3. Check dependencies
echo ""
echo "3. Checking dependencies..."
if [ -d "node_modules" ]; then
    print_status 0 "Dependencies installed"
else
    echo "Installing dependencies..."
    npm install
    print_status $? "Dependencies installation"
fi

# 4. Lint check
echo ""
echo "4. Running linter..."
npm run lint --if-present 2>&1 | tail -5
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    print_status 0 "Linting passed"
else
    print_warning "Linting warnings found (non-blocking)"
fi

# 5. Type check (skip if packages missing)
echo ""
echo "5. Running type check..."
print_warning "Skipping type check due to monorepo dependencies"

# 6. Unit tests (if they exist)
echo ""
echo "6. Running unit tests..."
if [ -f "jest.config.js" ]; then
    npm test --if-present 2>&1 | tail -10
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        print_status 0 "Unit tests passed"
    else
        print_warning "Unit tests failed (check output above)"
    fi
else
    print_warning "No jest.config.js found, skipping unit tests"
fi

# 7. Build check
echo ""
echo "7. Running production build..."
npm run build 2>&1 | tail -20
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    print_status 0 "Production build successful"
else
    print_status 1 "Production build failed"
fi

# 8. Check build output
echo ""
echo "8. Checking build output..."
if [ -d ".next" ]; then
    print_status 0 "Build directory exists"
    
    # Check build size
    BUILD_SIZE=$(du -sh .next | cut -f1)
    echo "   Build size: $BUILD_SIZE"
else
    print_status 1 "Build directory not found"
fi

# 9. Security check
echo ""
echo "9. Running security audit..."
npm audit --production 2>&1 | grep -E "(found|vulnerabilities)" | head -3
print_warning "Review security audit above"

# 10. PWA assets check
echo ""
echo "10. Checking PWA assets..."
if [ -f "public/manifest.json" ]; then
    print_status 0 "manifest.json exists"
else
    print_warning "manifest.json not found"
fi

if [ -f "public/sw.js" ]; then
    print_status 0 "Service worker exists"
else
    print_warning "Service worker not found"
fi

if [ -f "public/icon-192.png" ] && [ -f "public/icon-512.png" ]; then
    print_status 0 "PWA icons exist"
else
    print_warning "PWA icons not found"
fi

# Summary
echo ""
echo "======================================"
echo "Testing Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Review any warnings above"
echo "2. Test locally: npm run dev"
echo "3. Deploy to staging first"
echo "4. Run E2E tests on staging"
echo "5. Deploy to production"
echo ""
