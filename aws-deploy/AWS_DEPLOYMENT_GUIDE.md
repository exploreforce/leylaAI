# 🚀 AWS Deployment Guide - Leyla Suite WhatsApp Bot

Dieser Guide führt dich Schritt-für-Schritt durch das Deployment deiner WhatsApp-Bot-Anwendung auf AWS App Runner.

## 📋 Voraussetzungen

- [ ] AWS-Account (mit Kreditkarte)
- [ ] GitHub-Account (für automatisches Deployment)
- [ ] OpenAI API Key
- [ ] WhatsApp Business API Zugang (optional)

---

## 💰 Geschätzte Kosten

| Service | Konfiguration | Monatliche Kosten |
|---------|--------------|-------------------|
| **AWS App Runner** | 1 vCPU, 2 GB RAM | ~25-50€ |
| **RDS PostgreSQL** | db.t3.micro (Free Tier) | 0€ (12 Monate), dann ~15-20€ |
| **Data Transfer** | ~10 GB | ~5€ |
| **Total** | | **~30-75€/Monat** |

> **Free Tier**: Erste 12 Monate mit AWS Free Tier: RDS kostenlos, App Runner teilweise kostenlos!

---

## 🎯 Deployment-Strategie

Wir verwenden **AWS App Runner** weil:
- ✅ Einfachstes Setup für Container-Apps
- ✅ Automatisches Scaling (0-1000+ Nutzer)
- ✅ Integriertes CI/CD mit GitHub
- ✅ Automatisches HTTPS/SSL
- ✅ Pay-per-use (kosteneffizient)

---

## 📖 Schritt-für-Schritt Anleitung

### Phase 1: AWS Account Setup (10 Minuten)

#### 1.1 AWS Account erstellen

1. Gehe zu: https://aws.amazon.com/
2. Klicke auf **"Create an AWS Account"**
3. Gib deine Email, Passwort und Account-Name ein
4. Wähle **"Personal"** als Account-Typ
5. Gib deine Kreditkarten-Daten ein (wird für Free Tier benötigt)
6. Verifiziere per Telefon
7. Wähle **"Free"** Support Plan

#### 1.2 AWS Console Login

1. Gehe zu: https://console.aws.amazon.com/
2. Login mit deinen Credentials
3. Wähle Region: **EU (Frankfurt) - eu-central-1** (wichtig für DSGVO!)

---

### Phase 2: RDS PostgreSQL Setup (15 Minuten)

#### 2.1 RDS Datenbank erstellen

1. **Suche in AWS Console:** "RDS"
2. Klicke auf **"Create database"**

#### 2.2 Database Configuration

**Engine options:**
- Engine: **PostgreSQL**
- Version: **PostgreSQL 16.x** (empfohlen) oder **PostgreSQL 15.x**
  - 💡 Tipp: Version 16 ist stabil und hat bessere Performance
  - Version 17 ist sehr neu - besser vermeiden für Production

**Templates:**
- Wähle: **Free tier** ✅

**Settings:**
- DB instance identifier: `whatsappbot-db`
- Master username: `admin`
- Master password: **[Generiere sicheres Passwort - SPEICHERN!]**
- Confirm password: **[Wiederhole Passwort]**

**Instance configuration:**
- DB instance class: **db.t4g.micro** (empfohlen) oder **db.t3.micro** (Free Tier eligible)

**Availability & durability:**
- Deployment option: **Single-AZ DB instance (1 Instance)** ✅
  - ⚠️ **WICHTIG:** Multi-AZ ist NICHT Free Tier eligible und kostet doppelt!
  - Für den Start ist Single-AZ völlig ausreichend
  - Später auf Multi-AZ upgraden ist jederzeit möglich

**Storage:**
- Storage type: **General Purpose SSD (gp3)**
- Allocated storage: **20 GB** (Free Tier: bis 20 GB)
- ☑️ Enable storage autoscaling
- Maximum storage: **100 GB**

**Connectivity:**
- Compute resource: **Don't connect to an EC2 compute resource**
- VPC: **Default VPC**
- Public access: **Yes** ✅ (für einfaches Setup)
- VPC security group: **Create new**
- New VPC security group name: `whatsappbot-db-sg`
- Availability Zone: **No preference**

