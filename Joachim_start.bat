@echo off
echo ================================================
echo    WhatsApp Bot - Joachim's Starter
echo    Startet Frontend und Backend mit npm start
echo ================================================
echo.

echo Schritt 1: Überprüfe npm und node Installation...
node --version > nul 2>&1
if errorlevel 1 (
    echo FEHLER: Node.js ist nicht installiert oder nicht im PATH!
    echo Bitte installieren Sie Node.js von https://nodejs.org/
    pause
    exit /b 1
)

npm --version > nul 2>&1
if errorlevel 1 (
    echo FEHLER: npm ist nicht installiert oder nicht im PATH!
    pause
    exit /b 1
)

echo ✓ Node.js und npm sind verfügbar
echo.

echo Schritt 2: Überprüfe Projektstruktur...
if not exist "frontend" (
    echo FEHLER: Frontend Ordner nicht gefunden!
    pause
    exit /b 1
)

if not exist "backend" (
    echo FEHLER: Backend Ordner nicht gefunden!
    pause
    exit /b 1
)

echo ✓ Projektstruktur OK
echo.

echo Schritt 3: Überprüfe Dependencies...
if not exist "frontend\node_modules" (
    echo WARNUNG: Frontend Dependencies nicht gefunden!
    echo Installiere Frontend Dependencies...
    cd frontend
    call npm install
    if errorlevel 1 (
        cd ..
        echo FEHLER bei Frontend npm install
        pause
        exit /b 1
    )
    cd ..
)

if not exist "backend\node_modules" (
    echo WARNUNG: Backend Dependencies nicht gefunden!
    echo Installiere Backend Dependencies...
    cd backend
    call npm install
    if errorlevel 1 (
        cd ..
        echo FEHLER bei Backend npm install
        pause
        exit /b 1
    )
    cd ..
)

echo ✓ Dependencies OK
echo.

echo Schritt 4: Starte Services...
echo.
echo ================================================
echo  STARTVORGANG LÄUFT...
echo ================================================
echo.
echo Frontend wird gestartet auf: http://localhost:3000
echo Backend wird gestartet auf:  http://localhost:5000
echo.
echo HINWEIS:
echo - Beide Services werden parallel gestartet
echo - Es dauert ca. 30-60 Sekunden bis alles läuft
echo - Zum Beenden: Strg+C in beiden Fenstern
echo.
echo ================================================
echo.

echo Starte Backend...
start "WhatsApp Bot Backend" cmd /k "cd backend && npm start"

echo Warte 5 Sekunden...
timeout /t 5 /nobreak > nul

echo Starte Frontend...
start "WhatsApp Bot Frontend" cmd /k "cd frontend && npm start"

echo.
echo ================================================
echo ✓ BEIDE SERVICES GESTARTET!
echo ================================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
echo Zwei neue Fenster wurden geöffnet:
echo 1. Backend Server (läuft dauerhaft)
echo 2. Frontend Server (läuft dauerhaft)
echo.
echo Zum Beenden der Services:
echo - Gehe zu jedem Fenster und drücke Strg+C
echo - Oder schließe die CMD-Fenster
echo.
echo Dieses Fenster kann geschlossen werden.
echo.
pause

