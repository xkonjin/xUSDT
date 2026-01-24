#!/bin/bash

# Plenmo Vercel Deployment Script
# Automates deployment to Vercel with pre-flight checks

set -e

echo "======================================"
echo "Plenmo Vercel Deployment Script"
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

# 1. Check if git is clean
echo "1. Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Git working directory is not clean"
    echo "  Please commit or stash changes before deploying"
    git status --short
    exit 1
else
    print_status 0 "Git working directory is clean"
fi

# 2. Check current branch
echo ""
echo "2. Checking current branch..."
CURRENT_BRANCH=$(git branch --show-current)
echo "  Current branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "main" ]; then
    print_warning "Not on main branch (current: $CURRENT_BRANCH)"
    read -p "  Do you want to deploy to staging from $CURRENT_BRANCH? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    print_status 0 "On main branch"
fi

# 3. Run pre-flight checks
echo ""
echo "3. Running pre-flight checks..."

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    print_status 0 "Node.js version: $(node -v)"
else
    print_status 1 "Node.js version must be 18 or higher"
fi

# Check dependencies
if [ -d "node_modules" ]; then
    print_status 0 "Dependencies installed"
else
    echo "  Installing dependencies..."
    npm install
    print_status $? "Dependencies installation"
fi

# Check environment variables
if [ -f ".env.production.local" ]; then
    print_warning ".env.production.local file exists (this is okay, file is gitignored)"
else
    print_status 0 "No .env.production.local file (expected for local dev)"
fi

# 4. Run tests
echo ""
echo "4. Running tests..."
if command -v jest &> /dev/null; then
    npm test -- --passWithNoTests
    print_status $? "Tests passed"
else
    print_warning "Jest not found, skipping tests"
fi

# 5. Run lint
echo ""
echo "5. Running linter..."
npm run lint --if-present 2>&1 | tail -5
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    print_status 0 "Linting passed"
else
    print_warning "Linting warnings found (non-blocking)"
fi

# 6. Run build
echo ""
echo "6. Running production build..."
npm run build 2>&1 | tail -20
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    print_status 0 "Production build successful"
else
    print_status 1 "Production build failed"
fi

# 7. Check build output
echo ""
echo "7. Checking build output..."
if [ -d ".next" ]; then
    print_status 0 "Build directory exists"

    # Check build size
    BUILD_SIZE=$(du -sh .next | cut -f1)
    echo "  Build size: $BUILD_SIZE"
else
    print_status 1 "Build directory not found"
fi

# 8. Ask for deployment target
echo ""
echo "======================================"
echo "Ready to deploy to Vercel"
echo "======================================"
echo ""
echo "Select deployment target:"
echo "  1) Production (main branch → plenmo.vercel.app)"
echo "  2) Preview (current branch → preview URL)"
echo "  3) Cancel"
echo ""
read -p "  Enter choice (1-3): " -n 1 -r
echo ""

case $REPLY in
    1)
        echo ""
        echo "Deploying to PRODUCTION..."
        vercel --prod
        print_status 0 "Production deployment initiated"
        ;;
    2)
        echo ""
        echo "Deploying to PREVIEW..."
        vercel
        print_status 0 "Preview deployment initiated"
        ;;
    3)
        echo ""
        echo "Deployment cancelled"
        exit 0
        ;;
    *)
        echo ""
        print_status 1 "Invalid choice"
        exit 1
        ;;
esac

# 9. Provide next steps
echo ""
echo "======================================"
echo "Deployment Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Check deployment status: https://vercel.com/jins-projects-d67d72af/plasma-venmo/deployments"
echo "2. Wait for build to complete (2-5 minutes)"
echo "3. Test the application"
echo "4. Monitor error logs for 24 hours"
echo ""
echo "Deployment URL will be shown in the Vercel dashboard."
echo ""

# 10. Open Vercel dashboard (optional)
read -p "  Open Vercel dashboard in browser? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "https://vercel.com/jins-projects-d67d72af/plasma-venmo/deployments"
fi

echo ""
echo "Deployment script complete! 🚀"
