# 💰 AWS Kosten-Optimierung Guide

So hältst du deine AWS-Kosten niedrig bei gleichzeitig guter Performance!

---

## 📊 Aktuelle Kosten-Schätzung

### Basis Setup (wie im Guide)

| Service | Spezifikation | Kosten/Monat |
|---------|--------------|--------------|
| App Runner Backend | 1 vCPU, 2 GB, immer an | ~25-50€ |
| App Runner Frontend | 1 vCPU, 2 GB, immer an | ~25-50€ |
| RDS PostgreSQL | db.t3.micro | 0€ (Free Tier), dann ~15€ |
| Data Transfer | ~10 GB out | ~5€ |
| **TOTAL** | | **~55-120€/Monat** |

---

## 🎯 Optimierungs-Strategien

### 1. Frontend als Static Site (Spare ~30€/Monat!)

**Statt:** App Runner für Frontend (~30-50€)  
**Nutze:** S3 + CloudFront (~3-5€)

#### Warum?
- Next.js kann statische Seiten generieren
- S3 ist extrem günstig für statische Files
- CloudFront ist CDN → schneller weltweit!

#### Setup (15 Minuten):

**Schritt 1: Next.js Static Export aktivieren**

```javascript
// frontend/next.config.js
module.exports = {
  output: 'export',  // Aktiviert Static Export
  images: {
    unoptimized: true  // Für S3 nötig
  }
}
```

**Schritt 2: Build erstellen**

```bash
cd frontend
npm run build
# Erstellt: frontend/out/ Ordner
```

**Schritt 3: S3 Bucket erstellen**

1. AWS Console → S3
2. "Create bucket"
   - Name: `whatsappbot-frontend` (eindeutig!)
   - Region: `eu-central-1`
   - ☐ Block all public access (für CloudFront OK)
3. Create bucket

**Schritt 4: Files hochladen**

```bash
# AWS CLI installieren (einmalig)
aws configure  # AWS Credentials eingeben

# Upload
aws s3 sync frontend/out/ s3://whatsappbot-frontend/ --delete
```

**Schritt 5: CloudFront Distribution**

1. AWS Console → CloudFront
2. "Create distribution"
   - Origin domain: `whatsappbot-frontend.s3.eu-central-1.amazonaws.com`
   - Origin access: **Origin access control (OAC)**
   - Viewer protocol policy: **Redirect HTTP to HTTPS**
   - Cache policy: **CachingOptimized**
   - Price class: **Europe only** (günstiger!)
3. Create

**Kosten:** ~3-5€/Monat statt 30-50€! 💰

---

### 2. RDS auf Reserved Instance (Spare 40%!)

**Nach 1 Monat Testing:**

1. AWS Console → RDS → Reserved Instances
2. "Purchase reserved DB instance"
   - Term: **1 Year** (40% Rabatt)
   - DB instance class: `db.t3.micro`
   - Payment: **All upfront** (höchster Rabatt)

**Kosten:**
- Ohne Reserved: ~15€/Monat = 180€/Jahr
- Mit Reserved (1 Jahr): ~108€/Jahr = **9€/Monat** ✅

---

### 3. App Runner Auto-Pause (Beta Feature)

**Für wenig Traffic:**

1. Service → Configuration → Edit
2. **Provisioned instances:** 0 (falls verfügbar in deiner Region)
3. Auto-scaling:
   - Min: **0** (pausiert bei 0 Traffic!)
   - Max: **3**

**Effekt:** Bei 0 Traffic → 0 Kosten für Compute!

**Achtung:** Cold Start (~5 Sekunden) beim ersten Request

**Kosten:** Nur zahlen wenn Traffic da ist! Kann auf ~5-15€/Monat sinken

---

### 4. CloudWatch Logs reduzieren

**Standard:** Alle Logs werden gespeichert → teuer bei viel Traffic

**Optimierung:**

1. CloudWatch → Log Groups
2. Finde: `/aws/apprunner/whatsappbot-service`
3. Actions → Edit retention settings
4. **Retention:** 7 days (statt "Never expire")

**Kosten:** ~70% weniger Log-Kosten

---

### 5. RDS Storage Optimierung

**RDS kann teuer werden wenn Storage wächst!**

**Check regelmäßig:**
```sql
-- In PostgreSQL
SELECT 
  pg_size_pretty(pg_database_size('whatsappbot')) as db_size;
```

**Optimierungen:**
- Alte Chat-Sessions archivieren (>6 Monate)
- Alte Appointments löschen (>2 Jahre)
- File-Uploads nicht in DB → S3 nutzen!

**Script zum Cleanup:** `backend/scripts/cleanup-old-data.sql`

```sql
-- Lösche Test-Chats älter als 3 Monate
DELETE FROM chat_messages 
WHERE session_id IN (
  SELECT id FROM test_chat_sessions 
  WHERE created_at < NOW() - INTERVAL '3 months'
);

-- Archiviere alte Termine (in separate Archive-Tabelle)
INSERT INTO appointments_archive 
SELECT * FROM appointments 
WHERE created_at < NOW() - INTERVAL '2 years';

DELETE FROM appointments 
WHERE created_at < NOW() - INTERVAL '2 years';
```

