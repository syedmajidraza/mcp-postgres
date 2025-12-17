#!/bin/bash

# Start script for PostgreSQL MCP Server

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Error: Virtual environment not found"
    echo "Please run the installation script first"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found"
    echo "Copying from .env.example..."
    cp .env.example .env
    echo "Please edit .env with your database credentials"
    exit 1
fi

# Start the server
echo "Starting PostgreSQL MCP Server..."
echo "Server will be available at http://127.0.0.1:3000"
echo "Press Ctrl+C to stop"
echo ""

python server.py
