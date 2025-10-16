# Admin Dashboard - Deployment Guide

## 🚀 Lokale Einrichtung (Optional)

Falls du lokal testen möchtest:

```bash
# 1. Backend Migrationen ausführen
cd backend
npx knex migrate:latest

# 2. Seeds ausführen (macht susi@susi.com zum Admin)
npx knex seed:run

# 3. Frontend Dependencies installieren
cd ../frontend
npm install

# 4. Server starten
cd ../backend
npm run dev

cd ../frontend
npm run dev
```

## ☁️ AWS Deployment

### Pre-Deployment Checklist

**Datenbank Migrationen:**
Die folgenden Migrationen müssen auf AWS ausgeführt werden:

1. `20251016000000_add_user_roles.js` - Fügt `role` Spalte hinzu
2. `20251016000001_add_stats_indexes.js` - Optimiert Stats Queries
3. `20251016000002_make_susi_admin.js` - Macht susi@susi.com zum Admin

**Deployment Schritte:**

### 1. Backend Migration auf AWS

Nach dem Deployment des Backend auf AWS RDS/EC2:

```bash
# SSH in EC2 oder über AWS Systems Manager
cd /path/to/backend

# Migrationen ausführen
npx knex migrate:latest

# Optional: Seeds ausführen (falls susi@susi.com noch nicht existiert)
npx knex seed:run
```

### 2. Environment Variables

Stelle sicher, dass folgende Environment Variables auf AWS gesetzt sind:

**Backend (EC2/App Runner):**
```
NODE_ENV=production
DATABASE_URL=postgresql://... (oder SQLite path)
JWT_SECRET=your-secure-jwt-secret
OPENAI_API_KEY=your-openai-key
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

**Frontend (Amplify/App Runner):**
```
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

### 3. Deployment Commands

**Backend:**
```bash
# Build Backend
cd backend
npm run build

# Deploy via Docker (falls du Docker verwendest)
docker build -t whatsapp-bot-backend -f Dockerfile .
docker push your-registry/whatsapp-bot-backend:latest
```

**Frontend:**
```bash
# Build Frontend
cd frontend
npm run build

# Deploy via AWS Amplify oder als Static Export
npm run export
```

### 4. Post-Deployment Verification

Nach dem Deployment:

1. **Prüfe ob Migrationen erfolgreich waren:**
   - Logge dich in die AWS Datenbank ein
   - Prüfe ob `users` Tabelle eine `role` Spalte hat
   - Prüfe ob User `susi@susi.com` `role = 'admin'` hat

2. **Teste Admin Login:**
   - Gehe zu `https://your-frontend-url.com/auth/login`
   - Login mit: `susi@susi.com` / `susisusi`
   - Dashboard Link sollte in der Navigation erscheinen

3. **Teste Dashboard:**
   - Navigiere zu `/dashboard`
   - Statistiken sollten geladen werden
   - Charts sollten rendern
   - Export Button sollte CSV herunterladen

### 5. Troubleshooting

**Problem: "role column does not exist"**
```bash
# Lösung: Migrationen wurden nicht ausgeführt
cd backend
npx knex migrate:latest
```

**Problem: "403 Forbidden" beim Dashboard Zugriff**
```bash
# Lösung: User ist kein Admin
# Verbinde dich zur Datenbank und führe aus:
UPDATE users SET role = 'admin' WHERE email = 'susi@susi.com';
```

**Problem: Charts werden nicht angezeigt**
```bash
# Lösung: Chart.js Dependencies fehlen
cd frontend
npm install chart.js react-chartjs-2
npm run build
```

**Problem: Stats API gibt 500 zurück**
```bash
# Lösung: Indexes wurden nicht erstellt
cd backend
npx knex migrate:latest
# Migration 20251016000001_add_stats_indexes.js sollte ausgeführt werden
```

## 📊 Verfügbare Stats Endpoints

Nach dem Deployment sind folgende Endpoints verfügbar (nur für Admins):

- `GET /api/stats/overview` - Dashboard Übersicht
- `GET /api/stats/appointments` - Detaillierte Termin-Stats
- `GET /api/stats/services` - Service Performance
- `GET /api/stats/timeline` - Timeline Daten (mit period parameter)
- `GET /api/stats/export` - CSV Export

## 🔐 Security Notes

- Admin-Zugriff ist über `requireAdmin` Middleware geschützt
- JWT Token wird in allen Requests validiert
- Non-Admin Users bekommen 403 Forbidden
- Protected Routes prüfen Admin-Status clientseitig

## 📝 Testing auf AWS

1. Login als Admin: `susi@susi.com` / `susisusi`
2. Dashboard sollte in der Navigation erscheinen
3. Teste alle Features:
   - Date Range Filter
   - Period Selection (Täglich/Wöchentlich/Monatlich)
   - Charts laden und rendern
   - CSV Export funktioniert
   - Red Flag Log zeigt Daten
   - Top Customers Tabelle zeigt Daten

## 🔄 Rollback Plan

Falls etwas schief geht:

```bash
# Rollback Migrationen
cd backend
npx knex migrate:rollback

# Falls nur Admin-Rolle entfernt werden soll
UPDATE users SET role = 'user' WHERE email = 'susi@susi.com';
```

## ✅ Success Criteria

Das Dashboard ist erfolgreich deployed wenn:

- [x] User `susi@susi.com` hat `role = 'admin'`
- [x] Dashboard Link erscheint für Admin-User
- [x] `/dashboard` Route ist erreichbar
- [x] Stats API Endpoints geben Daten zurück
- [x] Charts rendern korrekt
- [x] CSV Export funktioniert
- [x] Non-Admin Users bekommen 403

---

**Deployment Status:** Ready for AWS Deployment 🚀

