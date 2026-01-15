#!/bin/bash
# Verifies Vercel deployment configuration before deploying
# Run this from the apps/plasma-venmo directory

set -e

echo "🔍 Checking Vercel configuration..."

# Check if .vercel exists
if [ ! -d ".vercel" ]; then
  echo "⚠️  No .vercel directory found."
  echo "   Run 'npx vercel link --yes' to link this project."
  exit 1
fi

# Check project.json exists
if [ ! -f ".vercel/project.json" ]; then
  echo "❌ ERROR: .vercel/project.json not found"
  exit 1
fi

# Parse settings from project.json
PROJECT_NAME=$(cat .vercel/project.json | python3 -c "import sys,json; print(json.load(sys.stdin).get('projectName', ''))" 2>/dev/null || echo "")
ROOT_DIR=$(cat .vercel/project.json | python3 -c "import sys,json; print(json.load(sys.stdin).get('settings', {}).get('rootDirectory', '') or '')" 2>/dev/null || echo "")
NODE_VER=$(cat .vercel/project.json | python3 -c "import sys,json; print(json.load(sys.stdin).get('settings', {}).get('nodeVersion', '') or '')" 2>/dev/null || echo "")

echo "   Project: $PROJECT_NAME"
echo "   Root Directory: ${ROOT_DIR:-'(empty)'}"
echo "   Node Version: ${NODE_VER:-'(not set)'}"

ERRORS=0

# Check root directory - should be empty when deploying from app directory
if [ -n "$ROOT_DIR" ] && [ "$ROOT_DIR" != "" ] && [ "$ROOT_DIR" != "." ]; then
  echo ""
  echo "⚠️  WARNING: rootDirectory is set to '$ROOT_DIR'"
  echo "   This will cause 'path does not exist' errors when deploying from this directory."
  echo ""
  echo "   FIX: Go to https://vercel.com/[team]/$PROJECT_NAME/settings"
  echo "        Set 'Root Directory' to empty (clear the field)"
  ERRORS=$((ERRORS + 1))
fi

# Check Node version - must be valid (18.x, 20.x, or 22.x)
if [ "$NODE_VER" = "24.x" ] || [ "$NODE_VER" = "23.x" ]; then
  echo ""
  echo "❌ ERROR: Node.js $NODE_VER is not supported by Vercel"
  echo "   Supported versions: 18.x, 20.x, 22.x"
  echo ""
  echo "   FIX: Go to https://vercel.com/[team]/$PROJECT_NAME/settings"
  echo "        Set 'Node.js Version' to 20.x"
  ERRORS=$((ERRORS + 1))
fi

# Check for .nvmrc
if [ ! -f ".nvmrc" ]; then
  echo ""
  echo "⚠️  WARNING: No .nvmrc file found"
  echo "   Consider creating one to pin Node version in code"
fi

# Summary
echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✅ Vercel configuration looks good!"
  echo "   Run 'npx vercel --yes' to deploy"
else
  echo "❌ Found $ERRORS issue(s) that need to be fixed in Vercel dashboard"
  echo "   Fix these before deploying to avoid errors"
  exit 1
fi
