@echo off
chcp 65001 >nul
echo.
echo  ╔══════════════════════════════════════╗
echo  ║    BarPOS — Instalacion              ║
echo  ║    Sistema POS Bar y Restaurante     ║
echo  ╚══════════════════════════════════════╝
echo.

:: Verificar Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js no encontrado.
    echo  Descargalo desde: https://nodejs.org  ^(version LTS recomendada^)
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  Node.js detectado: %NODE_VER%
echo.

echo  Instalando dependencias...
echo.
call npm install

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Fallo la instalacion. Revise la conexion a internet.
    pause
    exit /b 1
)

echo.
echo  ════════════════════════════════════════
echo  Instalacion completada correctamente!
echo.
echo  Para iniciar la aplicacion ejecute:
echo    npm start
echo.
echo  O haga doble click en: iniciar.bat
echo  ════════════════════════════════════════
echo.
pause
