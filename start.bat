@echo off
echo Iniciando o servidor Backend (Node.js) na porta 5001...
echo (Simulando ambiente PHP para desenvolvimento local)
set PORT=5001
start "Backend Node.js" node server/index.js
echo.
echo Aguardando servidor iniciar...
timeout /t 3
echo.
echo Iniciando o Frontend (Vite)...
npm run dev
