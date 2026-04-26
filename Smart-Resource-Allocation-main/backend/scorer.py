"""
scorer.py — Urgency scoring engine.
Scores each open need 0-100 using weighted factors and assigns a badge.
"""

from datetime import datetime
from typing import List

import pandas as pd


# ── Weights & Category Values ──────────────────────────────────────────────────

WEIGHTS = {
    "reported_count":   0.35,
    "category":         0.25,
    "days_since":       0.20,
    "volunteer_gap":    0.20,
}

CATEGORY_WEIGHT = {
    "medical":    1.00,
    "food":       0.85,
    "shelter":    0.75,
    "sanitation": 0.65,
    "education":  0.50,
}

BADGE_THRESHOLDS = {
    "Critical": 70,
    "High":     40,
    "Moderate": 0,
}


def _normalize(series: pd.Series) -> pd.Series:
    """Min-max normalize a pandas Series to [0, 1]."""
    mn, mx = series.min(), series.max()
    if mx == mn:
        return pd.Series([0.5] * len(series), index=series.index)
    return (series - mn) / (mx - mn)


def score_needs(needs_df: pd.DataFrame, volunteers_df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute urgency_score (0–100) for every row in needs_df.

    Parameters
    ----------
    needs_df     : DataFrame with columns [need_id, area, category, reported_count, reported_at, status]
    volunteers_df: DataFrame with columns [volunteer_id, area, status]

    Returns
    -------
    needs_df with two new columns: urgency_score, urgency_badge
    """
    df = needs_df.copy()

    # 1. Reported count score
    df["_count_norm"] = _normalize(df["reported_count"].astype(float))

    # 2. Category weight score
    df["_cat_score"] = df["category"].map(CATEGORY_WEIGHT).fillna(0.5)

    # 3. Days since reported
    now = datetime.utcnow()
    df["reported_at"] = pd.to_datetime(df["reported_at"], errors="coerce").fillna(now)
    df["_days_since"] = (now - df["reported_at"]).dt.days.clip(lower=0)
    df["_days_norm"]  = _normalize(df["_days_since"].astype(float))

    # 4. Volunteer coverage gap
    #    For each area, count available volunteers; invert → more coverage = less urgent
    vol_coverage = {}
    if volunteers_df is not None and not volunteers_df.empty:
        avail = volunteers_df[volunteers_df["status"] == "available"]
        for area_name, group in avail.groupby("area") if "area" in avail.columns else []:
            vol_coverage[area_name.lower()] = len(group)

    def _coverage_gap(area: str) -> float:
        count = vol_coverage.get(area.lower(), 0)
        # More volunteers → lower gap (less urgent from coverage side)
        if count == 0:
            return 1.0
        elif count <= 2:
            return 0.7
        elif count <= 5:
            return 0.4
        else:
            return 0.1

    df["_vol_gap"] = df["area"].apply(_coverage_gap)

    # 5. Composite score
    df["urgency_score"] = (
        WEIGHTS["reported_count"] * df["_count_norm"]  +
        WEIGHTS["category"]       * df["_cat_score"]   +
        WEIGHTS["days_since"]     * df["_days_norm"]   +
        WEIGHTS["volunteer_gap"]  * df["_vol_gap"]
    ) * 100

    df["urgency_score"] = df["urgency_score"].clip(0, 100).round(2)

    # 6. Badge assignment
    def _badge(score: float) -> str:
        if score >= BADGE_THRESHOLDS["Critical"]:
            return "Critical"
        elif score >= BADGE_THRESHOLDS["High"]:
            return "High"
        return "Moderate"

    df["urgency_badge"] = df["urgency_score"].apply(_badge)

    # Drop internal columns
    df.drop(columns=["_count_norm","_cat_score","_days_since","_days_norm","_vol_gap"],
            inplace=True, errors="ignore")

    return df


def score_and_update_db(db) -> int:
    """
    Pull all open needs + volunteers from DB, score them, write scores back.
    Returns count of needs scored.
    """
    from backend.models import Need, Volunteer

    needs     = db.query(Need).filter(Need.status != "resolved").all()
    volunteers = db.query(Volunteer).all()

    if not needs:
        return 0

    needs_data = [{
        "need_id":        n.need_id,
        "area":           n.area,
        "category":       n.category,
        "reported_count": n.reported_count,
        "reported_at":    n.reported_at,
        "status":         n.status,
    } for n in needs]

    vol_data = [{
        "volunteer_id": v.volunteer_id,
        "area":         v.area if hasattr(v, "area") else "",
        "status":       v.status,
    } for v in volunteers]

    needs_df = pd.DataFrame(needs_data)
    vol_df   = pd.DataFrame(vol_data)

    scored_df = score_needs(needs_df, vol_df)

    for _, row in scored_df.iterrows():
        need = db.query(Need).filter(Need.need_id == row["need_id"]).first()
        if need:
            need.urgency_score = float(row["urgency_score"])
            need.urgency_badge = str(row["urgency_badge"])

    db.commit()
    return len(needs_data)
