"""
matcher.py — Greedy volunteer-to-need matching engine.
Uses Haversine distance + skill overlap + availability matching.
"""

import uuid
from datetime import datetime
from math import radians, sin, cos, sqrt, atan2
from typing import List, Optional

SKILL_REQUIREMENTS = {
    "food":       ["food_distribution", "driving", "logistics"],
    "medical":    ["medical_aid", "first_aid", "counseling"],
    "education":  ["teaching", "data_entry", "language_translation"],
    "shelter":    ["construction", "driving", "logistics"],
    "sanitation": ["community_outreach", "construction", "logistics"],
}

AVAILABILITY_SCORE = {
    ("both",     "both"):     1.00,
    ("both",     "weekdays"): 0.90,
    ("both",     "weekends"): 0.90,
    ("weekdays", "both"):     0.85,
    ("weekdays", "weekdays"): 1.00,
    ("weekdays", "weekends"): 0.20,
    ("weekends", "both"):     0.85,
    ("weekends", "weekdays"): 0.20,
    ("weekends", "weekends"): 1.00,
}


# ── Distance ──────────────────────────────────────────────────────────────────

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return great-circle distance in kilometres between two lat/lng points."""
    R = 6371.0
    φ1, φ2 = radians(lat1), radians(lat2)
    Δφ = radians(lat2 - lat1)
    Δλ = radians(lng2 - lng1)
    a = sin(Δφ / 2) ** 2 + cos(φ1) * cos(φ2) * sin(Δλ / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


# ── Score One Volunteer ────────────────────────────────────────────────────────

def score_volunteer(volunteer, need, distance_km: float) -> dict:
    """
    Compute match score (0–1) for a volunteer against a need.

    Returns dict with: match_score, distance_km, skill_overlap
    """
    # 1. Skill match ratio
    required_skills = SKILL_REQUIREMENTS.get(need.category, [])
    vol_skills       = volunteer.skills or []
    if required_skills:
        overlap       = [s for s in vol_skills if s in required_skills]
        skill_ratio   = len(overlap) / len(required_skills)
    else:
        overlap, skill_ratio = [], 0.5

    # 2. Proximity score: 1 at 0 km, decays to 0 at max_distance_km
    max_d = volunteer.max_distance_km or 10.0
    proximity = max(0.0, 1.0 - distance_km / max_d) if max_d > 0 else 0.0

    # 3. Availability match
    # Need urgency_badge: Critical → needs "both" ideally
    need_avail = "both" if need.urgency_badge == "Critical" else "weekends"
    avail_score = AVAILABILITY_SCORE.get(
        (volunteer.availability, need_avail), 0.5
    )

    # Composite score
    match_score = (
        0.40 * skill_ratio   +
        0.35 * proximity     +
        0.25 * avail_score
    )

    return {
        "match_score":   round(match_score, 4),
        "distance_km":   round(distance_km, 2),
        "skill_overlap": overlap,
    }


# ── Main Matching Algorithm ────────────────────────────────────────────────────

def run_matching(db) -> List[dict]:
    """
    Greedy matching:
    1. Sort open needs by urgency_score DESC
    2. For each need, find available volunteers within max_distance_km
    3. Pick top-scoring volunteer
    4. Create Match record, update statuses
    """
    from backend.models import Need, Volunteer, Match, ActivityLog

    # Fetch all open needs sorted by urgency
    open_needs = (
        db.query(Need)
        .filter(Need.status == "open")
        .order_by(Need.urgency_score.desc().nullslast())
        .all()
    )

    available_vols = (
        db.query(Volunteer)
        .filter(Volunteer.status == "available")
        .all()
    )

    if not open_needs or not available_vols:
        return []

    new_matches = []
    assigned_vol_ids = set()

    for need in open_needs:
        candidates = []

        for vol in available_vols:
            if vol.volunteer_id in assigned_vol_ids:
                continue  # already assigned this round

            dist = haversine_km(need.lat, need.lng, vol.lat, vol.lng)
            if dist > (vol.max_distance_km or 10.0):
                continue  # too far

            result = score_volunteer(vol, need, dist)
            candidates.append((vol, result))

        if not candidates:
            continue  # no match found for this need

        # Pick the best candidate
        best_vol, best_result = max(candidates, key=lambda x: x[1]["match_score"])

        # Create match record
        match_id = f"M{uuid.uuid4().hex[:8].upper()}"
        match = Match(
            match_id      = match_id,
            need_id       = need.need_id,
            volunteer_id  = best_vol.volunteer_id,
            match_score   = best_result["match_score"],
            distance_km   = best_result["distance_km"],
            skill_overlap = best_result["skill_overlap"],
            assigned_at   = datetime.utcnow(),
            status        = "pending",
        )
        db.add(match)

        # Update statuses
        best_vol.status      = "assigned"
        best_vol.current_task = need.need_id
        need.status          = "in_progress"
        assigned_vol_ids.add(best_vol.volunteer_id)

        # Log
        log = ActivityLog(
            action    = "MATCH_CREATED",
            entity    = "match",
            entity_id = match_id,
            details   = (f"Volunteer {best_vol.name} matched to need {need.need_id} "
                         f"(score={best_result['match_score']:.2f}, "
                         f"dist={best_result['distance_km']:.1f}km)"),
        )
        db.add(log)

        new_matches.append({
            "match_id":     match_id,
            "need_id":      need.need_id,
            "need_area":    need.area,
            "need_category": need.category,
            "volunteer_id": best_vol.volunteer_id,
            "volunteer_name": best_vol.name,
            "match_score":  best_result["match_score"],
            "distance_km":  best_result["distance_km"],
            "skill_overlap": best_result["skill_overlap"],
        })

    db.commit()
    print(f"[Matcher] Created {len(new_matches)} new matches.")
    return new_matches
