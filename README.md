# Smart Resource Allocation
### Data-Driven Volunteer Coordination for Social Impact

A full-stack platform that centralizes scattered community needs data, prioritizes urgent local problems, and intelligently matches available volunteers to tasks using a smart scoring engine.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11 + FastAPI |
| Database | PostgreSQL (via SQLAlchemy) |
| Auth | JWT (python-jose + passlib) |
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Charts | Recharts |
| Deployment | Render (backend) + Vercel (frontend) |

---

## Project Structure

```
smart-resource-allocation/
├── backend/
│   ├── src/
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── config.py         # Settings from env vars
│   │   ├── database.py       # SQLAlchemy engine + session
│   │   ├── auth.py           # JWT auth + role guards
│   │   ├── matching_engine.py # Smart volunteer-task matching
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   └── routes/           # FastAPI route handlers
│   ├── seed.py               # Demo data seeder
│   ├── requirements.txt
│   ├── render.yaml           # Render deployment config
│   └── Procfile
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── api/client.ts     # Axios instance with auth
    │   ├── store/authStore.ts # Zustand auth state
    │   ├── components/       # Layout, shared components
    │   └── pages/            # Dashboard, Needs, Tasks, etc.
    ├── vercel.json
    └── package.json
```

---

## Local Development

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Set up environment
copy .env.example .env
# Edit .env — set DATABASE_URL to your PostgreSQL connection string

# Run the server
uvicorn src.main:app --reload --port 8000

# Seed demo data (optional)
python seed.py
```

API docs available at: http://localhost:8000/docs

### Frontend

```bash
cd frontend

npm install

# Set up environment
copy .env.example .env
# For local dev, leave VITE_API_URL empty (uses Vite proxy to localhost:8000)

npm run dev
```

Frontend at: http://localhost:5173

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@smartalloc.org | Admin@123 |
| Volunteer | priya@volunteer.org | Volunteer@123 |
| Volunteer | rahul@volunteer.org | Volunteer@123 |
| Field Worker | field@ngo.org | Field@123 |

---

## Smart Matching Engine

The matching engine scores each volunteer-task pair on 4 factors:

| Factor | Weight | How it works |
|---|---|---|
| Skill match | 40% | Intersection of volunteer skills vs task required skills |
| Location match | 30% | Volunteer city / preferred areas vs task city |
| Availability | 20% | Is the volunteer currently available? |
| Experience | 10% | Years of experience (capped at 5 years = 100%) |

Admins can view top-matched volunteers for any task. Volunteers see their personalized recommended tasks.

---

## Deployment

### Backend → Render (free tier)

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo, select `backend/` as root
4. Set environment variables:
   - `DATABASE_URL` — your PostgreSQL URL (Render provides free PostgreSQL)
   - `SECRET_KEY` — any random string
   - `FRONTEND_URL` — your Vercel URL
5. Deploy

### Frontend → Vercel (free tier)

1. Go to [vercel.com](https://vercel.com) → New Project
2. Connect your repo, set root to `frontend/`
3. Set environment variable:
   - `VITE_API_URL` — your Render backend URL + `/api`
4. Deploy

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/needs/ | List community needs |
| POST | /api/needs/ | Create need (admin) |
| GET | /api/tasks/ | List tasks |
| POST | /api/tasks/ | Create task (admin) |
| GET | /api/tasks/{id}/recommended-volunteers | Smart match volunteers |
| GET | /api/volunteers/me/recommended-tasks | Smart match tasks for volunteer |
| POST | /api/assignments/ | Assign volunteer to task |
| GET | /api/field-reports/ | List field reports |
| POST | /api/field-reports/ | Submit field report |
| GET | /api/dashboard/stats | Dashboard statistics |
| GET | /api/dashboard/needs-by-category | Chart data |
| GET | /api/dashboard/top-urgent-needs | Priority needs |

Full interactive docs: `<your-backend-url>/docs`
