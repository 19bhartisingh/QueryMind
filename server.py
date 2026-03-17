"""
╔══════════════════════════════════════════════════════════════╗
║  server.py  —  FastAPI REST API Backend for QueryMind v4.0   ║
╚══════════════════════════════════════════════════════════════╝

NEW IN v4.0:
  ★ Persistent SQLite history  — survives server restarts
  ★ LRU query cache            — instant repeat answers
  ★ Conversation memory        — multi-turn follow-up queries
  ★ Data profiling endpoint    — column stats for every table
  ★ Schema summarization       — AI descriptions of each table
  ★ SQL step explainer         — walk through SQL in plain English
  ★ Shareable results          — generate UUID links to results
  ★ Text-to-dashboard          — generate + run multi-panel dashboards
  ★ Chart suggestion           — AI picks the best viz type
"""

import os
import sys
import time
import json
import uuid
import sqlite3
from collections import OrderedDict
from datetime import datetime
from typing import Optional, List, Dict, Any
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(__file__))

from database import (
    get_all_database_names, get_schema, schema_to_text,
    execute_query, get_database_stats,
    validate_sql, reload_uploaded_databases,
    unregister_database, is_builtin_database, DATABASE_REGISTRY,
)
from nl_to_sql import (
    natural_language_to_sql, EXAMPLE_QUERIES, get_provider_status,
    summarize_schema_tables, explain_sql_steps,
    generate_dashboard_plan, generate_insights, DASHBOARD_GOALS,
)
from file_importer import (
    import_file, delete_uploaded_database, SUPPORTED_EXTENSIONS,
)
from sample_databases import setup_all_databases


# ─────────────────────────────────────────────────────────
#  APP SETUP
# ─────────────────────────────────────────────────────────

