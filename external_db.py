"""
external_db.py — Multi-database connection layer for QueryMind

Supports:
  • SQLite files      — stdlib sqlite3 (always available)
  • PostgreSQL        — requires: pip install psycopg2-binary
  • MySQL / MariaDB   — requires: pip install pymysql
  • MS SQL Server     — requires: pip install pyodbc
  • DuckDB            — requires: pip install duckdb

Architecture:
  - Each connection is stored encrypted in querymind_meta.db.
  - At runtime we maintain a registry: name → ExternalDB object.
  - ExternalDB wraps either sqlite3 or a SQLAlchemy engine (when available)
    or a native driver connection (psycopg2/pymysql/pyodbc/duckdb).
  - get_schema() and execute_query() in database.py route here for
    any db_name whose value in DATABASE_REGISTRY starts with "external:".
"""

import re
import os
import json
import sqlite3
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse, quote_plus

import pandas as pd

# ── Optional driver imports ──────────────────────────────────────────────────

def _try_import(module: str):
    try:
        return __import__(module)
    except ImportError:
        return None

# SQLAlchemy (preferred unified interface)
_sa = _try_import("sqlalchemy")

# Native drivers (fallback when SQLAlchemy absent)
_psycopg2    = _try_import("psycopg2")
_pymysql     = _try_import("pymysql")
_pyodbc      = _try_import("pyodbc")
_duckdb      = _try_import("duckdb")


# ── DB type constants ────────────────────────────────────────────────────────

SUPPORTED_DB_TYPES = {
    "postgresql": {
        "label":    "PostgreSQL",
        "icon":     "🐘",
        "example":  "postgresql://user:password@host:5432/dbname",
        "requires": "psycopg2-binary",
    },
    "mysql": {
        "label":    "MySQL / MariaDB",
        "icon":     "🐬",
        "example":  "mysql://user:password@host:3306/dbname",
        "requires": "pymysql",
    },
    "mssql": {
        "label":    "MS SQL Server",
        "icon":     "🏢",
        "example":  "mssql+pyodbc://user:password@host/dbname?driver=ODBC+Driver+17+for+SQL+Server",
        "requires": "pyodbc",
    },
    "sqlite_file": {
        "label":    "SQLite File",
        "icon":     "📂",
        "example":  "/absolute/path/to/database.db  OR  relative/path.db",
        "requires": None,
    },
    "duckdb": {
        "label":    "DuckDB",
        "icon":     "🦆",
        "example":  "/absolute/path/to/file.duckdb  OR  :memory:",
        "requires": "duckdb",
    },
}

# Registry: display_name → connection_string (unencrypted, in-memory only)
_EXTERNAL_CONNECTIONS: Dict[str, Dict] = {}

# Marker prefix used in DATABASE_REGISTRY values
EXTERNAL_MARKER = "external:"


def register_external(name: str, db_type: str, conn_str: str) -> None:
    """Register an external connection so database.py can route to it."""
    _EXTERNAL_CONNECTIONS[name] = {"db_type": db_type, "conn_str": conn_str}


def unregister_external(name: str) -> None:
    _EXTERNAL_CONNECTIONS.pop(name, None)


def is_external(db_name: str) -> bool:
    return db_name in _EXTERNAL_CONNECTIONS


def list_external_names() -> List[str]:
    return list(_EXTERNAL_CONNECTIONS.keys())


# ── Connection test / open ────────────────────────────────────────────────────

def test_connection(db_type: str, conn_str: str) -> Tuple[bool, str]:
    """
    Try to open a connection and run a trivial query.
    Returns (success, message).
    """
    try:
        engine = _open_engine(db_type, conn_str)
        if isinstance(engine, sqlite3.Connection):
            engine.execute("SELECT 1")
            engine.close()
        elif hasattr(engine, "connect"):
            # SQLAlchemy engine
            with engine.connect() as c:
                c.execute(_sa.text("SELECT 1"))
            engine.dispose()
        elif hasattr(engine, "cursor"):
            # Native driver connection (psycopg2/pymysql/pyodbc)
            cur = engine.cursor()
            cur.execute("SELECT 1")
            engine.close()
        elif _duckdb and isinstance(engine, _duckdb.DuckDBPyConnection):
            engine.execute("SELECT 1")
            engine.close()
        return True, "Connection successful"
    except Exception as e:
        return False, str(e)


