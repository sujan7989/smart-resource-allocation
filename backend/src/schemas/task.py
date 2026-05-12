from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from src.models.task import TaskStatus


class TaskCreate(BaseModel):
    community_need_id: str
    title: str
    description: str
    required_skills: Optional[str] = None
    required_volunteers: int = 1
    area: str
    city: str
    deadline: Optional[datetime] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Title must be at least 3 characters")
        if len(v) > 200:
            raise ValueError("Title must be at most 200 characters")
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 10:
            raise ValueError("Description must be at least 10 characters")
        return v

    @field_validator("required_volunteers")
    @classmethod
    def validate_volunteers(cls, v: int) -> int:
        if v < 1:
            raise ValueError("At least 1 volunteer is required")
        if v > 1000:
            raise ValueError("Cannot require more than 1000 volunteers per task")
        return v

    @field_validator("required_skills")
    @classmethod
    def validate_skills(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 500:
            raise ValueError("Skills string too long (max 500 characters)")
        return v


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[str] = None
    required_volunteers: Optional[int] = None
    status: Optional[TaskStatus] = None
    deadline: Optional[datetime] = None

    @field_validator("required_volunteers")
    @classmethod
    def validate_volunteers(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 1:
            raise ValueError("At least 1 volunteer is required")
        return v


class TaskResponse(BaseModel):
    id: str
    community_need_id: str
    title: str
    description: str
    required_skills: Optional[str] = None
    required_volunteers: int
    status: TaskStatus
    area: str
    city: str
    deadline: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
