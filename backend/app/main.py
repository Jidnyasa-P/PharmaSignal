from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from .schemas import ResearchRequest, ResearchResponse, ReviewRequest
from .demo_data import build_demo
from .research import run_live_research

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = FastAPI(
    title="PharmaSignal API",
    description="Human-in-the-loop pharmaceutical intelligence research MVP.",
    version="1.0.0",
)

origins_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [item.strip() for item in origins_raw.split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def root() -> str:
    return """<!doctype html><html><head><title>PharmaSignal API</title></head><body style='font-family:system-ui;padding:3rem;max-width:760px;margin:auto'><h1>PharmaSignal API</h1><p>The API is running.</p><p><a href='/docs'>Open interactive API docs</a> · <a href='/api/health'>Health check</a></p></body></html>"""

@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "PharmaSignal API", "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds")}

@app.get("/api/config")
def config() -> dict:
    return {
        "demo_available": True,
        "live_available": bool(os.getenv("GEMINI_API_KEY", "").strip() and os.getenv("TAVILY_API_KEY", "").strip()),
        "search_provider": "Tavily" if os.getenv("TAVILY_API_KEY", "").strip() else None,
        "model": os.getenv("GEMINI_MODEL", "gemini-3.8-flash"),
        "human_review_required": True,
    }

@app.post("/api/research", response_model=ResearchResponse)
def research(request: ResearchRequest) -> ResearchResponse:
    company = request.company.strip()
    if len(company) < 2:
        raise HTTPException(status_code=422, detail="Enter a company name with at least two characters.")
    try:
        if request.mode == "demo":
            return build_demo(company, request.focus)
        return run_live_research(company, request.focus)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        # Keep a clean API response; detailed stack traces stay in server logs.
        print(f"Research failed for {company!r}: {type(exc).__name__}: {exc}")
        raise HTTPException(status_code=502, detail="The research provider could not complete this scan. Check API keys, limits and server logs, or use Demo mode.") from exc

@app.post("/api/review")
def review(request: ReviewRequest) -> dict:
    """Stateless review acknowledgement; frontend persists analyst decisions locally.

    For this MVP, reviews are retained in the browser's localStorage so a free
    stateless backend requires no database. Production deployment should add an
    authenticated, persistent review store.
    """
    return {
        "saved": True,
        "finding_id": request.finding_id,
        "status": request.status,
        "reviewer": request.reviewer,
        "analyst_note": request.analyst_note,
        "reviewed_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "persistence": "browser-local-storage-managed-by-client",
    }