**Database authentication:**
- Database authentication: **Password authentication**

**Additional configuration:**
- Initial database name: `whatsappbot` ✅ (wichtig!)
- DB parameter group: **default**
- ☑️ Enable automated backups
- Backup retention period: **7 days**
- ☐ Enable encryption (optional für Anfang)

3. Klicke **"Create database"**
4. ⏳ Warte 5-10 Minuten (Status: Creating → Available)

#### 2.3 Database Connection Details speichern

Nach der Erstellung:

1. Klicke auf deine Datenbank: `whatsappbot-db`
2. Unter **"Connectivity & security"** findest du:
   - **Endpoint:** `whatsappbot-db.xxxxx.eu-central-1.rds.amazonaws.com`
   - **Port:** `5432`
   
3. **SPEICHERE DIESE WERTE:**
   ```
   DB_HOST=whatsappbot-db.xxxxx.eu-central-1.rds.amazonaws.com
   DB_PORT=5432
   DB_NAME=whatsappbot
   DB_USER=admin
   DB_PASSWORD=[dein-passwort]
   ```

#### 2.4 Security Group konfigurieren (Wichtig!)

1. Gehe zu **EC2 → Security Groups**
2. Finde: `whatsappbot-db-sg`
3. Tab **"Inbound rules"** → **"Edit inbound rules"**
4. **Wichtig für Anfang (später einschränken!):**
   - Type: **PostgreSQL**
   - Protocol: **TCP**
   - Port: **5432**
   - Source: **0.0.0.0/0** (⚠️ Überall - für Testing OK, später einschränken!)
5. Klicke **"Save rules"**

> **Sicherheitshinweis:** Nach dem Setup solltest du die Source auf die App Runner IP-Range einschränken!

---

### Phase 3: Database Migration testen (lokal) (5 Minuten)

Bevor wir deployen, teste die Datenbank lokal:

#### 3.1 Erstelle lokale .env mit RDS-Daten

```bash
# In backend/.env
NODE_ENV=production
DATABASE_URL=postgresql://admin:DEIN-PASSWORT@whatsappbot-db.xxxxx.eu-central-1.rds.amazonaws.com:5432/whatsappbot
DB_SSL=true
```

#### 3.2 Teste Migration

```bash
cd backend
npm run db:migrate
```

**Erfolgreich?** ✅ Du siehst: "Batch 1 run: XX migrations"

**Fehler?** ❌ Überprüfe:
- Ist die Datenbank "Available"?
- Security Group korrekt?
- Passwort richtig?
- Endpoint kopiert ohne Leerzeichen?

#### 3.3 Führe Seeds aus

```bash
npm run db:seed
```

**Erfolgreich?** ✅ "Ran 4 seed files"

---

### Phase 4: AWS App Runner Setup (20 Minuten)

#### 4.1 GitHub Repository vorbereiten

1. **Push dein Projekt zu GitHub** (falls noch nicht geschehen):
   ```bash
   git add .
   git commit -m "feat: AWS deployment configuration"
   git push origin main
   ```

2. Stelle sicher, dass dein Repo **public** oder dein AWS-Account Zugriff hat

#### 4.2 App Runner Service erstellen

1. **Suche in AWS Console:** "App Runner"
2. Klicke **"Create service"**

#### 4.3 Repository Configuration

**Source:**
- Repository type: **Source code repository** ✅
- Click **"Add new"** für GitHub Connection

**GitHub Connection Setup:**
1. Connection name: `github-connection`
2. Click **"Install another"**
3. Login bei GitHub → Authorisiere AWS Connector
4. Wähle dein Repository aus
5. Click **"Next"**

**Repository settings:**
- Repository: **dein-username/WhatsappBot**
- Branch: **main**

**Deployment settings:**
- Deployment trigger: **Automatic** ✅ (Deploy bei jedem Push!)
- Configuration file: **Use a configuration file**
- Configuration file path: `aws-deploy/apprunner.yaml`

Click **"Next"**

#### 4.4 Build Configuration

Wird aus `apprunner.yaml` geladen - sollte automatisch erkannt werden:

- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Port: `5000`

Click **"Next"**

#### 4.5 Service Configuration

**Service settings:**
- Service name: `whatsappbot-service`

**Instance configuration:**
- CPU: **1 vCPU** ✅
- Memory: **2 GB** ✅
- Environment variables: **Wir fügen diese gleich hinzu!**

**Auto scaling:**
- Minimum instances: **1**
- Maximum instances: **5** (für 1000+ Nutzer ausreichend)
- Concurrency: **100**

**Security:**
- Instance role: **Create new service role**

**Networking:**
- VPC: **Default VPC**
- VPC connector: **Create new**
- Subnets: **Select 2-3 subnets**

Click **"Next"**

#### 4.6 Environment Variables hinzufügen (WICHTIG!)

**NACH dem Service erstellt wurde:**

1. Gehe zu deinem Service: `whatsappbot-service`
2. Tab **"Configuration"** → **"Environment variables"**
3. Click **"Edit"**
4. Füge folgende Variables hinzu:

```bash
# Server
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://[DEINE-APP-RUNNER-URL]

# Database (DEINE RDS-DATEN!)
DATABASE_URL=postgresql://admin:PASSWORT@whatsappbot-db.xxxxx.eu-central-1.rds.amazonaws.com:5432/whatsappbot
DB_SSL=true

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini
OPENAI_CONTENT_FILTER=true
OPENAI_ALLOW_EXPLICIT=false

# WhatsApp (optional)
WHATSAPP_VERIFY_TOKEN=dein-token
WHATSAPP_ACCESS_TOKEN=dein-token
WHATSAPP_PHONE_NUMBER_ID=dein-phone-id
WHATSAPP_TYPING_DELAY=true

# JWT Secret (generiere ein sicheres!)
JWT_SECRET=dein-super-sicherer-jwt-secret-mindestens-32-zeichen-lang
```

> **JWT_SECRET generieren:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

5. Click **"Save changes"**
6. Service wird automatisch neu gestartet!

---

### Phase 5: Deployment & Testing (10 Minuten)

#### 5.1 Warte auf Deployment

1. In App Runner Console: Status sollte wechseln zu:
   - "Operation in progress" → "Running"
2. ⏳ Warte 5-10 Minuten

#### 5.2 Finde deine App URL

1. Im Service-Dashboard siehst du:
   - **Default domain:** `https://xxxxx.eu-central-1.awsapprunner.com`
2. **KOPIERE DIESE URL!**

#### 5.3 Health Check

1. Öffne in Browser:
   ```
   https://xxxxx.eu-central-1.awsapprunner.com/health
   ```