---

### 6. Caching mit CloudFront

**Für API-Endpoints die sich selten ändern:**

```javascript
// backend/src/index.ts
app.get('/api/services/:id', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');  // 1 Stunde Cache
  // ... rest of code
});
```

**Effekt:** CloudFront cached Responses → weniger Backend-Requests → günstiger!

---

### 7. Regionale Einschränkung

**Wenn du nur Europa bedienst:**

**CloudFront:**
- Price class: **Europe only** (günstiger als "All edge locations")

**App Runner:**
- Region: **eu-central-1** (Frankfurt) ✅

**RDS:**
- Multi-AZ: **Disabled** (für Start OK)

**Einsparung:** ~20% bei Data Transfer

---

## 🎯 Optimierungs-Roadmap

### Phase 1: Sofort (Tag 1)
- ✅ CloudWatch Logs auf 7 Tage
- ✅ RDS Multi-AZ disabled
- ✅ CloudFront Europe only

**Einsparung:** ~10€/Monat

### Phase 2: Nach 1 Woche
- ✅ Frontend auf S3 + CloudFront
- ✅ API Caching aktivieren

**Einsparung:** ~35€/Monat

### Phase 3: Nach 1 Monat
- ✅ RDS Reserved Instance kaufen
- ✅ App Runner Auto-Pause testen

**Einsparung:** ~10-20€/Monat

### Phase 4: Laufend
- ✅ Alte Daten cleanup (monatlich)
- ✅ Kosten-Alerts überwachen

**Einsparung:** ~5€/Monat

---

## 💡 Finale Kosten-Schätzung (Optimiert)

### Bei 1000+ Nutzern/Monat:

| Service | Optimierung | Kosten |
|---------|-------------|--------|
| App Runner Backend | Auto-scale 0-3 | ~15-30€ |
| Frontend | S3 + CloudFront | ~3-5€ |
| RDS PostgreSQL | Reserved Instance | ~9€ |
| Data Transfer | Europe only | ~3€ |
| CloudWatch | 7 days retention | ~1€ |
| **TOTAL** | | **~31-48€/Monat** ✅ |

**Gegenüber unoptimiert:** ~100€/Monat gespart! 🎉

---

## 📊 Kosten-Monitoring Setup

### 1. Budget erstellen

1. AWS Console → Billing → Budgets
2. "Create budget"
   - Budget type: **Cost budget**
   - Name: `Monthly Budget`
   - Amount: `50€`
3. Alert:
   - Threshold: 80% (40€)
   - Email: deine@email.com

### 2. Cost Explorer aktivieren

1. AWS Console → Cost Explorer
2. Enable Cost Explorer
3. Erstelle Report: "Daily costs by service"

### 3. Kosten-Dashboard

**Wichtigste Metriken:**
- App Runner Compute Hours
- RDS Instance Hours
- Data Transfer Out
- CloudWatch Logs Storage

---

## 🚨 Cost Spikes verhindern

### Häufige Kosten-Fallen:

1. **App Runner läuft 24/7 ohne Traffic**
   - Lösung: Auto-scale auf 0 wenn möglich

2. **CloudWatch Logs nie gelöscht**
   - Lösung: 7-30 Tage Retention

3. **RDS Storage wächst unkontrolliert**
   - Lösung: Monatlicher Cleanup

4. **NAT Gateway vergessen**
   - Lösung: Für Start nicht nötig!

5. **Load Balancer läuft ohne Grund**
   - Lösung: App Runner hat built-in LB!

---

## 🎓 Pro-Tipps

### Für unter 30€/Monat:

1. **Frontend:** S3 + CloudFront (static)
2. **Backend:** App Runner mit Min=0 Instances
3. **Database:** RDS Free Tier (12 Monate), dann Reserved
4. **Logs:** 3-7 Tage retention
5. **Region:** Nur EU
6. **Scheduled Tasks:** Lambda statt 24/7 Container

### Für Production (50-100€/Monat):

1. **Frontend:** S3 + CloudFront
2. **Backend:** App Runner Min=1, Max=5
3. **Database:** RDS Reserved Instance
4. **Cache:** ElastiCache Redis (optional, +15€)
5. **Monitoring:** CloudWatch + SNS Alerts
6. **Backup:** Automated RDS Backups

---

## ✅ Checklist

- [ ] CloudWatch Logs auf 7 Tage
- [ ] Frontend auf S3 + CloudFront migriert
- [ ] RDS Reserved Instance gekauft (nach 1 Monat)
- [ ] App Runner Auto-Scaling konfiguriert
- [ ] Budget Alert bei 40€ aktiviert
- [ ] Monatlicher Cleanup-Job eingerichtet
- [ ] Cost Explorer Dashboard erstellt
- [ ] Regionale Einschränkung (Europe only)

---

**Mit diesen Optimierungen: 30-50€/Monat für Production-ready Setup! 🚀**

