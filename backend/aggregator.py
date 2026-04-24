"""
aggregator.py — Reads from 3 messy data sources, normalizes, deduplicates,
and merges into a clean unified DataFrame ready for scoring + DB insert.
"""

import os
import json
import hashlib
from datetime import datetime, timedelta

import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

# ── Category normalization map ─────────────────────────────────────────────────
CATEGORY_MAP = {
    # food variations
    "food aid":            "food",
    "food_distribution":   "food",
    "food":                "food",
    "foods":               "food",
    # medical variations
    "medical help":        "medical",
    "medical_assistance":  "medical",
    "medical":             "medical",
    "healthcare":          "medical",
    "health":              "medical",
    # education variations
    "education":           "education",
    "edu":                 "education",
    "school_supply":       "education",
    "school supply":       "education",
    # shelter variations
    "shelter":             "shelter",
    "housing":             "shelter",
    "shelter aid":         "shelter",
    # sanitation variations
    "sanitation":          "sanitation",
    "hygiene":             "sanitation",
    "water & sanitation":  "sanitation",
    "water and sanitation":"sanitation",
}

SKILL_MAP = {
    "food":       "food_distribution",
    "medical":    "medical_aid",
    "education":  "teaching",
    "shelter":    "construction",
    "sanitation": "community_outreach",
}

DEFAULT_DESCRIPTION = "Community need reported — details pending"


def normalize_category(raw: str) -> str:
    """Map any messy category string to one of 5 canonical values."""
    if pd.isna(raw) or str(raw).strip() == "":
        return "food"  # safest default
    key = str(raw).strip().lower()
    # Exact match first
    if key in CATEGORY_MAP:
        return CATEGORY_MAP[key]
    # Partial match
    for k, v in CATEGORY_MAP.items():
        if k in key or key in k:
            return v
    return "food"  # fallback


def parse_date(raw) -> datetime:
    """Parse various date formats robustly."""
    if pd.isna(raw) or str(raw).strip() == "":
        return datetime.now() - timedelta(days=7)
    raw = str(raw).strip()
    for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d", "%d-%m-%Y", "%m/%d/%Y"]:
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return datetime.now() - timedelta(days=7)


def _make_id(prefix: str, area: str, category: str, idx: int) -> str:
    h = hashlib.md5(f"{area}{category}{idx}".encode()).hexdigest()[:6].upper()
    return f"{prefix}_{h}"


# ── Load each source ───────────────────────────────────────────────────────────

def load_surveys() -> pd.DataFrame:
    path = os.path.join(DATA_DIR, "sample_surveys.csv")
    if not os.path.exists(path):
        return pd.DataFrame()
    df = pd.read_csv(path)
    out = pd.DataFrame()
    out["raw_id"]         = df.get("need_id", pd.Series(dtype=str))
    out["area"]           = df.get("area", "Unknown")
    out["lat"]            = pd.to_numeric(df.get("lat"), errors="coerce")
    out["lng"]            = pd.to_numeric(df.get("lng"), errors="coerce")
    out["category"]       = df.get("category", "").apply(normalize_category)
    out["description"]    = df.get("description", DEFAULT_DESCRIPTION).fillna(DEFAULT_DESCRIPTION)
    out["reported_count"] = pd.to_numeric(df.get("reported_count"), errors="coerce").fillna(10).astype(int)
    out["source"]         = "field_survey"
    out["reported_at"]    = df.get("reported_at", "").apply(parse_date)
    return out


def load_paper_forms() -> pd.DataFrame:
    path = os.path.join(DATA_DIR, "paper_forms.json")
    if not os.path.exists(path):
        return pd.DataFrame()
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    out = pd.DataFrame()
    raw = pd.DataFrame(data)
    out["raw_id"]         = raw.get("id", pd.Series(dtype=str))
    out["area"]           = raw.get("location", "Unknown")
    out["lat"]            = pd.to_numeric(raw.get("latitude"), errors="coerce")
    out["lng"]            = pd.to_numeric(raw.get("longitude"), errors="coerce")
    out["category"]       = raw.get("need_type", "").apply(normalize_category)
    out["description"]    = raw.get("details", DEFAULT_DESCRIPTION).fillna(DEFAULT_DESCRIPTION)
    out["reported_count"] = pd.to_numeric(raw.get("affected_people"), errors="coerce").fillna(10).astype(int)
    out["source"]         = "paper_form"
    out["reported_at"]    = raw.get("date_collected", "").apply(parse_date)
    return out


