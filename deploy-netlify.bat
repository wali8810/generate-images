@echo off
echo ========================================
echo   DEPLOY AUTOMATICO PARA NETLIFY
echo ========================================
echo.
echo Verificando instalacao do Netlify CLI...
call netlify --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Netlify CLI nao encontrado!
    echo.
    echo Instalando Netlify CLI...
    call npm install -g netlify-cli
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar. Rode manualmente: npm install -g netlify-cli
        pause
        exit /b 1
    )
)

echo.
echo Netlify CLI encontrado!
echo.
echo Fazendo login no Netlify...
call netlify login

echo.
echo Fazendo deploy da pasta dist...
call netlify deploy --prod --dir=dist

echo.
echo ========================================
echo   DEPLOY CONCLUIDO!
echo ========================================
echo.
echo Nao esqueca de:
echo 1. Manter o Ngrok rodando (ngrok http 5001)
echo 2. Verificar a variavel VITE_API_URL no Netlify
echo.
pause
