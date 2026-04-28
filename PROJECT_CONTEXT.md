# Smart Resource Allocation — Complete Project Context

## 🎯 Project Overview

**Name:** Smart Resource Allocation  
**Purpose:** Data-driven volunteer coordination platform for NGOs and social groups  
**Status:** Hackathon submission (built in 4 days)  
**Core Value:** Aggregate messy community data, intelligently score needs by urgency, and match available volunteers to tasks in real-time

---

## 🧠 Problem Statement

Local NGOs struggle with:
- **Fragmented data:** Mix of paper surveys, CSV exports, JSON forms, spreadsheets
- **Manual coordination:** No automated way to identify critical areas
- **Time waste:** Manual volunteer matching takes hours instead of milliseconds
- **Poor visibility:** Coordinators can't see the big picture during crises

**Solution:** Centralized platform that automates data ingestion, urgency scoring, and volunteer matching.

---

## 🏗️ System Architecture

```
Data Sources (CSV/JSON)
    ↓
[Aggregator] → Normalize, deduplicate, merge
    ↓
[Urgency Scorer] → Score 0-100, assign badge (Critical/High/Moderate)
    ↓
[SQLite Database] → Store Needs, Volunteers, Matches, Activity Logs
    ↓
[FastAPI REST Backend] → Expose endpoints for data operations
    ├─ [Matcher Engine] → Greedy algorithm with Haversine + skills scoring
    └─ [React Frontend] → Interactive dashboard, map, analytics
```

---

## 📊 Data Model

### **Needs** (Community Requirements)
```
need_id           : String (unique identifier)
area              : String (geographic region)
lat/lng           : Float (geospatial coordinates)
category          : String (food|medical|education|shelter|sanitation)
description       : Text (detailed requirement)
reported_count    : Int (how many people reported this need)
source            : String (field_survey|paper_form|ngo_report)
reported_at       : DateTime (when need was reported)
urgency_score     : Float (0-100, computed)
urgency_badge     : String (Critical|High|Moderate, computed)
status            : String (open|in_progress|resolved)
created_at        : DateTime (timestamp)
```

### **Volunteers** (Available Resources)
```
volunteer_id      : String (unique identifier)
name              : String (volunteer name)
lat/lng           : Float (home/base coordinates)
skills            : JSON Array (food_distribution, medical_aid, teaching, construction, etc.)
availability      : String (weekdays|weekends|both)
max_distance_km   : Float (max distance willing to travel)
current_task      : String (task ID if assigned)
status            : String (available|assigned|inactive)
created_at        : DateTime (timestamp)
```

### **Matches** (Assignments)
```
match_id          : String (unique identifier)
need_id           : String (foreign key to Need)
volunteer_id      : String (foreign key to Volunteer)
match_score       : Float (0-1, quality of match)
distance_km       : Float (calculated using Haversine)
skill_overlap     : JSON Array (matched skills)
assigned_at       : DateTime (assignment timestamp)
status            : String (pending|accepted|completed)
```

### **Activity Log** (Audit Trail)
```
id                : Int (primary key)
action            : String (what happened)
entity            : String (type of object affected)
entity_id         : String (ID of affected object)
details           : Text (additional info)
created_at        : DateTime (timestamp)
```

---

## ⚙️ Core Algorithms

### 1. **Urgency Scoring Engine** (`scorer.py`)

Each need is scored 0-100 using weighted factors:

```
urgency_score = (
    0.35 × normalize(reported_count)      +  # More people = higher urgency
    0.25 × category_weight                +  # Medical > Food > Shelter > Sanitation > Education
    0.20 × normalize(days_since_reported) +  # Older unresolved needs prioritized
    0.20 × (1 - volunteer_coverage)          # Areas with fewer volunteers get boost
)
```

**Category Weights:**
- Medical: 1.00 (highest)
- Food: 0.85
- Shelter: 0.75
- Sanitation: 0.65
- Education: 0.50 (lowest)

**Badge Assignment:**
- Critical: ≥ 70
- High: 40-69
- Moderate: 0-39

### 2. **Volunteer-to-Need Matching** (`matcher.py`)

Greedy algorithm that assigns top-scoring volunteers to open needs:

```
match_score = (
    0.40 × skill_match_ratio   +   # How many required skills does volunteer have?
    0.35 × proximity_score     +   # Haversine distance with decay function
    0.25 × availability_match      # Does volunteer's availability match need urgency?
)
```

**Proximity Score:** `1.0 - (distance_km / volunteer.max_distance_km)`

**Skill Requirements Mapping:**
- Food needs: food_distribution, driving, logistics
- Medical needs: medical_aid, first_aid, counseling
- Education needs: teaching, data_entry, language_translation
- Shelter needs: construction, driving, logistics
- Sanitation needs: community_outreach, construction, logistics

**Availability Scoring Matrix:**
- Both availability + Both required: 1.00
- Both + Weekdays required: 0.90
- Weekdays + Weekdays: 1.00
- Weekdays + Weekends: 0.20 (poor match)
- etc.

### 3. **Data Aggregation** (`aggregator.py`)

