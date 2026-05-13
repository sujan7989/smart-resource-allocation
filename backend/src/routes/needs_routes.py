from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from src.database import get_db
from src.models.community_need import CommunityNeed, NeedStatus, UrgencyLevel
from src.models.user import User
from src.schemas.community_need import CommunityNeedCreate, CommunityNeedUpdate, CommunityNeedResponse
from src.auth import get_current_user, require_admin
from src.matching_engine import compute_urgency_score

router = APIRouter(prefix="/api/needs", tags=["Community Needs"])


@router.get("/", response_model=List[CommunityNeedResponse])
def list_needs(
    status: Optional[NeedStatus] = None,
    urgency: Optional[UrgencyLevel] = None,
    city: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(CommunityNeed)
    if status:
        query = query.filter(CommunityNeed.status == status)
    if urgency:
        query = query.filter(CommunityNeed.urgency == urgency)
    if city:
        query = query.filter(CommunityNeed.city.ilike(f"%{city}%"))
    if category:
        query = query.filter(CommunityNeed.category == category)
    if search:
        query = query.filter(
            CommunityNeed.title.ilike(f"%{search}%")
            | CommunityNeed.city.ilike(f"%{search}%")
            | CommunityNeed.description.ilike(f"%{search}%")
        )

    return query.order_by(CommunityNeed.urgency_score.desc()).offset(skip).limit(limit).all()

@router.post("/", response_model=CommunityNeedResponse, status_code=201)
def create_need(
    need_data: CommunityNeedCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    urgency_score = compute_urgency_score(need_data.affected_people, need_data.urgency.value)
    need = CommunityNeed(**need_data.model_dump(), urgency_score=urgency_score)
    db.add(need)
    db.commit()
    db.refresh(need)
    return need


@router.get("/{need_id}", response_model=CommunityNeedResponse)
def get_need(
    need_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    need = db.query(CommunityNeed).filter(CommunityNeed.id == need_id).first()
    if not need:
        raise HTTPException(status_code=404, detail="Community need not found")
    return need


@router.patch("/{need_id}", response_model=CommunityNeedResponse)
def update_need(
    need_id: str,
    updates: CommunityNeedUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    need = db.query(CommunityNeed).filter(CommunityNeed.id == need_id).first()
    if not need:
        raise HTTPException(status_code=404, detail="Community need not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(need, field, value)

    # Recompute urgency score if relevant fields changed
    if updates.affected_people is not None or updates.urgency is not None:
        need.urgency_score = compute_urgency_score(need.affected_people, need.urgency.value)

    db.commit()
    db.refresh(need)
    return need


@router.delete("/{need_id}", status_code=204)
def delete_need(
    need_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    need = db.query(CommunityNeed).filter(CommunityNeed.id == need_id).first()
    if not need:
        raise HTTPException(status_code=404, detail="Community need not found")

    # Manually delete related records first (handles DBs without CASCADE FK)
    from src.models.task import Task
    from src.models.assignment import Assignment
    from src.models.field_report import FieldReport

    # Get all task IDs for this need
    task_ids = [t.id for t in db.query(Task).filter(Task.community_need_id == need_id).all()]

    # Delete assignments for those tasks
    if task_ids:
        db.query(Assignment).filter(Assignment.task_id.in_(task_ids)).delete(synchronize_session=False)

    # Delete tasks
    db.query(Task).filter(Task.community_need_id == need_id).delete()

    # Unlink field reports (don't delete them, just unlink)
    db.query(FieldReport).filter(FieldReport.community_need_id == need_id).update(
        {"community_need_id": None}, synchronize_session=False
    )

    db.delete(need)
    db.commit()
