# Smart Resource Allocation

**Data-Driven Volunteer Coordination for Social Impact**

A full-stack platform that connects volunteers to urgent community needs using an AI-powered matching engine. Built for global NGO operations.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite 5 |
| Styling | Tailwind CSS + Framer Motion |
| State | Zustand + Axios |
| Charts | Recharts |
| PWA | vite-plugin-pwa + Workbox |
| Backend | FastAPI + Python 3.11 |
| ORM | SQLAlchemy 2.0 + Pydantic v2 |
| Auth | JWT (python-jose) + bcrypt |
| Rate Limiting | slowapi |
| DB (dev) | SQLite |
| DB (prod) | PostgreSQL |
| Deploy | Vercel (frontend) + Render (backend) |

---

## Features

- **Smart Matching Engine** — scores volunteers against tasks using skill match (40%), location (30%), availability (20%), experience (10%)
- **Three roles** — Admin, Volunteer, Field Worker with full RBAC
- **Community Needs** — create, verify, resolve, delete with urgency scoring
- **Task Management** — full lifecycle (open → assigned → in_progress → completed)
- **Field Reports → Community Needs** — one-click conversion workflow
- **Assignment Approval** — admin approves/rejects volunteer applications
- **Task Completion with Feedback** — volunteers rate tasks; ratings update volunteer profiles
- **Live Dashboard** — charts, stats, top urgent needs, city breakdown
- **PWA** — installable, offline-capable, service worker caching
- **Pagination** — server-side pagination on all list pages
- **Global** — no hardcoded country defaults

---

## Security

- Admin self-registration is blocked at the schema level
- Password strength enforced (8+ chars, uppercase, digit)
- Rate limiting on auth endpoints (5/min register, 10/min login)
- JWT with configurable expiry
- Role-based route guards on both frontend and backend
- Cascade deletes with proper FK constraints
- Input validation on all fields with length limits

---

## Local Development

### Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate        # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
cp .env.example .env           # edit SECRET_KEY and ADMIN_PASSWORD
python seed_prod.py            # creates admin account
uvicorn src.main:app --reload
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env           # set VITE_API_URL if needed
npm run dev
# App: http://localhost:5173
```

---

## Environment Variables

### Backend (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | No | SQLite default; set PostgreSQL URL for prod |
| `SECRET_KEY` | **Yes (prod)** | JWT signing key — generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `FRONTEND_URL` | Yes | Your Vercel URL for CORS |
| `ADMIN_EMAIL` | No | Admin seed email (default: admin@smartalloc.org) |
| `ADMIN_PASSWORD` | **Yes (prod)** | Admin seed password — change before deploying |
| `ADMIN_FULL_NAME` | No | Admin display name |

### Frontend (`.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL (e.g. `https://your-api.onrender.com/api`) |

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full Render + Vercel deployment guide.

---

## API Reference

Full interactive docs available at `/docs` (Swagger UI) and `/redoc` when the backend is running.

Key endpoints:
- `POST /api/auth/register` — public registration (volunteer/field_worker only)
- `POST /api/auth/login` — returns JWT
- `GET /api/dashboard/stats` — live platform statistics
- `GET /api/volunteers/me/recommended-tasks` — AI-matched tasks for current volunteer
- `GET /api/tasks/{id}/recommended-volunteers` — AI-matched volunteers for a task (admin)
- `POST /api/field-reports/{id}/convert` — convert field report to community need (admin)
- `GET /api/assignments/pending-count` — lightweight pending count for sidebar badge (admin)
