@echo off
echo ================================================
echo    WhatsApp Bot - Projekt Starter
echo    Idiotensicheres Startup Script
echo ================================================
echo.

:: Prüfe ob Node.js installiert ist
echo [1/6] Prüfe Node.js Installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Node.js ist nicht installiert!
    echo Bitte Node.js von https://nodejs.org/ installieren
    echo.
    pause
    exit /b 1
)
echo ✓ Node.js ist installiert

:: Prüfe ob npm installiert ist
echo.
echo [2/6] Prüfe npm Installation...
npm --version >nul 2>&1
set npm_error=%errorlevel%
if %npm_error% neq 0 (
    echo.
    echo ERROR: npm ist nicht installiert oder nicht im PATH!
    echo npm sollte mit Node.js mitgeliefert werden
    echo.
    echo Debugging Info:
    echo - Versuche npm manuell zu starten: npm --version
    echo - Prüfe ob Node.js korrekt installiert ist
    echo - Eventuell PowerShell/CMD neu starten
    echo.
    echo Drücke eine Taste zum Beenden...
    pause >nul
    exit /b 1
)
echo ✓ npm ist installiert

:: Lösche .next Ordner im Frontend (behebt häufige Probleme)
echo.
echo [3/6] Bereinige Frontend (.next Ordner)...
if exist "frontend\.next" (
    echo Lösche alten .next Ordner...
    rmdir /s /q "frontend\.next" 2>nul
    if errorlevel 1 (
        echo Warnung: Konnte .next Ordner nicht vollständig löschen
        echo Das ist meist kein Problem
    ) else (
        echo ✓ .next Ordner erfolgreich gelöscht
    )
) else (
    echo ✓ Kein .next Ordner zum Löschen gefunden
)

:: Installiere Dependencies
echo.
echo [4/6] Installiere Dependencies...
echo Dies kann beim ersten Mal etwas dauern...

:: Root Dependencies
echo Installiere Root Dependencies...
npm install >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Root npm install fehlgeschlagen!
    echo Versuche es manuell mit: npm install
    echo.
    pause
    exit /b 1
)
echo ✓ Root Dependencies installiert

:: Frontend Dependencies
echo Installiere Frontend Dependencies...
cd frontend
npm install >nul 2>&1
if errorlevel 1 (
    cd ..
    echo.
    echo ERROR: Frontend npm install fehlgeschlagen!
    echo Versuche es manuell mit: cd frontend && npm install
    echo.
    pause
    exit /b 1
)
cd ..
echo ✓ Frontend Dependencies installiert

:: Backend Dependencies
echo Installiere Backend Dependencies...
cd backend
npm install >nul 2>&1
if errorlevel 1 (
    cd ..
    echo.
    echo ERROR: Backend npm install fehlgeschlagen!
    echo Versuche es manuell mit: cd backend && npm install
    echo.
    pause
    exit /b 1
)
cd ..
echo ✓ Backend Dependencies installiert

echo ✓ Alle Dependencies installiert

:: Prüfe ob .env Dateien existieren
echo.
echo [5/6] Prüfe Konfigurationsdateien...
if not exist "frontend\.env" (
    echo.
    echo ERROR: frontend\.env Datei nicht gefunden!
    echo Diese wird für die Konfiguration benötigt
    echo.
    pause
    exit /b 1
)
if not exist "backend\.env" (
    echo.
    echo ERROR: backend\.env Datei nicht gefunden!
    echo Diese wird für die Konfiguration benötigt
    echo.
    pause
    exit /b 1
)
echo ✓ Alle Konfigurationsdateien gefunden

:: Starte das Projekt
echo.
echo [6/6] Starte Backend und Frontend...
echo.
echo ================================================
echo    Projekt wird gestartet!
echo    Backend läuft auf: http://localhost:5000
echo    Frontend läuft auf: http://localhost:3000
echo    
echo    Zum Beenden: Strg+C drücken
echo ================================================
echo.

:: Starte beide Services gleichzeitig
npm run dev

:: Falls das fehlschlägt, zeige Hilfe
if errorlevel 1 (
    echo.
    echo ================================================
    echo    Fehler beim Starten!
    echo ================================================
    echo.
    echo Mögliche Lösungen:
    echo 1. Prüfe ob Port 3000 und 5000 frei sind
    echo 2. Lösche node_modules und versuche es erneut:
    echo    rmdir /s node_modules
    echo    rmdir /s frontend\node_modules  
    echo    rmdir /s backend\node_modules
    echo    npm install
    echo.
    echo 3. Starte die Services einzeln zum debuggen:
    echo    npm run dev:backend
    echo    npm run dev:frontend
    echo.
    pause
    exit /b 1
)
