# ⚡ AWS Quick Start - Für Eilige

Du willst schnell deployen? Hier die 5 wichtigsten Schritte!

---

## 📋 Voraussetzungen (5 Min)

1. ✅ AWS Account: https://aws.amazon.com/
2. ✅ GitHub Repo mit deinem Code
3. ✅ OpenAI API Key bereit

---

## 🚀 5-Schritte Deployment

### 1️⃣ RDS PostgreSQL (10 Min)

**AWS Console → RDS → Create database:**
- Engine: **PostgreSQL 16.x** (oder 15.x)
- Template: **Free tier**
- DB identifier: `whatsappbot-db`
- Master username: `admin`
- Password: **[Generiere sicheres Passwort - SPEICHERN!]**
- Instance: **db.t4g.micro** (oder db.t3.micro)
- **Availability:** **Single-AZ (1 Instance)** ✅ (Multi-AZ kostet extra!)
- Storage: **20 GB**
- Public access: **Yes**
- Initial database: `whatsappbot`

**Security Group:**
- EC2 → Security Groups → `whatsappbot-db-sg`
- Inbound: PostgreSQL (5432) from **0.0.0.0/0**

**Speichere:**
```
DB_HOST=whatsappbot-db.xxxxx.eu-central-1.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=[dein-passwort]
DB_NAME=whatsappbot
```

---

### 2️⃣ Test Migration lokal (5 Min)

```bash
cd backend

# .env erstellen
echo "NODE_ENV=production
DATABASE_URL=postgresql://admin:PASSWORT@your-rds-endpoint.eu-central-1.rds.amazonaws.com:5432/whatsappbot
DB_SSL=true" > .env

# Migrations ausführen
npm run db:migrate
npm run db:seed
```

✅ **Erfolgreich?** → Weiter zu Schritt 3!

---

### 3️⃣ App Runner Backend (15 Min)

**AWS Console → App Runner → Create service:**

**Source:**
- Type: **Source code repository**
- Connect GitHub → Wähle dein Repo
- Branch: `main`
- Configuration file: `aws-deploy/apprunner.yaml`

**Service:**
- Name: `whatsappbot-service`
- CPU: **1 vCPU**
- Memory: **2 GB**
- Port: **5000**

**Auto scaling:**
- Min: **1**, Max: **5**

**Click:** Create service → Warte 10 Min

**Nach dem Start: Environment Variables hinzufügen!**

Service → Configuration → Environment variables → Edit:

```bash
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://[DEINE-APP-RUNNER-URL]

# Database
DATABASE_URL=postgresql://admin:PASSWORT@your-rds-endpoint.eu-central-1.rds.amazonaws.com:5432/whatsappbot
DB_SSL=true

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini

# JWT (generiere: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=[dein-generiertes-secret]
```

Save → Service neu startet automatisch!

---

### 4️⃣ Frontend (Option A: Einfach) (10 Min)

**Zweiter App Runner Service:**

AWS Console → App Runner → Create service:
- Repo: gleicher
- Branch: `main`
- **Port: 3000** ⚠️
- Name: `whatsappbot-frontend`

Environment Variables:
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://[BACKEND-URL]
NEXT_PUBLIC_SOCKET_URL=https://[BACKEND-URL]
```

---

### 5️⃣ Testen (2 Min)

**Backend:**
```bash
curl https://xxxxx.eu-central-1.awsapprunner.com/health
```
Erwarte: `{"status":"healthy"}`

**Frontend:**
Öffne Browser: `https://xxxxx.eu-central-1.awsapprunner.com/`

✅ **Läuft?** → **FERTIG!** 🎉

---

## 💰 Kosten

- App Runner (2x): ~50-100€/Monat
- RDS Free Tier: 0€ (12 Monate)
- Total: **~50-100€/Monat**

**Optimierung möglich:** ~30-50€/Monat (siehe `COST_OPTIMIZATION.md`)

---

## 🚨 Probleme?

**Database Error:**
→ Security Group Port 5432 offen?

**502 Bad Gateway:**
→ Environment Variables gesetzt?

**Build Failed:**
→ Logs ansehen: Service → Logs

---

## 📚 Ausführliche Anleitung

Für Details: `AWS_DEPLOYMENT_GUIDE.md`

---

**Das war's! Deine App läuft jetzt auf AWS! 🚀**

