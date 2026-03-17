"""
╔══════════════════════════════════════════════════════════════╗
║  nl_to_sql.py  —  Natural Language → SQL Engine  v3.0       ║
╚══════════════════════════════════════════════════════════════╝

NEW IN v3.0:
  ★ Conversational memory  — AI sees last 5 turns so follow-up
    questions like "now filter that by year 2" work perfectly.
  ★ AI-suggested charts    — Every SQL response includes a chart
    recommendation (type, axes, title, color scheme).
  ★ Dashboard generation   — Given a plain-English goal, the AI
    generates 4-6 coordinated SQL queries for a full dashboard.
"""

import re
import json
import requests
from typing import Tuple, Optional, List, Dict, Any

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

_hf_pipeline = None


# ─────────────────────────────────────────────────────────
#  SYSTEM PROMPTS
# ─────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert SQL query generator. Convert natural language questions into accurate SQLite SQL queries.

STRICT RULES:
1. Generate ONLY SELECT queries — NEVER INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE.
2. Use EXACT table and column names from the schema — never invent names.
3. SQLite specifics: use strftime() for dates, LIKE for patterns, || for string concat.
4. Always use table aliases in JOINs (e.g. s for students, d for departments).
5. Add LIMIT 100 unless the user explicitly asks for more or all rows.
6. Handle NULL values with IS NULL / IS NOT NULL.
7. For aggregations always use correct GROUP BY.
8. For CHART: pick the best type from: bar, line, pie, scatter, area, funnel, heatmap, table.
   - bar/line/area  → need one categorical x-column and one numeric y-column
   - pie/funnel     → need one label column and one value column  
   - scatter        → need two numeric columns
   - heatmap        → need two categorical columns and one numeric value
   - table          → use when data has many columns or doesn't fit a chart

OUTPUT FORMAT — return ONLY this JSON (no markdown, no code fences, no extra text):
{
  "sql": "SELECT ...",
  "explanation": "One sentence explaining what this query does",
  "confidence": 0.95,
  "chart": {
    "type": "bar",
    "x": "column_name_for_x_axis",
    "y": "column_name_for_y_axis",
    "title": "Human-readable chart title",
    "color": "teal"
  }
}

For chart color use one of: teal, blue, purple, orange, green, red, pink"""


DASHBOARD_SYSTEM_PROMPT = """You are a senior data analyst and BI engineer building production-grade dashboards.
Given a user's analytical goal and a database schema, generate a COMPLETE dashboard plan
with 2 KPI cards + 4-5 chart panels that together answer the goal comprehensively.

PANEL TYPES:
1. "kpi" — A single big metric number. SQL must return exactly ONE row with ONE numeric column.
   Include kpi_label (column alias for the number), kpi_icon (1 emoji), kpi_prefix (e.g. "$"), kpi_suffix (e.g. "%").
2. "chart" — A rich visualization. Must have x (categorical/date column) and y (numeric column).

CHART TYPES (for "chart" panels):
- "bar"      → categories on X, numbers on Y. Best for comparisons.
- "bar_h"    → horizontal bar. Best for long category names (>6 chars) or many categories.
- "line"     → time-series or sequential trends.
- "area"     → cumulative trends, nice fill effect.
- "pie"      → part-to-whole. Use only when ≤ 8 categories. x=label, y=value.
- "donut"    → same as pie but with a hole. Great for percentages.
- "scatter"  → two numeric columns, shows correlation.
- "funnel"   → conversion stages. x=stage_label, y=count.
- "table"    → when data has 3+ columns and doesn't fit a chart.

COLOR THEMES (assign different ones to each panel for variety):
"blue", "teal", "violet", "amber", "rose", "emerald", "orange", "cyan", "indigo", "pink"

RULES:
- Only SELECT queries. Use EXACT table and column names from schema — never invent names.
- Each panel answers a DIFFERENT aspect of the goal.
- KPI panels: SELECT COUNT(*), SUM(col), AVG(col), MAX(col), etc. — must return a single number.
- Chart panels: Add LIMIT 20 for bar/pie/donut/funnel. No limit needed for line/area/scatter.
- Each SQL must be independently runnable.
- Use meaningful aliases: SELECT COUNT(*) AS total_orders (not just COUNT(*)).
- dashboard_theme: pick one of "blue", "teal", "violet", "amber", "rose" to set the hero color.

