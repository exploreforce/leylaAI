#!/bin/bash

echo "================================================"
echo "   WhatsApp Bot - Projekt Reset (macOS/Linux)"
echo "   Löscht alle temporären Dateien und Dependencies"
echo "================================================"
echo

echo "WARNUNG: Dieses Script löscht:"
echo "- Alle node_modules Ordner"
echo "- Den .next Ordner"
echo "- Alle Build-Artifacts"
echo
read -p "Möchtest du fortfahren? (j/n): " choice
if [ "$choice" != "j" ] && [ "$choice" != "J" ]; then
    echo "Abgebrochen."
    exit 0
fi

echo
echo "[1/4] Lösche .next Ordner..."
if [ -d "frontend/.next" ]; then
    rm -rf frontend/.next
    echo "✓ Frontend .next Ordner gelöscht"
else
    echo "✓ Kein .next Ordner gefunden"
fi

echo
echo "[2/4] Lösche node_modules im Root..."
if [ -d "node_modules" ]; then
    rm -rf node_modules
    echo "✓ Root node_modules gelöscht"
else
    echo "✓ Keine Root node_modules gefunden"
fi

echo
echo "[3/4] Lösche Frontend node_modules..."
if [ -d "frontend/node_modules" ]; then
    rm -rf frontend/node_modules
    echo "✓ Frontend node_modules gelöscht"
else
    echo "✓ Keine Frontend node_modules gefunden"
fi

echo
echo "[4/4] Lösche Backend node_modules..."
if [ -d "backend/node_modules" ]; then
    rm -rf backend/node_modules
    echo "✓ Backend node_modules gelöscht"
else
    echo "✓ Keine Backend node_modules gefunden"
fi

echo
echo "================================================"
echo "   Projekt erfolgreich zurückgesetzt!"
echo "   "
echo "   Nächste Schritte:"
echo "   1. Starte das Projekt mit: ./start-project.sh"
echo "   2. Das Script wird automatisch alles neu installieren"
echo "================================================"
echo
read -p "Drücke Enter zum Beenden..."














