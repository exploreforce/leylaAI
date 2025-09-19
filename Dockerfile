FROM node:18-alpine

# Install dependencies for both backend and frontend
WORKDIR /app

# Copy source code first (simpler approach)
COPY . .

# Install backend dependencies
WORKDIR /app/backend
RUN npm install --production

# Install frontend dependencies and build
WORKDIR /app/frontend
RUN npm install && npm run build

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