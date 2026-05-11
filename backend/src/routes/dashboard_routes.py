from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from src.database import get_db
from src.models.community_need import CommunityNeed, NeedStatus, NeedCategory, UrgencyLevel
from src.models.task import Task, TaskStatus
from src.models.assignment import Assignment, AssignmentStatus
from src.models.user import User, UserRole
from src.models.volunteer import VolunteerProfile
from src.models.field_report import FieldReport, ReportStatus
from src.auth import get_current_user, require_admin

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Global dashboard statistics."""
    total_needs = db.query(CommunityNeed).count()
    open_needs = db.query(CommunityNeed).filter(CommunityNeed.status == NeedStatus.OPEN).count()
    critical_needs = db.query(CommunityNeed).filter(CommunityNeed.urgency == UrgencyLevel.CRITICAL).count()

    total_volunteers = db.query(User).filter(User.role == UserRole.VOLUNTEER).count()
    available_volunteers = db.query(VolunteerProfile).filter(VolunteerProfile.is_available == True).count()

    total_tasks = db.query(Task).count()
    open_tasks = db.query(Task).filter(Task.status == TaskStatus.OPEN).count()
    completed_tasks = db.query(Task).filter(Task.status == TaskStatus.COMPLETED).count()

    total_assignments = db.query(Assignment).count()
    active_assignments = db.query(Assignment).filter(
        Assignment.status == AssignmentStatus.ACCEPTED
    ).count()

    pending_reports = db.query(FieldReport).filter(
        FieldReport.status == ReportStatus.SUBMITTED
    ).count()

    total_affected = db.query(func.sum(CommunityNeed.affected_people)).scalar() or 0

    return {
        "needs": {
            "total": total_needs,
            "open": open_needs,
            "critical": critical_needs,
            "total_affected_people": total_affected,
        },
        "volunteers": {
            "total": total_volunteers,
            "available": available_volunteers,
        },
        "tasks": {
            "total": total_tasks,
            "open": open_tasks,
            "completed": completed_tasks,
        },
        "assignments": {
            "total": total_assignments,
            "active": active_assignments,
        },
        "field_reports": {
            "pending_review": pending_reports,
        }
    }


@router.get("/needs-by-category")
def needs_by_category(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Breakdown of community needs by category."""
    results = db.query(
        CommunityNeed.category,
        func.count(CommunityNeed.id).label("count"),
        func.sum(CommunityNeed.affected_people).label("total_affected")
    ).group_by(CommunityNeed.category).all()

    return [
        {"category": r.category, "count": r.count, "total_affected": r.total_affected or 0}
        for r in results
    ]


@router.get("/needs-by-urgency")
def needs_by_urgency(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Breakdown of community needs by urgency level."""
    results = db.query(
        CommunityNeed.urgency,
        func.count(CommunityNeed.id).label("count")
    ).group_by(CommunityNeed.urgency).all()

    return [{"urgency": r.urgency, "count": r.count} for r in results]


@router.get("/needs-by-city")
def needs_by_city(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Top cities by number of open community needs."""
    results = db.query(
        CommunityNeed.city,
        func.count(CommunityNeed.id).label("count"),
        func.sum(CommunityNeed.affected_people).label("total_affected")
    ).filter(
        CommunityNeed.status == NeedStatus.OPEN
    ).group_by(CommunityNeed.city).order_by(func.count(CommunityNeed.id).desc()).limit(10).all()

    return [
        {"city": r.city, "count": r.count, "total_affected": r.total_affected or 0}
        for r in results
    ]


@router.get("/top-urgent-needs")
def top_urgent_needs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Top 10 most urgent open community needs."""
    needs = db.query(CommunityNeed).filter(
        CommunityNeed.status == NeedStatus.OPEN
    ).order_by(CommunityNeed.urgency_score.desc()).limit(10).all()

    return needs