app = FastAPI(title="QueryMind API", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

LOCAL_PROVIDERS = {"ollama", "huggingface"}


# ─────────────────────────────────────────────────────────
#  PERSISTENT META DATABASE
# ─────────────────────────────────────────────────────────

META_DB_PATH = "databases/querymind_meta.db"


def _init_meta_db():
    os.makedirs("databases", exist_ok=True)
    conn = sqlite3.connect(META_DB_PATH)
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS query_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT, sql TEXT, explanation TEXT,
        success INTEGER, rows INTEGER, exec_time_s REAL,
        db_name TEXT, provider TEXT, confidence REAL,
        chart TEXT, timestamp TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS shared_results (
        uuid TEXT PRIMARY KEY, question TEXT, sql TEXT,
        columns TEXT, rows TEXT, db_name TEXT, timestamp TEXT
    )""")
    conn.commit()
    conn.close()


def _save_history_db(question, sql, explanation, success, rows,
                     exec_time, db_name="", provider="", confidence=0.0, chart=None):
    try:
        conn = sqlite3.connect(META_DB_PATH)
        conn.execute(
            "INSERT INTO query_history (question,sql,explanation,success,rows,exec_time_s,"
            "db_name,provider,confidence,chart,timestamp) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (question, sql, explanation, 1 if success else 0, rows,
             exec_time, db_name, provider, confidence,
             json.dumps(chart or {}), datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"History save error: {e}")


def _get_history_db(limit=100) -> List[Dict]:
    try:
        conn = sqlite3.connect(META_DB_PATH)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM query_history ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        conn.close()
        result = []
        for r in rows:
            d = dict(r)
            try:
                d["chart"] = json.loads(d.get("chart") or "{}")
            except Exception:
                d["chart"] = {}
            d["success"] = bool(d.get("success"))
            result.append(d)
        return result
    except Exception:
        return []


def _clear_history_db():
    try:
        conn = sqlite3.connect(META_DB_PATH)
        conn.execute("DELETE FROM query_history")
        conn.commit()
        conn.close()
    except Exception:
        pass


def _save_shared_result(question, sql, columns, rows, db_name) -> str:
    share_id = str(uuid.uuid4())[:8]
    try:
        conn = sqlite3.connect(META_DB_PATH)
        conn.execute(
            "INSERT INTO shared_results (uuid,question,sql,columns,rows,db_name,timestamp) VALUES (?,?,?,?,?,?,?)",
            (share_id, question, sql, json.dumps(columns), json.dumps(rows[:200]),
             db_name, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Share save error: {e}")
    return share_id


def _get_shared_result(share_id: str) -> Optional[Dict]:
    try:
        conn = sqlite3.connect(META_DB_PATH)
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM shared_results WHERE uuid=?", (share_id,)).fetchone()
        conn.close()
        if row:
            d = dict(row)
            d["columns"] = json.loads(d.get("columns") or "[]")
            d["rows"]    = json.loads(d.get("rows") or "[]")
            return d
    except Exception:
        pass
    return None


# ─────────────────────────────────────────────────────────
#  LRU QUERY CACHE
# ─────────────────────────────────────────────────────────

_query_cache: OrderedDict = OrderedDict()
_CACHE_MAX = 200


def _cache_key(question: str, db_name: str, provider: str) -> str:
    return f"{db_name}|{provider}|{question.lower().strip()}"


def _cache_get(key: str):
    if key in _query_cache:
        _query_cache.move_to_end(key)
        return _query_cache[key]
    return None


def _cache_set(key: str, value):
    _query_cache[key] = value
    _query_cache.move_to_end(key)
    if len(_query_cache) > _CACHE_MAX:
        _query_cache.popitem(last=False)


# ─────────────────────────────────────────────────────────
#  STARTUP
# ─────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    print("\n🚀 QueryMind v4.0 starting up...")
    _init_meta_db()
    print("💾 Persistent history database ready")
    db_files = ["databases/college.db", "databases/ecommerce.db", "databases/hospital.db"]
    if not all(os.path.exists(f) for f in db_files):
        print("📦 Creating sample databases...")
        setup_all_databases()
    n = reload_uploaded_databases()
    if n:
        print(f"📂 Restored {n} uploaded database(s)")
    print("✅ Ready at http://localhost:8000\n")


# ─────────────────────────────────────────────────────────
#  FRONTEND
# ─────────────────────────────────────────────────────────

STATIC_DIR    = Path(__file__).parent / "static"
FRONTEND_PATH = STATIC_DIR / "index.html"

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    if not FRONTEND_PATH.exists():
        return HTMLResponse("<h1>Frontend not found</h1>", status_code=404)
    return HTMLResponse(content=FRONTEND_PATH.read_text(encoding="utf-8"))


# ─────────────────────────────────────────────────────────
#  HEALTH
# ─────────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok", "version": "4.0.0",
        "timestamp": datetime.now().isoformat(),
        "databases": len(DATABASE_REGISTRY),
        "cache_size": len(_query_cache),
    }


# ─────────────────────────────────────────────────────────
#  DATABASE ENDPOINTS
# ─────────────────────────────────────────────────────────

@app.get("/api/databases")
async def list_databases():
    names = get_all_database_names()
    return {"databases": names, "count": len(names)}


@app.get("/api/schema/{db_name:path}")
async def get_database_schema(db_name: str):
    try:
        schema = get_schema(db_name)
        stats  = get_database_stats(db_name)
        result = {
            table: {"columns": columns, "row_count": stats.get(table, 0)}
            for table, columns in schema.items()
        }
        return {"db_name": db_name, "schema": result}
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/api/examples/{db_name:path}")
async def get_example_queries(db_name: str):
    examples = EXAMPLE_QUERIES.get(db_name, [
        "Show all rows", "Count total records",
        "Show the first 10 entries", "Find duplicate rows",
    ])
    goals = DASHBOARD_GOALS.get(db_name, [
        "Give me an overview of this database",
        "Show key metrics and trends",
    ])
    return {"examples": examples, "dashboard_goals": goals}


@app.get("/api/providers")
async def list_providers():
    return get_provider_status()


# ─────────────────────────────────────────────────────────
#  MAIN QUERY ENDPOINT
# ─────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question:             str
    db_name:              str
    provider:             str
    api_key:              str           = ""
    model:                Optional[str] = None
    max_rows:             int           = 200
    conversation_history: List[Dict]    = []


@app.post("/api/query")
async def run_natural_language_query(req: QueryRequest):
    if not req.question.strip():
        raise HTTPException(400, "Question cannot be empty")
    if req.provider not in LOCAL_PROVIDERS and not req.api_key.strip():
        raise HTTPException(400, f"API key required for '{req.provider}'")

    # LRU cache (skip for conversation mode — context differs)
    cache_k = _cache_key(req.question, req.db_name, req.provider)
    if not req.conversation_history:
        cached = _cache_get(cache_k)
        if cached:
            return {**cached, "from_cache": True}

    start = time.time()

    try:
        schema_text = schema_to_text(req.db_name)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Schema error: {e}")

    try:
        sql, explanation, confidence, chart = natural_language_to_sql(
            question             = req.question,
            schema_text          = schema_text,
            provider             = req.provider,
            api_key              = req.api_key,
            model                = req.model,
            conversation_history = req.conversation_history or None,
            retry_on_low_confidence = True,
        )
    except Exception as e:
        raise HTTPException(500, f"AI error: {e}")

    is_safe, safety_msg = validate_sql(sql)
    if not is_safe:
        raise HTTPException(400, f"Unsafe query blocked: {safety_msg}")

    df, error = execute_query(req.db_name, sql)
    exec_time  = round(time.time() - start, 3)

    if error:
        _save_history_db(req.question, sql, explanation, False, 0,
                         exec_time, req.db_name, req.provider, confidence, chart)
        raise HTTPException(400, f"SQL execution failed: {error}")

    rows    = _make_serialisable(df.head(req.max_rows).to_dict(orient="records"))
    columns = list(df.columns)

    result = {
        "sql": sql, "explanation": explanation,
        "confidence": round(confidence, 3), "chart": chart,
        "columns": columns, "rows": rows,
        "total_rows": len(df), "returned_rows": len(rows),
        "exec_time_s": exec_time, "from_cache": False,
    }

    _save_history_db(req.question, sql, explanation, True, len(df),
                     exec_time, req.db_name, req.provider, confidence, chart)
    _cache_set(cache_k, result)
    return result


# ─────────────────────────────────────────────────────────
#  RAW SQL EXECUTION
# ─────────────────────────────────────────────────────────

class ExecuteRequest(BaseModel):
    sql: str; db_name: str; max_rows: int = 200


@app.post("/api/execute")
async def execute_raw_sql(req: ExecuteRequest):
    is_safe, msg = validate_sql(req.sql)
    if not is_safe:
        raise HTTPException(400, msg)
    df, error = execute_query(req.db_name, req.sql)
    if error:
        raise HTTPException(400, error)
    return {
        "columns": list(df.columns),
        "rows": _make_serialisable(df.head(req.max_rows).to_dict(orient="records")),
        "total_rows": len(df),
    }


# ─────────────────────────────────────────────────────────
#  FILE IMPORT
# ─────────────────────────────────────────────────────────

@app.post("/api/import")
async def import_dataset(file: UploadFile = File(...)):
    filename  = file.filename or "upload.csv"
    extension = os.path.splitext(filename)[1].lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported format '{extension}'")
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(400, "File is empty")
    if len(file_bytes) > 50 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 50 MB)")
    result = import_file(file_bytes=file_bytes, filename=filename)
    if not result["success"]:
        raise HTTPException(422, result.get("error", "Import failed"))
    return {"success": True, "db_name": result["db_name"],
            "tables": result["tables"], "message": result["message"],
            "file_format": SUPPORTED_EXTENSIONS.get(extension, extension)}


@app.delete("/api/database/{db_name:path}")
async def delete_database(db_name: str):
    if is_builtin_database(db_name):
        raise HTTPException(403, "Cannot delete built-in sample databases")
    db_path = DATABASE_REGISTRY.get(db_name)
    if not db_path:
        raise HTTPException(404, f"Database '{db_name}' not found")
    if delete_uploaded_database(db_path):
        unregister_database(db_name)
        return {"success": True, "message": f"Deleted '{db_name}'"}
    raise HTTPException(500, "Failed to delete database file")


# ─────────────────────────────────────────────────────────
#  HISTORY  (persistent SQLite)
# ─────────────────────────────────────────────────────────

@app.get("/api/history")
async def get_query_history():
    return {"history": _get_history_db(100)}


@app.delete("/api/history")
async def clear_query_history():
    _clear_history_db()
    _query_cache.clear()
    return {"success": True}


# ─────────────────────────────────────────────────────────
#  DATA PROFILING
# ─────────────────────────────────────────────────────────

@app.get("/api/profile/{db_name:path}")
async def profile_database(db_name: str):
    try:
        schema = get_schema(db_name)
        stats  = get_database_stats(db_name)
        profile = {}
        for table, cols in schema.items():
            row_count = stats.get(table, 0)
            table_profile = {}
            for col in cols:
                cname = col["name"]
                ctype = col["type"]
                col_stat: Dict[str, Any] = {"type": ctype, "total_rows": row_count}
                try:
                    df, err = execute_query(db_name, f'SELECT "{cname}" FROM "{table}"')
                    if not err and df is not None:
                        series = df[cname]
                        col_stat["non_null"] = int(series.notna().sum())
                        col_stat["null_pct"] = round(series.isna().mean() * 100, 1)
                        col_stat["unique"]   = int(series.nunique())
                        try:
                            import pandas as pd
                            num = pd.to_numeric(series.dropna(), errors="coerce").dropna()
                            if len(num) > 0:
                                col_stat["min"]  = round(float(num.min()), 4)
                                col_stat["max"]  = round(float(num.max()), 4)
                                col_stat["mean"] = round(float(num.mean()), 4)
                        except Exception:
                            pass
                        try:
                            top = series.dropna().value_counts().head(5)
                            col_stat["top_values"] = [
                                {"value": str(k), "count": int(v)} for k, v in top.items()
                            ]
                        except Exception:
                            pass
                except Exception:
                    pass
                table_profile[cname] = col_stat
            profile[table] = table_profile
        return {"db_name": db_name, "profile": profile}
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))


# ─────────────────────────────────────────────────────────
#  SCHEMA SUMMARIZATION
# ─────────────────────────────────────────────────────────

class SchemaSummaryRequest(BaseModel):
    db_name: str; provider: str; api_key: str = ""; model: Optional[str] = None


@app.post("/api/schema-summary")
async def get_schema_summary(req: SchemaSummaryRequest):
    try:
        schema_text = schema_to_text(req.db_name)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    summaries = summarize_schema_tables(schema_text, req.provider, req.api_key, req.model)
    return {"db_name": req.db_name, "summaries": summaries}


# ─────────────────────────────────────────────────────────
#  SQL STEP EXPLAINER
# ─────────────────────────────────────────────────────────

class ExplainRequest(BaseModel):
    sql: str; db_name: str; provider: str; api_key: str = ""; model: Optional[str] = None


@app.post("/api/explain-steps")
async def explain_sql_step_by_step(req: ExplainRequest):
    is_safe, msg = validate_sql(req.sql)
    if not is_safe:
        raise HTTPException(400, msg)
    try:
        schema_text = schema_to_text(req.db_name)
    except Exception:
        schema_text = ""
    steps = explain_sql_steps(req.sql, schema_text, req.provider, req.api_key, req.model)
    return {"steps": steps}


# ─────────────────────────────────────────────────────────
#  AI INSIGHTS
# ─────────────────────────────────────────────────────────

class InsightsRequest(BaseModel):
    question:  str
    columns:   List[str]
    rows:      List[Dict]
    provider:  str
    api_key:   str           = ""
    model:     Optional[str] = None


@app.post("/api/insights")
async def get_query_insights(req: InsightsRequest):
    if not req.rows or not req.columns:
        return {"insights": []}
    insights = generate_insights(
        question = req.question,
        columns  = req.columns,
        rows     = req.rows,
        provider = req.provider,
        api_key  = req.api_key,
        model    = req.model,
    )
    return {"insights": insights}




class ShareRequest(BaseModel):
    question: str; sql: str; columns: List[str]; rows: List[Dict]; db_name: str


@app.post("/api/share")
async def create_share_link(req: ShareRequest):
    share_id = _save_shared_result(req.question, req.sql, req.columns, req.rows, req.db_name)
    return {"uuid": share_id, "url": f"/api/share/{share_id}"}


@app.get("/api/share/{share_id}")
async def get_shared_result_endpoint(share_id: str):
    result = _get_shared_result(share_id)
    if not result:
        raise HTTPException(404, f"Shared result '{share_id}' not found")
    return result


# ─────────────────────────────────────────────────────────
#  TEXT-TO-DASHBOARD
# ─────────────────────────────────────────────────────────

class DashboardRequest(BaseModel):
    goal: str; db_name: str; provider: str
    api_key: str = ""; model: Optional[str] = None; max_rows: int = 100


@app.post("/api/dashboard")
async def generate_dashboard(req: DashboardRequest):
    if not req.goal.strip():
        raise HTTPException(400, "Goal cannot be empty")
    if req.provider not in LOCAL_PROVIDERS and not req.api_key.strip():
        raise HTTPException(400, "API key required")
    try:
        schema_text = schema_to_text(req.db_name)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    try:
        plan = generate_dashboard_plan(req.goal, schema_text, req.provider, req.api_key, req.model)
    except Exception as e:
        raise HTTPException(500, f"Dashboard plan error: {e}")

    # Execute KPI row queries
    kpi_row = []
    for kpi in plan.get("kpi_row", []):
        sql = kpi.get("sql", "")
        if not sql:
            continue
        is_safe, _ = validate_sql(sql)
        if not is_safe:
            continue
        df, error = execute_query(req.db_name, sql)
        if not error and df is not None and len(df) > 0:
            kpi["columns"] = list(df.columns)
            kpi["rows"]    = _make_serialisable(df.head(1).to_dict(orient="records"))
            kpi_row.append(kpi)

    # Execute chart panels
    panels = []
    for panel in plan.get("panels", []):
        sql = panel.get("sql", "")
        if not sql:
            continue
        is_safe, _ = validate_sql(sql)
        if not is_safe:
            continue
        df, error = execute_query(req.db_name, sql)
        if error or df is None:
            panel["error"] = error
        else:
            panel["columns"]    = list(df.columns)
            panel["rows"]       = _make_serialisable(df.head(req.max_rows).to_dict(orient="records"))
            panel["total_rows"] = len(df)
        panels.append(panel)

    return {
        "dashboard_title":  plan.get("dashboard_title", "Dashboard"),
        "subtitle":         plan.get("subtitle", ""),
        "dashboard_theme":  plan.get("dashboard_theme", "blue"),
        "goal":             req.goal,
        "db_name":          req.db_name,
        "kpi_row":          kpi_row,
        "panels":           panels,
    }


# ─────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────

def _make_serialisable(rows: list) -> list:
    import numpy as np
    clean = []
    for row in rows:
        clean_row = {}
        for k, v in row.items():
            if isinstance(v, np.integer):   v = int(v)
            elif isinstance(v, np.floating): v = None if np.isnan(v) else float(v)
            elif isinstance(v, np.bool_):    v = bool(v)
            elif isinstance(v, float) and v != v: v = None
            clean_row[k] = v
        clean.append(clean_row)
    return clean


# ─────────────────────────────────────────────────────────
#  ENTRY POINT
# ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    print("=" * 54)
    print("  🧠  QueryMind v4.0 — Natural Language to SQL")
    print("  🌐  http://localhost:8000")
    print("  📖  API Docs: http://localhost:8000/docs")
    print("=" * 54)
    uvicorn.run("server:app", host="0.0.0.0",
                port=int(os.environ.get("PORT", 8000)),
                reload=True, log_level="info")