def _open_engine(db_type: str, conn_str: str):
    """
    Open and return a DB connection/engine for the given type.
    Prefers SQLAlchemy when available; falls back to native drivers.
    """
    dt = db_type.lower().strip()

    # ── SQLite file ──────────────────────────────────────────────────────────
    if dt == "sqlite_file":
        path = conn_str.strip()
        if not os.path.isabs(path):
            path = os.path.abspath(path)
        if not os.path.exists(path):
            raise FileNotFoundError(f"SQLite file not found: {path}")
        if _sa:
            return _sa.create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False})
        return sqlite3.connect(path)

    # ── DuckDB ───────────────────────────────────────────────────────────────
    if dt == "duckdb":
        if not _duckdb:
            raise ImportError("DuckDB not installed. Run: pip install duckdb")
        db_path = conn_str.strip() if conn_str.strip() else ":memory:"
        return _duckdb.connect(db_path, read_only=True)

    # ── PostgreSQL ───────────────────────────────────────────────────────────
    if dt in ("postgresql", "postgres"):
        url = _normalise_url(conn_str, "postgresql")
        if _sa:
            # prefer asyncpg-safe psycopg2 dialect
            if not url.startswith("postgresql+"):
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1) \
                         .replace("postgres://",   "postgresql+psycopg2://", 1)
            return _sa.create_engine(url, pool_pre_ping=True)
        if _psycopg2:
            return _psycopg2.connect(conn_str)
        raise ImportError(
            "PostgreSQL driver not installed.\n"
            "Run: pip install psycopg2-binary\n"
            "  or: pip install sqlalchemy psycopg2-binary"
        )

    # ── MySQL / MariaDB ──────────────────────────────────────────────────────
    if dt in ("mysql", "mariadb"):
        url = _normalise_url(conn_str, "mysql")
        if _sa:
            if not url.startswith("mysql+"):
                url = url.replace("mysql://", "mysql+pymysql://", 1)
            return _sa.create_engine(url, pool_pre_ping=True)
        if _pymysql:
            parsed = urlparse(conn_str)
            return _pymysql.connect(
                host=parsed.hostname, port=parsed.port or 3306,
                user=parsed.username, password=parsed.password,
                database=parsed.path.lstrip("/"),
            )
        raise ImportError(
            "MySQL driver not installed.\n"
            "Run: pip install pymysql\n"
            "  or: pip install sqlalchemy pymysql"
        )

    # ── MS SQL Server ─────────────────────────────────────────────────────────
    if dt in ("mssql", "sqlserver", "sql_server"):
        if _sa:
            url = _normalise_url(conn_str, "mssql+pyodbc")
            return _sa.create_engine(url, pool_pre_ping=True)
        if _pyodbc:
            # Assume conn_str is an ODBC connection string
            return _pyodbc.connect(conn_str)
        raise ImportError(
            "MS SQL driver not installed.\n"
            "Run: pip install pyodbc sqlalchemy"
        )

    raise ValueError(f"Unsupported db_type: {dt!r}. "
                     f"Must be one of: {list(SUPPORTED_DB_TYPES)}")


def _normalise_url(conn_str: str, expected_scheme: str) -> str:
    """Ensure the connection string starts with the expected scheme."""
    cs = conn_str.strip()
    if not cs.startswith(expected_scheme.split("+")[0]):
        # User might have given bare host:port/db style — just return as-is
        return cs
    return cs


# ── Schema extraction ─────────────────────────────────────────────────────────

