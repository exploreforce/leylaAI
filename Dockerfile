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

# Install frontend dependencies and build
WORKDIR /app/frontend
RUN npm install && npm run build

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