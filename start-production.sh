#!/bin/bash

echo "================================================"
echo "   WhatsApp Bot - Production Start (macOS/Linux)"
echo "   Startet die gebaute Production Version"
echo "================================================"
echo

# Prüfe ob Backend Build existiert
if [ ! -f "backend/dist/index.js" ]; then
    echo "ERROR: Backend Build nicht gefunden!"
    echo "Erst mit ./build-project.sh builden"
    echo
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi

# Prüfe ob Frontend Build existiert
if [ ! -d "frontend/.next" ]; then
    echo "ERROR: Frontend Build nicht gefunden!"
    echo "Erst mit ./build-project.sh builden"
    echo
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi

echo "✓ Builds gefunden"

# Prüfe .env Dateien
echo
echo "Prüfe Konfiguration..."
if [ ! -f "frontend/.env" ]; then
    echo "ERROR: frontend/.env nicht gefunden!"
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi
if [ ! -f "backend/.env" ]; then
    echo "ERROR: backend/.env nicht gefunden!"
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi
echo "✓ Konfiguration OK"

# Starte Production
echo
echo "================================================"
echo "   Starte Production Version..."
echo "   Backend:  http://localhost:5000"
echo "   Frontend: http://localhost:3000"
echo "   "
echo "   Zum Beenden: Strg+C"
echo "================================================"
echo

# Verwende den start script aus package.json
npm run start

# Falls Fehler
if [ $? -ne 0 ]; then
    echo
    echo "================================================"
    echo "   Fehler beim Starten!"
    echo "================================================"
    echo
    echo "Mögliche Lösungen:"
    echo "1. Projekt neu builden: ./build-project.sh"
    echo "2. Development starten: ./start-project.sh"
    echo
    read -p "Drücke Enter zum Beenden..."
fi








