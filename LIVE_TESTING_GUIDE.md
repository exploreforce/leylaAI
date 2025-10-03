# 🚀 Live Testing Guide - WhatsApp Bot

## ✅ Was ist bereits deployed?

### Backend (Production Ready)
- **URL:** https://wnn8pretct.eu-central-1.awsapprunner.com
- **Status:** ✅ RUNNING
- **Health Check:** https://wnn8pretct.eu-central-1.awsapprunner.com/health
- **Region:** Frankfurt (eu-central-1)

### Frontend (Production Ready)
- **URL:** https://arki44wiab.eu-central-1.awsapprunner.com
- **Status:** ✅ RUNNING
- **Region:** Frankfurt (eu-central-1)

### Database
- ✅ PostgreSQL RDS in Frankfurt
- ✅ Migrations ausgeführt
- ✅ Seeds eingespielt
- ✅ SSL aktiviert

---

## 🎯 Setup abgeschlossen - Ready for Testing!

### ✅ Alle Services deployed!

Beide Services sind live und miteinander verbunden:

**Frontend → Backend:**
- Frontend nutzt: `NEXT_PUBLIC_API_URL=https://wnn8pretct.eu-central-1.awsapprunner.com`
- Alle API-Calls gehen zum Backend

**Backend → Frontend:**
- Backend nutzt: `FRONTEND_URL=https://arki44wiab.eu-central-1.awsapprunner.com`
- CORS ist konfiguriert

**Backend → Database:**
- PostgreSQL RDS mit SSL
- Connection String konfiguriert

---

## 🧪 Testing

### Backend API testen

**Health Check:**
```bash
curl https://wnn8pretct.eu-central-1.awsapprunner.com/health
```

**API Endpoints:**
```bash
# Auth
POST https://wnn8pretct.eu-central-1.awsapprunner.com/api/auth/login
POST https://wnn8pretct.eu-central-1.awsapprunner.com/api/auth/register

# Bot Config
GET https://wnn8pretct.eu-central-1.awsapprunner.com/api/bot/config

# Services
GET https://wnn8pretct.eu-central-1.awsapprunner.com/api/services

# Appointments
GET https://wnn8pretct.eu-central-1.awsapprunner.com/api/appointments
POST https://wnn8pretct.eu-central-1.awsapprunner.com/api/appointments

# Calendar
GET https://wnn8pretct.eu-central-1.awsapprunner.com/api/calendar/availability
```

### Frontend-Backend Integration testen
1. Frontend öffnen
2. Login/Register testen
3. WhatsApp Bot Konfiguration öffnen
4. Services verwalten
5. Appointments erstellen
6. Calendar ansehen

---

## 🔑 Zugriffs-Informationen

### AWS Console
- **Account ID:** 948451198730
- **Region:** eu-central-1 (Frankfurt)
- **Services:**
  - App Runner → whatsappbot-backend
  - RDS → whatsappbot-db
  - ECR → whatsappbot-backend

### API Credentials
**Admin User (muss noch erstellt werden):**
```bash
# Via API
POST https://wnn8pretct.eu-central-1.awsapprunner.com/api/auth/register
{
  "email": "admin@example.com",
  "password": "your-secure-password",
  "name": "Admin User"
}
```

---

## 📝 Test-Checkliste

### Backend Tests
- [ ] Health Check erfolgreich
- [ ] Login funktioniert
- [ ] Register funktioniert
- [ ] Bot Config laden
- [ ] Services CRUD
- [ ] Appointments CRUD
- [ ] Calendar Availability
- [ ] WhatsApp Bot Connect (benötigt QR-Code Scan)

### Frontend Tests
- [ ] App lädt
- [ ] Login UI funktioniert
- [ ] Dashboard lädt
- [ ] Bot Config UI funktioniert
- [ ] Services UI funktioniert
- [ ] Appointments UI funktioniert
- [ ] Calendar UI funktioniert (DayPilot)
- [ ] i18n (Sprachen-Wechsel)
- [ ] Mobile Responsiveness

### Integration Tests
- [ ] WhatsApp Web.js verbindet
- [ ] QR-Code wird angezeigt
- [ ] Nach Scan: Bot ist online
- [ ] Bot empfängt Nachrichten
- [ ] Bot antwortet mit OpenAI
- [ ] Appointment Buchung via WhatsApp
- [ ] Termine werden in Calendar angezeigt

---

## 🐛 Bekannte Issues

### WhatsApp Session
- Beim ersten Start muss der Bot via QR-Code mit WhatsApp verbunden werden
- Session wird in `/backend/storage/wa-session` gespeichert
- **WICHTIG:** Session-Daten sind sensitiv und sollten NICHT auf GitHub gepusht werden

### OpenAI Rate Limits
- Free Tier: 3 requests/minute
- Bei vielen Tests: Rate Limit möglich
- Lösung: Paid Tier oder Warten

---

## 🔄 Updates deployen

### Backend Update
```bash
# 1. Code ändern
# 2. Docker Image bauen
docker build -f Dockerfile.backend.prod -t whatsappbot-backend:latest .

# 3. Zu ECR pushen
aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin 948451198730.dkr.ecr.eu-central-1.amazonaws.com
docker tag whatsappbot-backend:latest 948451198730.dkr.ecr.eu-central-1.amazonaws.com/whatsappbot-backend:latest
docker push 948451198730.dkr.ecr.eu-central-1.amazonaws.com/whatsappbot-backend:latest

# 4. App Runner Deployment triggern
aws apprunner start-deployment --service-arn [SERVICE_ARN] --region eu-central-1
```

### Frontend Update
```bash
cd frontend
git pull
vercel --prod  # oder Netlify/Amplify Auto-Deploy
```

---

## 📞 Support & Dokumentation

- **AWS Deployment Details:** siehe `AWS_DEPLOYMENT.md`
- **Project Structure:** siehe `documentation.md`
- **Backend API Docs:** siehe `backend/README.md` (falls vorhanden)
- **Frontend Docs:** siehe `frontend/README.md` (falls vorhanden)

---

## 🎉 Viel Erfolg beim Testing!

Bei Fragen oder Problemen:
1. Logs checken (siehe AWS_DEPLOYMENT.md)
2. GitHub Issues erstellen
3. Team kontaktieren

