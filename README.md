<div align="center">

# 📊 Graph Generator

### Ask a question. Get an interactive chart.

An AI-powered chart generator that turns a question into an interactive **ECharts** visualization, from business data and math function plots to full **Linear Programming** problems with feasible regions and optimal points.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

</div>

---

## ✨ What It Does

Type a question, and the app decides what kind of chart it needs.

| You ask | You get |
|---|---|
| `Show monthly sales of iPhone in 2024` | 📈 Line chart with months on the X-axis |
| `Compare revenue of Tata, Adani, and Reliance` | 📊 Bar chart |
| `Market share of Android vs iOS in India` | 🥧 Pie chart |
| `Plot y = x^2 from -5 to 5` | 📉 Function plot computed with SymPy + NumPy |
| `Max Z = 5x + 4y subject to 6x + 4y <= 24, x + 2y <= 6` | 🎯 Feasible region, corner points and the optimal point |
| `Min and Max Z = 3x + 9y subject to ...` | 🔴🟢 Dual chart showing both minimum and maximum |

---

## 📸 Screenshots

<!--
Add your screenshots in a `docs/` folder and uncomment the lines below.
Example:
![Business Chart](docs/business-chart.png)
-->

| Business Chart | Linear Programming |
|:---:|:---:|
| *Add screenshot here* | *Add screenshot here* |

| Dual LP (Min + Max) | Dark Mode |
|:---:|:---:|
| *Add screenshot here* | *Add screenshot here* |

---

## 🎯 Features

### 🤖 AI Chart Generation
- Natural language to chart, using **Groq** with structured **JSON mode** output
- The LLM returns a chart **spec (JSON), not code**, so nothing generated is ever executed in the browser
- 5 chart types: **bar, line, pie, scatter, area**
- Confidence score returned with every spec

### 📐 Linear Programming Solver
- Single LP (minimize **or** maximize) and Dual LP (minimize **and** maximize together)
- Solved with **SciPy** `linprog`, feasible region drawn from corner points using **ConvexHull**
- Detects **unbounded** and **infeasible** problems and shows a clear message
- Color-coded optimal points (🟢 minimum, 🔴 maximum)
- Auto-adjusting labels for mobile screens

### ⚡ Performance and Reliability
- **Redis (Upstash)** caching with TTL, so repeated questions skip the LLM entirely
- App keeps working if Redis is down (cache is skipped gracefully)
- **Multi-model fallback chain:** `gpt-oss-120b` → `gpt-oss-20b`
- Retry with backoff on rate limit and transient errors
- **Per-IP rate limiting** middleware (dev: 100 req/min, prod: 10 req/min)
- Global exception handler with user-friendly error messages

### 🗂️ History
- Every generated chart is saved to **PostgreSQL** (chart spec stored as **JSONB**)
- Duplicate detection using a normalized question (`≤` → `<=`, `minimize` → `min`, extra spaces removed)
- Relative timestamps (`5m ago`, `2h ago`, `3d ago`)
- Click an old chart to move it back to the top

### 🎨 UI / UX
- Dark and light theme
- Download any chart as **PNG**
- Responsive layout for mobile and desktop

---

## 🏗️ Architecture

```mermaid
flowchart TD
    A[👤 User Question] --> B[⚛️ React + ECharts Frontend]
    B -->|POST /generate-graph| C[⚡ FastAPI Backend]
    C --> D{Redis cache hit?}
    D -->|Yes| H[Return cached chart spec]
    D -->|No| E[🧠 Groq LLM<br/>gpt-oss-120b → gpt-oss-20b]
    E --> F{Question type}
    F -->|Business data| G1[Chart spec as-is]
    F -->|Math function| G2[SymPy + NumPy]
    F -->|Linear Programming| G3[SciPy + ConvexHull]
    G1 --> I[(🐘 PostgreSQL<br/>history, JSONB)]
    G2 --> I
    G3 --> I
    I --> J[(⚡ Redis cache, TTL)]
    J --> H
    H --> B
```

---

## 🛠️ Tech Stack

**Frontend**
- React + Vite
- Tailwind CSS
- ECharts (`echarts-for-react`)
- Axios

**Backend**
- FastAPI + Uvicorn
- SQLAlchemy + Pydantic
- SymPy, NumPy, SciPy

**AI**
- Groq API (`openai/gpt-oss-120b`, fallback `openai/gpt-oss-20b`)

**Data**
- PostgreSQL on Supabase (JSONB for chart specs)
- Redis on Upstash (TLS, `rediss://`)

---

## 📁 Project Structure

