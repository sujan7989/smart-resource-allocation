from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Resource Allocation API",
    description="Data-Driven Volunteer Coordination for Social Impact",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth_routes.router)
app.include_router(needs_routes.router)
app.include_router(volunteer_routes.router)
app.include_router(task_routes.router)
app.include_router(assignment_routes.router)
app.include_router(field_report_routes.router)
app.include_router(dashboard_routes.router)
app.include_router(admin_routes.router)


@app.get("/")
def root():
    return {
        "message": "Smart Resource Allocation API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
