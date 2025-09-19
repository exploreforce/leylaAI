# Backend Dockerfile (Node.js + TypeScript)
FROM node:20-alpine AS deps
WORKDIR /app
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
COPY backend/package*.json ./
COPY whatsapp-bot /whatsapp-bot
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Install system Chromium and required fonts/libs for puppeteer (whatsapp-web.js)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    tzdata
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY knexfile.js ./knexfile.js
COPY database ./database
# Env will be provided via compose
EXPOSE 5000
CMD ["node", "dist/index.js"]