```
graph-generator/
├── backend/
│   ├── main.py                # FastAPI app and API routes
│   ├── models.py              # SQLAlchemy models
│   ├── database.py            # Database connection
│   ├── llm_service.py         # Groq integration, fallback and retry
│   ├── math_service.py        # Math function plots (SymPy + NumPy)
│   ├── core/
│   │   ├── config.py          # Environment config
│   │   ├── cache.py           # Redis cache helpers
│   │   └── rate_limit.py      # Rate limiting middleware
│   └── lp_charts/
│       ├── lp_service.py      # Single LP solver
│       └── lp_min_max.py      # Dual (min + max) LP solver
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ChartDisplay.jsx
│       │   ├── HistorySidebar.jsx
│       │   ├── QuestionInput.jsx
│       │   ├── Navbar.jsx
│       │   └── charts/        # LP chart builders
│       └── services/api.js    # All backend calls
└── eval/
    ├── test_questions.json    # 55 test questions
    └── run_eval.py            # Eval script
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/generate-graph` | Generate a chart from a question (cache, LLM, save to DB) |
| `GET` | `/api/history` | List saved charts (`limit`, `offset`) |
| `GET` | `/api/graphs/{id}` | Get one saved chart |
| `DELETE` | `/api/graphs/{id}` | Delete a saved chart |
| `POST` | `/api/graphs/{id}/touch` | Move a chart to the top of history |
| `GET` | `/health` | Health check |

Example request:

```bash
curl -X POST http://127.0.0.1:8000/generate-graph \
  -H "Content-Type: application/json" \
  -d '{"question": "Show monthly sales of iPhone in 2024"}'
```

Interactive docs are available at `http://127.0.0.1:8000/docs` (Swagger UI).

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- A [Groq](https://console.groq.com) API key
- A PostgreSQL database (for example [Supabase](https://supabase.com))
- A Redis instance (for example [Upstash](https://upstash.com)). Optional: the app runs without it, just without caching.

### 1. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Mac / Linux
# source venv/bin/activate

pip install -r requirements.txt
```

Create a `backend/.env` file:

```env
GROQ_API_KEY=your_groq_api_key
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Redis (Upstash)
RH=your-redis-host.upstash.io
RPORT=6379
RP=your_redis_password

# Optional
APP_ENV=development            # "production" lowers the default rate limit to 10/min
RATE_LIMIT_PER_MINUTE=100
CACHE_TTL_SECONDS=3600
```

Start the server:

```bash
uvicorn main:app --reload
```

Backend runs at `http://127.0.0.1:8000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`. To point it at a different backend, create `frontend/.env`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

> ⚠️ Never commit `.env` files. Both are already listed in `.gitignore`.

---

## 🧪 Evaluation

The repo includes a small eval harness to check that the LLM returns a valid spec and picks the right chart type.

```bash
# backend must be running
python eval/run_eval.py
```

- **55 test questions** in `eval/test_questions.json` (business charts, math plots, single and dual LP)
- **Structural Validity (SV):** the response contains a usable chart type
- **Chart Type Accuracy (CTA):** the chart type is in the list of acceptable types for that question
- **VCS** = `0.4 × SV + 0.6 × CTA`
- Each run is saved as a JSON report in `eval/`

Latest run: **55/55** on both SV and CTA. Earlier runs scored lower (94.5% VCS) before the prompt and LP routing were tuned. This is a custom suite written by the author, so treat it as a regression check rather than a benchmark.

---

## ⚠️ Known Limitations

- Business charts use **LLM-generated sample data**, not real data sources
- The rate limiter is **in-memory** and works for a single server process only
- CORS is open (`*`) for development and should be restricted before deploying
- No automated unit tests yet (only the eval script)

---

## 🔮 Roadmap

- [ ] Deploy backend and frontend publicly
- [ ] GitHub Actions CI (lint and eval)
- [ ] Redis-based rate limiter for multi-worker setups
- [ ] Unit tests with `pytest`
- [ ] User authentication and per-user history
- [ ] Upload a CSV and chart real data
- [ ] 3-variable LP problems

---

## 👤 Author

**Harshit Pandey**
B.Tech CSE, IET DDU Gorakhpur University · Open-source contributor to [django-stubs](https://github.com/typeddjango/django-stubs)

[![GitHub](https://img.shields.io/badge/GitHub-01--Harshit-181717?style=flat&logo=github)](https://github.com/01-Harshit)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-harshit--pandey01-0A66C2?style=flat&logo=linkedin)](https://linkedin.com/in/harshit-pandey01)

If you find this project useful, a ⭐ on the repo is appreciated!