**Erfolgreich?** ✅ Du siehst:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-02T10:00:00.000Z",
  "database": "connected"
}
```

**Fehler?** ❌ Überprüfe:
- Environment Variables gesetzt?
- Database erreichbar?
- Logs ansehen (nächster Schritt!)

#### 5.4 Logs ansehen

1. Im Service-Dashboard: Tab **"Logs"**
2. Wähle **"Deployment logs"** oder **"Application logs"**
3. Suche nach Fehlern

**Häufige Fehler:**
- `ECONNREFUSED`: Database nicht erreichbar → Security Group prüfen
- `password authentication failed`: Falsches DB-Passwort
- `OPENAI_API_KEY`: API Key fehlt oder falsch

---

### Phase 6: Frontend Deployment (15 Minuten)

#### 6.1 Frontend für Backend URL konfigurieren

1. **Bearbeite:** `frontend/.env.production`
   ```bash
   NEXT_PUBLIC_API_URL=https://xxxxx.eu-central-1.awsapprunner.com
   NEXT_PUBLIC_SOCKET_URL=https://xxxxx.eu-central-1.awsapprunner.com
   ```

2. **Commit & Push:**
   ```bash
   git add .
   git commit -m "feat: configure frontend for AWS backend"
   git push
   ```

#### 6.2 Erstelle zweiten App Runner Service für Frontend

**Option A: Zweiter App Runner Service (Empfohlen)**

Wiederhole Phase 4 mit:
- Service name: `whatsappbot-frontend`
- Port: `3000`
- Environment Variables:
  ```bash
  NODE_ENV=production
  NEXT_PUBLIC_API_URL=https://[BACKEND-URL]
  NEXT_PUBLIC_SOCKET_URL=https://[BACKEND-URL]
  ```

**Option B: Static Hosting mit S3 + CloudFront (Günstiger)**

*(Separate Anleitung - siehe unten)*

---

### Phase 7: Custom Domain Setup (Optional, 15 Minuten)

#### 7.1 Domain vorbereiten

1. Hast du eine Domain? (z.B. bei Namecheap, GoDaddy, Route53)
2. Notiere: `app.deine-domain.com`

#### 7.2 In App Runner Service

1. Gehe zu Service: `whatsappbot-service`
2. Tab **"Custom domains"**
3. Click **"Link domain"**
4. Domain: `app.deine-domain.com`
5. **Kopiere die CNAME-Records!**

#### 7.3 Bei deinem Domain-Provider

1. Erstelle neuen **CNAME Record:**
   - Name: `app`
   - Value: `xxxxx.awsapprunner.com`
   - TTL: `300`
2. Speichern & warten (5-30 Minuten)

#### 7.4 SSL Zertifikat

- ✅ **Automatisch!** App Runner erstellt Let's Encrypt Zertifikat
- Status: "Certificate validation in progress" → "Active"

---

## 🎉 Fertig! Deine App läuft auf AWS!

### URLs testen:

- **Backend API:** `https://xxxxx.awsapprunner.com/health`
- **Frontend:** `https://xxxxx.awsapprunner.com/`
- **Custom Domain:** `https://app.deine-domain.com/`

---

## 🔧 Monitoring & Maintenance

### Logs ansehen

**App Runner Console:**
1. Service auswählen
2. Tab **"Logs"**
3. CloudWatch Logs öffnen

**CLI (Advanced):**
```bash
aws logs tail /aws/apprunner/whatsappbot-service --follow
```

### Kosten überwachen

1. AWS Console → **Billing Dashboard**
2. Aktiviere: **"Cost Alerts"**
3. Setze Budget: z.B. 100€/Monat

### Skalierung anpassen

1. Service → **Configuration** → **Edit**
2. Auto scaling Einstellungen:
   - Min: 1-2 Instances
   - Max: 5-10 Instances (je nach Traffic)

---

## 🚨 Troubleshooting

### Problem: Database Connection Failed

**Lösung:**
1. Security Group: Ist Port 5432 offen?
2. RDS Status: "Available"?
3. DATABASE_URL korrekt?
4. Test lokal mit psql:
   ```bash
   psql "postgresql://admin:PASS@host:5432/whatsappbot"
   ```

### Problem: App Runner Deployment Failed

**Lösung:**
1. Logs ansehen: Welcher Fehler?
2. Build-Fehler: `package.json` korrekt?
3. Start-Fehler: Port 5000 im Code?
4. Dependencies: Alle in `package.json`?

### Problem: 502 Bad Gateway

**Lösung:**
1. Backend erreichbar? `/health` Endpoint testen
2. Environment Variables gesetzt?
3. Logs: Crash beim Start?

---

## 📚 Nächste Schritte

### Optional: Weitere Optimierungen

1. **CloudFront CDN** für Frontend (schneller & günstiger)
2. **ElastiCache Redis** für Sessions/Caching
3. **S3** für File-Uploads (z.B. WhatsApp Media)
4. **Lambda Functions** für WhatsApp Webhooks
5. **RDS Read Replicas** für bessere Performance
6. **CloudWatch Alarms** für Monitoring

### Sicherheit härten

1. **RDS Security Group:** Source auf App Runner VPC einschränken
2. **WAF (Web Application Firewall)** aktivieren
3. **AWS Secrets Manager** für sensible Daten
4. **VPC** Private Subnets für RDS

---

## 💡 Hilfe & Support

- **AWS Support:** https://console.aws.amazon.com/support/
- **App Runner Docs:** https://docs.aws.amazon.com/apprunner/
- **Pricing Calculator:** https://calculator.aws/

---

**Viel Erfolg! 🚀**

Bei Fragen oder Problemen - einfach fragen!