OUTPUT FORMAT — return ONLY this JSON (no markdown, no code fences, no extra text):
{
  "dashboard_title": "Compelling Dashboard Title",
  "subtitle": "One sentence describing the key story this dashboard tells",
  "dashboard_theme": "blue",
  "kpi_row": [
    {
      "title": "KPI label shown above the number",
      "sql": "SELECT COUNT(*) AS total_records FROM table_name",
      "kpi_label": "total_records",
      "kpi_icon": "📦",
      "kpi_prefix": "",
      "kpi_suffix": "",
      "kpi_color": "blue",
      "insight": "What this metric means"
    }
  ],
  "panels": [
    {
      "title": "Panel title",
      "sql": "SELECT category_col, COUNT(*) AS total FROM table GROUP BY category_col ORDER BY total DESC LIMIT 15",
      "chart_type": "bar",
      "x": "category_col",
      "y": "total",
      "color_theme": "teal",
      "insight": "Key takeaway in one sentence",
      "size": "half"
    }
  ]
}

Size options: "half" (two per row), "full" (one per row, for line/area/scatter/table)."""


# ─────────────────────────────────────────────────────────
#  PROMPT BUILDERS
# ─────────────────────────────────────────────────────────

def build_prompt(question: str, schema_text: str,
                 conversation_history: List[Dict] = None) -> str:
    """
    Builds the user message combining schema, optional conversation
    history (for follow-up questions), and the current question.

    CONVERSATIONAL MEMORY:
      We include the last 5 query/SQL pairs so the AI can resolve
      pronouns and references like "filter that", "add year to it",
      "show me the same but for doctors" etc.
    """
    context = ""
    if conversation_history:
        recent = conversation_history[-5:]
        context = "\nConversation so far (for follow-up context):\n"
        for i, h in enumerate(recent, 1):
            context += f'  Turn {i}: User asked: "{h["question"]}"\n'
            context += f'           SQL used:   {h["sql"]}\n'
        context += "\nUse the above context if the new question refers to previous results.\n"

    return f"""Database schema:
{schema_text}
{context}
Now convert this to a SQLite SQL query: "{question}"

Return ONLY the JSON object with keys: sql, explanation, confidence, chart"""


def build_dashboard_prompt(goal: str, schema_text: str) -> str:
    return f"""Database schema:
{schema_text}

The user wants to build a dashboard to answer this goal:
"{goal}"

