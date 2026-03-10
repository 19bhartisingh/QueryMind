"""
╔══════════════════════════════════════════════════════════════╗
║      ║
╚══════════════════════════════════════════════════════════════╝

This module is the FOUNDATION of the project.
Everything else (server, AI, importer) calls functions from here.

WHAT IT DOES:
  1. Maintains a registry of all available databases (display name → file path)
  2. Reads database schemas (tables, columns, types, keys)
  3. Converts schemas to text for the AI prompt
  4. Executes SQL queries safely and returns Pandas DataFrames
  5. Validates SQL (only SELECT is allowed — safety!)
  6. Provides stats, previews, and utility functions

WHY SQLITE?
  SQLite stores an entire database in a single .db file.
  No separate server needed. Python has it built-in (import sqlite3).
  Perfect for a portable student project.
"""

import os
import sqlite3
from typing import Dict, List, Tuple, Optional
import pandas as pd


# ─────────────────────────────────────────────────────────
#  DATABASE REGISTRY
#  Maps human-friendly display names → file paths.
#  This is the single source of truth for all databases.
# ─────────────────────────────────────────────────────────

DATABASE_REGISTRY: Dict[str, str] = {
    "🎓 College Database":    "databases/college.db",
    "🛒 E-Commerce Database": "databases/ecommerce.db",
    "🏥 Hospital Database":   "databases/hospital.db",
}

# Names of the built-in (non-deletable) databases
_BUILTIN_NAMES = frozenset(DATABASE_REGISTRY.keys())


def register_database(display_name: str, db_path: str) -> None:
    """Add a new database to the registry (called after file import)."""
    DATABASE_REGISTRY[display_name] = db_path


def unregister_database(display_name: str) -> None:
    """Remove a database from the registry (called on delete)."""
    DATABASE_REGISTRY.pop(display_name, None)


def is_builtin_database(name: str) -> bool:
    """Returns True for the 3 sample databases (they cannot be deleted)."""
    return name in _BUILTIN_NAMES


def get_all_database_names() -> List[str]:
    """Return all registered database names for the UI dropdown."""
    return list(DATABASE_REGISTRY.keys())


def _get_path(db_name: str) -> str:
    """Resolve display name → file path. Raises FileNotFoundError if missing."""
    if db_name not in DATABASE_REGISTRY:
        raise FileNotFoundError(f"Database '{db_name}' not found in registry.")
    return DATABASE_REGISTRY[db_name]


# ─────────────────────────────────────────────────────────
#  SCHEMA READING
#  Reads a SQLite database and extracts its full structure:
#  which tables exist, what columns each has, types & keys.
# ─────────────────────────────────────────────────────────

def get_schema(db_name: str) -> Dict[str, List[Dict]]:
    """
    Read the database and return its structure.

    Returns:
        {
            "students": [
                {"name": "id",   "type": "INTEGER", "pk": True,  "fk": False},
                {"name": "name", "type": "TEXT",    "pk": False, "fk": False},
                {"name": "dept_id","type":"INTEGER","pk": False, "fk": True},
            ],
            "departments": [ ... ]
        }

    HOW IT WORKS:
      SQLite has built-in PRAGMA commands that describe a table's structure.
      PRAGMA table_info(X)    → columns, types, NOT NULL, defaults, primary key flag
      PRAGMA foreign_key_list(X) → foreign key relationships
    """
    path = _get_path(db_name)
    conn = sqlite3.connect(path)
    result = {}

    try:
        cursor = conn.cursor()

        # Get all non-system table names
        cursor.execute(
            "SELECT name FROM sqlite_master "
            "WHERE type='table' AND name NOT LIKE 'sqlite_%' "
            "ORDER BY name"
        )
        tables = [row[0] for row in cursor.fetchall()]

        for table in tables:
            # Column info: (cid, name, type, notnull, default_value, pk_flag)
            cursor.execute(f"PRAGMA table_info(`{table}`)")
            col_rows = cursor.fetchall()

            # Foreign key info: which columns reference other tables
            cursor.execute(f"PRAGMA foreign_key_list(`{table}`)")
            fk_from_cols = {row[3] for row in cursor.fetchall()}  # row[3] = "from" column

            result[table] = [
                {
                    "name": r[1],
                    "type": (r[2] or "TEXT").upper(),
                    "pk":   bool(r[5]),          # r[5] = pk index (0 means not PK)
                    "fk":   r[1] in fk_from_cols,
                    "notnull": bool(r[3]),
                }
                for r in col_rows
            ]

    finally:
        conn.close()

    return result


