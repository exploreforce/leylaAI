FROM node:18-alpine

# Install dependencies for both backend and frontend
WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install backend dependencies
WORKDIR /app/backend
RUN npm ci --only=production

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm ci --only=production

# Copy source code
WORKDIR /app
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm run build

# Build backend TypeScript
WORKDIR /app/backend
RUN npm run build

# Create database directory
RUN mkdir -p /app/backend/database

# Expose port
EXPOSE 5000

# Start backend (which serves frontend static files)
WORKDIR /app/backend
CMD ["npm", "run", "production"]