Generate a complete dashboard plan with 4-6 panels that together comprehensively address this goal.
Return ONLY the JSON object."""


# ─────────────────────────────────────────────────────────
#  RESPONSE PARSERS
# ─────────────────────────────────────────────────────────

def _extract_from_dict(data: dict) -> Tuple[str, str, float, Dict]:
    """Extract and validate all four fields from a parsed JSON dict."""
    sql = str(data.get("sql", "")).strip()
    if not sql or not sql.upper().startswith(("SELECT", "WITH")):
        raise ValueError(f"No valid SELECT in response: '{sql[:80]}'")

    explanation = str(data.get("explanation", "No explanation provided"))
    confidence  = float(data.get("confidence", 0.8))
    confidence  = max(0.0, min(1.0, confidence))

    # Chart suggestion — fallback to safe defaults if missing/malformed
    chart_raw = data.get("chart", {})
    if not isinstance(chart_raw, dict):
        chart_raw = {}
    chart = {
        "type":  chart_raw.get("type", "table"),
        "x":     chart_raw.get("x", ""),
        "y":     chart_raw.get("y", ""),
        "title": chart_raw.get("title", explanation[:60]),
        "color": chart_raw.get("color", "teal"),
    }

    return sql, explanation, confidence, chart


def parse_response(text: str) -> Tuple[str, str, float, Dict]:
    """
    Robustly extract (sql, explanation, confidence, chart) from any
    model output. Handles markdown fences, surrounding text, bare SELECT.
    """
    if not text or not text.strip():
        raise ValueError("Empty response from model")

    text = re.sub(r'```(?:json|sql)?\s*', '', text)
    text = re.sub(r'```', '', text).strip()

    try:
        return _extract_from_dict(json.loads(text))
    except (json.JSONDecodeError, ValueError):
        pass

    m = re.search(r'\{[^{}]*"sql"[^{}]*\}', text, re.DOTALL)
    if m:
        try:
            return _extract_from_dict(json.loads(m.group()))
        except (json.JSONDecodeError, ValueError):
            pass

    m = re.search(r'\{.*?\}', text, re.DOTALL)
    if m:
        try:
            return _extract_from_dict(json.loads(m.group()))
        except (json.JSONDecodeError, ValueError):
            pass

    # Last resort — bare SELECT
    m = re.search(r'(SELECT\s+.+?)(?:;|\Z)', text, re.IGNORECASE | re.DOTALL)
    if m:
        sql = m.group(1).strip()
        fallback_chart = {"type": "table", "x": "", "y": "", "title": "Query Results", "color": "teal"}
        return sql, "SQL extracted from model output", 0.65, fallback_chart

    raise ValueError(f"Could not extract SQL from model response: {text[:300]}")


def parse_dashboard_response(text: str) -> Dict:
    """Parse the dashboard plan JSON from the AI response.
    Normalizes both old (panels-only) and new (kpi_row + panels) formats.
    """
    text = re.sub(r'```(?:json)?\s*', '', text)
    text = re.sub(r'```', '', text).strip()

    data = None
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        pass

    if data is None:
        m = re.search(r'\{.*"panels".*\}', text, re.DOTALL)
        if m:
            try:
                data = json.loads(m.group())
            except json.JSONDecodeError:
                pass

    if data is None:
        raise ValueError("Could not parse dashboard plan from AI response")

    # Normalize panels — map chart_type → chart dict expected by server
    for panel in data.get("panels", []):
        if "chart_type" in panel and "chart" not in panel:
            panel["chart"] = {
                "type":  panel.get("chart_type", "bar"),
                "x":     panel.get("x", ""),
                "y":     panel.get("y", ""),
                "title": panel.get("title", ""),
                "color": panel.get("color_theme", panel.get("color", "blue")),
            }
        panel.setdefault("size", "half")

    # Normalize kpi_row — ensure sql field exists
    for kpi in data.get("kpi_row", []):
        kpi.setdefault("kpi_icon", "📊")
        kpi.setdefault("kpi_prefix", "")
        kpi.setdefault("kpi_suffix", "")
        kpi.setdefault("kpi_color", "blue")

    return data


# ─────────────────────────────────────────────────────────
#  CLOUD PROVIDERS  (updated to pass conversation_history)
# ─────────────────────────────────────────────────────────

def query_gemini(api_key: str, question: str, schema_text: str,
                 conversation_history: List[Dict] = None) -> Tuple[str, str, float, Dict]:
    if not GEMINI_AVAILABLE:
        raise ImportError("google-generativeai not installed. Run: pip install google-generativeai")

    genai.configure(api_key=api_key)
    model    = genai.GenerativeModel(model_name="gemini-1.5-flash", system_instruction=SYSTEM_PROMPT)
    prompt   = build_prompt(question, schema_text, conversation_history)
    response = model.generate_content(prompt)
    return parse_response(response.text)


def query_openai(api_key: str, question: str, schema_text: str,
                 conversation_history: List[Dict] = None) -> Tuple[str, str, float, Dict]:
    if not OPENAI_AVAILABLE:
        raise ImportError("openai not installed. Run: pip install openai")

    client   = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": build_prompt(question, schema_text, conversation_history)},
        ],
        temperature=0.1, max_tokens=600,
    )
    return parse_response(response.choices[0].message.content)


def query_groq(api_key: str, question: str, schema_text: str,
               conversation_history: List[Dict] = None) -> Tuple[str, str, float, Dict]:
    if not GROQ_AVAILABLE:
        raise ImportError("groq not installed. Run: pip install groq")

    client   = Groq(api_key=api_key)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": build_prompt(question, schema_text, conversation_history)},
        ],
        temperature=0.1, max_tokens=600,
    )
    return parse_response(response.choices[0].message.content)


OLLAMA_URL = "http://localhost:11434"
PREFERRED_OLLAMA_MODELS = [
    "qwen2.5-coder:7b","qwen2.5-coder:3b","qwen2.5-coder:1.5b",
    "llama3.2:3b","llama3.2:1b","mistral:7b","mistral:latest",
    "codellama:7b","codellama:latest","phi3:mini",
    "deepseek-coder:6.7b","llama3:8b","gemma2:9b",
]

def check_ollama_running() -> bool:
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        return r.status_code == 200
    except Exception:
        return False

def get_ollama_models() -> List[str]:
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        if r.status_code == 200:
            return [m["name"] for m in r.json().get("models", [])]
    except Exception:
        pass
    return []

def get_best_ollama_model() -> Optional[str]:
    installed = get_ollama_models()
    if not installed:
        return None
    for preferred in PREFERRED_OLLAMA_MODELS:
        base = preferred.split(":")[0]
        for m in installed:
            if m == preferred or m.startswith(base + ":") or m == base:
                return m
    return installed[0]

def query_ollama(question: str, schema_text: str, model: str = None,
                 conversation_history: List[Dict] = None) -> Tuple[str, str, float, Dict]:
    if not check_ollama_running():
        raise ConnectionError("Ollama is not running. Install from https://ollama.ai, then: ollama serve")

    if not model:
        model = get_best_ollama_model()
        if not model:
            raise ValueError("No Ollama models installed. Run: ollama pull qwen2.5-coder:7b")

    prompt = f"""[INST] You are a SQL expert. SQLite database schema:

