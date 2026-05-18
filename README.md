# Smart Resource Allocation

**Data-Driven Volunteer Coordination for Social Impact**

A full-stack platform that connects volunteers to urgent community needs using an AI-powered matching engine. Built for NGOs and social impact organizations.

**Live Demo:** https://smart-resource-allocation.vercel.app
**API Docs:** https://smart-resource-allocation-pvyg.onrender.com/docs
**GitHub:** https://github.com/sujan7989/smart-resource-allocation

---

## What It Does

- **Community Needs** — Post urgent needs (food, medical, shelter, water, etc.) with location, urgency, and affected population
- **AI Matching Engine** — Scores volunteers against tasks: skills (40%), location (30%), availability (20%), experience (10%)
- **Task Management** — Full lifecycle: open → assigned → in_progress → completed
- **Field Reports** — Field workers submit ground observations; admins convert them to verified community needs
- **Impact Analytics** — Volunteer hours, task completion rates, leaderboard, monthly resolved needs chart
- **Map View** — Geographic visualization of all community needs
- **Multi-language** — English, Spanish, French, Hindi
- **PWA** — Installable on mobile, works offline
- **Email** — Password reset, welcome emails, admin invites via Brevo

---

## User Roles

| Role | Can Do |
|------|--------|
| **Admin** | Full access — manage users, create needs/tasks, approve assignments, review field reports, view impact, invite new admins |
| **Volunteer** | Browse needs/tasks, accept tasks, view AI-matched recommendations, complete tasks with rating |
| **Field Worker** | Submit field reports from the ground |

Multiple admins are supported. Any admin can invite new admins via a secure one-time invite link.

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
| Email | Brevo API (free, 300/day, any recipient) |
| Database | Supabase (PostgreSQL) |
| Deploy | Vercel (frontend) + Render (backend) |

---

## Security

- Admin self-registration is blocked — requires invite token from existing admin
- Multiple admins supported — any admin can invite more admins
- Password policy: 8+ chars, 1 uppercase, 1 digit (enforced frontend + backend)
- Rate limiting: 5/min on register, 10/min on login, 200/min global
- JWT with 24h expiry stored in sessionStorage (not localStorage)
- Role-based route guards on both frontend (React) and backend (FastAPI)
- Password reset via secure single-use tokens stored in database (1 hour expiry)

---

## Local Development

### Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate        # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
cp .env.example .env
python migrate.py
python seed_prod.py
uvicorn src.main:app --reload
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

Default admin: `admin@smartalloc.org` / `Admin@123`

### Frontend

```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

---

## Email Setup (Production)

Set ONE environment variable on Render — the server sends emails to all users automatically:

**Brevo (recommended — free, 300 emails/day, any recipient):**
1. Sign up at https://app.brevo.com
2. Go to Account → SMTP & API → API Keys → Generate
3. Disable IP restriction: Security → Authorized IPs → Deactivate for API keys
4. Add to Render environment: `BREVO_API_KEY` = your key

---

## Deployment

See [PROJECT.md](./PROJECT.md) for complete deployment guide.

**Quick summary:**
- Frontend → Vercel (auto-deploys on push to `main`)
- Backend → Render (set env vars, manual deploy)
- Database → Supabase (free tier, always on)

---

## API Reference

Full interactive docs at `/docs` when the backend is running.

Key endpoints:
- `POST /api/auth/register` — public registration (volunteer/field_worker); admin requires invite token
- `POST /api/auth/login` — returns JWT
- `POST /api/auth/forgot-password` — sends reset email
- `POST /api/auth/reset-password` — resets password with token
- `GET /api/dashboard/stats` — live platform statistics
- `GET /api/volunteers/me/recommended-tasks` — AI-matched tasks for current volunteer
- `GET /api/tasks/{id}/recommended-volunteers` — AI-matched volunteers for a task (admin)
- `POST /api/field-reports/{id}/convert` — convert field report to community need (admin)
- `GET /api/dashboard/impact` — impact analytics with monthly chart data
- `POST /api/users/invite-admin` — generate admin invite token (admin only)
