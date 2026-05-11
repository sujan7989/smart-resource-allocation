from pydantic import BaseModel
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


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[str] = None
    required_volunteers: Optional[int] = None
    status: Optional[TaskStatus] = None
    deadline: Optional[datetime] = None


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

    class Config:
        from_attributes = True