def schema_to_text(db_name: str) -> str:
    """
    Convert the schema dict to a plain-text string for the AI prompt.

    WHY THIS FORMAT?
      The AI reads this text and uses it to write correct SQL.
      It needs to know exact table names, column names, and types.
      The [PRIMARY KEY] and [FK] flags help the AI write better JOINs.

    Example output:
        Table: students
          - id (INTEGER) [PRIMARY KEY]
          - name (TEXT)
          - cgpa (REAL)
          - dept_id (INTEGER) [FK]

        Table: departments
          - id (INTEGER) [PRIMARY KEY]
          - name (TEXT)
    """
    schema = get_schema(db_name)
    lines = []

    for table, columns in schema.items():
        lines.append(f"Table: {table}")
        for col in columns:
            flags = []
            if col["pk"]:  flags.append("PRIMARY KEY")
            if col["fk"]:  flags.append("FK")
            flag_str = f" [{', '.join(flags)}]" if flags else ""
            lines.append(f"  - {col['name']} ({col['type']}){flag_str}")
        lines.append("")  # blank line between tables

    return "\n".join(lines)


# ─────────────────────────────────────────────────────────
#  SQL EXECUTION
# ─────────────────────────────────────────────────────────

def execute_query(db_name: str, sql: str) -> Tuple[Optional[pd.DataFrame], Optional[str]]:
    """
    Execute a SQL query and return (DataFrame, error_message).

    Uses pd.read_sql_query() which:
      - Executes the SQL
      - Automatically converts results to a Pandas DataFrame
      - Handles type mapping (SQLite types → Python types)

    Returns:
        (DataFrame, None)  — on success
        (None, error_msg)  — on failure
    """
    path = _get_path(db_name)
    try:
        conn = sqlite3.connect(path)
        df = pd.read_sql_query(sql, conn)
        conn.close()
        return df, None
    except Exception as e:
        return None, str(e)


def validate_sql(sql: str) -> Tuple[bool, str]:
    """
    Safety check — only SELECT queries are allowed.

    WHY THIS MATTERS:
      Without validation, a user (or a misbehaving AI) could send:
        DROP TABLE students;      ← deletes all student data!
        DELETE FROM students;     ← same!
        UPDATE students SET cgpa=10; ← corrupts data!

      We use a whitelist approach:
        1. Query must START with SELECT
        2. Query must NOT contain dangerous keywords

    Returns:
        (True, "OK")                   — safe to execute
        (False, "reason it failed")    — blocked
    """
    DANGEROUS = [
        "DROP", "DELETE", "UPDATE", "INSERT",
        "ALTER", "CREATE", "TRUNCATE", "REPLACE",
        "ATTACH", "DETACH", "PRAGMA",
    ]

    cleaned = sql.strip()
    if not cleaned:
        return False, "Query is empty"

    upper = cleaned.upper()

    # Must start with SELECT (or WITH for CTEs)
    if not (upper.startswith("SELECT") or upper.startswith("WITH")):
        return False, "Only SELECT queries are allowed"

    # Must not contain any dangerous keyword
    for kw in DANGEROUS:
        # Check for keyword as a whole word (not part of a column name)
        import re
        if re.search(r'\b' + kw + r'\b', upper):
            return False, f"Keyword '{kw}' is not allowed"

    return True, "OK"


# ─────────────────────────────────────────────────────────
#  UTILITY FUNCTIONS
# ─────────────────────────────────────────────────────────

def get_database_stats(db_name: str) -> Dict[str, int]:
    """
    Returns row counts for every table in the database.
    Used by the schema explorer in the sidebar.

    Returns: {"students": 120, "departments": 5, "courses": 30, ...}
    """
    schema = get_schema(db_name)
    path   = _get_path(db_name)
    stats  = {}
    conn   = sqlite3.connect(path)

    try:
        for table in schema:
            try:
                cur = conn.execute(f"SELECT COUNT(*) FROM `{table}`")
                stats[table] = cur.fetchone()[0]
            except Exception:
                stats[table] = 0
    finally:
        conn.close()

    return stats


def get_table_preview(db_name: str, table_name: str, limit: int = 5) -> pd.DataFrame:
    """
    Returns the first `limit` rows of a table as a DataFrame.
    Used for the table preview feature in the import tab.
    """
    df, error = execute_query(db_name, f"SELECT * FROM `{table_name}` LIMIT {limit}")
    if df is not None:
        return df
    return pd.DataFrame()


def reload_uploaded_databases() -> int:
    """
    Scans the databases/uploads/ folder for .db files and
    registers any that aren't already in the registry.

    Called on server startup to restore previously uploaded databases
    that were registered in a previous session.

    Returns: number of databases reloaded
    """
    upload_dir = "databases/uploads"
    if not os.path.exists(upload_dir):
        return 0

    count = 0
    for fname in sorted(os.listdir(upload_dir)):
        if fname.endswith(".db"):
            display_name = "📄 " + fname[:-3]  # Remove .db extension
            db_path = os.path.join(upload_dir, fname)
            if display_name not in DATABASE_REGISTRY:
                register_database(display_name, db_path)
                count += 1

    return count
