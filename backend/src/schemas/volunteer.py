from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class VolunteerProfileCreate(BaseModel):
    skills: Optional[str] = None
    availability: Optional[str] = None
    preferred_areas: Optional[str] = None
    experience_years: int = 0
    bio: Optional[str] = None
    is_available: bool = True


class VolunteerProfileUpdate(BaseModel):
    skills: Optional[str] = None
    availability: Optional[str] = None
    preferred_areas: Optional[str] = None
    experience_years: Optional[int] = None
    bio: Optional[str] = None
    is_available: Optional[bool] = None


class VolunteerProfileResponse(BaseModel):
    id: str
    user_id: str
    skills: Optional[str] = None
    availability: Optional[str] = None
    preferred_areas: Optional[str] = None
    experience_years: int
    bio: Optional[str] = None
    is_available: bool
    total_tasks_completed: int
    rating: int
    created_at: datetime

    class Config:
        from_attributes = True


class VolunteerWithUser(BaseModel):
    id: str
    email: str
    full_name: str
    location: Optional[str] = None
    phone: Optional[str] = None
    profile: Optional[VolunteerProfileResponse] = None

    class Config:
        from_attributes = True
