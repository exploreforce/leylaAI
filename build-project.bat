@echo off
echo ================================================
echo    WhatsApp Bot - Production Build (Windows)
echo    Erstellt optimierte Production Version
echo ================================================
echo.

:: Prüfe ob Node.js installiert ist
echo [1/5] Prüfe Node.js Installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Node.js ist nicht installiert!
    echo Bitte Node.js von https://nodejs.org/ installieren
    echo.
    pause
    exit /b 1
)
echo ✓ Node.js gefunden

:: Bereinige alte Builds
echo.
echo [2/5] Bereinige alte Builds...
if exist "frontend\.next" rmdir /s /q "frontend\.next" 2>nul
if exist "frontend\out" rmdir /s /q "frontend\out" 2>nul  
if exist "backend\dist" rmdir /s /q "backend\dist" 2>nul
echo ✓ Alte Builds gelöscht

:: Installiere Dependencies
echo.
echo [3/5] Installiere Dependencies...
echo Dies kann einen Moment dauern...

echo Installing Root Dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Root npm install fehlgeschlagen!
    pause
    exit /b 1
)

echo Installing Frontend Dependencies...
cd frontend
call npm install
if errorlevel 1 (
    cd ..
    echo ERROR: Frontend npm install fehlgeschlagen!
    pause
    exit /b 1
)

echo Installing Backend Dependencies...
cd ..\backend
call npm install
if errorlevel 1 (
    cd ..
    echo ERROR: Backend npm install fehlgeschlagen!
    pause
    exit /b 1
)
cd ..

echo ✓ Dependencies installiert

:: Build Backend
echo.
echo [4/5] Build Backend (TypeScript → JavaScript)...
cd backend
npm run build
if errorlevel 1 (
    cd ..
    echo.
    echo ERROR: Backend Build fehlgeschlagen!
    pause
    exit /b 1
)
cd ..
echo ✓ Backend erfolgreich gebaut → backend\dist\

:: Build Frontend
echo.
echo [5/5] Build Frontend (Next.js Optimierung)...
cd frontend
npm run build
if errorlevel 1 (
    cd ..
    echo.
    echo ERROR: Frontend Build fehlgeschlagen!
    pause
    exit /b 1
)
cd ..
echo ✓ Frontend erfolgreich gebaut → frontend\.next\

echo.
echo ================================================
echo    🎉 BUILD ERFOLGREICH!
echo ================================================
echo.
echo Erstellte Dateien:
echo 📦 Backend:  backend\dist\ (JavaScript)
echo 📦 Frontend: frontend\.next\ (Optimiert)
echo.
echo Production starten:
echo 🚀 Backend:  cd backend ^&^& npm start
echo 🚀 Frontend: cd frontend ^&^& npm start
echo.
echo Oder beide zusammen:
echo 🚀 npm run start
echo.
echo ================================================
pause
