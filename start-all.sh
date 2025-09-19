#!/bin/sh
set -e

# Start backend (binds to PORT provided by platform)
cd /app/backend
npm run production &

# Start Next.js standalone
cd /app/frontend-standalone
NODE_ENV=production PORT=3000 node server.js &

wait -n

