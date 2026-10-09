from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from typing import List
from database import engine, Base, get_db
from llm_service import generate_chart_spec
from models import Graph
from core.cache import get_cached, set_cached
from core.rate_limit import RateLimitMiddleware
import re, logging

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Graph Generator API")

# Rate Limiting — 10 req/min per IP
app.add_middleware(RateLimitMiddleware)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GLOBAL EXCEPTION HANDLER
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions gracefully."""
    logger.error(f"Unhandled error on {request.url.path}: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Something went wrong. Please try again.",
            "type": "server_error"
        }
    )

# ============================================================
# REQUEST / RESPONSE MODELS
# ============================================================
class QuestionRequest(BaseModel):
    question: str


# ============================================================
# NORMALIZE QUESTION — upgraded for dedup
# ============================================================
def normalize_question(q: str) -> str:
    """Normalize question for consistent duplicate detection."""
    if not q:
        return ""

    # 1. Lowercase
    q = q.lower()

    # 2. Unicode math symbols → ASCII
    q = (
        q.replace('≤', '<=')
         .replace('≥', '>=')
         .replace('≠', '!=')
         .replace('×', '*')
         .replace('÷', '/')
         .replace('−', '-')
         .replace('–', '-')
         .replace('—', '-')
    )

    # 3. Word variations → standard form
    q = q.replace('minimize', 'min')
    q = q.replace('maximize', 'max')
    q = q.replace('minimise', 'min')
    q = q.replace('maximise', 'max')
    q = q.replace('subject to', 'st')
    q = q.replace('such that', 'st')

    # 4. Multiple spaces → single space
    q = re.sub(r'\s+', ' ', q)

    # 5. Spaces around operators hatao
    q = re.sub(r'\s*([<>=+\-*/])\s*', r'\1', q)

    # 6. Trailing punctuation hatao
    q = q.strip(' .,;')

    return q


# ============================================================
# ROOT & HEALTH
# ============================================================
@app.get("/")
def read_root():
    return {"message": "Graph Generator API is running!"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "graph-generator"}


@app.get("/db-test")
def db_test(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"database": "connected", "status": "success"}
    except Exception as e:
        return {"database": "failed", "error": str(e)}


# ============================================================
# GENERATE GRAPH — Also saves to database
# ============================================================
@app.post("/generate-graph")
def generate_graph(request: QuestionRequest, db: Session = Depends(get_db)):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

     # CACHE CHECK
    cached = get_cached(request.question)
    if cached:
        print(f"Cache hit: {request.question[:50]}")
        return cached

    # Normalize question for consistent dedup
    normalized_question = normalize_question(request.question)

    # IMPORTANT: LLM ko original question bhejo, normalized nahi
    # (warna LLM confuse ho jayega "st" jaisi cheezein dekh ke)
    result = generate_chart_spec(request.question)

    # Handle errors
    if "error" in result:
        error_type = result.get("type", "error")

        # User-friendly status codes
        if error_type in ["unbounded", "infeasible", "llm_json_error", "llm_error"]:
            status_code = 400   # Client error — user's question issue
        elif error_type == "rate_limit":
            status_code = 429   # Too many requests
        else:
            status_code = 500   # Server error

        raise HTTPException(status_code=status_code, detail=result["error"])
        set_cached(request.question, result)
    # CACHE SAVE                                           
    set_cached(request.question, result)

    # Check if this question already exists (using normalized form)
    existing = db.query(Graph).filter(
        Graph.question_normalized == normalized_question
    ).first()

    if existing:
        # Existing question — update, don't duplicate
        existing.question = request.question                    # Original
        existing.question_normalized = normalized_question      # Normalized
        existing.chart_spec = result
        existing.chart_type = result.get("chart_type")
        existing.confidence = result.get("confidence")
        existing.is_math = result.get("is_math", False)
        existing.is_unbounded = result.get("is_unbounded", False)
        existing.created_at = datetime.utcnow()                 # Update timestamp
        db.commit()
        db.refresh(existing)

        result["id"] = str(existing.id)
        return result

    # Save new record to database
    try:
        graph = Graph(
            question=request.question,
            question_normalized=normalized_question,
            chart_spec=result,
            chart_type=result.get("chart_type"),
            confidence=result.get("confidence"),
            is_math=result.get("is_math", False),
            is_unbounded=result.get("is_unbounded", False),
            created_at=datetime.utcnow()
        )
        db.add(graph)
        db.commit()
        db.refresh(graph)

        # Add DB id to response
        result["id"] = str(graph.id)
        result["created_at"] = graph.created_at.isoformat()

    except Exception as e:
        db.rollback()
        print(f"Warning: Failed to save to DB: {e}")

    return result


# ============================================================
# HISTORY — Get recent graphs
# ============================================================
@app.get("/api/history")
def get_history(limit: int = 20, offset: int = 0, db: Session = Depends(get_db)):
    limit = min(limit, 500)
    try:
        graphs = (
            db.query(Graph)
            .order_by(Graph.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        total = db.query(Graph).count()

        return {
            "total": total,
            "count": len(graphs),
            "items": [g.to_dict() for g in graphs],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# GET SINGLE GRAPH BY ID
# ============================================================
@app.get("/api/graphs/{graph_id}")
def get_graph(graph_id: str, db: Session = Depends(get_db)):
    try:
        graph = db.query(Graph).filter(Graph.id == graph_id).first()
        if not graph:
            raise HTTPException(status_code=404, detail="Graph not found")
        return graph.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# DELETE GRAPH
# ============================================================
@app.delete("/api/graphs/{graph_id}")
def delete_graph(graph_id: str, db: Session = Depends(get_db)):
    try:
        graph = db.query(Graph).filter(Graph.id == graph_id).first()
        if not graph:
            raise HTTPException(status_code=404, detail="Graph not found")

        db.delete(graph)
        db.commit()
        return {"message": "Deleted successfully", "id": graph_id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
# ============================================================
# TOUCH GRAPH — Update created_at (moves to top of history)
# SAFE: Only updates timestamp, NO duplicate record
# ============================================================
@app.post("/api/graphs/{graph_id}/touch")
def touch_graph(graph_id: str, db: Session = Depends(get_db)):
    """
    Update graph's created_at to now.
    This moves it to top of history WITHOUT creating duplicates.
    """
    try:

        count_before = db.query(Graph).count()

        graph = db.query(Graph).filter(Graph.id == graph_id).first()
        if not graph:
            raise HTTPException(status_code=404, detail="Graph not found")
        
        # Only update timestamp — no new record
        graph.created_at = datetime.utcnow()
        db.commit()
        db.refresh(graph)
        
        count_after = db.query(Graph).count()
        if count_before != count_after:
            print(f" WARNING: Count changed! {count_before} → {count_after}")
        
        return {
            "success": True,
            "id": str(graph.id),
            "created_at": graph.created_at.isoformat(),
            "count_before": count_before,
            "count_after": count_after
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))    