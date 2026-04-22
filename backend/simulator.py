"""
simulator.py — Generates realistic, intentionally messy community needs + volunteer data.
Outputs 3 source files: sample_surveys.csv, paper_forms.json, ngo_reports.csv
Also populates the SQLite DB directly if called as a module.
"""

import os
import json
import random
import uuid
from datetime import datetime, timedelta

import pandas as pd

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

# ── Geography: 10 real Indian urban areas with lat/lng ────────────────────────
AREAS = [
    {"area": "Dharavi, Mumbai",          "lat": 19.0400, "lng": 72.8530},
    {"area": "Govandi, Mumbai",           "lat": 19.0600, "lng": 72.9200},
    {"area": "Kurla East, Mumbai",        "lat": 19.0700, "lng": 72.8800},
    {"area": "Mankhurd, Mumbai",          "lat": 19.0500, "lng": 72.9400},
    {"area": "Bhandup West, Mumbai",      "lat": 19.1400, "lng": 72.9300},
    {"area": "Malvani, Mumbai",           "lat": 19.1900, "lng": 72.8100},
    {"area": "Shivaji Nagar, Pune",       "lat": 18.5800, "lng": 73.9200},
    {"area": "Yerwada, Pune",             "lat": 18.5600, "lng": 73.9000},
    {"area": "Hadapsar, Pune",            "lat": 18.5100, "lng": 73.9400},
    {"area": "Kothrud, Pune",             "lat": 18.5050, "lng": 73.8050},
]

CATEGORIES_CLEAN   = ["food", "medical", "education", "shelter", "sanitation"]
CATEGORIES_MESSY   = [
    "Food Aid", "food_distribution", "FOOD", "Food",
    "Medical Help", "medical_assistance", "MEDICAL", "Healthcare",
    "Education", "edu", "EDUCATION", "school_supply",
    "Shelter", "housing", "SHELTER", "Shelter Aid",
    "Sanitation", "hygiene", "SANITATION", "Water & Sanitation",
]

SOURCES_SURVEY = ["field_survey", "paper_form", "ngo_report"]

NEED_DESCRIPTIONS = {
    "food": [
        "{n} families need weekly ration kits",
        "Urgent food shortage — {n} households affected",
        "{n} children require mid-day meal support",
        "Food drought affecting {n} elderly residents",
    ],
    "medical": [
        "{n} people need primary health checkups",
        "Mobile medical camp needed — {n} patients waiting",
        "{n} diabetic patients without medication",
        "Clean water access causing illness in {n} households",
    ],
    "education": [
        "{n} children lack school supplies for new term",
        "Digital literacy needed for {n} youth",
        "{n} girls dropped from school — support needed",
        "Tutoring required for {n} students",
    ],
    "shelter": [
        "{n} families displaced after flooding",
        "{n} households with damaged roofs before monsoon",
        "Temporary shelter needed for {n} families",
        "{n} homeless individuals need night shelter",
    ],
    "sanitation": [
        "{n} households without functional toilets",
        "Open defecation zone with {n} affected families",
        "Sewage overflow affecting {n} homes",
        "{n} households lack safe drinking water",
    ],
}

SKILLS_POOL = [
    "food_distribution", "medical_aid", "teaching", "driving",
    "counseling", "construction", "data_entry", "logistics",
    "first_aid", "language_translation", "fundraising", "community_outreach",
]

VOLUNTEER_NAMES = [
    "Aarav Singh", "Priya Mehta", "Rohan Desai", "Ananya Iyer",
    "Karan Sharma", "Meera Nair", "Arjun Rao", "Divya Patel",
    "Vikram Gupta", "Sneha Joshi", "Aditya Kumar", "Pooja Reddy",
    "Rahul Verma", "Kavya Menon", "Nikhil Shah", "Shreya Das",
    "Manish Tiwari", "Ritu Agarwal", "Siddharth Bose", "Neha Pillai",
    "Amit Srivastava", "Deepika Nambiar", "Suresh Yadav", "Anjali Singh",
    "Harish Khanna", "Tanvi Chawla", "Rajesh Pandey", "Sonal Jain",
    "Vikas Thakur", "Preety Malhotra",
]


