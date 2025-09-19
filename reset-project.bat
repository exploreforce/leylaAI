@echo off
echo ================================================
echo    WhatsApp Bot - Projekt Reset
echo    Löscht alle temporären Dateien und Dependencies
echo ================================================
echo.

echo WARNUNG: Dieses Script löscht:
echo - Alle node_modules Ordner
echo - Den .next Ordner
echo - Alle Build-Artifacts
echo.
set /p choice="Möchtest du fortfahren? (j/n): "
if /i "%choice%" neq "j" (
    echo Abgebrochen.
    pause
    exit /b 0
)

echo.
echo [1/4] Lösche .next Ordner...
if exist "frontend\.next" (
    rmdir /s /q "frontend\.next" 2>nul
    echo ✓ Frontend .next Ordner gelöscht
) else (
    echo ✓ Kein .next Ordner gefunden
)

echo.
echo [2/4] Lösche node_modules im Root...
if exist "node_modules" (
    rmdir /s /q "node_modules" 2>nul
    echo ✓ Root node_modules gelöscht
) else (
    echo ✓ Keine Root node_modules gefunden
)

echo.
echo [3/4] Lösche Frontend node_modules...
if exist "frontend\node_modules" (
    rmdir /s /q "frontend\node_modules" 2>nul
    echo ✓ Frontend node_modules gelöscht
) else (
    echo ✓ Keine Frontend node_modules gefunden
)

echo.
echo [4/4] Lösche Backend node_modules...
if exist "backend\node_modules" (
    rmdir /s /q "backend\node_modules" 2>nul
    echo ✓ Backend node_modules gelöscht
) else (
    echo ✓ Keine Backend node_modules gefunden
)

echo.
echo ================================================
echo    Projekt erfolgreich zurückgesetzt!
echo    
echo    Nächste Schritte:
echo    1. Starte das Projekt mit: start-project.bat
echo    2. Das Script wird automatisch alles neu installieren
echo ================================================
echo.
pause








