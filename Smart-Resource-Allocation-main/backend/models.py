"""
models.py — SQLAlchemy ORM models + Pydantic schemas for request/response.
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import Column, String, Float, Integer, DateTime, Text, JSON
from sqlalchemy.sql import func
from pydantic import BaseModel
from backend.database import Base


# ══════════════════════════════════════════════════════════════════════════════
# SQLAlchemy ORM Models
# ══════════════════════════════════════════════════════════════════════════════

class Need(Base):
    __tablename__ = "needs"

    need_id        = Column(String, primary_key=True, index=True)
    area           = Column(String, nullable=False)
    lat            = Column(Float, nullable=False)
    lng            = Column(Float, nullable=False)
    category       = Column(String, nullable=False)   # food|medical|education|shelter|sanitation
    description    = Column(Text, nullable=False)
    reported_count = Column(Integer, default=1)
    source         = Column(String, default="field_survey")  # field_survey|paper_form|ngo_report
    reported_at    = Column(DateTime, default=datetime.utcnow)
    urgency_score  = Column(Float, nullable=True)
    urgency_badge  = Column(String, nullable=True)    # Critical|High|Moderate
    status         = Column(String, default="open")   # open|in_progress|resolved
    created_at     = Column(DateTime, server_default=func.now())


class Volunteer(Base):
    __tablename__ = "volunteers"

    volunteer_id    = Column(String, primary_key=True, index=True)
    name            = Column(String, nullable=False)
    lat             = Column(Float, nullable=False)
    lng             = Column(Float, nullable=False)
    skills          = Column(JSON, default=list)      # list of skill strings
    availability    = Column(String, default="both")  # weekdays|weekends|both
    max_distance_km = Column(Float, default=10.0)
    current_task    = Column(String, nullable=True)
    status          = Column(String, default="available")  # available|assigned|inactive
    created_at      = Column(DateTime, server_default=func.now())


class Match(Base):
    __tablename__ = "matches"

    match_id      = Column(String, primary_key=True, index=True)
    need_id       = Column(String, nullable=False, index=True)
    volunteer_id  = Column(String, nullable=False, index=True)
    match_score   = Column(Float, nullable=False)
    distance_km   = Column(Float, nullable=False)
    skill_overlap = Column(JSON, default=list)
    assigned_at   = Column(DateTime, default=datetime.utcnow)
    status        = Column(String, default="pending")  # pending|accepted|completed


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    action     = Column(String, nullable=False)
    entity     = Column(String, nullable=True)
    entity_id  = Column(String, nullable=True)
    details    = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


# ══════════════════════════════════════════════════════════════════════════════
# Pydantic Response Schemas
# ══════════════════════════════════════════════════════════════════════════════

class NeedOut(BaseModel):
    need_id:        str
    area:           str
    lat:            float
    lng:            float
    category:       str
    description:    str
    reported_count: int
    source:         str
    reported_at:    Optional[datetime]
    urgency_score:  Optional[float]
    urgency_badge:  Optional[str]
    status:         str

    class Config:
        from_attributes = True


class VolunteerOut(BaseModel):
    volunteer_id:    str
    name:            str
    lat:             float
    lng:             float
    skills:          List[str]
    availability:    str
    max_distance_km: float
    current_task:    Optional[str]
    status:          str

    class Config:
        from_attributes = True


class MatchOut(BaseModel):
    match_id:      str
    need_id:       str
    volunteer_id:  str
    match_score:   float
    distance_km:   float
    skill_overlap: List[str]
    assigned_at:   Optional[datetime]
    status:        str

    class Config:
        from_attributes = True


class VolunteerRegister(BaseModel):
    name:            str
    lat:             float
    lng:             float
    skills:          List[str]
    availability:    str = "both"
    max_distance_km: float = 10.0


class DashboardStats(BaseModel):
    open_needs:           int
    in_progress_needs:    int
    resolved_needs:       int
    total_needs:          int
    available_volunteers: int
    assigned_volunteers:  int
    total_volunteers:     int
    active_matches:       int
    total_matches:        int
    needs_by_category:    dict
    coverage_pct:         float   # % high-urgency areas with ≥1 volunteer assigned
