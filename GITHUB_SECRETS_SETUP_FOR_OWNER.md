# 🔐 GitHub Secrets Setup - Für Repository Owner

**An: exploreforce (Repository Owner)**  
**Von: Domi (Co-Developer)**

---

## ✅ Was muss gemacht werden?

Ich habe **GitHub Actions CI/CD** für automatisches Deployment eingerichtet! 🚀

**Damit es funktioniert, musst du als Owner 2 GitHub Secrets hinzufügen.**

---

## 🔑 AWS Credentials

Ich habe AWS Access Keys erstellt, die ich dir gebe:

```
AWS_ACCESS_KEY_ID=AKIA******************
AWS_SECRET_ACCESS_KEY=****************************************
```

**🔒 Die echten Keys wurden dir separat/privat mitgeteilt.**

**⚠️ WICHTIG:** Diese Keys sind nur für GitHub Actions (automatisches Deployment), **NICHT** für die laufende App!

---

## 📋 Schritt-für-Schritt Anleitung

### **Schritt 1: GitHub Secrets Seite öffnen**

Gehe zu: https://github.com/exploreforce/leylaAI/settings/secrets/actions

**Oder:**
1. Repository öffnen
2. **Settings** Tab
3. Links: **Secrets and variables** → **Actions**

---

### **Schritt 2: Erstes Secret hinzufügen**

1. Klicke **"New repository secret"** (grüner Button oben rechts)

2. **Name:** (genau so eingeben!)
   ```
   AWS_ACCESS_KEY_ID
   ```

3. **Value:** (kopiere den echten Wert der dir privat mitgeteilt wurde!)
   ```
   AKIA******************
   ```

4. Klicke **"Add secret"** (grüner Button unten)

---

### **Schritt 3: Zweites Secret hinzufügen**

1. Klicke nochmal **"New repository secret"**

2. **Name:** (genau so eingeben!)
   ```
   AWS_SECRET_ACCESS_KEY
   ```

3. **Value:** (kopiere den echten Wert der dir privat mitgeteilt wurde!)
   ```
   ****************************************
   ```

4. Klicke **"Add secret"**

---

### **Schritt 4: Überprüfen**

Du solltest jetzt **2 Secrets** sehen:

```
✅ AWS_ACCESS_KEY_ID          Updated X seconds ago
✅ AWS_SECRET_ACCESS_KEY      Updated X seconds ago
```

---

## 🧪 Schritt 5: CI/CD testen (Optional)

Wenn du möchtest, können wir sofort testen:

1. Gehe zu: https://github.com/exploreforce/leylaAI/actions

2. Wähle **"Deploy Backend to AWS App Runner"**

3. Klicke **"Run workflow"**
   - Branch: `master`
   - **"Run workflow"**

4. **Warte 5-10 Minuten** → Workflow sollte erfolgreich durchlaufen! ✅

---

## ✅ Das war's!

Nach diesem Setup:
- ✅ Automatisches Deployment bei Git Push auf `master`
- ✅ Separate Workflows für Backend & Frontend
- ✅ Build-Logs in GitHub Actions
- ✅ Professional CI/CD Pipeline

---

## 📞 Bei Problemen

Falls etwas nicht klappt:
- Checke, dass die Secret **Namen** exakt stimmen (case-sensitive!)
- Checke, dass die Secret **Values** keine Leerzeichen am Anfang/Ende haben
- Schaue dir die GitHub Actions Logs an

---

## 🔒 Sicherheit

- ✅ Secrets sind verschlüsselt in GitHub gespeichert
- ✅ Werden niemals in Logs angezeigt
- ✅ Nur für GitHub Actions Workflows verfügbar
- ✅ Können jederzeit gelöscht/ersetzt werden

---

**Danke fürs Setup! 🙏**

*Nach dem Hinzufügen kannst du mir Bescheid geben, dann teste ich das CI/CD System!*

