from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from src.database import get_db
from src.models.assignment import Assignment, AssignmentStatus
from src.models.task import Task, TaskStatus
from src.models.volunteer import VolunteerProfile
from src.models.user import User
from src.schemas.assignment import AssignmentCreate, AssignmentUpdate, AssignmentDetail
from src.auth import get_current_user, require_admin
from src.matching_engine import compute_match_score


router = APIRouter(prefix="/api/assignments", tags=["Assignments"])


def _build_detail(assignment: Assignment, db: Session) -> AssignmentDetail:
    """Build an AssignmentDetail from an ORM object, fetching related data."""
    task = db.query(Task).filter(Task.id == assignment.task_id).first()
    volunteer = db.query(User).filter(User.id == assignment.volunteer_id).first()
    return AssignmentDetail(
        id=assignment.id,
        task_id=assignment.task_id,
        volunteer_id=assignment.volunteer_id,
        status=assignment.status.value if hasattr(assignment.status, "value") else str(assignment.status),
        match_score=assignment.match_score,
        notes=assignment.notes,
        assigned_at=assignment.assigned_at,
        completed_at=assignment.completed_at,
        feedback=assignment.feedback,
        rating=assignment.rating,
        hours_spent=assignment.hours_spent,
        task_title=task.title.strip() if task else None,
        task_city=task.city if task else None,
        volunteer_name=volunteer.full_name if volunteer else None,
        volunteer_email=volunteer.email if volunteer else None,
    )


@router.get("/pending-count")
def get_pending_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> dict:
    """Lightweight endpoint for the sidebar badge — returns only the count."""
    count = db.query(Assignment).filter(Assignment.status == AssignmentStatus.PENDING).count()
    return {"count": count}


@router.get("/", response_model=List[AssignmentDetail])
def list_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.value == "admin":
        assignments = db.query(Assignment).order_by(Assignment.assigned_at.desc()).all()
    else:
        assignments = (
            db.query(Assignment)
            .filter(Assignment.volunteer_id == current_user.id)
            .order_by(Assignment.assigned_at.desc())
            .all()
        )
    return [_build_detail(a, db) for a in assignments]


@router.post("/", response_model=AssignmentDetail, status_code=201)
def create_assignment(
    data: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Volunteers can only assign themselves; admins can assign anyone.
    if current_user.role.value != "admin" and data.volunteer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Volunteers can only accept tasks for themselves")

    task = db.query(Task).filter(Task.id == data.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status not in (TaskStatus.OPEN, TaskStatus.ASSIGNED):
        raise HTTPException(status_code=400, detail=f"Task is not available for assignment (status: {task.status.value})")

    volunteer = db.query(User).filter(User.id == data.volunteer_id).first()
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    if not volunteer.is_active:
        raise HTTPException(status_code=400, detail="Volunteer account is inactive")

    # Prevent duplicate active assignment (pending or accepted)
    existing = (
        db.query(Assignment)
        .filter(
            Assignment.task_id == data.task_id,
            Assignment.volunteer_id == data.volunteer_id,
            Assignment.status.in_([AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED]),
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active assignment for this task")

    profile = db.query(VolunteerProfile).filter(VolunteerProfile.user_id == volunteer.id).first()
    score = compute_match_score(volunteer, profile, task)

    assignment = Assignment(
        task_id=data.task_id,
        volunteer_id=data.volunteer_id,
        notes=data.notes,
        match_score=score,
    )
    db.add(assignment)

    # Move task to ASSIGNED if it was OPEN
    if task.status == TaskStatus.OPEN:
        task.status = TaskStatus.ASSIGNED

    db.commit()
    db.refresh(assignment)
    return _build_detail(assignment, db)


@router.patch("/{assignment_id}", response_model=AssignmentDetail)
def update_assignment(
    assignment_id: str,
    updates: AssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Only admin or the assigned volunteer can update
    if current_user.role.value != "admin" and assignment.volunteer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this assignment")

    # Volunteers cannot approve/reject their own assignments — only admins can
    if current_user.role.value != "admin" and updates.status in (
        AssignmentStatus.ACCEPTED, AssignmentStatus.REJECTED
    ):
        raise HTTPException(status_code=403, detail="Only admins can approve or reject assignments")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(assignment, field, value)

    task = db.query(Task).filter(Task.id == assignment.task_id).first()

    if updates.status == AssignmentStatus.COMPLETED:
        assignment.completed_at = datetime.now(timezone.utc)
        # Increment volunteer's completed task counter and hours
        profile = (
            db.query(VolunteerProfile)
            .filter(VolunteerProfile.user_id == assignment.volunteer_id)
            .first()
        )
        if profile:
            profile.total_tasks_completed += 1
            # Accumulate volunteer hours
            if updates.hours_spent is not None and updates.hours_spent > 0:
                profile.total_hours_contributed = (profile.total_hours_contributed or 0) + updates.hours_spent
            # Update volunteer rating if a rating was provided
            if updates.rating is not None:
                old_count = profile.total_tasks_completed - 1
                if old_count > 0:
                    profile.rating = round(
                        (profile.rating * old_count + updates.rating) / profile.total_tasks_completed
                    )
                else:
                    profile.rating = updates.rating
        if task:
            task.status = TaskStatus.COMPLETED

    elif updates.status == AssignmentStatus.REJECTED:
        # If all non-rejected assignments for this task are gone, revert task to OPEN
        if task:
            active_assignments = (
                db.query(Assignment)
                .filter(
                    Assignment.task_id == task.id,
                    Assignment.id != assignment_id,
                    Assignment.status.in_([AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED]),
                )
                .count()
            )
            if active_assignments == 0:
                task.status = TaskStatus.OPEN

    elif updates.status == AssignmentStatus.ACCEPTED:
        if task and task.status == TaskStatus.ASSIGNED:
            task.status = TaskStatus.IN_PROGRESS

    db.commit()
    db.refresh(assignment)
    return _build_detail(assignment, db)