{schema_text}

Write a SELECT query to answer: "{question}"

Rules: SELECT only. Exact column names. LIMIT 100.
Return ONLY this JSON (no markdown):
{{"sql": "SELECT ...", "explanation": "what it does", "confidence": 0.9,
  "chart": {{"type": "bar", "x": "col1", "y": "col2", "title": "Chart title", "color": "teal"}}}}
[/INST]"""

    resp = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={"model": model, "prompt": prompt, "stream": False,
              "options": {"temperature": 0.05, "num_predict": 600}},
        timeout=120,
    )
    if resp.status_code != 200:
        raise ValueError(f"Ollama error {resp.status_code}: {resp.text[:200]}")
    return parse_response(resp.json().get("response", ""))


# ─────────────────────────────────────────────────────────
#  DASHBOARD PLAN GENERATOR
# ─────────────────────────────────────────────────────────

def generate_dashboard_plan(goal: str, schema_text: str, provider: str,
                             api_key: str = "", model: str = None) -> Dict:
    """
    Generate a full dashboard plan from a plain-English goal.

    The AI returns 4-6 SQL queries with chart types and insights,
    which the server then executes and returns as a complete dashboard.

    Example goal: "Understand student performance across departments"
    Returns: {dashboard_title, subtitle, panels: [{title, sql, chart_type, insight, ...}]}
    """
    prompt = build_dashboard_prompt(goal, schema_text)

    if provider == "gemini":
        if not GEMINI_AVAILABLE:
            raise ImportError("google-generativeai not installed")
        genai.configure(api_key=api_key)
        model_obj = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=DASHBOARD_SYSTEM_PROMPT
        )
        response = model_obj.generate_content(prompt)
        raw = response.text

    elif provider == "openai":
        if not OPENAI_AVAILABLE:
            raise ImportError("openai not installed")
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": DASHBOARD_SYSTEM_PROMPT},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.2, max_tokens=2000,
        )
        raw = resp.choices[0].message.content

    elif provider == "groq":
        if not GROQ_AVAILABLE:
            raise ImportError("groq not installed")
        client = Groq(api_key=api_key)
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": DASHBOARD_SYSTEM_PROMPT},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.2, max_tokens=2000,
        )
        raw = resp.choices[0].message.content

    else:
        raise ValueError(f"Dashboard generation not supported for provider: {provider}")

    return parse_dashboard_response(raw)


# ─────────────────────────────────────────────────────────
#  PROVIDER STATUS
# ─────────────────────────────────────────────────────────

def get_provider_status() -> Dict:
    ollama_running = check_ollama_running()
    ollama_models  = get_ollama_models() if ollama_running else []
    return {
        "local": {
            "ollama": {
                "name": "Ollama (Local LLM)", "available": ollama_running,
                "models": ollama_models, "best_model": get_best_ollama_model() if ollama_running else None,
                "needs_key": False, "description": "Run LLMs on your machine. Free, private, offline.",
                "install_url": "https://ollama.ai",
            },
        },
        "cloud": {
            "gemini": {"name": "Google Gemini", "available": GEMINI_AVAILABLE, "needs_key": True,
                       "description": "Free tier. Fast. Recommended for students.", "key_url": "https://aistudio.google.com"},
            "openai": {"name": "OpenAI GPT", "available": OPENAI_AVAILABLE, "needs_key": True,
                       "description": "Paid API. Very accurate.", "key_url": "https://platform.openai.com"},
            "groq":   {"name": "Groq (LLaMA)", "available": GROQ_AVAILABLE, "needs_key": True,
                       "description": "Free tier. Extremely fast.", "key_url": "https://console.groq.com"},
        },
    }


# ─────────────────────────────────────────────────────────
#  MASTER FUNCTION
# ─────────────────────────────────────────────────────────

def natural_language_to_sql(
    question:             str,
    schema_text:          str,
    provider:             str,
    api_key:              str = "",
    model:                str = None,
    conversation_history: List[Dict] = None,
    retry_on_low_confidence: bool = True,
) -> Tuple[str, str, float, Dict]:
    """
    Convert a natural language question to SQL.

    v3.0 features:
      - conversation_history: list of {question, sql} dicts for memory
      - retry_on_low_confidence: if confidence < 0.60, silently retry with
        a more detailed prompt before returning
      - Returns 4-tuple: (sql, explanation, confidence, chart_suggestion)
    """
    if not question.strip():
        raise ValueError("Question cannot be empty")

    def _call(q):
        if provider == "ollama":
            return query_ollama(q, schema_text, model=model,
                               conversation_history=conversation_history)
        if not api_key.strip():
            raise ValueError(f"API key is required for the '{provider}' provider")
        if provider == "gemini":
            return query_gemini(api_key, q, schema_text, conversation_history)
        elif provider == "openai":
            return query_openai(api_key, q, schema_text, conversation_history)
        elif provider == "groq":
            return query_groq(api_key, q, schema_text, conversation_history)
        else:
            raise ValueError(f"Unknown provider: '{provider}'")

    sql, explanation, confidence, chart = _call(question)

    # Confidence retry: if AI seems uncertain, retry with more detailed prompt
    if retry_on_low_confidence and confidence < 0.60:
        enhanced = (
            question
            + "\n\n[IMPORTANT: Use ONLY the exact table and column names shown in the schema. "
            "Double-check every JOIN condition and column reference. "
            "If unsure about a column name, pick the closest match from the schema above.]"
        )
        try:
            sql2, explanation2, confidence2, chart2 = _call(enhanced)
            if confidence2 > confidence:
                sql, explanation, confidence, chart = sql2, explanation2, confidence2, chart2
        except Exception:
            pass  # Keep original

    return sql, explanation, confidence, chart


# ─────────────────────────────────────────────────────────
#  EXAMPLE QUERIES
# ─────────────────────────────────────────────────────────

EXAMPLE_QUERIES = {
    "🎓 College Database": [
        "Show all students with CGPA above 8.5",
        "Which department has the most students?",
        "List all courses with their professor names",
        "Find students who scored A+ in any course",
        "What is the average CGPA by department?",
        "Show top 5 students by CGPA",
        "How many students are in each year?",
        "Which professor teaches the most courses?",
        "List all students enrolled in Machine Learning",
        "Show students who failed in any subject",
    ],
    "🛒 E-Commerce Database": [
        "Show top 5 best selling products",
        "What is the total revenue this year?",
        "Which city has the most customers?",
        "List all pending orders",
        "Find customers who spent more than 50000",
        "What is the average order value?",
        "Show all products with rating above 4.5",
        "Which category generates the most revenue?",
        "List cancelled orders with customer details",
        "Find the most popular payment method",
    ],
    "🏥 Hospital Database": [
        "List all patients admitted in 2024",
        "Which doctor has seen the most patients?",
        "Show all patients with blood group O+",
        "Find patients diagnosed with Diabetes",
        "What is the average consultation fee?",
        "List all appointments for Cardiology",
        "Show patients still admitted without a discharge date",
        "Which medicine is prescribed most often?",
        "Find all female patients above age 60",
        "Show doctors sorted by years of experience",
    ],
}

# ─────────────────────────────────────────────────────────
#  SCHEMA SUMMARIZATION  (improves SQL accuracy on complex schemas)
# ─────────────────────────────────────────────────────────

SCHEMA_SUMMARY_PROMPT = """You are a database documentation expert.
Given a database schema, write a short 1-2 sentence description for EACH TABLE
explaining what real-world data it stores and what it's used for.

