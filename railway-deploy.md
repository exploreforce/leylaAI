# Railway Deployment Guide

## 1. GitHub Repository Setup

```bash
# Im Projekt-Root-Ordner
git init
git add .
git commit -m "Initial commit"

# GitHub Repository erstellen (über GitHub Website)
# Dann:
git remote add origin https://github.com/DEIN-USERNAME/WhatsappBot.git
git push -u origin main
```

## 2. Railway Configuration

### Dockerfile für Railway
Erstelle `Dockerfile` im Root:

```dockerfile
FROM node:18-alpine

# Backend Dependencies
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production

# Frontend Dependencies
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production

# Copy Source Code
WORKDIR /app
COPY . .

# Build Frontend
WORKDIR /app/frontend
RUN npm run build

# Build Backend
WORKDIR /app/backend
RUN npm run build

# Expose Port
EXPOSE 5000

# Start Backend
CMD ["npm", "run", "start"]
```

### Railway Environment Variables
```env
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=file:./whatsapp_bot.db

# OpenAI
OPENAI_API_KEY=dein-openai-key

# WasenderAPI
WASENDER_API_BASE_URL=https://wasenderapi.com
WASENDER_API_TOKEN=dein-wasender-token
WASENDER_WEBHOOK_URL=https://DEINE-RAILWAY-URL.railway.app/api/webhooks/wasender

# JWT
JWT_SECRET=dein-jwt-secret

# WhatsApp Bot
WHATSAPP_TYPING_DELAY=true
```

## 3. Deployment Steps

1. **Railway Dashboard** → "New Project"
2. **Connect GitHub** → Select Repository
3. **Environment Variables** → Add all variables above
4. **Deploy** → Railway builds automatically
5. **Custom Domain** → Get stable HTTPS URL
6. **Update Webhook** → Copy Railway URL to WasenderAPI

## 4. Database Migration

Railway runs SQLite in memory by default. Für persistent data:

```json
// package.json - add to backend
{
  "scripts": {
    "railway-migrate": "npm run migrate && npm start"
  }
}
```

## 5. Frontend Serving

Backend serves built frontend automatically:

```typescript
// backend/src/index.ts - add after routes
import path from 'path';

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/build');
  app.use(express.static(frontendPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}
```
