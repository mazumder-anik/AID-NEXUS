"""
main.py — FastAPI application entry point.
All REST endpoints, CORS middleware, startup seeding, and demo flow.
"""

import io
import uuid
import time
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.database import engine, get_db, Base
from backend.models import (
    Need, Volunteer, Match, ActivityLog,
    NeedOut, VolunteerOut, MatchOut, VolunteerRegister, DashboardStats
)
from backend.simulator import seed_database
from backend.scorer import score_and_update_db
from backend.matcher import run_matching
from backend.aggregator import aggregate_uploaded_csv

# ── App Setup ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Smart Resource Allocation API",
    description="Aggregate community needs, score urgency, match volunteers.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Startup ────────────────────────────────────────────────────────────────────
@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    from backend.database import SessionLocal
    db = SessionLocal()
    try:
        # Seed only if DB is empty
        if db.query(Need).count() == 0:
            print("[Startup] Empty DB detected — seeding with simulated data...")
            seed_database(db)
            score_and_update_db(db)
        else:
            print("[Startup] DB already has data — skipping seed.")
    finally:
        db.close()


# ══════════════════════════════════════════════════════════════════════════════
# NEEDS ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/needs", response_model=List[NeedOut], tags=["Needs"])
def get_needs(
    area:     Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status:   Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Return all needs, optionally filtered by area, category, or status."""
    q = db.query(Need)
    if area:
        q = q.filter(Need.area.ilike(f"%{area}%"))
    if category:
        q = q.filter(Need.category == category.lower())
    if status:
        q = q.filter(Need.status == status.lower())
    return q.order_by(Need.urgency_score.desc().nullslast()).all()


@app.get("/needs/urgent", response_model=List[NeedOut], tags=["Needs"])
def get_urgent_needs(db: Session = Depends(get_db)):
    """Return top 10 open needs sorted by urgency score."""
    return (
        db.query(Need)
        .filter(Need.status == "open")
        .order_by(Need.urgency_score.desc().nullslast())
        .limit(10)
        .all()
    )


@app.post("/needs/upload", tags=["Needs"])
async def upload_needs_csv(
    file: UploadFile = File(...),
    db:   Session    = Depends(get_db),
):
    """Upload a CSV file of new community needs. Aggregates, scores, and saves."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are accepted.")

    contents = await file.read()
    extra_df = aggregate_uploaded_csv(contents)

    if extra_df.empty:
        raise HTTPException(422, "No valid rows found in uploaded CSV.")

    added = 0
    for _, row in extra_df.iterrows():
        need_id = f"U{uuid.uuid4().hex[:6].upper()}"
        need = Need(
            need_id        = need_id,
            area           = str(row.get("area", "Unknown")),
            lat            = float(row.get("lat", 0)),
            lng            = float(row.get("lng", 0)),
            category       = str(row.get("category", "food")),
            description    = str(row.get("description", "Uploaded need")),
            reported_count = int(row.get("reported_count", 10)),
            source         = "uploaded_csv",
            reported_at    = row.get("reported_at", datetime.utcnow()),
            status         = "open",
        )
        db.add(need)
        added += 1

    db.commit()
    scored = score_and_update_db(db)
    return {"message": f"Uploaded and processed {added} needs.", "scored": scored}


@app.post("/needs/{need_id}/resolve", tags=["Needs"])
def resolve_need(need_id: str, db: Session = Depends(get_db)):
    """Mark a need as resolved and free its assigned volunteer."""
    need = db.query(Need).filter(Need.need_id == need_id).first()
    if not need:
        raise HTTPException(404, f"Need {need_id} not found.")
    need.status = "resolved"

    # Free the assigned volunteer
    match = (
        db.query(Match)
        .filter(Match.need_id == need_id, Match.status == "pending")
        .first()
    )
    if match:
        match.status = "completed"
        vol = db.query(Volunteer).filter(
            Volunteer.volunteer_id == match.volunteer_id
        ).first()
        if vol:
            vol.status       = "available"
            vol.current_task = None

    db.add(ActivityLog(
        action="NEED_RESOLVED", entity="need", entity_id=need_id,
        details=f"Need {need_id} marked as resolved."
    ))
    db.commit()
    return {"message": f"Need {need_id} resolved."}


