# GitHub CI/CD - Automatische Datenbank-Migrationen

## 🎯 Übersicht

Datenbank-Migrationen werden **automatisch beim Container-Start** ausgeführt - **keine GitHub Secrets nötig!**

## ⚙️ Wie funktioniert es?

### Container-Start Migrations

Der Docker Container führt Migrationen automatisch beim Start aus:

```dockerfile
# Dockerfile.backend.prod - CMD Zeile
CMD ["sh", "-c", "npx knex migrate:latest && node dist/index.js"]
```

**Vorteile:**
- ✅ Keine zusätzlichen Secrets erforderlich
- ✅ Migrationen nutzen die bereits in App Runner konfigurierten Environment Variables
- ✅ Automatisch bei jedem Deployment
- ✅ Fehler werden im Container-Log sichtbar

### Vorhandene Secrets (unverändert)

Die folgenden Secrets sind bereits konfiguriert und ausreichend:

- ✅ `AWS_ACCESS_KEY_ID`
- ✅ `AWS_SECRET_ACCESS_KEY`

## 🚀 Workflow

### Automatischer Ablauf

Bei jedem `git push` auf den `master` Branch:

1. ✅ Code wird ausgecheckt
2. ✅ Docker Image wird gebaut (inkl. Migrations-Dateien)
3. ✅ Image wird zu AWS ECR gepusht
4. ✅ App Runner Deployment wird getriggert
5. ✅ Warten bis Deployment erfolgreich ist
6. ✅ **Container startet und führt Migrationen automatisch aus** 🆕
7. ✅ Server startet nach erfolgreichen Migrationen
8. ✅ Summary wird angezeigt

### Container-Start Ablauf

```bash
🔄 Running database migrations...
Batch 1 run: 3 migrations
  20251016000000_add_user_roles.js
  20251016000001_add_stats_indexes.js
  20251016000002_make_susi_admin.js
✅ Migrations completed successfully

🚀 Starting server...
Server listening on port 5000
```

## 📊 Aktuell ausstehende Migrationen

Nach dem nächsten Deployment werden folgende Migrationen automatisch ausgeführt:

1. **20251016000000_add_user_roles.js**
   - Fügt `role` Spalte zur `users` Tabelle hinzu
   - Default: 'user', Admin: 'admin'

2. **20251016000001_add_stats_indexes.js**
   - Fügt Performance-Indexes für Dashboard-Queries hinzu
   - `appointments`: Index auf `(account_id, status, created_at)`
   - `appointments`: Index auf `(appointment_type, status)`
   - `chat_messages`: Index auf `(session_id, timestamp)`
   - `chat_messages`: GIN Index auf `metadata` (PostgreSQL)

3. **20251016000002_make_susi_admin.js**
   - Setzt `susi@susi.com` als Admin
   - Fallback: Erstellt neuen Admin-User, falls User nicht existiert

## ✅ Vorteile

- 🔄 **Automatisch**: Keine manuellen Migrations-Schritte mehr nötig
- 🛡️ **Sicher**: Migrations laufen erst nach erfolgreichem Deployment
- 📝 **Nachvollziehbar**: Alle Migrations-Logs in GitHub Actions sichtbar
- ⚡ **Schnell**: Direkt nach Deployment verfügbar

## 🔍 Monitoring

### Container-Logs in AWS CloudWatch prüfen

Die Migrations-Logs sind direkt in den Container-Logs sichtbar:

