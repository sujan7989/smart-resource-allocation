from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from src.database import get_db
from src.models.assignment import Assignment, AssignmentStatus
from src.models.task import Task, TaskStatus
from src.models.volunteer import VolunteerProfile
from src.models.user import User
from src.schemas.assignment import AssignmentCreate, AssignmentUpdate, AssignmentResponse
from src.auth import get_current_user, require_admin
from src.matching_engine import compute_match_score

router = APIRouter(prefix="/api/assignments", tags=["Assignments"])


@router.get("/", response_model=List[AssignmentResponse])
def list_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value == "admin":
        return db.query(Assignment).all()
    # Volunteers see only their own assignments
    return db.query(Assignment).filter(Assignment.volunteer_id == current_user.id).all()


@router.post("/", response_model=AssignmentResponse, status_code=201)
def create_assignment(
    data: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Validate task and volunteer exist
    task = db.query(Task).filter(Task.id == data.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    volunteer = db.query(User).filter(User.id == data.volunteer_id).first()
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")

    # Check for duplicate assignment
    existing = db.query(Assignment).filter(
        Assignment.task_id == data.task_id,
        Assignment.volunteer_id == data.volunteer_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Volunteer already assigned to this task")

    # Compute match score
    profile = db.query(VolunteerProfile).filter(VolunteerProfile.user_id == volunteer.id).first()
    score = compute_match_score(volunteer, profile, task)

    assignment = Assignment(
        task_id=data.task_id,
        volunteer_id=data.volunteer_id,
        notes=data.notes,
        match_score=score
    )
    db.add(assignment)

    # Update task status
    if task.status == TaskStatus.OPEN:
        task.status = TaskStatus.ASSIGNED

    db.commit()
    db.refresh(assignment)
    return assignment


@router.patch("/{assignment_id}", response_model=AssignmentResponse)
def update_assignment(
    assignment_id: str,
    updates: AssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Volunteers can only update their own assignments (accept/reject/complete)
    if current_user.role.value != "admin" and assignment.volunteer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(assignment, field, value)

    # If completed, set timestamp and update volunteer stats
    if updates.status == AssignmentStatus.COMPLETED:
        assignment.completed_at = datetime.utcnow()
        profile = db.query(VolunteerProfile).filter(
            VolunteerProfile.user_id == assignment.volunteer_id
        ).first()
        if profile:
            profile.total_tasks_completed += 1

        # Check if all assignments for the task are done
        task = db.query(Task).filter(Task.id == assignment.task_id).first()
        if task:
            task.status = TaskStatus.COMPLETED

    db.commit()
    db.refresh(assignment)
    return assignment
