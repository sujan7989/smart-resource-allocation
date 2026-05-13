# Smart Resource Allocation

**Data-Driven Volunteer Coordination for Social Impact**

A full-stack platform that connects volunteers to urgent community needs using an AI-powered matching engine. Built for NGOs and social impact organizations operating at a global scale.

**Live Demo:** https://smart-resource-allocation.vercel.app  
**API Docs:** https://smart-resource-allocation-pvyg.onrender.com/docs

---

## What It Does

- **Community Needs** — NGO admins post urgent needs (food, medical, shelter, water, etc.) with location, urgency level, and affected population count
- **AI Matching Engine** — Automatically scores and ranks volunteers against tasks based on skills (40%), location (30%), availability (20%), and experience (10%)
- **Task Management** — Full lifecycle: open → assigned → in_progress → completed
- **Field Reports** — Field workers submit ground observations; admins convert them into verified community needs with one click
- **Impact Tracking** — Volunteer hours, task completion rates, leaderboard, monthly resolved needs chart
- **Map View** — Geographic visualization of all community needs worldwide
- **Multi-language** — English, Spanish, French, Hindi
- **PWA** — Installable on mobile, works offline

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite 5 |
| Styling | Tailwind CSS + Framer Motion |
| State | Zustand + Axios |
| Charts | Recharts |
| Map | Leaflet + react-leaflet |
| i18n | react-i18next (EN, ES, FR, HI) |
| PWA | vite-plugin-pwa + Workbox |
| Backend | FastAPI + Python 3.11 |
| ORM | SQLAlchemy 2.0 + Pydantic v2 |
| Auth | JWT (python-jose) + bcrypt |
| Rate Limiting | slowapi |
| Database | Supabase (PostgreSQL) |
| Deploy | Vercel (frontend) + Render (backend) |

---

## User Roles

| Role | Can Do |
|------|--------|
| **Admin** | Full access — manage users, create needs/tasks, approve assignments, review field reports, view impact |
| **Volunteer** | Browse needs/tasks, accept tasks, view AI-matched recommendations, complete tasks with rating |
| **Field Worker** | Submit field reports from the ground |

---

## Security

- Admin self-registration is blocked at schema level
- Password policy: 8+ chars, 1 uppercase, 1 digit (enforced on both frontend and backend)
- Rate limiting: 5/min on register, 10/min on login, 200/min global
- JWT with 24h expiry, token expiry checked on app load
- Role-based route guards on both frontend (React) and backend (FastAPI)
- Cascade deletes handled manually for Supabase FK compatibility

---

## Local Development

### Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate        # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
cp .env.example .env           # fill in your Supabase DATABASE_URL
uvicorn src.main:app --reload
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

---

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── routes/          # FastAPI route handlers
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── auth.py          # JWT authentication
│   │   ├── config.py        # Environment settings
│   │   ├── database.py      # DB engine + session
│   │   ├── main.py          # FastAPI app + middleware
│   │   └── matching_engine.py  # AI volunteer-task matching
│   ├── migrate.py           # Schema migration (idempotent)
│   ├── seed_prod.py         # Production seed (admin account only)
│   ├── supabase_migration.sql  # SQL migration for Supabase
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── pages/           # All page components
    │   ├── components/      # Shared UI components
    │   ├── store/           # Zustand auth store
    │   ├── api/             # Axios client
    │   ├── hooks/           # Custom React hooks
    │   └── i18n/            # Translation files (EN/ES/FR/HI)
    ├── public/              # PWA icons + static assets
    └── vite.config.ts
```

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full setup instructions.

**Quick summary:**
- Frontend → Vercel (auto-deploys on push to `main`)
- Backend → Render (set `DATABASE_URL` to Supabase connection string)
- Database → Supabase (free tier, always on)

---

## API Reference

Full interactive docs at `/docs` (Swagger UI) when the backend is running.

Key endpoints:
- `POST /api/auth/register` — public registration (volunteer/field_worker only)
- `POST /api/auth/login` — returns JWT
- `GET /api/dashboard/stats` — live platform statistics
- `GET /api/volunteers/me/recommended-tasks` — AI-matched tasks for current volunteer
- `GET /api/tasks/{id}/recommended-volunteers` — AI-matched volunteers for a task (admin)
- `POST /api/field-reports/{id}/convert` — convert field report to community need (admin)
- `GET /api/dashboard/impact` — impact analytics with monthly chart data