**Option A: AWS Console**
1. Gehe zu: [AWS App Runner Console](https://eu-central-1.console.aws.amazon.com/apprunner)
2. Klicke auf **whatsappbot-backend**
3. Gehe zu **Logs** Tab
4. Schaue nach den Zeilen:
   ```
   🔄 Running database migrations...
   Batch 1 run: 3 migrations
   ✅ Migrations completed successfully
   ```

**Option B: AWS CLI**
```bash
# Application Logs (Migrations sind hier)
aws logs tail /aws/apprunner/whatsappbot-backend/caecd6b0f8fd4235a8b5e8b2305d62a9/application \
  --region eu-central-1 \
  --follow

# Service Logs (Deployment Status)
aws logs tail /aws/apprunner/whatsappbot-backend/caecd6b0f8fd4235a8b5e8b2305d62a9/service \
  --region eu-central-1 \
  --follow
```

### GitHub Actions prüfen

1. Gehe zu: **GitHub Repository** → **Actions**
2. Klicke auf den neuesten Workflow-Run
3. Schaue dir den Step **"Wait for deployment"** an
4. Status sollte `RUNNING` sein nach erfolgreichem Deployment

## 🚨 Troubleshooting

### Fehler: "DATABASE_URL not set"

**Ursache**: Environment Variable fehlt in App Runner Konfiguration

**Lösung**: 
1. Gehe zu: [AWS App Runner Console](https://eu-central-1.console.aws.amazon.com/apprunner)
2. Klicke auf **whatsappbot-backend**
3. Gehe zu **Configuration** → **Edit**
4. Überprüfe, dass `DATABASE_URL` gesetzt ist
5. Speichern und neu deployen

### Fehler: "Connection refused" oder "ECONNREFUSED"

**Ursachen**:
1. RDS Security Group blockiert Zugriff von App Runner
2. DATABASE_URL hat falsches Format
3. RDS Instanz ist gestoppt

**Lösung**: 
1. **Security Group prüfen:**
   - Gehe zu: [RDS Console](https://eu-central-1.console.aws.amazon.com/rds)
   - Klicke auf **whatsappbot-db**
   - Gehe zu **Connectivity & security**
   - Prüfe Security Group Inbound Rules
   - Port 5432 muss von App Runner VPC oder 0.0.0.0/0 erreichbar sein

2. **DATABASE_URL Format prüfen:**
   ```
   postgresql://USERNAME:PASSWORD@whatsappbot-db.chwsoysw4ghw.eu-central-1.rds.amazonaws.com:5432/whatsappbot?ssl=true
   ```

3. **RDS Status prüfen:**
   ```bash
   aws rds describe-db-instances --db-instance-identifier whatsappbot-db --region eu-central-1 --query 'DBInstances[0].DBInstanceStatus'
   ```

### Fehler: "Migration already ran"

**Normal**: Migrationen, die bereits ausgeführt wurden, werden übersprungen
- Knex verwaltet Migration-Status in der `knex_migrations` Tabelle
- Keine Aktion nötig ✅

### Container startet nicht / bleibt im "OPERATION_IN_PROGRESS" Status

**Ursache**: Migrations-Fehler verhindern Container-Start

**Lösung**: 
1. Prüfe CloudWatch Logs (siehe oben)
2. Suche nach Fehler-Meldungen in den Migrations
3. Rollback zur vorherigen Version:
   ```bash
   aws apprunner start-deployment \
     --service-arn arn:aws:apprunner:eu-central-1:948451198730:service/whatsappbot-backend/caecd6b0f8fd4235a8b5e8b2305d62a9 \
     --region eu-central-1
   ```

### Manuelle Migration (Fallback)

Falls du Migrationen manuell ausführen musst (z.B. für Rollback):

```bash
# Lokal mit Production DB (VORSICHT!)
cd backend
NODE_ENV=production DATABASE_URL="postgresql://..." npx knex migrate:latest

# Oder über AWS CLI in der RDS direkt
# (Empfohlen: Nutze einen EC2 Bastion Host oder Cloud9 IDE)
```

## 📝 Nächste Schritte

Der nächste Push wird automatisch deployen und migrieren:

1. ✅ Push deinen Code: `git push origin master`
2. ✅ Warte auf GitHub Actions Workflow (Build & Deploy)
3. ✅ Container startet automatisch und führt Migrationen aus
4. ✅ Überprüfe CloudWatch Logs für Migration-Status
5. ✅ Teste das Admin Dashboard: https://arki44wiab.eu-central-1.awsapprunner.com/dashboard
6. ✅ Login mit: `susi@susi.com` / `susisusi`

---

## 🔑 Wo finde ich meine RDS Credentials? (Optional)

Falls du die Credentials brauchst (z.B. für lokale Entwicklung):

**Option A: AWS Secrets Manager** (falls konfiguriert)
```bash
aws secretsmanager get-secret-value \
  --secret-id whatsappbot-db-credentials \
  --region eu-central-1 \
  --query SecretString \
  --output text
```

**Option B: App Runner Environment Variables**
1. Gehe zu: [AWS App Runner Console](https://eu-central-1.console.aws.amazon.com/apprunner)
2. Klicke auf **whatsappbot-backend**
3. Gehe zu **Configuration** → **Environment variables**
4. Schaue nach `DATABASE_URL` - dort sind Username und Password enthalten

**Option C: Parameter Store** (falls konfiguriert)
```bash
aws ssm get-parameter \
  --name /whatsappbot/production/database-url \
  --with-decryption \
  --region eu-central-1
```

---

**Status**: 🟢 Bereit für automatische Migrationen (keine zusätzlichen Secrets nötig!)


