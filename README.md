# 🧠 QueryMind — Natural Language to SQL

> Ask your database questions in plain English. Get instant answers.

QueryMind is a full-stack AI web application that translates natural language questions into SQL queries using Large Language Models (LLMs), executes them on a SQLite database, and displays the results as a table, chart, and explained SQL.

---

## 🎯 What It Does

| You type | QueryMind does |
|---|---|
| *"Show all students with CGPA above 8.5"* | `SELECT * FROM students WHERE cgpa > 8.5` |
| *"Which department has the most students?"* | `SELECT d.name, COUNT(*) FROM students s JOIN departments d ON s.dept_id = d.id GROUP BY d.id ORDER BY COUNT(*) DESC LIMIT 1` |
| *"What is total revenue this month?"* | `SELECT SUM(total_amount) FROM orders WHERE strftime('%Y-%m', order_date) = strftime('%Y-%m', 'now')` |

---

## 🏗️ Project Architecture

```
Browser (HTML/JS)
    │  User types question → JavaScript sends POST /api/query
    ▼
FastAPI Server (server.py)
    │  Validates request → reads schema → calls AI → executes SQL
    ▼
AI Provider (nl_to_sql.py)
    │  Gemini / OpenAI / Groq — generates SQL from English + schema
    ▼
SQLite Database (database.py)
    │  Executes SQL → returns Pandas DataFrame
    ▼
Browser (HTML/JS)
    Renders table + chart + SQL explanation
```

### File Structure

```
querymind/
├── server.py              ← FastAPI REST API (the glue)
├── database.py            ← All SQLite operations
├── nl_to_sql.py           ← AI query generation engine
├── file_importer.py       ← Upload CSV/Excel/JSON → database
├── sample_databases.py    ← Creates 3 demo databases
├── requirements.txt       ← Python dependencies
├── .env                   ← API keys (never commit this!)
├── static/
│   └── index.html         ← Entire frontend (HTML + CSS + JS)
└── databases/
    ├── college.db
    ├── ecommerce.db
    ├── hospital.db
    └── uploads/           ← User-uploaded databases stored here
```

---

## 🚀 Quick Start

### Step 1 — Clone and create environment

```bash
git clone https://github.com/yourusername/querymind.git
cd querymind

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt
```

### Step 2 — Get a free API key

Go to **https://aistudio.google.com** → Get API Key → Create API Key

Create a `.env` file:
```env
GEMINI_API_KEY=AIzaYourKeyHere
```

### Step 3 — Run

```bash
python server.py
```

Open **http://localhost:8000** in your browser.

That's it. The three sample databases are created automatically on first run.

---

## 📦 Sample Databases

Three realistic databases are included:

| Database | Tables | Rows | Sample Question |
|---|---|---|---|
| 🎓 College | students, departments, professors, courses, enrollments | ~900 | "Show top 5 students by CGPA" |
| 🛒 E-Commerce | customers, products, categories, orders, order_items | ~1,500 | "Which product sold the most?" |
| 🏥 Hospital | patients, doctors, appointments, prescriptions, medicines | ~1,200 | "List patients with Diabetes" |

---

## 📁 Import Your Own Data

Upload any of these formats and query them immediately:

| Format | Extension |
|---|---|
| CSV / TSV | `.csv` `.tsv` `.txt` |
| Excel | `.xlsx` `.xls` |
| JSON | `.json` |
| HTML Table | `.html` `.htm` |
| Parquet | `.parquet` |
| SQLite | `.db` `.sqlite` `.sqlite3` |

---

## 🤖 AI Providers

| Provider | Cost | Speed | Setup |
|---|---|---|---|
| **Google Gemini** | ✅ Free tier | Fast (~1s) | Get key at aistudio.google.com |
| **Groq (LLaMA)** | ✅ Free tier | Very fast (~0.5s) | Get key at console.groq.com |
| **OpenAI GPT** | 💰 Paid | Medium (~2s) | Get key at platform.openai.com |
| **Ollama (Local)** | ✅ Free, offline | Varies | Install from ollama.ai |

---

## 🌐 API Reference

All endpoints return JSON. Full interactive docs at `http://localhost:8000/docs`.

### POST /api/query — Main endpoint

**Request:**
```json
{
  "question": "Show all students with CGPA above 8.5",
  "db_name":  "🎓 College Database",
  "provider": "gemini",
  "api_key":  "AIzaYourKey",
  "max_rows": 200
}
```

**Response:**
```json
{
  "sql":           "SELECT * FROM students WHERE cgpa > 8.5 LIMIT 100",
  "explanation":   "Filters students where CGPA is greater than 8.5",
  "confidence":    0.97,
  "columns":       ["id", "name", "cgpa", "dept_id", "year"],
  "rows":          [{"id": 1, "name": "Arjun Sharma", "cgpa": 9.1, ...}],
  "total_rows":    42,
  "returned_rows": 42,
  "exec_time_s":   1.23
}
```

### Other Endpoints

```
GET  /api/databases              → {"databases": ["🎓 College Database", ...]}
GET  /api/schema/{db_name}       → Table + column info with row counts
GET  /api/examples/{db_name}     → Example queries for the database
GET  /api/providers              → AI provider availability
POST /api/import                 → Upload file (multipart/form-data)
DELETE /api/database/{db_name}   → Delete uploaded database
GET  /api/history                → Last 50 queries
GET  /api/health                 → Server status
```

---

## ☁️ Deployment

### Railway (Recommended — free tier)

1. Push code to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Add environment variable: `GEMINI_API_KEY=your_key`
4. Railway auto-detects Python and deploys

### Render (Free tier)

1. Go to render.com → New Web Service
2. Connect GitHub repo
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`

### Local Network (Classroom demo)

```bash
# Find your local IP: ifconfig (Mac/Linux) or ipconfig (Windows)
uvicorn server:app --host 0.0.0.0 --port 8000
# Anyone on same WiFi can visit: http://YOUR_IP:8000
```

---

## 🛡️ Security

- Only `SELECT` queries are allowed — `DROP`, `DELETE`, `UPDATE`, `INSERT` are blocked
- API keys are never stored server-side — passed per request, never logged
- File uploads are validated and size-limited (50 MB max)
- `.env` file should never be committed to Git

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Language | Python 3.11+ | All backend logic |
| Web Framework | FastAPI | REST API server |
| Database | SQLite | Data storage + querying |
| AI | Gemini / GPT / Groq | Natural language → SQL |
| Data | Pandas | DataFrame operations |
| Frontend | HTML + CSS + JS | User interface |
| Charts | Chart.js | Data visualisation |

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

*Built as a complete learning project. Read the code comments — every line is explained.*
