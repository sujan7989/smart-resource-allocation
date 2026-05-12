from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from src.models.community_need import NeedCategory, UrgencyLevel, NeedStatus


class CommunityNeedCreate(BaseModel):
    title: str
    description: str
    category: NeedCategory
    urgency: UrgencyLevel = UrgencyLevel.MEDIUM
    area: str
    city: str
    state: Optional[str] = None
    country: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    affected_people: int = 0
    reported_by_org: Optional[str] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 5:
            raise ValueError("Title must be at least 5 characters")
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

    @field_validator("affected_people")
    @classmethod
    def validate_affected(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Affected people cannot be negative")
        return v

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (-90 <= v <= 90):
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (-180 <= v <= 180):
            raise ValueError("Longitude must be between -180 and 180")
        return v


class CommunityNeedUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[NeedCategory] = None
    urgency: Optional[UrgencyLevel] = None
    status: Optional[NeedStatus] = None
    affected_people: Optional[int] = None
    is_verified: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    reported_by_org: Optional[str] = None


class CommunityNeedResponse(BaseModel):
    id: str
    title: str
    description: str
    category: NeedCategory
    urgency: UrgencyLevel
    status: NeedStatus
    area: str
    city: str
    state: Optional[str] = None
    country: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    affected_people: int
    urgency_score: float
    reported_by_org: Optional[str] = None
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
