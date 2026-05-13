"""
Database migration script — adds missing columns to existing tables.
Safe to run multiple times (uses IF NOT EXISTS / checks before altering).

Run this ONCE on production after deploying the new code:
  python migrate.py

Or via Render Shell:
  python migrate.py
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.database import engine
from sqlalchemy import text

def column_exists(conn, table: str, column: str) -> bool:
    """Check if a column exists in a table (works for PostgreSQL and SQLite)."""
    try:
        result = conn.execute(text(
            f"SELECT column_name FROM information_schema.columns "
            f"WHERE table_name='{table}' AND column_name='{column}'"
        ))
        return result.fetchone() is not None
    except Exception:
        # SQLite fallback
        try:
            result = conn.execute(text(f"PRAGMA table_info({table})"))
            cols = [row[1] for row in result.fetchall()]
            return column in cols
        except Exception:
            return False

migrations = [
    # assignments table — add hours_spent
    {
        "table": "assignments",
        "column": "hours_spent",
        "sql": "ALTER TABLE assignments ADD COLUMN hours_spent INTEGER",
        "description": "Add hours_spent to assignments"
    },
    # assignments table — add rating (was missing in some old schemas)
    {
        "table": "assignments",
        "column": "rating",
        "sql": "ALTER TABLE assignments ADD COLUMN rating INTEGER",
        "description": "Add rating to assignments"
    },
    # assignments table — add feedback
    {
        "table": "assignments",
        "column": "feedback",
        "sql": "ALTER TABLE assignments ADD COLUMN feedback TEXT",
        "description": "Add feedback to assignments"
    },
    # assignments table — add completed_at
    {
        "table": "assignments",
        "column": "completed_at",
        "sql": "ALTER TABLE assignments ADD COLUMN completed_at TIMESTAMP",
        "description": "Add completed_at to assignments"
    },
    # volunteer_profiles — add total_hours_contributed
    {
        "table": "volunteer_profiles",
        "column": "total_hours_contributed",
        "sql": "ALTER TABLE volunteer_profiles ADD COLUMN total_hours_contributed INTEGER DEFAULT 0",
        "description": "Add total_hours_contributed to volunteer_profiles"
    },
    # volunteer_profiles — change rating from INTEGER to FLOAT (safe: add new, copy, drop old)
    # We handle this by just ensuring the column exists as numeric — PostgreSQL allows this
    {
        "table": "volunteer_profiles",
        "column": "updated_at",
        "sql": "ALTER TABLE volunteer_profiles ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()",
        "description": "Add updated_at to volunteer_profiles"
    },
    # users — add updated_at
    {
        "table": "users",
        "column": "updated_at",
        "sql": "ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()",
        "description": "Add updated_at to users"
    },
    # tasks — add updated_at
    {
        "table": "tasks",
        "column": "updated_at",
        "sql": "ALTER TABLE tasks ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()",
        "description": "Add updated_at to tasks"
    },
    # community_needs — add updated_at
    {
        "table": "community_needs",
        "column": "updated_at",
        "sql": "ALTER TABLE community_needs ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()",
        "description": "Add updated_at to community_needs"
    },
    # field_reports — add updated_at
    {
        "table": "field_reports",
        "column": "updated_at",
        "sql": "ALTER TABLE field_reports ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()",
        "description": "Add updated_at to field_reports"
    },
]

def run_migrations():
    print("Starting database migrations...")
    with engine.connect() as conn:
        applied = 0
        skipped = 0
        for m in migrations:
            if column_exists(conn, m["table"], m["column"]):
                print(f"  SKIP  {m['description']} (column already exists)")
                skipped += 1
            else:
                try:
                    conn.execute(text(m["sql"]))
                    conn.commit()
                    print(f"  APPLY {m['description']}")
                    applied += 1
                except Exception as e:
                    print(f"  ERROR {m['description']}: {e}")
                    conn.rollback()

    print(f"\nMigrations complete: {applied} applied, {skipped} skipped.")

if __name__ == "__main__":
    run_migrations()
