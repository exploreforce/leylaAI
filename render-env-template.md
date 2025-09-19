# Render Environment Variables

## Required Environment Variables für Render Dashboard:

```env
NODE_ENV=production
PORT=10000

# Database (SQLite with persistent disk)
DATABASE_URL=file:./database/whatsapp_bot.db

# OpenAI API
OPENAI_API_KEY=sk-...

# WasenderAPI
WASENDER_API_BASE_URL=https://wasenderapi.com
WASENDER_API_TOKEN=1084|...
WASENDER_WEBHOOK_URL=https://DEINE-RENDER-APP.onrender.com/api/webhooks/wasender

# JWT Secret
JWT_SECRET=dein-super-geheimer-jwt-secret-mindestens-32-zeichen

# WhatsApp Bot Settings
WHATSAPP_TYPING_DELAY=true

# Optional Webhook Security
WASENDER_WEBHOOK_SECRET=
```

## Render Deployment Steps:

1. **render.com** → Sign up mit GitHub
2. **"New Web Service"** 
3. **Connect Repository:** exploreforce/leylaAI
4. **Settings:**
   - Name: whatsapp-bot
   - Region: Frankfurt (EU)
   - Branch: master
   - Build Command: `cd backend && npm ci && npm run build && cd ../frontend && npm ci && npm run build`
   - Start Command: `cd backend && npm run production`
5. **Environment Variables** → Add all variables above
6. **Deploy** → Automatisch

## Nach Deployment:

1. **URL kopieren:** `https://whatsapp-bot-xyz.onrender.com`
2. **WASENDER_WEBHOOK_URL** aktualisieren mit der echten URL
3. **WasenderAPI Dashboard** → Webhook URL setzen
4. **Testen!**
