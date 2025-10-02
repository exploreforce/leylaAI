# 🚀 AWS Deployment - Leyla Suite WhatsApp Bot

Dieses Verzeichnis enthält alle Dateien für das AWS-Deployment deiner WhatsApp-Bot-Anwendung.

---

## 📁 Dateien in diesem Ordner

| Datei | Beschreibung |
|-------|-------------|
| `AWS_DEPLOYMENT_GUIDE.md` | **Hauptanleitung** - Schritt-für-Schritt Deployment |
| `MIGRATION_SCRIPT.md` | SQLite → PostgreSQL Migration Guide |
| `COST_OPTIMIZATION.md` | Kosten sparen & optimieren |
| `apprunner.yaml` | AWS App Runner Konfiguration |
| `.env.production.example` | Environment Variables Template |
| `Dockerfile.backend` | Optimiertes Backend Dockerfile |

---

## 🎯 Quick Start

### Schritt 1: AWS Account erstellen
Wenn noch nicht vorhanden: https://aws.amazon.com/

### Schritt 2: Deployment Guide öffnen
```bash
# Öffne die Hauptanleitung
code aws-deploy/AWS_DEPLOYMENT_GUIDE.md
```

### Schritt 3: Folge der Anleitung
Die Anleitung führt dich durch:
1. ✅ AWS Account Setup (10 Min)
2. ✅ RDS PostgreSQL Setup (15 Min)
3. ✅ Database Migration Test (5 Min)
4. ✅ App Runner Deployment (20 Min)
5. ✅ Frontend Deployment (15 Min)
6. ✅ Custom Domain (Optional, 15 Min)

**Gesamtzeit: ~60-90 Minuten** ⏱️

---

## 💰 Erwartete Kosten

### Standard Setup:
- **App Runner Backend:** ~25-50€/Monat
- **RDS PostgreSQL:** 0€ (Free Tier 12 Monate), dann ~15€
- **Data Transfer:** ~5€/Monat
- **Total:** ~30-70€/Monat

### Optimiert (siehe COST_OPTIMIZATION.md):
- **Frontend S3 + CloudFront:** ~3-5€/Monat (statt 30€!)
- **Backend Auto-Scale:** ~15-30€/Monat
- **RDS Reserved:** ~9€/Monat (statt 15€)
- **Total:** ~30-50€/Monat ✅

---

## 📚 Dokumentation

### AWS_DEPLOYMENT_GUIDE.md
Die **Hauptanleitung** mit Screenshots und detaillierten Erklärungen:
- AWS-Account Setup
- RDS PostgreSQL Konfiguration
- App Runner Service erstellen
- Environment Variables setzen
- Domain & SSL Setup
- Troubleshooting

### MIGRATION_SCRIPT.md
Wenn du bereits Daten in SQLite hast:
- Automatische Migration mit pgloader
- Manueller Export/Import
- Node.js Migration Script
- Testing & Validation

### COST_OPTIMIZATION.md
Spare bis zu 50% der Kosten:
- Frontend auf S3 + CloudFront (~30€ gespart!)
- RDS Reserved Instances (40% Rabatt)
- Auto-Scaling Optimierung
- CloudWatch Logs Retention
- Monitoring & Alerts

---

## 🛠️ Technische Details

### App Runner Konfiguration
```yaml
runtime: nodejs18
port: 5000
auto-scaling:
  min: 1
  max: 5
```

### Database
- **Engine:** PostgreSQL 15.x
- **Instance:** db.t3.micro (Free Tier eligible)
- **Storage:** 20 GB SSD
- **Backups:** 7 Tage automatisch

### Sicherheit
- ✅ HTTPS/SSL automatisch
- ✅ VPC Isolation
- ✅ RDS Security Groups
- ✅ Environment Variables encrypted

---

## 🚦 Status Check

Nach dem Deployment, teste:

```bash
# Backend Health
curl https://your-app-runner-url.awsapprunner.com/health

# Response sollte sein:
{
  "status": "healthy",
  "timestamp": "2025-01-02T10:00:00.000Z",
  "database": "connected"
}
```

---

## 🆘 Hilfe benötigt?

### Häufige Probleme:

**Database Connection Failed:**
- Security Group: Port 5432 offen?
- DATABASE_URL korrekt kopiert?
- RDS Status "Available"?

**App Runner Deployment Failed:**
- Logs ansehen in AWS Console
- Environment Variables gesetzt?
- Build-Fehler in Logs?

**502 Bad Gateway:**
- Backend erreichbar? `/health` testen
- Port 5000 korrekt?
- Startup-Fehler in Logs?

### Logs ansehen:
```bash
# In AWS Console
App Runner → Service → Logs → Application logs

# Oder mit AWS CLI
aws logs tail /aws/apprunner/whatsappbot-service --follow
```

---

## 📈 Nächste Schritte

Nach erfolgreichem Deployment:

1. ✅ **Custom Domain** einrichten (Optional)
2. ✅ **Cost Optimization** durchführen
3. ✅ **Monitoring** einrichten (CloudWatch Alerts)
4. ✅ **Backup-Strategie** testen
5. ✅ **CI/CD** mit GitHub Actions (Advanced)

---

## 🎓 Weiterführende Ressourcen

- **AWS App Runner Docs:** https://docs.aws.amazon.com/apprunner/
- **AWS RDS PostgreSQL:** https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html
- **AWS Pricing Calculator:** https://calculator.aws/
- **PostgreSQL Best Practices:** https://aws.amazon.com/rds/postgresql/best-practices/

---

## ✅ Pre-Deployment Checklist

Bevor du startest:

- [ ] AWS Account erstellt & verifiziert
- [ ] Kreditkarte hinterlegt
- [ ] Region gewählt: EU (Frankfurt) - `eu-central-1`
- [ ] OpenAI API Key bereit
- [ ] GitHub Repository ready (mit Code gepusht)
- [ ] WhatsApp API Credentials (falls genutzt)
- [ ] 60-90 Minuten Zeit eingeplant

---

## 🎉 Nach erfolgreichem Deployment

Deine App läuft jetzt auf AWS!

- ✅ **Automatisches Scaling** (1-5 Instances)
- ✅ **HTTPS/SSL** aktiviert
- ✅ **Auto-Deploy** bei Git-Push
- ✅ **PostgreSQL** mit Backups
- ✅ **99.9% Uptime** (AWS SLA)

**Kosten:** ~30-70€/Monat (optimierbar auf ~30-50€)

---

**Ready? Los geht's! 🚀**

Öffne: `AWS_DEPLOYMENT_GUIDE.md` und folge den Schritten!

