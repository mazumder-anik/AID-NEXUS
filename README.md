# # AID-NEXUS 🛰️
### *Optimizing Humanitarian Impact through Intelligent Coordination*

[![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Gemini](https://img.shields.io/badge/AI-Google_Gemini-4285F4?logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)

**AID-NEXUS** is an intelligent, full-stack coordination platform designed to bridge the gap between community needs and volunteer resources. Developed to replace manual, error-prone spreadsheets, the system transforms fragmented field data into a prioritized action plan using mathematical models and geospatial intelligence.

---

## 📌 Core Features

* **⚡ Automated Urgency Scoring:** A weighted mathematical model that prioritizes needs based on impact, category, and time-sensitivity.
* **📍 Geospatial Matcher:** Real-time volunteer-to-need matching using proximity and skill-overlap scoring.
* **🤖 AI-Powered Assistant:** An integrated coordinator assistant powered by **Google Gemini 2.5 Flash** for natural language queries and insights.
* **📊 Live Dashboard:** Interactive field maps and data visualizations for a comprehensive tactical overview.
* **🛠️ Data Normalization:** An automated pipeline that cleans and deduplicates unstructured field reports.

---

## 🧠 The "Math Behind the Magic"

AID-NEXUS removes human bias from aid distribution by utilizing two primary mathematical frameworks:

### 1. Urgency Scoring ($S_u$)
Every reported need is assigned a priority score from 0 to 100 based on the following weighted variables:
$$S_u = (w_1 \cdot N_{people}) + (w_2 \cdot C_{category}) + (w_3 \cdot T_{age})$$

### 2. The Haversine Formula
To ensure volunteers are dispatched to the closest "hot zones," the system calculates the great-circle distance between two points on a sphere using their longitudes and latitudes:
$$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\phi_2 - \phi_1}{2}\right) + \cos(\phi_1) \cos(\phi_2) \sin^2\left(\frac{\lambda_2 - \lambda_1}{2}\right)}\right)$$

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React (Vite), Tailwind CSS, Leaflet.js, Recharts |
| **Backend** | FastAPI (Python), SQLAlchemy, Pandas |
| **AI Model** | Google Gemini 2.5 Flash |
| **Deployment** | Vercel (Frontend), Render (Backend) |

---

## 👥 Meet Team: Dark Raven

This project was built with passion and precision by **Dark Raven** for the Google Gen AI Exchange Hackathon.

* **Anik Mazumder** — *Project Lead & Technical Architect*
* **Anweshan Das** — *Frontend Engineering & UI/UX*
* **Debmalya Gupta** — *Backend Development & Logic*
* **Anusua Bhattacharjee** — *Research & Documentation*

---

## 🚀 Installation & Local Development

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
1. Create a `.env` file in the backend directory.
2. Add your `GOOGLE_API_KEY` and database credentials.
3. Run the server:
```bash
cd backend
pip install -r requirements.txt
python main.py
```

---

> [!NOTE]
> **AID-NEXUS** is currently a functional prototype developed for social impact. We are actively looking to scale this with real-world NGO partnerships.

*A project by Dark Raven.(Anik Mazumder, Anweshan Das, Debmalya Gupta, Anusua Bhattacharjee*
