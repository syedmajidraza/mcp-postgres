@echo off
REM Stop all PostgreSQL Chatbot services on Windows

echo.
echo Stopping PostgreSQL Chatbot Services
echo ========================================
echo.

REM Stop Web Server (port 9000)
echo Stopping Web Server (port 9000)...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":9000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%p /F >nul 2>&1
)
netstat -ano | findstr ":9000 " | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL%==0 (
    echo    [WARN] Web Server could not be stopped
) else (
    echo    [OK] Web Server stopped
)

REM Stop VS Code
echo Stopping VS Code + Copilot Bridge...
taskkill /IM "Code.exe" /F >nul 2>&1
if %ERRORLEVEL%==0 (
    echo    [OK] VS Code stopped
) else (
    echo    [INFO] VS Code was not running
)

REM Stop MCP Server (port 3000)
echo Stopping MCP Server (port 3000)...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%p /F >nul 2>&1
)
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL%==0 (
    echo    [WARN] MCP Server could not be stopped
) else (
    echo    [OK] MCP Server stopped
)

echo.
echo ========================================
echo All services stopped
echo ========================================
echo.
