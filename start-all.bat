@echo off
REM Start all PostgreSQL Chatbot services on Windows
REM Run this script and everything starts automatically!

echo.
echo PostgreSQL Chatbot - Starting All Services
echo ==================================================
echo.

REM Get script directory
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

REM ---- Step 1: Start MCP Server (port 3000) ----
echo [1/3] Starting MCP Server (port 3000)...

REM Check if port 3000 is already in use
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL%==0 (
    echo    MCP Server already running
) else (
    cd mcp-server

    REM Create venv if it doesn't exist
    if not exist "venv" (
        echo    Creating Python virtual environment...
        python -m venv venv
    )

    REM Activate venv and install dependencies
    call venv\Scripts\activate.bat

    REM Install dependencies if needed
    pip install -r requirements.txt -q >nul 2>&1

    REM Copy .env if it doesn't exist
    if not exist ".env" (
        echo    Creating .env from .env.example...
        copy .env.example .env >nul 2>&1
        echo    IMPORTANT: Edit mcp-server\.env with your database credentials!
    )

    REM Start MCP server in background
    start /b "" python server.py > "%TEMP%\mcp-server.log" 2>&1
    cd ..

    echo    Waiting for MCP Server to start...
    timeout /t 5 /nobreak >nul

    REM Health check
    curl -s http://localhost:3000/health | findstr "running" >nul 2>&1
    if %ERRORLEVEL%==0 (
        echo    [OK] MCP Server started successfully
    ) else (
        echo    [FAIL] MCP Server failed to start
        echo    Check logs: type "%TEMP%\mcp-server.log"
        echo    Make sure your database credentials in mcp-server\.env are correct
        exit /b 1
    )
)
echo.

REM ---- Step 2: Start VS Code with Copilot Bridge (port 9001) ----
echo [2/3] Starting VS Code + Copilot Bridge (port 9001)...

netstat -ano | findstr ":9001 " | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL%==0 (
    echo    Copilot Bridge already running
) else (
    echo    Starting VS Code in background...
    start "" code "%SCRIPT_DIR%"

    echo    Waiting for VS Code to load (15 seconds)...
    timeout /t 15 /nobreak >nul

    REM Health check
    curl -s http://localhost:9001/health | findstr "ok" >nul 2>&1
    if %ERRORLEVEL%==0 (
        echo    [OK] Copilot Bridge started and running
    ) else (
        echo    Copilot Bridge not responding yet, waiting 10 more seconds...
        timeout /t 10 /nobreak >nul
        curl -s http://localhost:9001/health | findstr "ok" >nul 2>&1
        if %ERRORLEVEL%==0 (
            echo    [OK] Copilot Bridge started
        ) else (
            echo    [WARN] Copilot Bridge failed to start automatically
            echo    Troubleshooting:
            echo      1. Open VS Code
            echo      2. Press Ctrl+Shift+P
            echo      3. Type: "Copilot Web Bridge: Start Server"
            echo      4. Check View -^> Output -^> "Copilot Web Bridge"
        )
    )
)
echo.

REM ---- Step 3: Start Web Server (port 9000) ----
echo [3/3] Starting Web Server (port 9000)...

netstat -ano | findstr ":9000 " | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL%==0 (
    echo    Web Server already running
) else (
    start /b "" node web-server.js > "%TEMP%\web-server.log" 2>&1

    echo    Waiting for Web Server to start...
    timeout /t 3 /nobreak >nul

    curl -s http://localhost:9000/health | findstr "healthy" >nul 2>&1
    if %ERRORLEVEL%==0 (
        echo    [OK] Web Server started successfully
    ) else (
        echo    [FAIL] Web Server failed to start
        echo    Check logs: type "%TEMP%\web-server.log"
        exit /b 1
    )
)
echo.

REM ---- Final Status Check ----
echo ==================================================
echo Service Status Check
echo ==================================================
echo.

set MCP_STATUS=[FAIL] Not Running
set COPILOT_STATUS=[FAIL] Not Running
set WEB_STATUS=[FAIL] Not Running

curl -s http://localhost:3000/health >nul 2>&1 && set MCP_STATUS=[OK] Running
curl -s http://localhost:9001/health >nul 2>&1 && set COPILOT_STATUS=[OK] Running
curl -s http://localhost:9000/health >nul 2>&1 && set WEB_STATUS=[OK] Running

echo MCP Server (3000):      %MCP_STATUS%
echo Copilot Bridge (9001):  %COPILOT_STATUS%
echo Web Server (9000):      %WEB_STATUS%
echo.

REM Check if all services are running
echo %MCP_STATUS% | findstr "Running" >nul 2>&1
set MCP_OK=%ERRORLEVEL%
echo %COPILOT_STATUS% | findstr "Running" >nul 2>&1
set COPILOT_OK=%ERRORLEVEL%
echo %WEB_STATUS% | findstr "Running" >nul 2>&1
set WEB_OK=%ERRORLEVEL%

if %MCP_OK%==0 if %COPILOT_OK%==0 if %WEB_OK%==0 (
    echo ==================================================
    echo All Services Running Successfully!
    echo ==================================================
    echo.
    echo Chatbot Interface: http://localhost:9000
    echo.
    echo Opening chatbot in your browser...
    timeout /t 1 /nobreak >nul
    start http://localhost:9000
    echo.
    echo IMPORTANT: Do NOT close VS Code or the AI chat will stop working
    echo.
    echo To stop all services: stop-all.bat
    echo.
    echo Service Logs:
    echo    MCP Server:  type "%TEMP%\mcp-server.log"
    echo    Web Server:  type "%TEMP%\web-server.log"
    echo.
) else (
    echo ==================================================
    echo Some Services Failed to Start
    echo ==================================================
    echo.
    if not %MCP_OK%==0 (
        echo [FAIL] MCP Server not running
        echo    Check: type "%TEMP%\mcp-server.log"
        echo    Fix: Check database connection in mcp-server\.env
    )
    if not %COPILOT_OK%==0 (
        echo [WARN] Copilot Bridge not running
        echo    1. Open VS Code
        echo    2. Press Ctrl+Shift+P
        echo    3. Run: "Copilot Web Bridge: Start Server"
    )
    if not %WEB_OK%==0 (
        echo [FAIL] Web Server not running
        echo    Check: type "%TEMP%\web-server.log"
    )
    echo.
)
