FROM node:18-alpine

# Install dependencies for both backend and frontend
WORKDIR /app

# Copy source code first (simpler approach)
COPY . .

# Install backend dependencies (including dev dependencies for build)
WORKDIR /app/backend
RUN npm install

# Build backend TypeScript first
RUN npm run build

# Install frontend dependencies and build (standalone server)
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Copy Next.js standalone server to a folder served at runtime
RUN mkdir -p /app/frontend-standalone
RUN cp -r /app/frontend/.next/standalone/* /app/frontend-standalone/
RUN mkdir -p /app/frontend-standalone/.next
RUN cp -r /app/frontend/.next/static /app/frontend-standalone/.next/static
RUN cp -r /app/frontend/public /app/frontend-standalone/public 2>/dev/null || true

# Clean up backend dev dependencies (optional, saves space)
WORKDIR /app/backend
RUN npm prune --production

# Create database directory
RUN mkdir -p /app/backend/database

# Expose port
EXPOSE 5000

# Start both backend and Next.js server
WORKDIR /app
COPY start-all.sh ./start-all.sh
RUN chmod +x ./start-all.sh
CMD ["./start-all.sh"]