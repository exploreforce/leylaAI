@echo off
echo ================================================
echo    WhatsApp Bot - Production Start (Windows)
echo    Startet die gebaute Production Version
echo ================================================
echo.

:: Prüfe ob Backend Build existiert
if not exist "backend\dist\index.js" (
    echo ERROR: Backend Build nicht gefunden!
    echo Erst mit build-project.bat builden
    echo.
    pause
    exit /b 1
)

:: Prüfe ob Frontend Build existiert
if not exist "frontend\.next" (
    echo ERROR: Frontend Build nicht gefunden!
    echo Erst mit build-project.bat builden
    echo.
    pause
    exit /b 1
)

echo ✓ Builds gefunden

:: Prüfe .env Dateien
echo.
echo Prüfe Konfiguration...
if not exist "frontend\.env" (
    echo ERROR: frontend\.env nicht gefunden!
    pause
    exit /b 1
)
if not exist "backend\.env" (
    echo ERROR: backend\.env nicht gefunden!
    pause  
    exit /b 1
)
echo ✓ Konfiguration OK

:: Starte Production
echo.
echo ================================================
echo    Starte Production Version...
echo    Backend:  http://localhost:5000
echo    Frontend: http://localhost:3000
echo    
echo    Zum Beenden: Strg+C
echo ================================================
echo.

:: Verwende den start script aus package.json
npm run start

:: Falls Fehler
if errorlevel 1 (
    echo.
    echo ================================================
    echo    Fehler beim Starten!
    echo ================================================
    echo.
    echo Mögliche Lösungen:
    echo 1. Projekt neu builden: build-project.bat
    echo 2. Development starten: start-project.bat
    echo.
    pause
)








