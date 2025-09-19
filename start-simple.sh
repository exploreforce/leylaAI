#!/bin/bash

echo "================================================"
echo "   WhatsApp Bot - EINFACHER Starter (macOS/Linux)"
echo "   Minimale Version falls start-project.sh nicht geht"
echo "================================================"
echo

echo "Schritt 1: Lösche .next Ordner..."
if [ -d "frontend/.next" ]; then
    rm -rf frontend/.next
    echo ".next Ordner gelöscht"
else
    echo "Kein .next Ordner gefunden"
fi

echo
echo "Schritt 2: Installiere Dependencies..."
echo "Das kann 2-3 Minuten dauern..."

echo "- Root Dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "FEHLER bei Root npm install"
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi

echo "- Frontend Dependencies..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    cd ..
    echo "FEHLER bei Frontend npm install"
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi
cd ..

echo "- Backend Dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    cd ..
    echo "FEHLER bei Backend npm install"
    read -p "Drücke Enter zum Beenden..."
    exit 1
fi
cd ..

echo
echo "Schritt 3: Starte Projekt..."
echo
echo "================================================"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5000"
echo "Zum Beenden: Strg+C"
echo "================================================"
echo

npm run dev








