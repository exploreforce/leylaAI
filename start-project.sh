#!/bin/bash

echo "================================================"
echo "   WhatsApp Bot - Projekt Starter (macOS/Linux)"
echo "   Idiotensicheres Startup Script"
echo "================================================"
echo

# Prüfe ob Node.js installiert ist
echo "[1/6] Prüfe Node.js Installation..."
if ! command -v node &> /dev/null; then
    echo
    echo "ERROR: Node.js ist nicht installiert!"
    echo "Bitte Node.js von https://nodejs.org/ installieren"
    echo "Oder verwende Homebrew: brew install node"
    echo
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi
echo "✓ Node.js ist installiert ($(node --version))"

# Prüfe ob npm installiert ist
echo
echo "[2/6] Prüfe npm Installation..."
if ! command -v npm &> /dev/null; then
    echo
    echo "ERROR: npm ist nicht installiert!"
    echo "npm sollte mit Node.js mitgeliefert werden"
    echo
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi
echo "✓ npm ist installiert ($(npm --version))"

# Prüfe macOS-spezifische Anforderungen
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo
    echo "[3/7] Prüfe macOS-spezifische Anforderungen..."
    
    # Prüfe ob XCode Command Line Tools installiert sind
    if ! xcode-select -p &> /dev/null; then
        echo
        echo "WARNUNG: XCode Command Line Tools sind nicht installiert!"
        echo "Diese werden für native npm packages benötigt."
        echo
        echo "Installation mit: xcode-select --install"
        echo "Möchtest du trotzdem fortfahren? (j/n)"
        read -p "> " choice
        if [ "$choice" != "j" ] && [ "$choice" != "J" ]; then
            echo "Abgebrochen. Installiere zuerst XCode Command Line Tools."
            exit 1
        fi
    else
        echo "✓ XCode Command Line Tools sind installiert"
    fi
fi

# Lösche .next Ordner im Frontend (behebt häufige Probleme)
echo
echo "[4/7] Bereinige Frontend (.next Ordner)..."
if [ -d "frontend/.next" ]; then
    echo "Lösche alten .next Ordner..."
    rm -rf frontend/.next
    echo "✓ .next Ordner erfolgreich gelöscht"
else
    echo "✓ Kein .next Ordner zum Löschen gefunden"
fi

# Installiere Dependencies
echo
echo "[5/7] Installiere Dependencies..."
echo "Dies kann beim ersten Mal etwas dauern..."

# Root Dependencies
echo "Installiere Root Dependencies..."
npm install > /dev/null 2>&1
npm_exit_code=$?
if [ $npm_exit_code -ne 0 ]; then
    echo
    echo "ERROR: Root npm install fehlgeschlagen!"
    echo
    echo "Mögliche Lösungen für macOS:"
    echo "1. XCode Command Line Tools installieren:"
    echo "   xcode-select --install"
    echo "2. Node.js über Homebrew neu installieren:"
    echo "   brew uninstall node && brew install node"
    echo "3. npm Cache leeren:"
    echo "   npm cache clean --force"
    echo "4. Manuell versuchen: npm install"
    echo
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi
echo "✓ Root Dependencies installiert"

# Frontend Dependencies
echo "Installiere Frontend Dependencies..."
cd frontend
npm install > /dev/null 2>&1
frontend_exit_code=$?
if [ $frontend_exit_code -ne 0 ]; then
    cd ..
    echo
    echo "ERROR: Frontend npm install fehlgeschlagen!"
    echo "Mögliche Lösungen:"
    echo "1. Manuell versuchen: cd frontend && npm install"
    echo "2. Node.js Berechtigungen: sudo chown -R $(whoami) ~/.npm"
    echo
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi
cd ..
echo "✓ Frontend Dependencies installiert"

# Backend Dependencies
echo "Installiere Backend Dependencies..."
cd backend
npm install > /dev/null 2>&1
backend_exit_code=$?
if [ $backend_exit_code -ne 0 ]; then
    cd ..
    echo
    echo "ERROR: Backend npm install fehlgeschlagen!"
    echo "Mögliche Lösungen:"
    echo "1. Manuell versuchen: cd backend && npm install"
    echo "2. Python installieren: brew install python"
    echo
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi
cd ..
echo "✓ Backend Dependencies installiert"

echo "✓ Alle Dependencies installiert"

# Prüfe ob .env Dateien existieren
echo
echo "[6/7] Prüfe Konfigurationsdateien..."
if [ ! -f "frontend/.env" ]; then
    echo
    echo "ERROR: frontend/.env Datei nicht gefunden!"
    echo "Diese wird für die Konfiguration benötigt"
    echo
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi
if [ ! -f "backend/.env" ]; then
    echo
    echo "ERROR: backend/.env Datei nicht gefunden!"
    echo "Diese wird für die Konfiguration benötigt"
    echo
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi
echo "✓ Alle Konfigurationsdateien gefunden"

# Starte das Projekt
echo
echo "[7/7] Starte Backend und Frontend..."
echo
echo "================================================"
echo "   Projekt wird gestartet!"
echo "   Backend läuft auf: http://localhost:5000"
echo "   Frontend läuft auf: http://localhost:3000"
echo "   "
echo "   Zum Beenden: Strg+C drücken"
echo "================================================"
echo

# Starte beide Services gleichzeitig
npm run dev

# Falls das fehlschlägt, zeige Hilfe
if [ $? -ne 0 ]; then
    echo
    echo "================================================"
    echo "   Fehler beim Starten!"
    echo "================================================"
    echo
    echo "Mögliche Lösungen:"
    echo "1. Prüfe ob Port 3000 und 5000 frei sind"
    echo "2. Lösche node_modules und versuche es erneut:"
    echo "   rm -rf node_modules"
    echo "   rm -rf frontend/node_modules"  
    echo "   rm -rf backend/node_modules"
    echo "   npm install"
    echo
    echo "3. Starte die Services einzeln zum debuggen:"
    echo "   npm run dev:backend"
    echo "   npm run dev:frontend"
    echo
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi
