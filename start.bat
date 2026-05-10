@echo off
setlocal

set "ROOT=%~dp0"

echo Starting Python backend...
start "gupiao-backend" cmd /k "cd /d ""%ROOT%"" && uvicorn server:app --reload"

echo Starting web frontend...
start "gupiao-frontend" cmd /k "cd /d ""%ROOT%web"" && npm run dev"

exit /b 0