def _random_date(days_back: int = 60) -> datetime:
    return datetime.now() - timedelta(days=random.randint(0, days_back))


def _jitter(lat: float, lng: float, radius: float = 0.03):
    return round(lat + random.uniform(-radius, radius), 5), \
           round(lng + random.uniform(-radius, radius), 5)


# ── Generate Needs ─────────────────────────────────────────────────────────────

def generate_needs_survey(n: int = 20) -> list[dict]:
    """Field survey CSV — clean-ish data with some missing fields."""
    rows = []
    for i in range(n):
        area  = random.choice(AREAS)
        cat   = random.choice(CATEGORIES_CLEAN)
        count = random.randint(5, 200)
        lat, lng = _jitter(area["lat"], area["lng"])
        rows.append({
            "need_id":        f"NS{i+1:03d}",
            "area":           area["area"],
            "lat":            lat,
            "lng":            lng,
            "category":       cat,
            "description":    random.choice(NEED_DESCRIPTIONS[cat]).format(n=count),
            "reported_count": count if random.random() > 0.10 else "",   # 10% missing
            "source":         "field_survey",
            "reported_at":    _random_date().strftime("%Y-%m-%d"),
            "status":         "open",
        })
    # Inject 3 intentional duplicates
    for _ in range(3):
        dup = dict(random.choice(rows))
        dup["need_id"] = f"NS{n+_+1:03d}"
        dup["reported_at"] = _random_date(5).strftime("%Y-%m-%d")  # slightly different date
        rows.append(dup)
    return rows


def generate_needs_paper(n: int = 15) -> list[dict]:
    """Paper forms JSON — inconsistent field names, messy categories."""
    entries = []
    for i in range(n):
        area  = random.choice(AREAS)
        # Messy category name chosen from messy pool
        messy_cat = random.choice(CATEGORIES_MESSY)
        count = random.randint(3, 150)
        lat, lng = _jitter(area["lat"], area["lng"])
        entries.append({
            "id":              f"PF{i+1:03d}",
            "location":        area["area"],            # different key name intentionally
            "latitude":        lat,
            "longitude":       lng,
            "need_type":       messy_cat,               # intentionally messy
            "details":         f"Unmet need reported — approx {count} affected",
            "affected_people": count,
            "form_source":     "paper_form",
            "date_collected":  _random_date().strftime("%d/%m/%Y"),  # different date format
            "resolved":        False,
        })
    return entries


def generate_needs_ngo(n: int = 18) -> list[dict]:
    """NGO report CSV — some overlap with surveys, different column names."""
    rows = []
    for i in range(n):
        area  = random.choice(AREAS)
        cat   = random.choice(CATEGORIES_CLEAN)
        count = random.randint(10, 300)
        lat, lng = _jitter(area["lat"], area["lng"])
        # Occasionally use messy category names
        display_cat = cat if random.random() > 0.4 else random.choice(
            [c for c in CATEGORIES_MESSY if cat.lower() in c.lower()] or [cat]
        )
        rows.append({
            "report_id":      f"NGO{i+1:03d}",
            "zone":           area["area"],
            "geo_lat":        lat,
            "geo_lng":        lng,
            "issue_category": display_cat,
            "summary":        random.choice(NEED_DESCRIPTIONS[cat]).format(n=count),
            "beneficiaries":  count,
            "ngo_source":     "ngo_report",
            "report_date":    _random_date().strftime("%Y/%m/%d"),  # yet another format
            "case_status":    random.choice(["open", "open", "open", "pending"]),
        })
    return rows


# ── Generate Volunteers ────────────────────────────────────────────────────────