Return ONLY a JSON object where keys are EXACT table names (no spaces, keep original casing)
and values are the description strings.

Example format:
{"students": "Stores enrolled student records including personal info, GPA, and year of study.",
 "courses": "Contains all available courses with their credit hours and assigned professor."}"""


def summarize_schema_tables(
    schema_text: str, provider: str, api_key: str = "", model: str = None
) -> Dict[str, str]:
    """
    Run a lightweight AI pass to generate 1-sentence descriptions for each table.
    Injected into the schema explorer sidebar and used to enrich AI prompts.
    Returns {table_name: description_string}
    """
    prompt = f"""Database schema:
{schema_text}

Write a 1-2 sentence description for each table.
Return ONLY the JSON object (no markdown fences).
Keys must be exact table names from the schema above."""

    def _parse_summaries(text: str) -> Dict[str, str]:
        text = re.sub(r'```(?:json)?\s*', '', text).replace('```', '').strip()
        try:
            data = json.loads(text)
            if isinstance(data, dict):
                return {k: str(v) for k, v in data.items()}
        except Exception:
            pass
        # Try finding JSON block
        m = re.search(r'\{[^{}]+\}', text, re.DOTALL)
        if m:
            try:
                return {k: str(v) for k, v in json.loads(m.group()).items()}
            except Exception:
                pass
        return {}

    try:
        if provider == "ollama":
            if not check_ollama_running():
                return {}
            m = model or get_best_ollama_model()
            if not m:
                return {}
            resp = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": m, "prompt": f"[INST] {SCHEMA_SUMMARY_PROMPT}\n\n{prompt} [/INST]",
                      "stream": False, "options": {"temperature": 0.1, "num_predict": 800}},
                timeout=60,
            )
            return _parse_summaries(resp.json().get("response", ""))

        if not api_key.strip():
            return {}

        if provider == "gemini" and GEMINI_AVAILABLE:
            genai.configure(api_key=api_key)
            m_obj = genai.GenerativeModel("gemini-1.5-flash", system_instruction=SCHEMA_SUMMARY_PROMPT)
            return _parse_summaries(m_obj.generate_content(prompt).text)

        if provider == "openai" and OPENAI_AVAILABLE:
            client = OpenAI(api_key=api_key)
            resp = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "system", "content": SCHEMA_SUMMARY_PROMPT},
                           {"role": "user", "content": prompt}],
                temperature=0.1, max_tokens=600,
            )
            return _parse_summaries(resp.choices[0].message.content)

        if provider == "groq" and GROQ_AVAILABLE:
            client = Groq(api_key=api_key)
            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "system", "content": SCHEMA_SUMMARY_PROMPT},
                           {"role": "user", "content": prompt}],
                temperature=0.1, max_tokens=600,
            )
            return _parse_summaries(resp.choices[0].message.content)

    except Exception as e:
        print(f"Schema summary error: {e}")

    return {}


# ─────────────────────────────────────────────────────────
#  SQL STEP-BY-STEP EXPLAINER
# ─────────────────────────────────────────────────────────

EXPLAIN_STEPS_PROMPT = """You are a SQL teacher who explains queries to beginners.
Break a SQL query into 3-6 numbered steps in plain conversational English.
Each step should explain ONE logical part of the query.
A complete non-programmer must understand what the query is doing.

