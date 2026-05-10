"""Prepare the local SQLite database for a new checkout.

This script is safe to run repeatedly. It creates missing tables and applies
the same lightweight compatibility updates used by the application startup.
It does not reset or seed personal data.
"""

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database import SQLALCHEMY_DATABASE_URL, ensure_database_ready


def main():
    ensure_database_ready()
    print(f"Database is ready: {SQLALCHEMY_DATABASE_URL}")


if __name__ == "__main__":
    main()
