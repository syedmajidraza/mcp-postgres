@echo off
REM Start script for PostgreSQL MCP Server on Windows

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo Error: Virtual environment not found
    echo Please run the installation script first
    exit /b 1
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Check if .env exists
if not exist ".env" (
    echo Warning: .env file not found
    echo Copying from .env.example...
    copy .env.example .env
    echo Please edit .env with your database credentials
    exit /b 1
)

REM Start the server
echo Starting PostgreSQL MCP Server...
echo Server will be available at http://127.0.0.1:3000
echo Press Ctrl+C to stop
echo.

python server.py
