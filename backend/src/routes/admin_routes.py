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

router = APIRouter(prefix="/api/admin", tags=["Admin"])

# Confirmation token required to prevent accidental data wipe
_CONFIRM_TOKEN = "CONFIRM_DELETE_ALL"


@router.delete("/clear-sample-data", status_code=200)
def clear_sample_data(
    confirm: str = Query(..., description=f"Must be '{_CONFIRM_TOKEN}' to proceed"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Removes all non-admin users and all data.
    Requires ?confirm=CONFIRM_DELETE_ALL query parameter to prevent accidents.
    """
    if confirm != _CONFIRM_TOKEN:
        raise HTTPException(
            status_code=400,
            detail=f"Confirmation token required. Pass ?confirm={_CONFIRM_TOKEN} to proceed.",
        )

    # Delete in FK-safe order
    db.query(Assignment).delete()
    db.query(FieldReport).delete()
    db.query(Task).delete()
    db.query(CommunityNeed).delete()
    db.query(VolunteerProfile).delete()
    db.query(User).filter(User.role != UserRole.ADMIN).delete()
    db.commit()

    return {"message": "All sample data cleared. Database is clean for real data."}
