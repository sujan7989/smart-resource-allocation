# Smart Resource Allocation — Complete Project Reference

> **Live URLs**
> - Frontend: https://smart-resource-allocation.vercel.app
> - Backend API: https://smart-resource-allocation-pvyg.onrender.com
> - API Docs (Swagger): https://smart-resource-allocation-pvyg.onrender.com/docs
> - GitHub: https://github.com/sujan7989/smart-resource-allocation

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Data Storage — Where Everything Lives](#3-data-storage--where-everything-lives)
4. [Tech Stack](#4-tech-stack)
5. [Backend — Deep Dive](#5-backend--deep-dive)
6. [Frontend — Deep Dive](#6-frontend--deep-dive)
7. [Database Schema](#7-database-schema)
8. [Authentication & Security](#8-authentication--security)
9. [Smart Matching Engine](#9-smart-matching-engine)
10. [API Reference](#10-api-reference)
11. [Environment Variables](#11-environment-variables)
12. [How to Run Locally](#12-how-to-run-locally)
13. [Production Deployment](#13-production-deployment)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Project Overview

**Smart Resource Allocation** is a full-stack, production-grade volunteer coordination platform built for social impact organizations. It connects community needs with available volunteers using an AI-powered matching engine that scores volunteers against tasks based on skills, location, availability, and experience.

### Core Capabilities

| Feature | Description |
|---|---|
| Community Needs Management | Track needs by category, urgency, location, and affected population |
| Task Management | Break needs into actionable tasks with skill requirements and deadlines |
| Volunteer Matching | AI engine scores volunteers 0–100 per task across 4 weighted dimensions |
| Assignment Workflow | Pending → Accepted → In Progress → Completed lifecycle with ratings |
| Field Reports | Field workers submit ground reports; admins convert them to verified needs |
| Impact Analytics | Volunteer hours, resolved needs, top performers, monthly trend charts |
| Interactive Map | Leaflet map showing geo-located community needs |
| PWA | Installable on mobile/desktop, offline banner, push notifications |
| i18n | English, Spanish, French, Nepali |
| Role-Based Access | Admin, Volunteer, Field Worker — each with scoped permissions |


---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│   React 18 + Vite PWA  ──  Vercel (CDN, global edge)           │
│   Tailwind CSS + Framer Motion + Recharts + Leaflet             │
│   Zustand (state) + Axios (HTTP) + i18next (i18n)               │
└────────────────────────┬────────────────────────────────────────┘
                         │  HTTPS REST API  (JWT Bearer token)
                         │  Axios timeout: 15s
                         │  Rate limited: 200 req/min (global)
┌────────────────────────▼────────────────────────────────────────┐
│                        API LAYER                                │
│   FastAPI 0.115 + Uvicorn  ──  Render (free tier, auto-sleep)  │
│   SlowAPI rate limiting + CORS middleware                       │
│   bcrypt password hashing + HS256 JWT (24h expiry)             │
│   Smart Matching Engine (skill/location/availability/exp)       │
└────────────────────────┬────────────────────────────────────────┘
                         │  SQLAlchemy ORM (connection pool)
                         │  pool_size=5, max_overflow=10
                         │  pool_pre_ping=True, pool_recycle=300s
┌────────────────────────▼────────────────────────────────────────┐
│                      DATABASE LAYER                             │
│   PostgreSQL 15  ──  Supabase (Mumbai / ap-south-1)            │
│   Shared Pooler (port 5432)                                     │
│   6 tables: users, volunteer_profiles, community_needs,         │
│             tasks, assignments, field_reports                   │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow

```
User action in browser
  → Zustand store reads token from localStorage
  → Axios attaches Authorization: Bearer <JWT>
  → FastAPI validates JWT → get_current_user dependency
  → Route handler queries PostgreSQL via SQLAlchemy
  → Pydantic response model serializes result
  → JSON response → React state update → UI re-render
```


---

## 3. Data Storage — Where Everything Lives

### ✅ All Application Data is Stored in the Database

Every piece of business data — users, needs, tasks, assignments, field reports, volunteer profiles — is persisted in **PostgreSQL (Supabase)** in production and **SQLite** in local development. No auth data is stored in the browser.

| Data | Storage Location | Why |
|---|---|---|
| Users, roles, passwords (hashed) | PostgreSQL `users` table | Persistent, server-authoritative |
| Volunteer profiles, skills, availability | PostgreSQL `volunteer_profiles` table | Persistent, queryable |
| Community needs | PostgreSQL `community_needs` table | Persistent, geo-queryable |
| Tasks | PostgreSQL `tasks` table | Persistent, linked to needs |
| Assignments | PostgreSQL `assignments` table | Persistent, full lifecycle |
| Field reports | PostgreSQL `field_reports` table | Persistent, admin-reviewable |
| JWT session token | httpOnly cookie (browser cookie jar) | **JS cannot read it** — set/cleared by backend only |
| Logged-in user object | In-memory Zustand store | Restored from DB via `GET /api/auth/me` on app load |
| Language preference | `localStorage['i18next']` | UI preference only — not auth data |

### Why httpOnly Cookie for the Token?

The JWT lives in a **httpOnly, SameSite=Lax cookie** set by the backend on login/register:

- `httponly=True` — JavaScript has **zero access** to the token, eliminating XSS token theft
- `samesite="lax"` — provides CSRF protection for cross-site requests
- `secure=True` in production (HTTPS only), `False` in local dev (HTTP)
- The browser sends the cookie automatically on every API request — no manual token injection needed
- On logout, `POST /api/auth/logout` tells the backend to delete the cookie server-side
- On app load, `GET /api/auth/me` restores the user object into memory from the database

No auth data ever touches `localStorage`.

### Local Dev vs Production

| Environment | Database | How to Switch |
|---|---|---|
| Local development | SQLite (auto-created as `backend/smart_resource.db`) | Default — no setup needed |
| Production (Render) | Supabase PostgreSQL | Set `DATABASE_URL` env var to Supabase pooler URL |

The `database.py` file auto-detects which database to use based on the `DATABASE_URL` prefix.


---

## 4. Tech Stack

### Backend

| Tool | Version | Purpose |
|---|---|---|
| **Python** | 3.11+ | Runtime |
| **FastAPI** | 0.115.0 | Web framework — async, OpenAPI auto-docs |
| **Uvicorn** | 0.30.0 | ASGI server (with `standard` extras for WebSocket/HTTP2) |
| **SQLAlchemy** | 2.0.25 | ORM — models, queries, connection pooling |
| **Pydantic** | 2.7.0 | Request/response validation and serialization |
| **pydantic-settings** | 2.2.1 | Environment variable management |
| **psycopg2-binary** | 2.9.9 | PostgreSQL driver |
| **python-jose** | 3.3.0 | JWT creation and validation (HS256) |
| **passlib + bcrypt** | 1.7.4 / 4.1.3 | Password hashing |
| **slowapi** | 0.1.9 | Rate limiting middleware |
| **python-dotenv** | 1.0.0 | `.env` file loading |
| **email-validator** | 2.1.0 | Email format validation in Pydantic |
| **python-multipart** | 0.0.9 | Form data parsing |

### Frontend

| Tool | Version | Purpose |
|---|---|---|
| **React** | 18.2 | UI framework |
| **TypeScript** | 5.2 | Type safety |
| **Vite** | 5.0 | Build tool and dev server |
| **React Router** | 6.21 | Client-side routing |
| **Zustand** | 4.4 | Lightweight global state management |
| **Axios** | 1.6 | HTTP client with interceptors |
| **Tailwind CSS** | 3.4 | Utility-first CSS framework |
| **Framer Motion** | 11.3 | Animations and transitions |
| **Recharts** | 2.10 | Charts (bar, pie, line) for dashboard/impact |
| **React Leaflet** | 4.2 | Interactive map component |
| **Leaflet** | 1.9 | Map engine |
| **i18next** | 23.11 | Internationalization framework |
| **react-i18next** | 14.1 | React bindings for i18next |
| **react-hot-toast** | 2.4 | Toast notifications |
| **lucide-react** | 0.303 | Icon library |
| **vite-plugin-pwa** | 1.3 | PWA manifest + service worker generation |
| **Workbox** | 7.4 | Service worker caching strategies |

### Infrastructure & Services

| Service | Role | Tier |
|---|---|---|
| **Vercel** | Frontend hosting (CDN, global edge) | Free |
| **Render** | Backend hosting (auto-deploy from GitHub) | Free (sleeps after 15min) |
| **Supabase** | PostgreSQL database (Mumbai region) | Free |
| **GitHub** | Source control + CI trigger | Free |


---

## 5. Backend — Deep Dive

### Directory Structure

```
backend/
├── src/
│   ├── main.py              # FastAPI app factory, middleware, router registration
│   ├── config.py            # Pydantic Settings — all env vars with defaults
│   ├── database.py          # SQLAlchemy engine, session, get_db(), health check
│   ├── auth.py              # JWT, bcrypt, get_current_user, require_admin
│   ├── matching_engine.py   # AI volunteer-task scoring algorithm
│   ├── models/
│   │   ├── user.py          # User model (users table)
│   │   ├── volunteer.py     # VolunteerProfile model (volunteer_profiles table)
│   │   ├── community_need.py # CommunityNeed model (community_needs table)
│   │   ├── task.py          # Task model (tasks table)
│   │   ├── assignment.py    # Assignment model (assignments table)
│   │   └── field_report.py  # FieldReport model (field_reports table)
│   ├── routes/
│   │   ├── auth_routes.py        # POST /api/auth/register, /login
│   │   ├── user_routes.py        # GET/PATCH /api/users/me, admin user CRUD
│   │   ├── volunteer_routes.py   # Volunteer profile + recommended tasks
│   │   ├── task_routes.py        # Task CRUD + recommended volunteers
│   │   ├── assignment_routes.py  # Assignment lifecycle management
│   │   ├── needs_routes.py       # Community needs CRUD
│   │   ├── field_report_routes.py # Field reports + convert to need
│   │   ├── dashboard_routes.py   # Stats, analytics, impact data
│   │   └── admin_routes.py       # Admin-only: clear sample data
│   └── schemas/
│       ├── user.py, volunteer.py, task.py
│       ├── assignment.py, community_need.py, field_report.py
│       └── (Pydantic v2 request/response models for each entity)
├── migrate.py       # Idempotent column-addition migration script
├── seed_prod.py     # Creates admin account if none exists (safe, idempotent)
├── requirements.txt
├── .env.example
├── Procfile         # Render start command
├── render.yaml      # Render service configuration
├── runtime.txt      # Python version pin
└── supabase_migration.sql  # SQL migration for Supabase SQL Editor
```

### Key Files Explained

**`main.py`** — App entry point:
- Calls `Base.metadata.create_all(bind=engine)` on startup — creates all tables if they don't exist
- Configures SlowAPI rate limiter (200 req/min global, 5/min on register, 10/min on login)
- Sets up CORS for `FRONTEND_URL` + localhost dev origins
- Registers all 9 routers
- Exposes `GET /health` — returns 503 if DB is unreachable

**`database.py`** — Smart connection setup:
- Detects `sqlite://` → uses `check_same_thread=False`
- Detects `pooler.supabase.com` → uses connection pool with `pool_pre_ping` and `pool_recycle=300s`
- `get_db()` — FastAPI dependency that yields a session and closes it after the request

**`config.py`** — All configuration in one place:
- Reads from `.env` file and environment variables
- Warns loudly if the insecure dev `SECRET_KEY` is detected on a cloud platform
- Defaults: SQLite DB, 24h JWT expiry, localhost CORS

**`migrate.py`** — Safe migration runner:
- Checks if each column exists before attempting `ALTER TABLE`
- Works on both PostgreSQL (`information_schema`) and SQLite (`PRAGMA table_info`)
- Run on every deploy via `Procfile`

**`seed_prod.py`** — Admin account bootstrap:
- Creates admin account from env vars only if no admin exists
- Warns if default password is used on a cloud platform
- Run on every deploy via `Procfile` (safe — skips if admin exists)


---

## 6. Frontend — Deep Dive

### Directory Structure

```
frontend/
├── src/
│   ├── main.tsx             # React root — BrowserRouter, Toaster, PWA components
│   ├── App.tsx              # Route tree with PrivateRoute, PublicRoute, RoleRoute guards
│   ├── index.css            # Tailwind base styles
│   ├── api/
│   │   └── client.ts        # Axios instance — base URL, JWT interceptor, 401 handler
│   ├── store/
│   │   └── authStore.ts     # Zustand auth store — token/user in localStorage
│   ├── pages/
│   │   ├── LoginPage.tsx        # Email/password login form
│   │   ├── RegisterPage.tsx     # Self-registration (volunteer/field_worker only)
│   │   ├── DashboardPage.tsx    # Stats overview with charts
│   │   ├── NeedsPage.tsx        # Community needs list + CRUD (admin)
│   │   ├── TasksPage.tsx        # Tasks list + AI-recommended tasks tab
│   │   ├── VolunteersPage.tsx   # Volunteer roster (admin only)
│   │   ├── FieldReportsPage.tsx # Submit reports / review & convert (admin)
│   │   ├── ProfilePage.tsx      # User profile + volunteer profile + assignments
│   │   ├── AdminPage.tsx        # User management (admin only)
│   │   ├── MapPage.tsx          # Leaflet map of community needs
│   │   ├── ImpactPage.tsx       # Analytics: hours, resolved needs, top volunteers
│   │   └── NotFoundPage.tsx     # 404 page
│   ├── components/
│   │   ├── Layout.tsx           # Sidebar navigation + Outlet wrapper
│   │   ├── AnimatedBackground.tsx # Decorative animated background
│   │   ├── InstallPrompt.tsx    # PWA "Add to Home Screen" prompt
│   │   ├── OfflineBanner.tsx    # Shows when browser is offline
│   │   ├── UpdatePrompt.tsx     # Prompts reload when new SW version available
│   │   ├── LanguageSelector.tsx # EN/ES/FR/NE language switcher
│   │   └── Logo.tsx             # App logo
│   ├── hooks/
│   │   └── usePushNotifications.ts # Web Push API integration
│   └── i18n/
│       ├── index.ts             # i18next configuration
│       └── locales/
│           ├── en.json          # English translations
│           ├── es.json          # Spanish translations
│           ├── fr.json          # French translations
│           └── ne.json          # Nepali translations
├── public/
│   ├── favicon.ico
│   ├── pwa-64x64.png, pwa-192x192.png, pwa-512x512.png
│   ├── apple-touch-icon.png
│   ├── maskable-icon-512x512.png
│   └── offline.html             # Shown by service worker when fully offline
├── index.html
├── package.json
├── vite.config.ts               # Vite + PWA plugin configuration
├── tailwind.config.js
└── postcss.config.js
```

### Route Guards

| Guard | Behavior |
|---|---|
| `PrivateRoute` | Redirects to `/login` if not authenticated |
| `PublicRoute` | Redirects to `/dashboard` if already authenticated |
| `RoleRoute` | Redirects to `/dashboard` if authenticated but wrong role |

### State Management

**Zustand `authStore`** is the only global store. It holds:
- `user` — the logged-in user object
- `token` — the JWT string
- `isAuthenticated` — boolean derived from token presence + validity

On app load, it reads from `localStorage` and validates the JWT expiry client-side. Stale or malformed tokens are cleared immediately.

### API Client Pattern

All API calls go through `src/api/client.ts`. Pages and components import this Axios instance and call endpoints directly — no separate service layer. The interceptors handle auth and error cases globally, so individual pages don't need to handle 401 errors.


---

## 7. Database Schema

### Entity Relationship Overview

```
users (1) ──────────────── (0..1) volunteer_profiles
  │
  ├── (1) ──── (many) field_reports
  └── (1) ──── (many) assignments ──── (many) tasks
                                              │
community_needs (1) ──── (many) tasks         │
       │                                      │
       └── (many) field_reports ──────────────┘
```

### Tables

#### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | VARCHAR (UUID) | Primary key |
| `email` | VARCHAR | Unique, indexed |
| `full_name` | VARCHAR | Required |
| `hashed_password` | VARCHAR | bcrypt hash |
| `role` | ENUM | `admin`, `volunteer`, `field_worker` |
| `is_active` | BOOLEAN | Default true |
| `phone` | VARCHAR | Optional |
| `location` | VARCHAR | Optional |
| `created_at` | TIMESTAMP | Server default NOW() |
| `updated_at` | TIMESTAMP | Auto-updated |

#### `volunteer_profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | VARCHAR (UUID) | Primary key |
| `user_id` | VARCHAR | FK → users.id (CASCADE DELETE), unique |
| `skills` | TEXT | Comma-separated: `"medical,first aid"` |
| `availability` | TEXT | JSON string: `{"days":["Mon","Tue"],"hours":"9am-5pm"}` |
| `preferred_areas` | TEXT | Comma-separated: `"Mumbai,Pune"` |
| `experience_years` | INTEGER | Default 0 |
| `bio` | TEXT | Optional |
| `is_available` | BOOLEAN | Default true |
| `total_tasks_completed` | INTEGER | Running counter |
| `total_hours_contributed` | INTEGER | Cumulative volunteer hours |
| `rating` | FLOAT | 0.0–5.0 running average |
| `created_at` / `updated_at` | TIMESTAMP | Auto-managed |

#### `community_needs`
| Column | Type | Notes |
|---|---|---|
| `id` | VARCHAR (UUID) | Primary key |
| `title` | VARCHAR | Required |
| `description` | TEXT | Required |
| `category` | ENUM | food, medical, education, shelter, water, sanitation, mental_health, elderly_care, child_care, disaster_relief, other |
| `urgency` | ENUM | `low`, `medium`, `high`, `critical` |
| `status` | ENUM | `open`, `in_progress`, `resolved`, `closed` |
| `area` | VARCHAR | Neighborhood/area name |
| `city` | VARCHAR | City |
| `state` | VARCHAR | Optional |
| `country` | VARCHAR | Required |
| `latitude` / `longitude` | FLOAT | Optional, for map display |
| `affected_people` | INTEGER | Estimated count |
| `urgency_score` | FLOAT | Computed: `urgency_weight × (1 + affected_people/100)` |
| `reported_by_org` | VARCHAR | Optional organization name |
| `is_verified` | BOOLEAN | Admin-verified flag |
| `created_at` / `updated_at` | TIMESTAMP | Auto-managed |

#### `tasks`
| Column | Type | Notes |
|---|---|---|
| `id` | VARCHAR (UUID) | Primary key |
| `community_need_id` | VARCHAR | FK → community_needs.id (CASCADE DELETE) |
| `title` | VARCHAR | Required |
| `description` | TEXT | Required |
| `required_skills` | TEXT | Comma-separated skill requirements |
| `required_volunteers` | INTEGER | Default 1 |
| `status` | ENUM | `open`, `assigned`, `in_progress`, `completed`, `cancelled` |
| `area` / `city` | VARCHAR | Location |
| `deadline` | TIMESTAMP | Optional |
| `created_at` / `updated_at` | TIMESTAMP | Auto-managed |

#### `assignments`
| Column | Type | Notes |
|---|---|---|
| `id` | VARCHAR (UUID) | Primary key |
| `task_id` | VARCHAR | FK → tasks.id (CASCADE DELETE) |
| `volunteer_id` | VARCHAR | FK → users.id (CASCADE DELETE) |
| `status` | ENUM | `pending`, `accepted`, `rejected`, `completed` |
| `match_score` | INTEGER | 0–100, computed at assignment time |
| `notes` | TEXT | Optional notes |
| `assigned_at` | TIMESTAMP | Server default NOW() |
| `completed_at` | TIMESTAMP | Set when status → completed |
| `feedback` | TEXT | Volunteer feedback after completion |
| `rating` | INTEGER | 1–5 rating by volunteer |
| `hours_spent` | INTEGER | Volunteer hours contributed |

#### `field_reports`
| Column | Type | Notes |
|---|---|---|
| `id` | VARCHAR (UUID) | Primary key |
| `submitted_by_id` | VARCHAR | FK → users.id (CASCADE DELETE) |
| `community_need_id` | VARCHAR | FK → community_needs.id (SET NULL on delete), nullable |
| `title` | VARCHAR | Required |
| `description` | TEXT | Required |
| `area` / `city` / `country` | VARCHAR | Location |
| `estimated_affected` | INTEGER | Estimated affected people |
| `urgency_observation` | VARCHAR | Optional urgency note |
| `status` | ENUM | `submitted`, `reviewed`, `converted`, `rejected` |
| `admin_notes` | TEXT | Admin review notes |
| `created_at` / `updated_at` | TIMESTAMP | Auto-managed |


---

## 8. Authentication & Security

### JWT Flow

```
1. POST /api/auth/login  { email, password }
2. Backend verifies bcrypt hash
3. Backend sets httpOnly cookie: access_token=<JWT>  (JS cannot read this)
4. Response body returns the user object (no token in body)
5. Frontend stores user in Zustand memory store only
6. Every subsequent request: browser sends cookie automatically (withCredentials: true)
7. Backend reads cookie → decodes JWT → looks up user in DB → checks is_active
8. On 401: frontend redirects to /login (cookie expired or invalid)
9. On logout: POST /api/auth/logout → backend deletes cookie → frontend clears memory store
10. On app load: GET /api/auth/me → backend validates cookie → returns user → restores session
```

### Security Measures

| Measure | Implementation |
|---|---|
| Password hashing | bcrypt via passlib (cost factor 12) |
| JWT signing | HS256 with configurable `SECRET_KEY` |
| Token storage | httpOnly cookie — **inaccessible to JavaScript** |
| Token expiry | 24 hours (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`) |
| CSRF protection | `SameSite=Lax` cookie attribute |
| Rate limiting | SlowAPI: 200/min global, 5/min on register, 10/min on login |
| CORS | Restricted to `FRONTEND_URL` + localhost dev origins, `allow_credentials=True` |
| Role enforcement | FastAPI dependencies: `require_admin`, `require_role()` |
| Single admin rule | Only one admin account allowed at a time (enforced in user_routes) |
| Self-protection | Admin cannot deactivate or delete their own account |
| Session restore | `GET /api/auth/me` on app load — validates cookie against DB |
| Production key warning | `config.py` warns if dev `SECRET_KEY` is used on cloud platforms |

### User Roles

| Role | Can Do |
|---|---|
| `admin` | Full access: manage users, needs, tasks, assignments, field reports, analytics |
| `volunteer` | View needs/tasks, manage own profile, accept tasks, complete assignments |
| `field_worker` | Submit field reports, view own reports |

### Registration Rules

- Public `/api/auth/register` only allows `volunteer` and `field_worker` roles
- Admin accounts can only be created by an existing admin via `POST /api/users/`
- Only one admin account is allowed at a time

---

## 9. Smart Matching Engine

**File:** `backend/src/matching_engine.py`

The engine scores each volunteer–task pair on a 0–100 scale using four weighted dimensions:

| Dimension | Weight | How Scored |
|---|---|---|
| Skill match | 40% | Intersection of volunteer skills vs required skills (CSV comparison) |
| Location match | 30% | Checks preferred_areas first (100), then base location (90), then neutral (50) or different (30) |
| Availability | 20% | Parses JSON availability, checks if task deadline falls on an available day |
| Experience | 10% | 0–100 based on years: 0yr=25, 1yr=50, 3yr=75, 5yr+=100 |

**Urgency Score** (for community needs):
```
urgency_score = urgency_weight × (1 + min(affected_people / 100, 10))
```
Where urgency weights: critical=4, high=3, medium=2, low=1

**Key functions:**
- `compute_match_score(volunteer, profile, task)` → int 0–100
- `get_top_volunteers_for_task(task, db, limit=10)` → sorted list of (volunteer, profile, score)
- `get_recommended_tasks_for_volunteer(volunteer, db, limit=10)` → sorted list of (task, score)
- `compute_urgency_score(affected_people, urgency)` → float

Volunteers with `is_available=False` always score 0. Already-assigned volunteers are excluded from recommendations.


---

## 10. API Reference

Base URL (production): `https://smart-resource-allocation-pvyg.onrender.com`  
Interactive docs: `/docs` (Swagger UI) | `/redoc` (ReDoc)

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Register volunteer or field_worker. Sets httpOnly cookie. Returns user object. |
| POST | `/api/auth/login` | None | Login. Sets httpOnly cookie. Returns user object. |
| POST | `/api/auth/logout` | None | Clears the auth cookie. |
| GET | `/api/auth/me` | Cookie | Returns current user from DB. Used on app load to restore session. |

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users/me` | Any | Get own profile |
| PATCH | `/api/users/me` | Any | Update own name/phone/location |
| POST | `/api/users/me/change-password` | Any | Change own password |
| GET | `/api/users/` | Admin | List all users |
| POST | `/api/users/` | Admin | Create any user (including admin) |
| PATCH | `/api/users/{id}` | Admin | Update user role/status |
| POST | `/api/users/{id}/reset-password` | Admin | Reset user password |
| DELETE | `/api/users/{id}` | Admin | Delete user |

### Community Needs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/needs/` | Any | List needs (filterable by status, urgency, city, category, search) |
| POST | `/api/needs/` | Admin | Create need |
| GET | `/api/needs/{id}` | Any | Get single need |
| PATCH | `/api/needs/{id}` | Admin | Update need |
| DELETE | `/api/needs/{id}` | Admin | Delete need (cascades to tasks/assignments) |

### Tasks

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/tasks/` | Any | List tasks (filterable by status, city) |
| POST | `/api/tasks/` | Admin | Create task |
| GET | `/api/tasks/{id}` | Any | Get single task |
| PATCH | `/api/tasks/{id}` | Admin | Update task |
| DELETE | `/api/tasks/{id}` | Admin | Delete task |
| GET | `/api/tasks/{id}/recommended-volunteers` | Admin | AI-matched volunteers for task |

### Assignments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/assignments/pending-count` | Admin | Count of pending assignments (sidebar badge) |
| GET | `/api/assignments/` | Any | List assignments (admin: all; volunteer: own) |
| POST | `/api/assignments/` | Any | Create assignment (volunteer: self only) |
| PATCH | `/api/assignments/{id}` | Any | Update status/feedback/rating/hours |

### Volunteers

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/volunteers/` | Admin | List all volunteers with profiles |
| GET | `/api/volunteers/me/profile` | Any | Get own volunteer profile |
| POST | `/api/volunteers/me/profile` | Any | Create own volunteer profile |
| PATCH | `/api/volunteers/me/profile` | Any | Update own volunteer profile |
| GET | `/api/volunteers/me/recommended-tasks` | Any | AI-matched tasks for current volunteer |

### Field Reports

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/field-reports/` | Any | List reports (admin: all; others: own) |
| POST | `/api/field-reports/` | Any | Submit field report |
| GET | `/api/field-reports/{id}` | Any | Get single report |
| PATCH | `/api/field-reports/{id}` | Admin | Review report (update status/notes) |
| POST | `/api/field-reports/{id}/convert` | Admin | Convert report to community need |

### Dashboard & Analytics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/dashboard/public-stats` | None | People/needs/volunteers counts (login page) |
| GET | `/api/dashboard/stats` | Any | Full dashboard statistics |
| GET | `/api/dashboard/needs-by-category` | Any | Needs breakdown by category |
| GET | `/api/dashboard/needs-by-urgency` | Any | Needs breakdown by urgency |
| GET | `/api/dashboard/needs-by-city` | Any | Top cities by open needs |
| GET | `/api/dashboard/top-urgent-needs` | Any | Top 10 most urgent open needs |
| GET | `/api/dashboard/impact` | Any | Impact analytics (hours, resolved, top volunteers, monthly) |

### Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| DELETE | `/api/admin/clear-sample-data?confirm=CONFIRM_DELETE_ALL` | Admin | Wipe all non-admin data |

### System

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | None | API info |
| GET | `/health` | None | DB connectivity check (503 if DB unreachable) |


---

## 11. Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `sqlite:///./smart_resource.db` | DB connection string. Use Supabase pooler URL in production |
| `SECRET_KEY` | ✅ (prod) | dev fallback | JWT signing key. Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ALGORITHM` | No | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `1440` | JWT expiry (24 hours) |
| `FRONTEND_URL` | ✅ (prod) | `http://localhost:5173` | Allowed CORS origin |
| `ADMIN_EMAIL` | No | `admin@smartalloc.org` | Admin account email |
| `ADMIN_PASSWORD` | ✅ (prod) | `Admin@123` | Admin account password — **change this** |
| `ADMIN_FULL_NAME` | No | `Platform Admin` | Admin display name |
| `DB_POOL_SIZE` | No | `5` | SQLAlchemy pool size (PostgreSQL only) |
| `DB_MAX_OVERFLOW` | No | `10` | SQLAlchemy max overflow (PostgreSQL only) |

**Supabase DATABASE_URL format:**
```
postgresql://postgres.[project-ref]:[password]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```
Get from: Supabase Dashboard → Settings → Database → Connection string → Shared Pooler

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | ✅ (prod) | `/api` | Backend API base URL |

**Local:** `VITE_API_URL=http://localhost:8000/api`  
**Production:** `VITE_API_URL=https://smart-resource-allocation-pvyg.onrender.com/api`

---

## 12. How to Run Locally

### Prerequisites

- Python 3.11+
- Node.js 18+
- Git

### Step 1 — Clone the Repository

```bash
git clone https://github.com/sujan7989/smart-resource-allocation.git
cd smart-resource-allocation
```

### Step 2 — Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows (CMD)
venv\Scripts\activate

# Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file (SQLite is the default — no changes needed for local dev)
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux

# Run database migrations (creates tables + adds any missing columns)
python migrate.py

# Create admin account
python seed_prod.py

# Start the API server
uvicorn src.main:app --reload
```

Backend is now running at: **http://localhost:8000**  
Swagger docs: **http://localhost:8000/docs**

Default admin credentials (local):
- Email: `admin@smartalloc.org`
- Password: `Admin@123`

### Step 3 — Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux

# The default VITE_API_URL=http://localhost:8000/api is already correct for local dev

# Start the dev server
npm run dev
```

Frontend is now running at: **http://localhost:5173**

### Step 4 — Using the App Locally

1. Open http://localhost:5173
2. Log in with `admin@smartalloc.org` / `Admin@123`
3. Go to **User Management** → create volunteer and field_worker accounts
4. Go to **Community Needs** → add needs
5. Go to **Tasks** → create tasks linked to needs
6. Log in as a volunteer → go to **Tasks** → see AI-recommended tasks

### Local Database

The SQLite database file is at `backend/smart_resource.db`. It's created automatically on first run. You can delete it to start fresh — `migrate.py` and `seed_prod.py` will recreate everything.

### Using Supabase Locally (Optional)

If you want to test against the real PostgreSQL database locally:

1. Get your Supabase connection string from Supabase Dashboard → Settings → Database → Direct Connection
2. Update `backend/.env`:
   ```
   DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   ```
3. Run `python migrate.py` to apply any pending migrations
4. Restart the backend


---

## 13. Production Deployment

### Deployment Pipeline

```
git push origin main
    ↓
GitHub (source of truth)
    ↓                    ↓
Render (auto-deploy)   Vercel (auto-deploy)
    ↓
python migrate.py
python seed_prod.py
uvicorn src.main:app --host 0.0.0.0 --port $PORT
```

### Deploy Backend (Render)

1. Go to https://dashboard.render.com → your `smart-resource-allocation` service
2. Go to **Environment** → set these variables:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Supabase pooler connection string |
   | `SECRET_KEY` | Random 64-char hex string |
   | `FRONTEND_URL` | `https://smart-resource-allocation.vercel.app` |
   | `ADMIN_EMAIL` | Your admin email |
   | `ADMIN_PASSWORD` | Strong password (8+ chars, uppercase, digit) |

3. Click **Manual Deploy** → **Deploy latest commit**

The `Procfile` start command runs automatically:
```
python migrate.py && python seed_prod.py && uvicorn src.main:app --host 0.0.0.0 --port $PORT
```

### Deploy Frontend (Vercel)

Vercel auto-deploys on every push to `main`. To set environment variables:

1. Go to https://vercel.com/dashboard → your project → **Settings** → **Environment Variables**
2. Add: `VITE_API_URL` = `https://smart-resource-allocation-pvyg.onrender.com/api`
3. Redeploy if needed: **Deployments** → **Redeploy**

### Supabase Database Migration

If you need to run the schema migration manually in Supabase:

1. Go to https://supabase.com/dashboard → your project → **SQL Editor**
2. Open `backend/supabase_migration.sql`
3. Copy the entire file and run it
4. It's safe to run multiple times (`IF NOT EXISTS` guards)

### First Login After Deploy

1. Visit https://smart-resource-allocation.vercel.app
2. Log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in Render
3. Go to **User Management** → create your team accounts
4. Go to **Community Needs** → add real needs
5. Go to **Tasks** → create tasks linked to those needs

---

## 14. Troubleshooting

### Backend 500 Errors

- Check Render logs for the exact Python traceback
- Run `python migrate.py` in Render Shell to apply missing columns
- Verify `DATABASE_URL` points to Supabase (not a Render-managed DB)
- Check that `SECRET_KEY` is set and not the dev default

### Frontend Can't Connect to Backend

- Check `VITE_API_URL` in Vercel environment variables — must match Render URL exactly
- Ensure `FRONTEND_URL` on Render matches your Vercel URL exactly (no trailing slash)
- Check browser console for CORS errors
- Verify the Render service is not sleeping (first request after sleep takes ~50s)

### Render Service Sleeping

Render free tier sleeps after 15 minutes of inactivity. Options:
- Use UptimeRobot (free) to ping `https://your-api.onrender.com/health` every 14 minutes
- Upgrade to Render Starter ($7/month) for always-on service

### Admin Account Not Created

- Check Render logs for `seed_prod.py` output
- Run `python seed_prod.py` manually in Render Shell
- Verify `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set in Render environment

### Database Connection Issues

- Verify `DATABASE_URL` uses the **Shared Pooler** format (port 5432), not the direct connection (port 5432 on `db.*.supabase.co`)
- Check Supabase dashboard for connection limits (free tier: 60 connections)
- The `/health` endpoint returns `{"status": "unhealthy", "database": "unreachable"}` if the DB is down

### Local Dev: Port Already in Use

```bash
# Kill process on port 8000 (Windows)
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Kill process on port 5173 (Windows)
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Reset Local Database

```bash
cd backend
del smart_resource.db          # Windows
# rm smart_resource.db         # macOS/Linux
python migrate.py
python seed_prod.py
```

---

*Last updated: May 2026 — Smart Resource Allocation v2.0.0*
