# Smart Resource Allocation — Implementation Plan

A full-stack **Volunteer–NGO Matching Platform** that ingests scattered survey data, ranks needs by urgency, matches volunteers by skills & proximity, and closes the loop with a verification workflow.

---

## Stack Decision

| Layer | Technology | Rationale |
|---|---|---|
| Backend API | **Node.js + Express** | Fast CRUD, easy CSV/JSON parsing, runs anywhere |
| Database | **SQLite (via better-sqlite3)** | Zero-setup, file-based, perfect for hackathon demos |
| Frontend | **Vanilla HTML/CSS/JS** | No build step, instant iteration, premium custom design |
| Volunteer Matching | **Pure JS** (Skills overlap + Haversine distance) | Replaces Java service — same logic, no JVM needed |
| Survey Parser | **Node.js** (csv-parse + JSON.parse) | Handles CSV, JSON, and mock paper survey formats |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Browser (SPA)                    │
│  Dashboard │ Needs │ Volunteers │ Verify │ Upload   │
└────────────────────────┬────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────┐
│              Express API Server (Node.js)            │
│  /api/needs  /api/volunteers  /api/matches           │
│  /api/verify  /api/upload  /api/survey               │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│         SQLite DB  (smart_resource.db)              │
│  needs  │  volunteers  │  matches  │  verifications  │
└─────────────────────────────────────────────────────┘
```

---

## Database Schema

### `needs`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| title | TEXT | Human-readable need |
| description | TEXT | |
| category | TEXT | medical, food, shelter, etc. |
| severity | REAL | 1–10 scale |
| time_remaining_hours | REAL | Hours until critical |
| urgency_score | REAL | **= severity / time_remaining_hours** |
| location_lat | REAL | |
| location_lng | REAL | |
| location_name | TEXT | |
| skills_required | TEXT | JSON array as string |
| status | TEXT | open / in_progress / done / verified |
| ngo_id | INTEGER | FK to volunteers (NGO accounts) |
| created_at | TEXT | ISO timestamp |

### `volunteers`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | |
| email | TEXT | UNIQUE |
| phone | TEXT | |
| skills | TEXT | JSON array as string |
| lat | REAL | |
| lng | REAL | |
| location_name | TEXT | |
| role | TEXT | `volunteer` or `ngo` |
| available | INTEGER | 0/1 boolean |
| created_at | TEXT | |

### `matches`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| need_id | INTEGER | FK → needs |
| volunteer_id | INTEGER | FK → volunteers |
| match_score | REAL | Combined skill + proximity score |
| status | TEXT | pending / accepted / declined |
| assigned_at | TEXT | |

### `verifications`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| match_id | INTEGER | FK → matches |
| volunteer_marked_done | INTEGER | 0/1 |
| ngo_verified | INTEGER | 0/1 |
| volunteer_note | TEXT | |
| ngo_note | TEXT | |
| updated_at | TEXT | |

---

## Proposed Changes

### Backend (`/backend`)

#### [NEW] `server.js`
Main Express server, mounts all route modules, CORS, JSON body parsing.

#### [NEW] `db.js`
Initializes SQLite with `better-sqlite3`, creates schema, seeds sample data.

#### [NEW] `routes/needs.js`
- `GET /api/needs` — list all, sorted by urgency_score DESC
- `POST /api/needs` — create need, auto-compute urgency
- `PUT /api/needs/:id` — update status, severity, time_remaining
- `DELETE /api/needs/:id`

#### [NEW] `routes/volunteers.js`
- `GET /api/volunteers`
- `POST /api/volunteers`
- `PUT /api/volunteers/:id`

#### [NEW] `routes/matches.js`
- `GET /api/matches` — all matches with join data
- `POST /api/matches/run` — **trigger matching algorithm**
- `PUT /api/matches/:id/status` — accept / decline

#### [NEW] `routes/verify.js`
- `POST /api/verify/:matchId/done` — volunteer marks done
- `POST /api/verify/:matchId/confirm` — NGO confirms
- `GET /api/verify` — list all verifications

#### [NEW] `routes/survey.js`
- `POST /api/survey/upload` — accept CSV or JSON file (multipart)
- Parses file → validates → bulk-inserts needs into DB
- Returns a summary: `{imported: N, skipped: M, errors: [...]}`

#### [NEW] `matching/engine.js`
Core matching logic (pure JS):
```
matchScore = (skillOverlapScore * 0.6) + (proximityScore * 0.4)
```
- `skillOverlapScore` = |intersection(volunteer.skills, need.skills_required)| / |need.skills_required|
- `proximityScore` = 1 − (haversineDistance / MAX_DISTANCE_KM).clamp(0,1)

### Frontend (`/frontend`)

Single-page app with 5 tabs, zero build step.

#### [NEW] `index.html`
App shell: nav, tab routing, modal containers.

#### [NEW] `style.css`
Dark glassmorphism design system:
- HSL color palette (teal accent `hsl(174, 72%, 48%)`)
- Glass cards, gradient headers
- Micro-animations (card hover lift, urgency pulse)

#### [NEW] `app.js`
Tab router, API client, state management.

#### [NEW] `pages/dashboard.js`
- Summary cards: Total Needs / Open / Matched / Verified
- Urgency heatmap bar showing top 5 critical needs
- Recent activity feed

#### [NEW] `pages/needs.js`
- Table sorted by urgency score (highest = urgent red badge)
- "Add Need" modal with form
- Survey import button (CSV/JSON drop zone)

#### [NEW] `pages/volunteers.js`
- Volunteer cards with skill tags and availability toggle
- "Register Volunteer" form
- Map-style location display (text-based for no API key requirement)

#### [NEW] `pages/matches.js`
- Side-by-side: Need ↔ Volunteer cards
- Match score visualization (progress bar)
- "Run Matching" button that triggers the engine
- Accept / Decline actions per match

#### [NEW] `pages/verify.js`
- Kanban-style columns: Assigned → Marked Done → NGO Verified
- Volunteer "Mark as Done" button + notes field
- NGO "Confirm" button + notes field

### Root Files

#### [NEW] `package.json`
```json
{ "dependencies": { "express": "^4", "better-sqlite3": "^9", "multer": "^1", "csv-parse": "^5", "cors": "^2" } }
```

#### [NEW] `seed_data/sample_needs.csv`
Mock paper survey data — 15 needs across categories.

#### [NEW] `seed_data/sample_volunteers.json`
10 mock volunteers with varied skills and locations.

---

## Verification Plan

### Automated (via Browser Tool)
1. Upload sample CSV → verify N records imported
2. Trigger `/api/matches/run` → confirm scores calculated
3. Accept a match → verify status change
4. Mark done → NGO confirm → verify status = `verified`

### Manual
- All 5 tabs visually reviewed in browser
- Urgency formula (`severity / time_remaining`) spot-checked
- Matching score math verified for known fixture data

---

## Open Questions

> [!IMPORTANT]
> **Deployment target?** Local dev only (Node.js on machine) or should I add a `Dockerfile`?

> [!NOTE]
> **Java service?** The brief mentions a Java matching service. I've replaced it with pure JS for zero-setup. Say the word and I'll scaffold a Spring Boot microservice instead with the exact same API contract.

> [!NOTE]
> **Map visualization?** Adding a real map (Leaflet.js) requires no API key and would significantly improve the proximity matching UX. Should I include it?
