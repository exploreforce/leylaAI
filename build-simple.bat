@echo off
echo ================================================
echo    WhatsApp Bot - EINFACHER Build (Windows)
echo    Minimale Version ohne viele Prüfungen
echo ================================================
echo.

echo Schritt 1: Bereinige alte Builds...
if exist "frontend\.next" rmdir /s /q "frontend\.next" 2>nul
if exist "backend\dist" rmdir /s /q "backend\dist" 2>nul
echo ✓ Bereinigt

echo.
echo Schritt 2: Installiere Dependencies (das kann dauern)...
call npm install
call npm install --prefix frontend
call npm install --prefix backend
echo ✓ Dependencies installiert

echo.
echo Schritt 3: Build Backend...
cd backend
call npm run build
if errorlevel 1 (
    cd ..
    echo FEHLER beim Backend Build!
    pause
    exit /b 1
)
cd ..
echo ✓ Backend gebaut

echo.
echo Schritt 4: Build Frontend...
cd frontend  
call npm run build
if errorlevel 1 (
    cd ..
    echo FEHLER beim Frontend Build!
    pause
    exit /b 1
)
cd ..
echo ✓ Frontend gebaut

echo.
echo ================================================
echo    BUILD ERFOLGREICH!
echo    
echo    Starten mit: start-production.bat
echo    Oder manuell: npm run start
echo ================================================
pause







