#!/bin/sh
set -e

# Start backend
cd /app/backend
PORT=5000 npm run production &

# Start Next.js standalone
cd /app/frontend-standalone
NODE_ENV=production PORT=3000 node server.js &

wait -n

