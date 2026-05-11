from pydantic import BaseModel
from typing import Optional, List
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
    country: str = "India"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    affected_people: int = 0
    reported_by_org: Optional[str] = None


class CommunityNeedUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[NeedCategory] = None
    urgency: Optional[UrgencyLevel] = None
    status: Optional[NeedStatus] = None
    affected_people: Optional[int] = None
    is_verified: Optional[bool] = None


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

    class Config:
        from_attributes = True
