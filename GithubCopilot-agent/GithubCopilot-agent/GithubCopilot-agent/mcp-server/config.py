"""
Configuration management for PostgreSQL MCP Server
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Database and server configuration"""

    # Database settings
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', '5431'))
    DB_NAME = os.getenv('DB_NAME', 'AdventureWorks')
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')

    # Server settings
    SERVER_HOST = os.getenv('SERVER_HOST', '127.0.0.1')
    SERVER_PORT = int(os.getenv('SERVER_PORT', '3000'))

    # Connection pool settings
    POOL_MIN_SIZE = int(os.getenv('POOL_MIN_SIZE', '2'))
    POOL_MAX_SIZE = int(os.getenv('POOL_MAX_SIZE', '10'))

    @classmethod
    def get_database_url(cls) -> str:
        """Get PostgreSQL connection URL"""
        if cls.DB_PASSWORD:
            return f"postgresql://{cls.DB_USER}:{cls.DB_PASSWORD}@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}"
        else:
            return f"postgresql://{cls.DB_USER}@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}"
