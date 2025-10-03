# 🚀 GitHub Actions CI/CD Setup

## ✅ Was ist eingerichtet?

Automatisches Deployment bei Git Push auf `master` Branch:

- **Backend Workflow:** `.github/workflows/deploy-backend.yml`
- **Frontend Workflow:** `.github/workflows/deploy-frontend.yml`

---

## 🔐 GitHub Secrets einrichten

**WICHTIG:** Du musst AWS Credentials als GitHub Secrets hinzufügen!

### **Schritt 1: GitHub Secrets öffnen**

1. Gehe zu: https://github.com/exploreforce/leylaAI/settings/secrets/actions
2. Oder: Repository → Settings → Secrets and variables → Actions

### **Schritt 2: AWS Access Keys erstellen**

#### **Option A: Über AWS Console (EINFACHER)**

1. **AWS Console öffnen:** https://console.aws.amazon.com/iam
2. **IAM → Users → Deinen User auswählen**
3. **Security credentials** Tab
4. **Create access key**
5. **Use case:** CLI
6. **Next** → **Create access key**
7. ⚠️ **WICHTIG:** Notiere dir:
   - `Access key ID`
   - `Secret access key`

#### **Option B: Über AWS CLI**

```bash
aws iam create-access-key --user-name [DEIN_USERNAME]
```

### **Schritt 3: Secrets in GitHub hinzufügen**

Füge folgende Secrets hinzu (auf der GitHub Secrets Seite):

| Secret Name | Value | Beschreibung |
|-------------|-------|--------------|
| `AWS_ACCESS_KEY_ID` | `AKIA...` | Deine AWS Access Key ID |
| `AWS_SECRET_ACCESS_KEY` | `xxxx...` | Deine AWS Secret Access Key |

**So fügst du Secrets hinzu:**
1. Klicke **"New repository secret"**
2. Name: `AWS_ACCESS_KEY_ID`
3. Value: Deine Access Key ID
4. **Add secret**
5. Wiederhole für `AWS_SECRET_ACCESS_KEY`

---

## ⚙️ IAM Permissions benötigt

Die AWS Access Keys benötigen folgende Permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "apprunner:StartDeployment",
        "apprunner:DescribeService"
      ],
      "Resource": [
        "arn:aws:apprunner:eu-central-1:948451198730:service/whatsappbot-backend/*",
        "arn:aws:apprunner:eu-central-1:948451198730:service/whatsappbot-frontend/*"
      ]
    }
  ]
}
```

**Falls du keine Admin-Rechte hast:**
- Bitte deinen AWS Admin, diese Policy für deinen User zu erstellen
- Oder verwende einen User, der bereits Admin-Rechte hat

---

## 🧪 Testen

### **Test 1: Manueller Trigger**

Gehe zu: https://github.com/exploreforce/leylaAI/actions

1. Wähle **"Deploy Backend to AWS App Runner"** oder **"Deploy Frontend to AWS App Runner"**
2. Klicke **"Run workflow"**
3. Branch: `master`
4. **Run workflow**

**Was passiert:**
- Workflow startet
- Docker Image wird gebaut
- Image wird zu ECR gepusht
- App Runner Deployment wird getriggert
- Status wird angezeigt

### **Test 2: Automatischer Trigger (Git Push)**

```bash
# Backend ändern
echo "// Test" >> backend/src/index.ts
git add backend/src/index.ts
git commit -m "test: Trigger backend deployment"
git push origin master

# → Backend Workflow startet automatisch!
```

```bash
# Frontend ändern
echo "// Test" >> frontend/src/app/page.tsx
git add frontend/src/app/page.tsx
git commit -m "test: Trigger frontend deployment"
git push origin master

