# WhatsApp Bot - Einfacher Start 🚀

## 🎯 Sofort loslegen (für Tester)

### Windows
**Option 1:** `start-project.bat` (Doppelklick)  
**Option 2:** `start-simple.bat` (Doppelklick, falls Option 1 nicht geht)

### macOS/Linux
**Option 1:** `./start-project.sh` (im Terminal)  
**Option 2:** `./start-simple.sh` (im Terminal, falls Option 1 nicht geht)

**Oder einfach doppelklick auf die .sh Dateien im Finder!**

Das war's! Das Script macht alles automatisch:
- ✅ Installiert Dependencies (Root + Frontend + Backend)
- ✅ Behebt Frontend-Probleme (.next Ordner)  
- ✅ Startet Backend + Frontend
- ✅ Öffnet auf http://localhost:3000

## 🏗️ Production Build

### Für Deployment/Production:
**Windows:** `build-project.bat` (Doppelklick)  
**macOS/Linux:** `build-project.sh` (Terminal oder Doppelklick)

**Was passiert:**
- ✅ Kompiliert TypeScript → JavaScript (Backend)
- ✅ Optimiert Next.js für Production (Frontend)
- ✅ Erstellt `backend/dist/` und `frontend/.next/`

### Production starten:
**Windows:** `start-production.bat` (Doppelklick)  
**Alternative:** `npm run start` (im Terminal)

## 🐳 Docker Alternative

**Noch einfacher für Production:**
```bash
docker-compose up -d
```
**→ Baut und startet alles automatisch in Containern**

## 🛠️ Falls Probleme auftreten

**Projekt zurücksetzen:**
- **Windows:** `reset-project.bat` (Doppelklick)
- **macOS/Linux:** `./reset-project.sh` (Terminal oder Doppelklick)

**Was das Reset macht:**
- Löscht alle temporären Dateien
- Bereitet Neustart vor
- Dann wieder `start-project.bat` ausführen

## 📋 Voraussetzungen

- **Node.js** von https://nodejs.org/ (wird automatisch geprüft)
- **Konfiguration** ist bereits fertig eingerichtet

## 📖 Vollständige Dokumentation

Siehe `documentation.md` für alle Details, API-Dokumentation und erweiterte Features.

---

**Projekt:** AI-powered WhatsApp Chatbot mit Terminbuchung
**Tech Stack:** Next.js Frontend, Node.js Backend, OpenAI Integration
