# GitHub CI/CD - Automatische Datenbank-Migrationen

## 🎯 Übersicht

Der GitHub Actions Workflow führt jetzt **automatisch** Datenbank-Migrationen nach jedem erfolgreichen Backend-Deployment aus.

## ⚙️ Setup

### 1. GitHub Secret hinzufügen

Du musst das `DATABASE_URL` Secret in deinem GitHub Repository hinzufügen:

1. Gehe zu: **GitHub Repository** → **Settings** → **Secrets and variables** → **Actions**
2. Klicke auf **New repository secret**
3. Name: `DATABASE_URL`
4. Value: 
   ```
   postgresql://[USERNAME]:[PASSWORD]@whatsappbot-db.chwsoysw4ghw.eu-central-1.rds.amazonaws.com:5432/whatsappbot?ssl=true
   ```
   *(Ersetze `[USERNAME]` und `[PASSWORD]` mit deinen RDS-Credentials)*

5. Klicke auf **Add secret**

### 2. Vorhandene Secrets

Stelle sicher, dass folgende Secrets bereits konfiguriert sind:

- ✅ `AWS_ACCESS_KEY_ID`
- ✅ `AWS_SECRET_ACCESS_KEY`
- ✅ `DATABASE_URL` *(neu hinzugefügt)*

## 🚀 Workflow

### Automatischer Ablauf

Bei jedem `git push` auf den `master` Branch:

1. ✅ Code wird ausgecheckt
2. ✅ Docker Image wird gebaut
3. ✅ Image wird zu AWS ECR gepusht
4. ✅ App Runner Deployment wird getriggert
5. ✅ Warten bis Deployment erfolgreich ist
6. ✅ **Datenbank-Migrationen werden automatisch ausgeführt** 🆕
7. ✅ Summary wird angezeigt

### Migration Step Details

```yaml
- name: Run Database Migrations
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    NODE_ENV: production
  run: |
    echo "🗄️ Running database migrations..."
    cd backend
    npm ci --only=production
    npx knex migrate:latest
    echo "✅ Migrations completed successfully!"
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

### GitHub Actions prüfen

1. Gehe zu: **GitHub Repository** → **Actions**
2. Klicke auf den neuesten Workflow-Run
3. Schaue dir den Step **"Run Database Migrations"** an
4. Überprüfe die Logs:
   ```
   🗄️ Running database migrations...
   Batch 1 run: 3 migrations
   ✅ Migrations completed successfully!
   ```

### CloudWatch Logs prüfen

Falls Probleme auftreten, prüfe die Backend-Logs:

```bash
aws logs tail /aws/apprunner/whatsappbot-backend/caecd6b0f8fd4235a8b5e8b2305d62a9/application \
  --region eu-central-1 \
  --follow
```

## 🚨 Troubleshooting

### Fehler: "DATABASE_URL not set"

**Lösung**: Füge das `DATABASE_URL` Secret in GitHub hinzu (siehe Setup oben)

### Fehler: "Connection refused"

**Ursachen**:
1. RDS Security Group blockiert Zugriff von GitHub Actions IPs
2. DATABASE_URL ist falsch konfiguriert

**Lösung**: 
- Prüfe RDS Security Group Inbound Rules
- Erlaube Zugriff von GitHub Actions (0.0.0.0/0 für Public Access oder VPC Setup)

### Fehler: "Migration already ran"

**Normal**: Migrationen, die bereits ausgeführt wurden, werden übersprungen
- Knex verwaltet Migration-Status in der `knex_migrations` Tabelle
- Keine Aktion nötig ✅

### Manuelle Migration (Fallback)

Falls automatische Migrationen fehlschlagen, kannst du sie manuell ausführen:

```bash
# Lokal mit Production DB
cd backend
NODE_ENV=production DATABASE_URL="postgresql://..." npx knex migrate:latest

# Oder über AWS CLI/SSM (falls EC2/ECS)
aws ssm start-session --target <instance-id>
cd /app/backend
npx knex migrate:latest
```

## 📝 Nächste Schritte

Nach dem nächsten Push:

1. ✅ Push deinen Code: `git push origin master`
2. ✅ Warte auf GitHub Actions Workflow
3. ✅ Überprüfe, dass "Run Database Migrations" erfolgreich war
4. ✅ Teste das Admin Dashboard auf: https://arki44wiab.eu-central-1.awsapprunner.com/dashboard
5. ✅ Login mit: `susi@susi.com` / `susisusi`

---

**Status**: 🟢 Bereit für automatische Migrationen


