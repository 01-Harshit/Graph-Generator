# 🚀 Graph Generator — AI-Powered Chart Generation

Full-stack web application that converts natural language questions into beautiful charts using LLM (Groq) + FastAPI + React + ECharts.

## 🎯 Features

- ✅ **AI-Powered** — Natural language → Chart JSON via Groq (Llama 3.3 70B)
- ✅ **Linear Programming** — Solve and visualize LP problems (min/max/dual)
- ✅ **5 Chart Types** — Bar, Line, Pie, Scatter, Area
- ✅ **40x Faster** — Redis caching (2s → 50ms)
- ✅ **Rate Limiting** — 100 req/min (dev) / 10 req/min (prod)
- ✅ **100% Eval Score** — 55 test cases, all passing
- ✅ **Mobile Responsive** — Auto-adjusting layouts
- ✅ **History Tracking** — PostgreSQL + Supabase

## 🛠️ Tech Stack

**Frontend:**
- React 18 + Vite
- Tailwind CSS
- ECharts
- Axios

**Backend:**
- FastAPI + Uvicorn
- SQLAlchemy + PostgreSQL
- Redis (Upstash)
- Groq API (Llama 3.3 70B)
- SymPy + NumPy (Math)
- SciPy + ConvexHull (LP)

## 📊 Performance

| Metric | Value |
|---|---|
| Chart Accuracy (VCS) | 100% |
| Avg Response (cached) | 50ms |
| Avg Response (fresh) | 2s |
| Cost | $0 (free tier) |

## 🚀 Quick Start

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload