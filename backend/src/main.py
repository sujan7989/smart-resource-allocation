from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from src.config import settings
from src.database import Base, engine
from src.routes import (
    auth_routes,
    needs_routes,
    volunteer_routes,
    task_routes,
    assignment_routes,
    field_report_routes,
    dashboard_routes,
    admin_routes,
    user_routes,
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Rate limiter (keyed by client IP)
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Smart Resource Allocation API",
    description="Data-Driven Volunteer Coordination for Social Impact",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Attach rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow configured frontend + localhost dev origins
allowed_origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]
# Remove duplicates and empty strings
allowed_origins = list({o for o in allowed_origins if o})

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# Register all routers
app.include_router(auth_routes.router)
app.include_router(user_routes.router)
app.include_router(needs_routes.router)
app.include_router(volunteer_routes.router)
app.include_router(task_routes.router)
app.include_router(assignment_routes.router)
app.include_router(field_report_routes.router)
app.include_router(dashboard_routes.router)
app.include_router(admin_routes.router)


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Smart Resource Allocation API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["Root"])
def health_check():
    return {"status": "healthy"}
