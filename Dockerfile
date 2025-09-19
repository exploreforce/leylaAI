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

# Install frontend dependencies and build (standalone)
WORKDIR /app/frontend
RUN npm install && npm run build

# Copy Next.js standalone build to backend public folder
RUN mkdir -p /app/backend/public
RUN cp -r /app/frontend/.next/standalone/* /app/backend/public/ 2>/dev/null || true
RUN cp -r /app/frontend/.next/static /app/backend/public/.next/static 2>/dev/null || true
RUN cp -r /app/frontend/public/* /app/backend/public/ 2>/dev/null || true

# Clean up backend dev dependencies (optional, saves space)
WORKDIR /app/backend
RUN npm prune --production

# Create database directory
RUN mkdir -p /app/backend/database

# Expose port
EXPOSE 5000

# Start backend (which serves frontend static files)
WORKDIR /app/backend
CMD ["npm", "run", "production"]