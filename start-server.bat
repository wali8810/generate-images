@echo off
echo ========================================
echo   SERVIDOR COM SUPORTE NGROK
echo ========================================
echo.
echo Parando processos antigos do Node...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo Iniciando servidor na porta 5001...
echo (O aviso do Ngrok ja foi REMOVIDO automaticamente!)
echo.
cd /d %~dp0
node server/index.js
pause