Return ONLY a JSON array of step strings (no markdown, no extra text).
Example: ["Step 1: We look at the students table which has all student records.",
           "Step 2: We filter to keep only students whose GPA is greater than 8.5.",
           "Step 3: We sort the remaining students from highest to lowest GPA.",
           "Step 4: We return only the top 5 results."]"""


def explain_sql_steps(
    sql: str, schema_text: str, provider: str, api_key: str = "", model: str = None
) -> List[str]:
    """
    Break a SQL query into numbered plain-English steps.
    Used in the 'Explain' tab of results.
    Returns a list of step strings like ["Step 1: ...", "Step 2: ..."]
    """
    prompt = f"""Schema context:
{schema_text[:1500]}

SQL query to explain:
{sql}

Break this query into 3-6 numbered steps in plain English for a non-programmer.
Return ONLY a JSON array of strings."""

    def _parse_steps(text: str) -> List[str]:
        text = re.sub(r'```(?:json)?\s*', '', text).replace('```', '').strip()
        try:
            data = json.loads(text)
            if isinstance(data, list):
                return [str(s) for s in data if s]
        except Exception:
            pass
        # Find JSON array
        m = re.search(r'\[.*?\]', text, re.DOTALL)
        if m:
            try:
                data = json.loads(m.group())
                return [str(s) for s in data if s]
            except Exception:
                pass
        # Fallback: split by "Step"
        lines = [l.strip() for l in text.split('\n') if l.strip() and ('Step' in l or l[0].isdigit())]
        return lines[:8] if lines else ["This query retrieves data from the database based on your question."]

    try:
        if provider == "ollama":
            if not check_ollama_running():
                return ["Ollama not running — start it to get step-by-step explanations."]
            m = model or get_best_ollama_model()
            if not m:
                return []
            resp = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": m, "prompt": f"[INST] {EXPLAIN_STEPS_PROMPT}\n\n{prompt} [/INST]",
                      "stream": False, "options": {"temperature": 0.1, "num_predict": 600}},
                timeout=60,
            )
            return _parse_steps(resp.json().get("response", ""))

        if not api_key.strip():
            return ["Add an API key to get step-by-step explanations."]

        if provider == "gemini" and GEMINI_AVAILABLE:
            genai.configure(api_key=api_key)
            m_obj = genai.GenerativeModel("gemini-1.5-flash", system_instruction=EXPLAIN_STEPS_PROMPT)
            return _parse_steps(m_obj.generate_content(prompt).text)

        if provider == "openai" and OPENAI_AVAILABLE:
            client = OpenAI(api_key=api_key)
            resp = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "system", "content": EXPLAIN_STEPS_PROMPT},
                           {"role": "user", "content": prompt}],
                temperature=0.1, max_tokens=600,
            )
            return _parse_steps(resp.choices[0].message.content)

        if provider == "groq" and GROQ_AVAILABLE:
            client = Groq(api_key=api_key)
            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "system", "content": EXPLAIN_STEPS_PROMPT},
                           {"role": "user", "content": prompt}],
                temperature=0.1, max_tokens=600,
            )
            return _parse_steps(resp.choices[0].message.content)

    except Exception as e:
        print(f"Explain steps error: {e}")
        return [f"Explanation unavailable: {e}"]

    return []


# ─────────────────────────────────────────────────────────
#  AI-GENERATED INSIGHTS
# ─────────────────────────────────────────────────────────

INSIGHTS_SYSTEM_PROMPT = """You are a sharp data analyst. You are given the results of a SQL query
along with the original question that produced them.

