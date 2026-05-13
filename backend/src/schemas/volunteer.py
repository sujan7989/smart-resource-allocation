import json
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


def _validate_availability_json(v: Optional[str]) -> Optional[str]:
    """Shared validator: ensure availability is valid JSON if provided."""
    if v is not None and v.strip():
        try:
            json.loads(v)
        except (json.JSONDecodeError, ValueError):
            raise ValueError(
                'Availability must be valid JSON, e.g. {"days":["Saturday","Sunday"],"hours":"9am-5pm"}'
            )
    return v


class VolunteerProfileCreate(BaseModel):
    skills: Optional[str] = None
    availability: Optional[str] = None
    preferred_areas: Optional[str] = None
    experience_years: int = 0
    bio: Optional[str] = None
    is_available: bool = True

    @field_validator("experience_years")
    @classmethod
    def validate_experience(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Experience years cannot be negative")
        if v > 60:
            raise ValueError("Experience years cannot exceed 60")
        return v

    @field_validator("skills")
    @classmethod
    def validate_skills(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 500:
            raise ValueError("Skills string too long (max 500 characters)")
        return v

    @field_validator("availability")
    @classmethod
    def validate_availability(cls, v: Optional[str]) -> Optional[str]:
        return _validate_availability_json(v)

    @field_validator("bio")
    @classmethod
    def validate_bio(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 1000:
            raise ValueError("Bio must be at most 1000 characters")
        return v


class VolunteerProfileUpdate(BaseModel):
    skills: Optional[str] = None
    availability: Optional[str] = None
    preferred_areas: Optional[str] = None
    experience_years: Optional[int] = None
    bio: Optional[str] = None
    is_available: Optional[bool] = None

    @field_validator("experience_years")
    @classmethod
    def validate_experience(cls, v: Optional[int]) -> Optional[int]:
        if v is not None:
            if v < 0:
                raise ValueError("Experience years cannot be negative")
            if v > 60:
                raise ValueError("Experience years cannot exceed 60")
        return v

    @field_validator("skills")
    @classmethod
    def validate_skills(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 500:
            raise ValueError("Skills string too long (max 500 characters)")
        return v

    @field_validator("availability")
    @classmethod
    def validate_availability(cls, v: Optional[str]) -> Optional[str]:
        return _validate_availability_json(v)

    @field_validator("bio")
    @classmethod
    def validate_bio(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 1000:
            raise ValueError("Bio must be at most 1000 characters")
        return v


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
    total_hours_contributed: int = 0   # default 0 for rows created before this column existed
    rating: float = 0.0                # default 0.0 for rows created before float migration
    created_at: datetime
    updated_at: Optional[datetime] = None  # nullable for rows created before this column existed

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