def generate_volunteers(n: int = 30) -> list[dict]:
    rows = []
    random.shuffle(VOLUNTEER_NAMES)
    for i in range(n):
        area = random.choice(AREAS)
        lat, lng = _jitter(area["lat"], area["lng"], radius=0.05)
        n_skills = random.randint(1, 4)
        skills = random.sample(SKILLS_POOL, n_skills)
        rows.append({
            "volunteer_id":    f"V{i+1:03d}",
            "name":            VOLUNTEER_NAMES[i % len(VOLUNTEER_NAMES)],
            "lat":             lat,
            "lng":             lng,
            "skills":          skills,
            "availability":    random.choice(["weekdays", "weekends", "both", "both"]),
            "max_distance_km": random.choice([5.0, 8.0, 10.0, 15.0, 20.0]),
            "current_task":    None,
            "status":          random.choice(["available", "available", "available", "inactive"]),
        })
    return rows


# ── Write Files ────────────────────────────────────────────────────────────────

def write_source_files():
    surveys = generate_needs_survey(20)
    paper   = generate_needs_paper(15)
    ngo     = generate_needs_ngo(18)
    volunteers = generate_volunteers(30)

    # Sample surveys CSV
    pd.DataFrame(surveys).to_csv(
        os.path.join(DATA_DIR, "sample_surveys.csv"), index=False
    )

    # Paper forms JSON
    with open(os.path.join(DATA_DIR, "paper_forms.json"), "w", encoding="utf-8") as f:
        json.dump(paper, f, indent=2, default=str)

    # NGO reports CSV
    pd.DataFrame(ngo).to_csv(
        os.path.join(DATA_DIR, "ngo_reports.csv"), index=False
    )

    # Volunteers CSV
    vol_df = pd.DataFrame(volunteers)
    vol_df["skills"] = vol_df["skills"].apply(json.dumps)
    vol_df.to_csv(os.path.join(DATA_DIR, "sample_volunteers.csv"), index=False)

    print(f"[Simulator] Generated {len(surveys)} survey needs, "
          f"{len(paper)} paper needs, {len(ngo)} NGO needs, "
          f"{len(volunteers)} volunteers.")
    return surveys, paper, ngo, volunteers


def seed_database(db):
    """Seed the SQLite DB with simulated data (called from main.py on startup)."""
    from backend.models import Need, Volunteer
    from backend.aggregator import run_aggregation
    import json

    # Write files first
    write_source_files()

    # Aggregate and insert needs
    clean_df = run_aggregation()
    for _, row in clean_df.iterrows():
        existing = db.query(Need).filter(Need.need_id == row["need_id"]).first()
        if not existing:
            need = Need(
                need_id        = row["need_id"],
                area           = row["area"],
                lat            = float(row["lat"]),
                lng            = float(row["lng"]),
                category       = row["category"],
                description    = row["description"],
                reported_count = int(row["reported_count"]),
                source         = row["source"],
                reported_at    = pd.to_datetime(row["reported_at"]).to_pydatetime(),
                status         = "open",
            )
            db.add(need)

    # Insert volunteers
    import ast
    vol_path = os.path.join(DATA_DIR, "sample_volunteers.csv")
    vol_df = pd.read_csv(vol_path)
    for _, row in vol_df.iterrows():
        existing = db.query(Volunteer).filter(
            Volunteer.volunteer_id == row["volunteer_id"]
        ).first()
        if not existing:
            skills = json.loads(row["skills"]) if isinstance(row["skills"], str) else []
            vol = Volunteer(
                volunteer_id    = row["volunteer_id"],
                name            = row["name"],
                lat             = float(row["lat"]),
                lng             = float(row["lng"]),
                skills          = skills,
                availability    = row["availability"],
                max_distance_km = float(row["max_distance_km"]),
                current_task    = None,
                status          = row["status"],
            )
            db.add(vol)

    db.commit()
    print("[Simulator] Database seeded successfully.")


if __name__ == "__main__":
    write_source_files()
