#!/bin/bash

# Start all Plasma SDK apps
# Each app runs on a unique port

echo "Starting all Plasma SDK apps..."

# Kill any existing Next.js processes on our ports
lsof -ti:3005,3006,3007,3008,3009,3010 | xargs kill -9 2>/dev/null

# Start all apps with concurrently
npx concurrently \
  --names "plenmo,pledictions,splitzy,streampay,subkiller,telegram" \
  --prefix-colors "green,purple,cyan,yellow,red,blue" \
  "cd apps/plasma-venmo && PORT=3005 npm run dev" \
  "cd apps/plasma-predictions && PORT=3006 npm run dev" \
  "cd apps/bill-split && PORT=3007 npm run dev" \
  "cd apps/plasma-stream && PORT=3008 npm run dev" \
  "cd apps/subkiller && PORT=3009 npm run dev" \
  "cd apps/telegram-webapp && PORT=3010 npm run dev"
