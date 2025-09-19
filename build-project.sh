#!/bin/bash

echo "================================================"
echo "   WhatsApp Bot - Production Build (macOS/Linux)"
echo "   Erstellt optimierte Production Version"
echo "================================================"
echo

# Prüfe ob Node.js installiert ist
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js ist nicht installiert!"
    echo "Installiere Node.js von https://nodejs.org/"
    exit 1
fi
echo "✓ Node.js gefunden: $(node --version)"

# Bereinige alte Builds
echo
echo "[1/5] Bereinige alte Builds..."
rm -rf frontend/.next
rm -rf frontend/out
rm -rf backend/dist
echo "✓ Alte Builds gelöscht"

# Installiere Dependencies
echo
echo "[2/5] Installiere Dependencies..."
npm install > /dev/null 2>&1
cd frontend && npm install > /dev/null 2>&1
cd ../backend && npm install > /dev/null 2>&1
cd ..
echo "✓ Dependencies installiert"

# Build Backend
echo
echo "[3/5] Build Backend (TypeScript → JavaScript)..."
cd backend
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Backend Build fehlgeschlagen!"
    exit 1
fi
cd ..
echo "✓ Backend erfolgreich gebaut → backend/dist/"

# Build Frontend  
echo
echo "[4/5] Build Frontend (Next.js Optimierung)..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Frontend Build fehlgeschlagen!"
    exit 1
fi
cd ..
echo "✓ Frontend erfolgreich gebaut → frontend/.next/"

echo
echo "================================================"
echo "   🎉 BUILD ERFOLGREICH!"
echo "================================================"
echo
echo "Erstellte Dateien:"
echo "📦 Backend:  backend/dist/ (JavaScript)"
echo "📦 Frontend: frontend/.next/ (Optimiert)"
echo
echo "Production starten:"
echo "🚀 Backend:  cd backend && npm start"
echo "🚀 Frontend: cd frontend && npm start"
echo
echo "Oder beide zusammen:"
echo "🚀 npm run start"
echo "================================================"








