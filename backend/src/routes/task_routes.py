from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from src.database import get_db
from src.models.task import Task, TaskStatus
from src.models.user import User
from src.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from src.auth import get_current_user, require_admin
from src.matching_engine import get_top_volunteers_for_task
from src.schemas.volunteer import VolunteerWithUser, VolunteerProfileResponse

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


@router.get("/", response_model=List[TaskResponse])
def list_tasks(
    status: Optional[TaskStatus] = None,
    city: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Task)
    if status:
        query = query.filter(Task.status == status)
    if city:
        query = query.filter(Task.city.ilike(f"%{city}%"))

    return query.order_by(Task.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=TaskResponse, status_code=201)
def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    task = Task(**{k: v.strip() if isinstance(v, str) else v for k, v in task_data.model_dump().items()})
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: str,
    updates: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()


@router.get("/{task_id}/recommended-volunteers", response_model=List[dict])
def get_recommended_volunteers(
    task_id: str,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get AI-matched volunteers recommended for this task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    recommendations = get_top_volunteers_for_task(task, db, limit)
    return [
        {
            "volunteer": VolunteerWithUser(
                id=vol.id,
                email=vol.email,
                full_name=vol.full_name,
                location=vol.location,
                phone=vol.phone,
                profile=VolunteerProfileResponse.from_orm(profile) if profile else None
            ),
            "match_score": score
        }
        for vol, profile, score in recommendations
    ]
