from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from src.database import get_db
from src.models.user import User, UserRole
from src.models.volunteer import VolunteerProfile
from src.schemas.volunteer import VolunteerProfileCreate, VolunteerProfileUpdate, VolunteerProfileResponse, VolunteerWithUser
from src.schemas.task import TaskResponse
from src.auth import get_current_user, require_admin
from src.matching_engine import get_recommended_tasks_for_volunteer

router = APIRouter(prefix="/api/volunteers", tags=["Volunteers"])


@router.get("/", response_model=List[VolunteerWithUser])
def list_volunteers(
    available_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    # Single JOIN query — no N+1
    query = (
        db.query(User, VolunteerProfile)
        .outerjoin(VolunteerProfile, VolunteerProfile.user_id == User.id)
        .filter(User.role == UserRole.VOLUNTEER, User.is_active == True)
    )
    if available_only:
        query = query.filter(VolunteerProfile.is_available == True)

    rows = query.all()
    return [
        VolunteerWithUser(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            location=user.location,
            phone=user.phone,
            profile=VolunteerProfileResponse.from_orm(profile) if profile else None,
        )
        for user, profile in rows
    ]


@router.get("/me/profile", response_model=VolunteerProfileResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = db.query(VolunteerProfile).filter(VolunteerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Please create one.")
    return profile


@router.post("/me/profile", response_model=VolunteerProfileResponse, status_code=201)
def create_my_profile(
    profile_data: VolunteerProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(VolunteerProfile).filter(VolunteerProfile.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists. Use PATCH to update.")

    profile = VolunteerProfile(user_id=current_user.id, **profile_data.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.patch("/me/profile", response_model=VolunteerProfileResponse)
def update_my_profile(
    updates: VolunteerProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = db.query(VolunteerProfile).filter(VolunteerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile


@router.get("/me/recommended-tasks", response_model=List[dict])
def get_recommended_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI-matched tasks recommended for the current volunteer."""
    recommendations = get_recommended_tasks_for_volunteer(current_user, db)
    return [
        {"task": TaskResponse.from_orm(task), "match_score": score}
        for task, score in recommendations
    ]
