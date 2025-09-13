@echo off
echo ================================================
echo    WhatsApp Bot - EINFACHER Starter
echo    Minimale Version falls start-project.bat nicht geht
echo ================================================
echo.

echo Schritt 1: Lösche .next Ordner...
if exist "frontend\.next" (
    rmdir /s /q "frontend\.next" 2>nul
    echo .next Ordner gelöscht
) else (
    echo Kein .next Ordner gefunden
)

echo.
echo Schritt 2: Installiere Dependencies...
echo Das kann 2-3 Minuten dauern...

echo - Root Dependencies...
call npm install
if errorlevel 1 (
    echo FEHLER bei Root npm install
    pause
    exit /b 1
)

echo - Frontend Dependencies...
cd frontend
call npm install
if errorlevel 1 (
    cd ..
    echo FEHLER bei Frontend npm install
    pause
    exit /b 1
)
cd ..

echo - Backend Dependencies...
cd backend
call npm install
if errorlevel 1 (
    cd ..
    echo FEHLER bei Backend npm install  
    pause
    exit /b 1
)
cd ..

echo.
echo Schritt 3: Starte Projekt...
echo.
echo ================================================
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo Zum Beenden: Strg+C
echo ================================================
echo.

npm run dev


