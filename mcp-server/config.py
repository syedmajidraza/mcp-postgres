"""
Configuration management for PostgreSQL MCP Server
All values are read from .env file - no hardcoded defaults.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def _require_env(key: str) -> str:
    """Get a required environment variable or exit with an error."""
    value = os.getenv(key)
    if value is None:
        print(f"Error: Required environment variable '{key}' is not set. "
              f"Please add it to your .env file.", file=sys.stderr)
        sys.exit(1)
    return value


class Config:
    """Database and server configuration - all values from .env"""

    # Database settings
    DB_HOST = _require_env('DB_HOST')
    DB_PORT = int(_require_env('DB_PORT'))
    DB_NAME = _require_env('DB_NAME')
    DB_USER = _require_env('DB_USER')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')

    # Server settings
    SERVER_HOST = _require_env('SERVER_HOST')
    SERVER_PORT = int(_require_env('SERVER_PORT'))

    # Connection pool settings
    POOL_MIN_SIZE = int(_require_env('POOL_MIN_SIZE'))
    POOL_MAX_SIZE = int(_require_env('POOL_MAX_SIZE'))

    @classmethod
    def get_database_url(cls) -> str:
        """Get PostgreSQL connection URL"""
        if cls.DB_PASSWORD:
            return f"postgresql://{cls.DB_USER}:{cls.DB_PASSWORD}@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}"
        else:
            return f"postgresql://{cls.DB_USER}@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}"
