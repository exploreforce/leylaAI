#!/bin/sh
set -e

# Start backend (binds to PORT provided by platform)
cd /app/backend
npm run production &

# Start Next.js (built) server from frontend
cd /app/frontend
NODE_ENV=production PORT=3000 npm run start &

wait -n

