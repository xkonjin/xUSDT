#!/bin/bash

# Start all Plasma SDK apps
# Each app runs on a unique port

echo "Starting all Plasma SDK apps..."

# Kill any existing Next.js processes on our ports
lsof -ti:3001,3002,3004,3005,3008,3010 | xargs kill -9 2>/dev/null

# Start all apps with concurrently
npx concurrently \
  --names "plenmo,predictions,splitzy,streampay,subkiller,telegram" \
  --prefix-colors "green,purple,cyan,yellow,red,blue" \
  "cd apps/plasma-venmo && npm run dev" \
  "cd apps/plasma-predictions && npm run dev" \
  "cd apps/bill-split && npm run dev" \
  "cd apps/plasma-stream && npm run dev" \
  "cd apps/subkiller && npm run dev" \
  "cd apps/telegram-webapp && npm run dev"
