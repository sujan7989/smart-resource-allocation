from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from src.models.assignment import AssignmentStatus


class AssignmentCreate(BaseModel):
    task_id: str
    volunteer_id: str
    notes: Optional[str] = None


class AssignmentUpdate(BaseModel):
    status: Optional[AssignmentStatus] = None
    notes: Optional[str] = None
    feedback: Optional[str] = None
    rating: Optional[int] = None


class AssignmentResponse(BaseModel):
    id: str
    task_id: str
    volunteer_id: str
    status: AssignmentStatus
    match_score: int
    notes: Optional[str] = None
    assigned_at: datetime
    completed_at: Optional[datetime] = None
    feedback: Optional[str] = None
    rating: Optional[int] = None

    class Config:
        from_attributes = True