def get_external_schema(db_type: str, conn_str: str) -> Dict[str, List[Dict]]:
    """
    Extract table/column metadata from an external database.
    Returns the same format as database.get_schema().
    """
    dt = db_type.lower()
    engine = _open_engine(dt, conn_str)

    try:
        # ── SQLAlchemy path (PostgreSQL / MySQL / MSSQL / SQLite-via-SA) ──
        if _sa and hasattr(engine, "connect"):
            insp = _sa.inspect(engine)
            result = {}
            for table in insp.get_table_names():
                pk_cols = set(insp.get_pk_constraint(table).get("constrained_columns", []))
                fk_cols = {fk["constrained_columns"][0]
                           for fk in insp.get_foreign_keys(table)
                           if fk["constrained_columns"]}
                cols = []
                for col in insp.get_columns(table):
                    cols.append({
                        "name":    col["name"],
                        "type":    str(col["type"]).upper()[:30],
                        "pk":      col["name"] in pk_cols,
                        "fk":      col["name"] in fk_cols,
                        "notnull": not col.get("nullable", True),
                    })
                result[table] = cols
            engine.dispose()
            return result

        # ── DuckDB path ──────────────────────────────────────────────────────
        if _duckdb and isinstance(engine, _duckdb.DuckDBPyConnection):
            rows = engine.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema='main'"
            ).fetchall()
            result = {}
            for (tbl,) in rows:
                col_rows = engine.execute(
                    f"PRAGMA table_info('{tbl}')"
                ).fetchall()
                result[tbl] = [
                    {"name": r[1], "type": (r[2] or "TEXT").upper(),
                     "pk": bool(r[5]), "fk": False, "notnull": bool(r[3])}
                    for r in col_rows
                ]
            engine.close()
            return result

        # ── SQLite (native) path ─────────────────────────────────────────────
        if isinstance(engine, sqlite3.Connection):
            cursor = engine.cursor()
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
            tables = [r[0] for r in cursor.fetchall()]
            result = {}
            for tbl in tables:
                cursor.execute(f"PRAGMA table_info(`{tbl}`)")
                col_rows = cursor.fetchall()
                cursor.execute(f"PRAGMA foreign_key_list(`{tbl}`)")
                fk_cols = {r[3] for r in cursor.fetchall()}
                result[tbl] = [
                    {"name": r[1], "type": (r[2] or "TEXT").upper(),
                     "pk": bool(r[5]), "fk": r[1] in fk_cols, "notnull": bool(r[3])}
                    for r in col_rows
                ]
            engine.close()
            return result

        # ── Native psycopg2 / pymysql path ────────────────────────────────────
        cursor = engine.cursor()
        # information_schema works for PostgreSQL and MySQL
        cursor.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = current_schema() OR table_schema = DATABASE()"
        )
        tables = [r[0] for r in cursor.fetchall()]
        result = {}
        for tbl in tables:
            cursor.execute(
                "SELECT column_name, data_type, column_key "
                "FROM information_schema.columns WHERE table_name = %s",
                (tbl,)
            )
            cols = []
            for col_name, dtype, col_key in cursor.fetchall():
                cols.append({
                    "name":    col_name,
                    "type":    dtype.upper()[:30],
                    "pk":      col_key == "PRI",
                    "fk":      col_key == "MUL",
                    "notnull": False,
                })
            result[tbl] = cols
        engine.close()
        return result

    except Exception as e:
        try:
            if hasattr(engine, "dispose"): engine.dispose()
            if hasattr(engine, "close"):   engine.close()
        except Exception:
            pass
        raise RuntimeError(f"Schema extraction failed: {e}") from e


# ── Query execution ────────────────────────────────────────────────────────────

def execute_external_query(
    db_type: str, conn_str: str, sql: str
) -> Tuple[Optional[pd.DataFrame], Optional[str]]:
    """
    Execute a SELECT query against an external database.
    Returns (DataFrame, None) or (None, error_str).
    """
    try:
        engine = _open_engine(db_type, conn_str)

        # SQLAlchemy engine
        if _sa and hasattr(engine, "connect"):
            with engine.connect() as conn:
                df = pd.read_sql_query(_sa.text(sql), conn)
            engine.dispose()
            return df, None

        # DuckDB
        if _duckdb and isinstance(engine, _duckdb.DuckDBPyConnection):
            rel = engine.execute(sql)
            df = rel.df()
            engine.close()
            return df, None

        # Native sqlite3 / psycopg2 / pymysql
        df = pd.read_sql_query(sql, engine)
        try:
            engine.close()
        except Exception:
            pass
        return df, None

    except Exception as e:
        return None, str(e)


# ── Persistence helpers ────────────────────────────────────────────────────────

def save_connection_to_db(
    meta_db_path: str, name: str, db_type: str,
    conn_str_enc: str
) -> int:
    """Insert a connection record. Returns new row id."""
    from datetime import datetime
    conn = sqlite3.connect(meta_db_path)
    cur  = conn.execute(
        """INSERT INTO external_connections (name, db_type, conn_str_enc, created_at)
           VALUES (?, ?, ?, ?)""",
        (name, db_type, conn_str_enc, datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    )
    row_id = cur.lastrowid
    conn.commit(); conn.close()
    return row_id


def load_connections_from_db(meta_db_path: str) -> List[Dict]:
    """Return all saved connections (conn_str redacted)."""
    try:
        conn = sqlite3.connect(meta_db_path)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT id, name, db_type, created_at FROM external_connections ORDER BY id"
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception:
        return []


def delete_connection_from_db(meta_db_path: str, name: str) -> bool:
    """Delete by name. Returns True if a row was deleted."""
    try:
        conn = sqlite3.connect(meta_db_path)
        affected = conn.execute(
            "DELETE FROM external_connections WHERE name=?", (name,)
        ).rowcount
        conn.commit(); conn.close()
        return affected > 0
    except Exception:
        return False


def get_connection_str(meta_db_path: str, name: str) -> Optional[str]:
    """Return the encrypted conn_str for a given name."""
    try:
        conn = sqlite3.connect(meta_db_path)
        row  = conn.execute(
            "SELECT conn_str_enc, db_type FROM external_connections WHERE name=?", (name,)
        ).fetchone()
        conn.close()
        return row
    except Exception:
        return None