# → Frontend Workflow startet automatisch!
```

---

## 📊 Workflow Triggers

### **Backend Deployment** läuft wenn:
- ✅ Push auf `master` Branch
- ✅ Änderungen in `backend/**`
- ✅ Änderungen in `Dockerfile.backend.prod`
- ✅ Änderungen in `.github/workflows/deploy-backend.yml`
- ✅ Manuell getriggert via GitHub Actions UI

### **Frontend Deployment** läuft wenn:
- ✅ Push auf `master` Branch
- ✅ Änderungen in `frontend/**`
- ✅ Änderungen in `Dockerfile.frontend.prod`
- ✅ Änderungen in `.github/workflows/deploy-frontend.yml`
- ✅ Manuell getriggert via GitHub Actions UI

**WICHTIG:** Änderungen an anderen Dateien (z.B. README, Docs) triggern **KEIN** Deployment!

---

## 🔄 Deployment Flow

```
1. Code ändern & auf GitHub pushen
   ↓
2. GitHub Actions startet automatisch
   ↓
3. Docker Image wird gebaut (Ubuntu Runner)
   ↓
4. Image wird zu ECR gepusht
   ↓
5. App Runner Deployment wird getriggert
   ↓
6. App Runner pullt neues Image
   ↓
7. Health Check (bis zu 5 Minuten)
   ↓
8. ✅ Neue Version ist live!
```

**Dauer:** ~5-10 Minuten

---

## 📝 Workflow Logs anschauen

1. Gehe zu: https://github.com/exploreforce/leylaAI/actions
2. Klicke auf einen Workflow-Run
3. Klicke auf **"Build and Deploy Backend"** oder **"Build and Deploy Frontend"**
4. Sieh dir die Logs an

**Was du siehst:**
- Build-Logs
- Docker Push Status
- App Runner Deployment Status
- Deployment Summary

---

## ⚠️ Troubleshooting

### **Fehler: "AWS credentials not configured"**

**Problem:** GitHub Secrets nicht korrekt gesetzt

**Lösung:**
1. Checke GitHub Secrets: https://github.com/exploreforce/leylaAI/settings/secrets/actions
2. Stelle sicher, dass `AWS_ACCESS_KEY_ID` und `AWS_SECRET_ACCESS_KEY` existieren
3. Werte müssen korrekt sein (keine Leerzeichen!)

### **Fehler: "Access Denied"**

**Problem:** AWS User hat nicht genug Permissions

**Lösung:**
1. Checke IAM Permissions (siehe oben)
2. Stelle sicher, dass User ECR & App Runner Zugriff hat

### **Fehler: "Deployment timeout"**

**Problem:** App Runner braucht zu lange

**Lösung:**
- Normal bei großen Images (bis zu 5 Min)
- Checke AWS Console für Details
- Workflow wird trotzdem erfolgreich sein

### **Workflow läuft nicht automatisch**

**Problem:** Falscher Branch oder falscher Pfad

**Lösung:**
- Pushe auf `master` Branch
- Stelle sicher, dass du Dateien in `backend/` oder `frontend/` änderst

---

## 🎯 Best Practices

1. **Feature Branches verwenden:**
   ```bash
   git checkout -b feature/neue-funktion
   # Code ändern
   git push origin feature/neue-funktion
   # → Kein Deployment (nur bei master!)
   ```

2. **Pull Requests erstellen:**
   - Merge erst nach Code Review
   - Deployment passiert erst nach Merge zu `master`

3. **Rollback bei Problemen:**
   - Gehe zu GitHub Actions
   - Suche letzten erfolgreichen Run
   - Klicke **"Re-run all jobs"**

4. **Monitoring:**
   - Checke GitHub Actions Dashboard regelmäßig
   - Schaue CloudWatch Logs für Runtime-Fehler

---

## 📞 Support

Bei Problemen:
- **GitHub Actions Logs:** https://github.com/exploreforce/leylaAI/actions
- **AWS CloudWatch:** https://eu-central-1.console.aws.amazon.com/cloudwatch
- **App Runner Console:** https://eu-central-1.console.aws.amazon.com/apprunner

---

## ✅ Checkliste

- [ ] AWS Access Keys erstellt
- [ ] GitHub Secrets hinzugefügt (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- [ ] Workflows auf GitHub gepusht
- [ ] Manueller Test erfolgreich
- [ ] Automatischer Test (Git Push) erfolgreich

**Sobald alles ✅ ist, hast du vollautomatisches CI/CD! 🚀**