Unifies 3 messy data sources:

**Sources:**
1. **Field Surveys** (sample_surveys.csv)
2. **Paper Forms** (paper_forms.json)
3. **NGO Reports** (ngo_reports.csv)

**Process:**
- Normalize category strings to canonical 5 values
- Parse various date formats robustly
- Generate unique IDs using MD5 hashing
- Deduplicate entries (same area + category)
- Fill missing fields with defaults
- Merge into single cleaned DataFrame

---

## 🔌 REST API Endpoints

**Base URL:** `http://localhost:3000` (backend)

### Needs Endpoints
```
GET  /needs?area=...&category=...&status=...
GET  /needs/{need_id}
POST /needs
PATCH /needs/{need_id}
DELETE /needs/{need_id}
```

### Volunteers Endpoints
```
GET  /volunteers?status=...
GET  /volunteers/{volunteer_id}
POST /volunteers (register new volunteer)
PATCH /volunteers/{volunteer_id}
DELETE /volunteers/{volunteer_id}
```

### Matches Endpoints
```
GET  /matches?status=...&volunteer_id=...&need_id=...
POST /matches/run (execute matching algorithm)
GET  /matches/{match_id}
PATCH /matches/{match_id} (accept/complete)
```

### Dashboard Endpoints
```
GET  /stats (DashboardStats: counts, categories, coverage %)
GET  /activity-log
```

### Upload Endpoints
```
POST /upload/csv (CSV file upload + auto-aggregation)
POST /upload/json (JSON file upload)
```

### AI Assistant Endpoints
```
POST /ai/analyze (send data to Google Generative AI for insights)
GET  /ai/suggestions (get AI recommendations)
```

---

## 💾 Database

**Type:** SQLite (zero-config relational DB)  
**Location:** `/data/smart_resource.db`  
**ORM:** SQLAlchemy  
**Tables:** needs, volunteers, matches, activity_log

---

## 🎨 Frontend Architecture

**Framework:** React 18 + Vite (fast ES module bundler)  
**Styling:** Tailwind CSS (utility-first)  
**Theme:** Glassmorphism dark theme  
**Build:** TypeScript (tsconfig.json configured)

### Key Pages/Components

1. **Dashboard** (DashboardContent.jsx)
   - Real-time stats overview
   - Quick actions panel
   - Recent activity feed

2. **Urgent Needs Panel** (UrgentNeedsPanel.jsx)
   - List of all needs sorted by urgency
   - Filter by category/area/status
   - Trigger matching button

3. **Needs Map** (NeedsMap.jsx)
   - Interactive Leaflet map
   - Geographic visualization of needs
   - Marker clustering
   - Real-time location data

4. **Match Panel** (MatchPanel.jsx)
   - Display volunteer-to-need assignments
   - Show match scores and reasoning
   - Accept/complete match workflow

5. **Upload Panel** (UploadPanel.jsx)
   - React Dropzone (drag-and-drop CSV/JSON)
   - Auto-aggregation via backend
   - Progress tracking

6. **Analytics** (Analytics.jsx)
   - Recharts visualizations
   - Needs by category (pie chart)
   - Volunteer coverage trends (line chart)
   - Resolution rate metrics

7. **AI Assistant** (AIAssistant.jsx)
   - Chat interface
   - Real-time recommendations from Google Generative AI
   - Context-aware insights from current data

### Frontend Dependencies (package.json - frontend/)
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "vite": "latest",
  "tailwindcss": "^3.x",
  "leaflet": "^1.9.x",
  "recharts": "^2.x",
  "react-dropzone": "^14.x",
  "axios": "^1.x" (for API calls)
}
```

---

## 🐍 Backend Tech Stack

**Language:** Python 3.10+  
**Framework:** FastAPI (ultra-fast async web framework)  
**Server:** Uvicorn (ASGI server)  
**ORM:** SQLAlchemy 2.0+  
**Data Processing:** Pandas  
**ML/Metrics:** scikit-learn  
**AI Integration:** Google Generative AI SDK

### Backend Dependencies (requirements.txt)
```
fastapi>=0.110.0
uvicorn[standard]>=0.29.0
sqlalchemy>=2.0.0
pandas>=2.2.0
scikit-learn>=1.4.0
python-multipart>=0.0.9
pydantic>=2.0.0
google-generativeai>=0.4.0
python-dotenv>=1.0.0
```

### Backend File Structure
```
backend/
├── __init__.py
├── main.py              (FastAPI app, all endpoints, startup logic)
├── models.py            (SQLAlchemy ORM + Pydantic schemas)
├── database.py          (SQLAlchemy engine, session management)
├── aggregator.py        (Data cleaning & deduplication)
├── scorer.py            (Urgency scoring algorithm)
├── matcher.py           (Volunteer matching algorithm)
├── simulator.py         (Seed database with test data)
├── ai_assistant.py      (Google Generative AI integration)
└── Dockerfile           (Container configuration)
```

---

## 🐳 Deployment

### Docker Compose Configuration
```yaml
Services:
  - backend: FastAPI server (port 3000)
  - matcher: Separate matcher service (port 8080, Java/Spring Boot based)

