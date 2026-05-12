from pydantic import BaseModel, field_validator
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
    hours_spent: Optional[int] = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 5):
            raise ValueError("Rating must be between 1 and 5")
        return v

    @field_validator("hours_spent")
    @classmethod
    def validate_hours(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("Hours spent cannot be negative")
        if v is not None and v > 720:
            raise ValueError("Hours spent cannot exceed 720 (30 days)")
        return v


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
    hours_spent: Optional[int] = None

    class Config:
        from_attributes = True


class AssignmentDetail(BaseModel):
    """Extended assignment response with denormalized task and volunteer info."""
    id: str
    task_id: str
    volunteer_id: str
    status: str
    match_score: int
    notes: Optional[str] = None
    assigned_at: datetime
    completed_at: Optional[datetime] = None
    feedback: Optional[str] = None
    rating: Optional[int] = None
    hours_spent: Optional[int] = None
    task_title: Optional[str] = None
    task_city: Optional[str] = None
    volunteer_name: Optional[str] = None
    volunteer_email: Optional[str] = None

    class Config:
        from_attributes = True