def load_ngo_reports() -> pd.DataFrame:
    path = os.path.join(DATA_DIR, "ngo_reports.csv")
    if not os.path.exists(path):
        return pd.DataFrame()
    df = pd.read_csv(path)
    out = pd.DataFrame()
    out["raw_id"]         = df.get("report_id", pd.Series(dtype=str))
    out["area"]           = df.get("zone", "Unknown")
    out["lat"]            = pd.to_numeric(df.get("geo_lat"), errors="coerce")
    out["lng"]            = pd.to_numeric(df.get("geo_lng"), errors="coerce")
    out["category"]       = df.get("issue_category", "").apply(normalize_category)
    out["description"]    = df.get("summary", DEFAULT_DESCRIPTION).fillna(DEFAULT_DESCRIPTION)
    out["reported_count"] = pd.to_numeric(df.get("beneficiaries"), errors="coerce").fillna(10).astype(int)
    out["source"]         = "ngo_report"
    out["reported_at"]    = df.get("report_date", "").apply(parse_date)
    return out


# ── Main aggregation pipeline ──────────────────────────────────────────────────

def run_aggregation(extra_df: pd.DataFrame = None) -> pd.DataFrame:
    """
    Full pipeline:
    1. Load all 3 sources
    2. Combine into one DataFrame
    3. Drop rows missing lat/lng
    4. Deduplicate by (area + category + date_window)
    5. Merge duplicate reported_count
    6. Assign clean IDs
    """
    frames = [load_surveys(), load_paper_forms(), load_ngo_reports()]
    if extra_df is not None and not extra_df.empty:
        frames.append(extra_df)

    df = pd.concat([f for f in frames if not f.empty], ignore_index=True)
    if df.empty:
        print("[Aggregator] No data to aggregate.")
        return df

    # Drop rows with unusable coordinates
    df.dropna(subset=["lat", "lng"], inplace=True)

    # Dedup key: area + category + week-bucket
    df["week_bucket"] = df["reported_at"].apply(
        lambda d: d.isocalendar()[:2]  # (year, week)
    )
    df["dedup_key"] = df["area"].str.lower().str.strip() + "|" + \
                      df["category"] + "|" + \
                      df["week_bucket"].apply(str)

    # Within each dedup group: take first row, sum reported_count
    grouped = df.groupby("dedup_key", sort=False)
    merged_rows = []
    for key, group in grouped:
        row = group.iloc[0].copy()
        row["reported_count"] = int(group["reported_count"].sum())
        merged_rows.append(row)

    clean = pd.DataFrame(merged_rows).reset_index(drop=True)

    # Assign clean need IDs
    clean["need_id"] = [
        f"N{i+1:03d}" for i in range(len(clean))
    ]

    # Final column selection
    final = clean[[
        "need_id", "area", "lat", "lng", "category",
        "description", "reported_count", "source", "reported_at"
    ]].copy()

    # Ensure reported_at is datetime
    final["reported_at"] = pd.to_datetime(final["reported_at"])

    print(f"[Aggregator] {len(df)} raw records -> {len(final)} clean needs after dedup/merge.")
    return final


def aggregate_uploaded_csv(file_bytes: bytes) -> pd.DataFrame:
    """Process an uploaded CSV, normalize it, and return clean DataFrame."""
    import io
    df = pd.read_csv(io.BytesIO(file_bytes))

    # Try to map whatever columns the CSV has to our standard schema
    col_map = {
        # area
        "area": "area", "location": "area", "zone": "area", "place": "area",
        # lat/lng
        "lat": "lat", "latitude": "lat", "geo_lat": "lat",
        "lng": "lng", "lon": "lng", "longitude": "lng", "geo_lng": "lng",
        # category
        "category": "category", "need_type": "category",
        "issue_category": "category", "type": "category",
        # description
        "description": "description", "details": "description",
        "summary": "description", "notes": "description",
        # count
        "reported_count": "reported_count", "affected_people": "reported_count",
        "beneficiaries": "reported_count", "count": "reported_count",
        # date
        "reported_at": "reported_at", "date_collected": "reported_at",
        "report_date": "reported_at", "date": "reported_at",
    }
    df.rename(columns={c: col_map[c.lower()] for c in df.columns
                       if c.lower() in col_map}, inplace=True)

    out = pd.DataFrame()
    out["raw_id"]         = df.index.astype(str)
    out["area"]           = df.get("area", pd.Series(["Unknown"] * len(df)))
    out["lat"]            = pd.to_numeric(df.get("lat"), errors="coerce")
    out["lng"]            = pd.to_numeric(df.get("lng"), errors="coerce")
    out["category"]       = df.get("category", pd.Series(["food"] * len(df))).apply(normalize_category)
    out["description"]    = df.get("description", DEFAULT_DESCRIPTION)
    out["reported_count"] = pd.to_numeric(df.get("reported_count"), errors="coerce").fillna(10).astype(int)
    out["source"]         = "uploaded_csv"
    out["reported_at"]    = df.get("reported_at", pd.Series([datetime.now()] * len(df))).apply(parse_date)

    return out