Volumes:
  - sra-data: Persistent SQLite database storage

Networks:
  - sra-network: Bridge network for service communication
```

**Environment Variables:**
```
PORT=3000
DB_PATH=/app/data/smart_resource.db
MATCHER_URL=http://matcher:8080
GOOGLE_API_KEY=... (for AI features)
```

---

## 🔄 Data Flow (End-to-End)

### 1. **Upload Phase**
- User uploads CSV/JSON via UploadPanel
- File sent to `POST /upload/csv` or `POST /upload/json`
- Aggregator cleans, deduplicates, normalizes data
- Records inserted into `needs` table with status="open"

### 2. **Scoring Phase**
- Scorer runs on all open needs
- Calculates urgency_score (0-100)
- Assigns urgency_badge (Critical/High/Moderate)
- Updates database

### 3. **Matching Phase**
- User clicks "Run Matching" button
- Matcher queries available volunteers and open needs
- For each need (sorted by urgency), assigns top-scoring volunteer
- Creates Match records with status="pending"
- Sends activity logs

### 4. **Frontend Display**
- Dashboard shows summary stats
- Needs Map visualizes geographic distribution
- Urgent Needs Panel lists prioritized needs
- Match Panel shows volunteer assignments
- Analytics show trends and coverage %

### 5. **Feedback Loop**
- Volunteer accepts/completes match
- Match status updated to "accepted"/"completed"
- Need status updated to "in_progress"/"resolved"
- Activity log captures all changes

---

## 📈 Key Metrics & KPIs

- **Total Needs:** Count of all reported needs
- **Open Needs:** Needs awaiting assignment
- **In Progress:** Needs currently being addressed
- **Resolved:** Completed needs
- **Coverage %:** % of Critical needs with ≥1 volunteer assigned
- **Available Volunteers:** Unassigned volunteers
- **Active Matches:** Pending + accepted matches
- **Average Match Score:** Mean quality of all matches

---

## 🤖 AI Integration

**Provider:** Google Generative AI (Gemini API)  
**Use Cases:**
- Analyze uploaded data for anomalies
- Generate prioritization recommendations
- Suggest volunteer skill training needs
- Predict resource shortages

---

## 🎯 Current Features

✅ Multi-source data ingestion (CSV, JSON, direct API)  
✅ Automatic data cleaning & deduplication  
✅ Intelligent urgency scoring (0-100)  
✅ Geographic-aware volunteer matching (Haversine)  
✅ Skill-based matching  
✅ Availability scheduling logic  
✅ Interactive needs map (Leaflet.js)  
✅ Real-time dashboard with live stats  
✅ Upload center with drag-and-drop  
✅ Analytics & reporting  
✅ AI-powered insights  
✅ Activity audit logs  
✅ Docker containerization  

---

## 🔮 Potential Extensions

- Push notifications for urgent matches
- SMS/WhatsApp integration for field volunteers
- ML-based need prediction
- Volunteer feedback rating system
- Multi-language support
- Mobile app (React Native)
- Advanced reporting (PDF export, email)
- Integration with external volunteer platforms
- Real-time collaboration features
- Offline-first PWA support

---

## 🚀 Running the Project

### Prerequisites
- Python 3.10+
- Node.js 16+
- Docker & Docker Compose

### Local Development
```bash
# Backend
cd backend
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate
pip install -r ../requirements.txt
uvicorn main:app --reload --port 3000

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

### Docker
```bash
docker-compose up --build
```

Backend: http://localhost:3000  
Frontend: http://localhost:5173

---

## 🔐 Security Considerations

- CORS enabled for all origins (configurable)
- Input validation via Pydantic
- SQL injection prevention via SQLAlchemy ORM
- File upload size limits (not explicitly set — review)
- Rate limiting: Not currently implemented
- Authentication: Not currently implemented (add as extension)
- API key management for Google Generative AI

---

## 📝 Notes for Other AI Tools

1. **This is a full-stack application** with clear separation of concerns
2. **Data quality is critical** — aggregator handles most messy data cases
3. **Geospatial logic** is core — all matching relies on Haversine distance
4. **Urgency scoring** is domain-specific and weighted — not ML-based (uses rules)
5. **Volunteer matching** uses greedy algorithm (fast, good-enough, not optimal)
6. **Real-time updates** via API calls — frontend polls backend
7. **No authentication** yet — all endpoints publicly accessible
8. **Persistent storage** is SQLite (single file, portable, suitable for MVP)
9. **AI features** are additive (not core logic, but enhance user experience)
10. **Scalability** considerations: Would need PostgreSQL + caching (Redis) for production

---

## 📞 Key Contact Points

- **Data Upload:** `POST /upload/csv`, `POST /upload/json`
- **Matching Logic:** `POST /matches/run` triggers greedy algorithm
- **Scoring Logic:** Triggered at startup, can be re-run manually
- **Frontend State:** Managed via React hooks, refreshes via API calls
- **Database:** `/data/smart_resource.db` (SQLite file)

---

End of Project Context Document