Your job: generate 3-5 concise, high-value insights from the data.

RULES:
- Each insight must be a standalone observation: a trend, outlier, comparison,
  percentage, ranking, or anomaly that a non-technical reader would find valuable.
- Be specific: use actual numbers, names, or percentages from the data where possible.
- Do NOT restate the question or explain what the query does.
- Do NOT give generic filler like "the data shows results" — every bullet must be
  a real finding.
- Keep each insight to 1-2 sentences maximum.
- Vary the insight types: include at least one trend/comparison AND one outlier/anomaly
  when the data allows it.
- Assign each insight an icon from: 📈 📉 🏆 ⚠️ 💡 🔍 📊 🎯 ⚡ 🔗
  that best matches the finding type.

OUTPUT FORMAT — return ONLY a JSON array (no markdown, no code fences):
[
  {"icon": "🏆", "text": "Computer Science has the highest average GPA of 3.82, outperforming all other departments."},
  {"icon": "⚠️", "text": "3 students have a GPA below 1.5, which may indicate academic risk."},
  {"icon": "📈", "text": "Enrollment has grown 18% from 2022 to 2024 across all departments."}
]"""


def _build_insights_prompt(question: str, columns: List[str], rows: List[Dict]) -> str:
    """Build a compact data snapshot for the insights AI call."""
    col_str = ", ".join(columns)
    # Send at most 50 rows to stay within token budget
    sample = rows[:50]
    # Format as a compact CSV-style block
    lines = [col_str]
    for row in sample:
        lines.append(", ".join(str(row.get(c, "")) for c in columns))
    data_block = "\n".join(lines)
    truncation_note = f"\n(showing {len(sample)} of {len(rows)} rows)" if len(rows) > 50 else ""
    return (
        f'Original question: "{question}"\n\n'
        f"Query results ({len(rows)} rows, {len(columns)} columns){truncation_note}:\n"
        f"{data_block}\n\n"
        "Generate 3-5 data insights from the above results."
    )


def _parse_insights(text: str) -> List[Dict]:
    """Parse the insights JSON array from the AI response."""
    text = re.sub(r'```(?:json)?\s*', '', text).replace('```', '').strip()
    # Try full parse
    try:
        data = json.loads(text)
        if isinstance(data, list):
            return [d for d in data if isinstance(d, dict) and "text" in d]
    except json.JSONDecodeError:
        pass
    # Try extracting array from surrounding text
    m = re.search(r'\[.*?\]', text, re.DOTALL)
    if m:
        try:
            data = json.loads(m.group())
            if isinstance(data, list):
                return [d for d in data if isinstance(d, dict) and "text" in d]
        except json.JSONDecodeError:
            pass
    # Fallback: extract bullet lines and wrap them
    insights = []
    for line in text.split('\n'):
        line = line.strip().lstrip('•-*123456789. ')
        if len(line) > 20:
            insights.append({"icon": "💡", "text": line})
    return insights[:5]


def generate_insights(
    question: str,
    columns: List[str],
    rows: List[Dict],
    provider: str,
    api_key: str = "",
    model: str = None,
) -> List[Dict]:
    """
    Generate 3-5 AI insights from query results.

    Returns a list of {"icon": "...", "text": "..."} dicts.
    Falls back gracefully to an empty list on any error.
    """
    if not rows or not columns:
        return []

    prompt = _build_insights_prompt(question, columns, rows)

    try:
        if provider == "ollama":
            if not check_ollama_running():
                return []
            m = model or get_best_ollama_model()
            if not m:
                return []
            resp = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": m,
                    "prompt": f"[INST] {INSIGHTS_SYSTEM_PROMPT}\n\n{prompt} [/INST]",
                    "stream": False,
                    "options": {"temperature": 0.3, "num_predict": 700},
                },
                timeout=60,
            )
            return _parse_insights(resp.json().get("response", ""))

        if not api_key.strip():
            return []

        if provider == "gemini" and GEMINI_AVAILABLE:
            genai.configure(api_key=api_key)
            m_obj = genai.GenerativeModel(
                "gemini-1.5-flash",
                system_instruction=INSIGHTS_SYSTEM_PROMPT,
            )
            return _parse_insights(m_obj.generate_content(prompt).text)

        if provider == "openai" and OPENAI_AVAILABLE:
            client = OpenAI(api_key=api_key)
            resp = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": INSIGHTS_SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
                temperature=0.3, max_tokens=700,
            )
            return _parse_insights(resp.choices[0].message.content)

        if provider == "groq" and GROQ_AVAILABLE:
            client = Groq(api_key=api_key)
            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": INSIGHTS_SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
                temperature=0.3, max_tokens=700,
            )
            return _parse_insights(resp.choices[0].message.content)

    except Exception as e:
        print(f"Insights generation error: {e}")

    return []


DASHBOARD_GOALS = {
    "🎓 College Database": [
        "Understand student performance across departments",
        "Analyze course enrollment and professor workload",
        "Show academic grade distribution and trends",
    ],
    "🛒 E-Commerce Database": [
        "Give me a full sales performance overview",
        "Analyze customer behavior and spending patterns",
        "Show product performance and inventory insights",
    ],
    "🏥 Hospital Database": [
        "Give me a hospital operations overview",
        "Analyze patient demographics and diagnoses",
        "Show doctor performance and appointment trends",
    ],
}