# ══════════════════════════════════════════════════════════════════════════════
# VOLUNTEER ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/volunteers", response_model=List[VolunteerOut], tags=["Volunteers"])
def get_volunteers(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Return all volunteers, optionally filtered by status."""
    q = db.query(Volunteer)
    if status:
        q = q.filter(Volunteer.status == status.lower())
    return q.all()


@app.post("/volunteers/register", response_model=VolunteerOut, tags=["Volunteers"])
def register_volunteer(data: VolunteerRegister, db: Session = Depends(get_db)):
    """Register a new volunteer."""
    vol_id = f"V{uuid.uuid4().hex[:6].upper()}"
    vol = Volunteer(
        volunteer_id    = vol_id,
        name            = data.name,
        lat             = data.lat,
        lng             = data.lng,
        skills          = data.skills,
        availability    = data.availability,
        max_distance_km = data.max_distance_km,
        status          = "available",
    )
    db.add(vol)
    db.add(ActivityLog(
        action="VOLUNTEER_REGISTERED", entity="volunteer", entity_id=vol_id,
        details=f"New volunteer {data.name} registered."
    ))
    db.commit()
    db.refresh(vol)
    return vol


# ══════════════════════════════════════════════════════════════════════════════
# MATCHING ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/match/run", tags=["Matching"])
def trigger_matching(db: Session = Depends(get_db)):
    """Run the greedy matching algorithm and return new matches."""
    # Re-score before matching to refresh urgency
    score_and_update_db(db)
    matches = run_matching(db)
    return {
        "message": f"{len(matches)} new matches created.",
        "matches": matches,
    }


@app.get("/matches", response_model=List[MatchOut], tags=["Matching"])
def get_matches(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Return all matches, optionally filtered by status."""
    q = db.query(Match)
    if status:
        q = q.filter(Match.status == status.lower())
    return q.order_by(Match.assigned_at.desc()).all()


@app.post("/matches/{match_id}/accept", tags=["Matching"])
def accept_match(match_id: str, db: Session = Depends(get_db)):
    """Volunteer accepts a match."""
    match = db.query(Match).filter(Match.match_id == match_id).first()
    if not match:
        raise HTTPException(404, f"Match {match_id} not found.")
    match.status = "accepted"
    db.commit()
    return {"message": f"Match {match_id} accepted."}


# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD / STATS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/dashboard/stats", response_model=DashboardStats, tags=["Dashboard"])
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Return aggregated KPIs for the dashboard header."""
    needs      = db.query(Need).all()
    volunteers = db.query(Volunteer).all()
    matches    = db.query(Match).all()

    open_needs        = sum(1 for n in needs if n.status == "open")
    in_progress_needs = sum(1 for n in needs if n.status == "in_progress")
    resolved_needs    = sum(1 for n in needs if n.status == "resolved")

    available_vols = sum(1 for v in volunteers if v.status == "available")
    assigned_vols  = sum(1 for v in volunteers if v.status == "assigned")

    active_matches = sum(1 for m in matches if m.status in ("pending", "accepted"))

    # Needs by category
    cats = {}
    for n in needs:
        cats[n.category] = cats.get(n.category, 0) + 1

    # Coverage: % critical/high needs with ≥1 match
    critical_needs = [n for n in needs if n.urgency_badge in ("Critical", "High")
                      and n.status != "resolved"]
    matched_need_ids = {m.need_id for m in matches if m.status != "completed"}
    covered = sum(1 for n in critical_needs if n.need_id in matched_need_ids)
    coverage_pct = round(covered / max(len(critical_needs), 1) * 100, 1)

    return DashboardStats(
        open_needs           = open_needs,
        in_progress_needs    = in_progress_needs,
        resolved_needs       = resolved_needs,
        total_needs          = len(needs),
        available_volunteers = available_vols,
        assigned_volunteers  = assigned_vols,
        total_volunteers     = len(volunteers),
        active_matches       = active_matches,
        total_matches        = len(matches),
        needs_by_category    = cats,
        coverage_pct         = coverage_pct,
    )


# ══════════════════════════════════════════════════════════════════════════════
# DEMO FLOW ENDPOINT
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/demo/run", tags=["Demo"])
def run_demo(db: Session = Depends(get_db)):
    """
    Full automated demo flow for judges:
    Step 1: Reset DB with fresh simulated data
    Step 2: Aggregate all 3 sources
    Step 3: Score all needs
    Step 4: Run matcher → generate matches
    Step 5: Return summary
    """
    from backend.models import Need, Volunteer, Match, ActivityLog as AL
    from backend.simulator import seed_database as seed_db

    # Reset all tables
    db.query(AL).delete()
    db.query(Match).delete()
    db.query(Volunteer).delete()
    db.query(Need).delete()
    db.commit()

    # Seed fresh data
    seed_db(db)

    # Score
    scored = score_and_update_db(db)

    # Match
    matches = run_matching(db)

    # Stats
    stats_response = get_dashboard_stats(db)

    return {
        "demo_steps": [
            "✅ Step 1: Database reset with fresh simulated data",
            "✅ Step 2: 3 source files aggregated and deduplicated",
            f"✅ Step 3: {scored} needs scored with urgency badges",
            f"✅ Step 4: {len(matches)} volunteer matches generated",
            "✅ Step 5: Dashboard KPIs updated",
        ],
        "stats":   stats_response,
        "matches": matches[:5],  # Preview top 5
    }


# ══════════════════════════════════════════════════════════════════════════════
# ANALYTICS ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/analytics/skills", tags=["Analytics"])
def get_skill_distribution(db: Session = Depends(get_db)):
    """Return volunteer skill distribution for pie chart."""
    volunteers = db.query(Volunteer).all()
    skill_counts = {}
    for v in volunteers:
        for s in (v.skills or []):
            skill_counts[s] = skill_counts.get(s, 0) + 1
    return {"skills": skill_counts}


@app.get("/analytics/timeline", tags=["Analytics"])
def get_timeline(db: Session = Depends(get_db)):
    """Return simulated resolved-over-time data for line chart."""
    needs = db.query(Need).all()
    # Group by week
    from collections import defaultdict
    weekly = defaultdict(lambda: {"open": 0, "resolved": 0, "in_progress": 0})
    for n in needs:
        if n.reported_at:
            week = n.reported_at.strftime("%Y-W%W")
            weekly[week][n.status] += 1
    return {"timeline": dict(sorted(weekly.items()))}


from pydantic import BaseModel
class AIPrompt(BaseModel):
    prompt: str

@app.post("/ask-ai", tags=["AI"])
@app.post("/ai/query", tags=["AI"])
def ask_ai_endpoint(data: AIPrompt, db: Session = Depends(get_db)):
    """Ask Gemini AI a question about the current open needs."""
    from backend.ai_assistant import ask_gemini
    
    # Gather context from open needs
    open_needs = db.query(Need).filter(Need.status == "open").all()
    if not open_needs:
        context = "There are no open needs currently."
    else:
        context_lines = []
        for n in open_needs:
            context_lines.append(f"- [Urgency: {n.urgency_badge}] {n.category.upper()} in {n.area}: {n.description} (Reported count: {n.reported_count})")
        context = "\n".join(context_lines)
    
    response = ask_gemini(data.prompt, context)
    return {"response": response}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
