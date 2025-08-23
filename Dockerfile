# Multi-stage build for Next.js frontend
# Context: ./frontend

FROM node:20-alpine AS deps
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY frontend .
# Allow overriding public API/socket URLs at build time; fall back to internal defaults for compose
ARG NEXT_PUBLIC_API_URL=http://backend:5000
ARG NEXT_PUBLIC_SOCKET_URL=http://backend:5000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]


