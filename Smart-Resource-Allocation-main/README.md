# Smart Resource Allocation

**Data-Driven Volunteer Coordination for Social Impact**

A specialized platform designed to gather scattered community needs data, intelligently score their urgency, and match available volunteers to specific tasks and areas where they are needed most. Built over 4 days as a hackathon submission.

---

## 🚀 The Problem
Local NGOs and social groups often collect essential data through a mix of paper surveys, mobile field reports, and spreadsheet logs. This messy, unstructured data makes it incredibly difficult to see the big picture. When a crisis occurs or resources are scarce, identifying the most critical areas and finding the right volunteers with the right skills takes too much manual effort and time.

## 💡 Our Solution
The **Smart Resource Allocation System** works as a centralized "brain" for NGO coordination:
1. **Aggregates & Cleans:** Takes in messy CSV/JSON data from various sources and deduplicates it automatically.
2. **Scores Urgency:** Uses an algorithm to rank needs based on multiple factors, prioritizing the most critical.
3. **Matches Volunteers:** Connects the right volunteer to the right task based on skills, location, and availability in milliseconds.
4. **Visualizes Action:** Presents everything on an interactive map and live dashboard for coordinators.

---

## 🧠 System Architecture

```text
[CSV / JSON Data Sources]
  (field surveys, paper forms, NGO reports)
         │
         ▼
  [Aggregator] ──► dedup, normalize, merge
         │
         ▼
  [Urgency Scorer] ──► score 0-100, assign badge
         │
         ▼
     [SQLite DB]
    needs / volunteers / matches
         │
    [FastAPI Backend]
         │
    ┌────┴─────────────────┐
    ▼                      ▼
[Matcher Engine]    [REST API Endpoints]
(Haversine +              │
 Skill Scoring)           ▼
    │            [React Frontend]
    │         ┌──────────┴──────────┐
    └────────►│  Needs Map          │
              │  Urgent Needs Panel │
              │  Match Panel        │
              │  Upload Panel       │
              │  Analytics Charts   │
              └─────────────────────┘
```

---

## 🛠️ Tech Stack & Key Features

### Backend
- **Python 3.10+ & FastAPI**: Extremely fast REST API.
- **Pandas**: Powers the data aggregation, cleaning, and deduplication engine.
- **SQLite + SQLAlchemy ORM**: Zero-configuration relational database to store entities.
- **Custom Matching Algorithm**: Greedy matching utilizing the Haversine formula (for geospatial distance) and weighted skill-overlap scoring.

### Frontend
- **React (Vite) & Tailwind CSS**: Modern, lightning-fast UI with a custom glassmorphism dark theme.
- **Leaflet.js**: Free and open-source interactive mapping.
- **Recharts**: Beautiful data visualizations for the analytics dashboard.
- **React Dropzone**: Intuitive drag-and-drop CSV uploads.

---

## ⚙️ How it Works: Scoring & Matching Algorithms

### Urgency Scoring Engine (`scorer.py`)
Each need is scored 0–100 using a weighted formula. Needs scoring ≥70 are marked **Critical**.

```python
urgency_score = (
    0.35 * normalize(reported_count)     +  # more people affected = higher score
    0.25 * category_weight               +  # medical prioritized over education
    0.20 * normalize(days_since_reported)+  # older unresolved cases get boosted
    0.20 * (1 - volunteer_coverage)         # areas with FEWER volunteers get higher priority
)
```

### Volunteer Matching Engine (`matcher.py`)
Matches are generated using a multi-variable score:

```python
match_score = (
    0.40 * skill_match_ratio    +   # skills volunteer has vs skills need requires
    0.35 * proximity_score      +   # Closer = better (uses Haversine distance)
    0.25 * availability_match       # E.g. 'both' preferred for 'Critical' needs
)
```
*The greedy matcher assigns top-scoring volunteers to open needs, sorted descending by urgency.*

---

## 🏃 How to Run Locally

### Requirements
- Node.js 18+
- Python 3.10+

### 1. Start the Backend
```bash
# In the project root, create a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn backend.main:app --reload
```
*Note: The database will automatically seed itself with simulated messy data on first launch.*

### 2. Start the Frontend
```bash
# Open a new terminal
cd frontend

# Install packages
npm install

# Run the dev server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🎥 End-to-End Demo Mode
We included a "Demo Flow" button in the frontend. Clicking it hits a specialized endpoint that runs the entire pipeline end-to-end:
1. Reloads the database with simulated dirty CSV/JSON data.
2. Runs the Aggregator to normalize categories and deduplicate overlapping records.
3. Runs the Scorer to assign `urgency_score` to every need.
4. Runs the Matcher to assign nearby, skilled volunteers to the most urgent tasks.
5. Pushes all live updates to the frontend Dashboard and Analytics.

---

## 🔭 Future Scalability
Path to production:
- Replace **SQLite** with **PostgreSQL + PostGIS** for optimized spatial querying.
- Incorporate **Twilio API** to dispatch SMS notifications to volunteers the moment they are matched.
- Replace greedy matching with the **Hungarian Algorithm** for optimal, system-wide matching combinations.
- Integrate directly with ODK, KoboToolbox, or Google Forms to replace manual CSV uploads.
