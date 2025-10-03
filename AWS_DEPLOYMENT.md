# AWS Deployment - WhatsApp Bot

## 🎯 Aktuelle Production Umgebung

### Backend (AWS App Runner)
- **URL:** https://wnn8pretct.eu-central-1.awsapprunner.com
- **Region:** eu-central-1 (Frankfurt)
- **Service Name:** whatsappbot-backend
- **Service ARN:** arn:aws:apprunner:eu-central-1:948451198730:service/whatsappbot-backend/caecd6b0f8fd4235a8b5e8b2305d62a9
- **Runtime:** Node.js 16 (Docker via ECR)
- **Resources:** 1 vCPU, 2 GB RAM
- **Health Check:** `/health`

### Frontend (AWS App Runner)
- **URL:** https://arki44wiab.eu-central-1.awsapprunner.com
- **Region:** eu-central-1 (Frankfurt)
- **Service Name:** whatsappbot-frontend
- **Service ARN:** arn:aws:apprunner:eu-central-1:948451198730:service/whatsappbot-frontend/dfa55fa42dbd48e0a99a02f9acf84705
- **Runtime:** Node.js 18 (Docker via ECR)
- **Resources:** 1 vCPU, 2 GB RAM
- **Health Check:** `/`

### Database (AWS RDS PostgreSQL)
- **Host:** whatsappbot-db.chwsoysw4ghw.eu-central-1.rds.amazonaws.com
- **Port:** 5432
- **Database:** whatsappbot
- **Instance:** db.t4g.micro
- **Region:** eu-central-1 (Frankfurt)

### Container Registry (AWS ECR)
- **Repository:** 948451198730.dkr.ecr.eu-central-1.amazonaws.com/whatsappbot-backend
- **Region:** eu-central-1

---

## 🚀 Neues Backend Deployment

### 1. Docker Image bauen
```bash
docker build -f Dockerfile.backend.prod -t whatsappbot-backend:latest .
```

### 2. ECR Login
```bash
aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin 948451198730.dkr.ecr.eu-central-1.amazonaws.com
```

### 3. Image taggen und pushen
```bash
docker tag whatsappbot-backend:latest 948451198730.dkr.ecr.eu-central-1.amazonaws.com/whatsappbot-backend:latest
docker push 948451198730.dkr.ecr.eu-central-1.amazonaws.com/whatsappbot-backend:latest
```

### 4. Deployment triggern
```bash
aws apprunner start-deployment \
  --service-arn arn:aws:apprunner:eu-central-1:948451198730:service/whatsappbot-backend/[SERVICE_ID] \
  --region eu-central-1
```

**Service ARN finden:**
```bash
aws apprunner list-services --region eu-central-1
```

---

## 🔧 Environment Variables (Production)

Die folgenden Environment Variables sind in App Runner konfiguriert:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://[USERNAME]:[PASSWORD]@whatsappbot-db.chwsoysw4ghw.eu-central-1.rds.amazonaws.com:5432/whatsappbot
DB_SSL=true
OPENAI_API_KEY=[STORED_IN_AWS]
OPENAI_MODEL=gpt-4o-mini
OPENAI_CONTENT_FILTER=true
OPENAI_ALLOW_EXPLICIT=false
JWT_SECRET=[STORED_IN_AWS]
WHATSAPP_TYPING_DELAY=true
FRONTEND_URL=[FRONTEND_URL_HERE]
```

**Environment Variables ändern:**
1. AWS Console → App Runner → whatsappbot-backend
2. Configuration → Edit
3. Environment Variables anpassen
4. Deploy

---

## 📊 Monitoring & Logs

### CloudWatch Logs anschauen
```bash
# Service Logs
aws logs tail /aws/apprunner/whatsappbot-backend/[SERVICE_ID]/service --region eu-central-1 --follow

# Application Logs
aws logs tail /aws/apprunner/whatsappbot-backend/[SERVICE_ID]/application --region eu-central-1 --follow
```

### Service Status checken
```bash
aws apprunner list-services --region eu-central-1
```

---

## 🗄️ Database Management

### Verbindung testen
```bash
cd backend
node -e "require('pg').Pool({connectionString:'postgresql://...'}).query('SELECT NOW()').then(r=>console.log(r.rows))"
```

### Migrations ausführen
```bash
cd backend
NODE_ENV=production npx knex migrate:latest
```

### Seeds ausführen
```bash
cd backend
NODE_ENV=production npx knex seed:run
```

---

## 💰 Kosten (geschätzt)

| Service | Konfiguration | Kosten/Monat |
|---------|---------------|--------------|
| App Runner | 1 vCPU, 2GB RAM | $25-40 |
| RDS PostgreSQL | db.t4g.micro | $15-20 |
| ECR | Image Storage | $1-2 |
| **Total** | | **~$40-60** |

---

## 🔐 IAM Roles & Permissions

### App Runner ECR Access Role
- **Role Name:** AppRunnerECRAccessRole
- **Policy:** AWSAppRunnerServicePolicyForECRAccess
- **Purpose:** Erlaubt App Runner, Docker Images von ECR zu pullen

---

## 🛠️ Troubleshooting

### Service startet nicht
1. Logs checken (siehe oben)
2. Health Check Path prüfen: `/health`
3. Environment Variables prüfen
4. RDS Security Group prüfen (Port 5432 offen?)

### Database Connection Fehler
1. RDS Status checken
2. Security Group Rules prüfen (Inbound Port 5432)
3. DB_SSL=true gesetzt?
4. Connection String korrekt?

### App Runner Build Fehler
1. Dockerfile.backend.prod checken
2. ECR Image vorhanden und gepusht?
3. IAM Role korrekt konfiguriert?

---

## 📞 Support

Bei Fragen oder Problemen:
- AWS Console: https://eu-central-1.console.aws.amazon.com/apprunner
- CloudWatch Logs: https://eu-central-1.console.aws.amazon.com/cloudwatch
- RDS Console: https://eu-central-1.console.aws.amazon.com/rds

