@echo off
echo ========================================
echo   REINICIANDO SERVIDOR COM NGROK
echo ========================================
echo.
echo Parando processos antigos...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM ngrok.exe >nul 2>&1

echo.
echo Iniciando servidor na porta 5001...
start "Backend Node.js" cmd /k "cd /d %~dp0 && node server/index.js"

timeout /t 3 /nobreak >nul

echo.
echo Iniciando Ngrok...
start "Ngrok Tunnel" cmd /k "ngrok http 5001"

echo.
echo ========================================
echo   TUDO PRONTO!
echo ========================================
echo.
echo O servidor esta rodando em: http://localhost:5001
echo.
echo Aguarde o Ngrok carregar e copie a URL que aparece:
echo   https://XXXXXXXX.ngrok-free.app
echo.
echo Acesse essa URL no navegador!
echo O aviso do Ngrok foi REMOVIDO automaticamente!
echo.
pause
