"""
Admin-only routes for database management.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.models.user import User, UserRole
from src.models.community_need import CommunityNeed
from src.models.task import Task
from src.models.assignment import Assignment
from src.models.field_report import FieldReport
from src.models.volunteer import VolunteerProfile
from src.auth import require_admin
from src import email_service

router = APIRouter(prefix="/api/admin", tags=["Admin"])

_CONFIRM_TOKEN = "CONFIRM_DELETE_ALL"


@router.get("/test-email")
def test_email(
    to: str = Query(..., description="Email address to send test to"),
    current_user: User = Depends(require_admin),
):
    """
    Admin: test email configuration and send a test email.
    Returns detailed diagnostics so you can see exactly what's failing.
    GET /api/admin/test-email?to=you@gmail.com
    """
    result = email_service.test_email_config(to)
    return result


@router.delete("/clear-sample-data", status_code=200)
def clear_sample_data(
    confirm: str = Query(..., description=f"Must be '{_CONFIRM_TOKEN}' to proceed"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if confirm != _CONFIRM_TOKEN:
        raise HTTPException(
            status_code=400,
            detail=f"Confirmation token required. Pass ?confirm={_CONFIRM_TOKEN} to proceed.",
        )

    db.query(Assignment).delete()
    db.query(FieldReport).delete()
    db.query(Task).delete()
    db.query(CommunityNeed).delete()
    db.query(VolunteerProfile).delete()
    db.query(User).filter(User.role != UserRole.ADMIN).delete()
    db.commit()

    return {"message": "All sample data cleared. Database is clean for real data."}
