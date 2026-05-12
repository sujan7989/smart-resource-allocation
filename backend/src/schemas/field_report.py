from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from src.models.field_report import ReportStatus
from src.models.community_need import NeedCategory, UrgencyLevel


class FieldReportCreate(BaseModel):
    title: str
    description: str
    area: str
    city: str
    country: str = ""
    estimated_affected: int = 0
    urgency_observation: Optional[str] = None

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

    @field_validator("estimated_affected")
    @classmethod
    def validate_affected(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Estimated affected people cannot be negative")
        return v


class FieldReportUpdate(BaseModel):
    status: Optional[ReportStatus] = None
    admin_notes: Optional[str] = None
    community_need_id: Optional[str] = None


class FieldReportConvert(BaseModel):
    """Payload for converting a field report into a Community Need."""
    category: NeedCategory
    urgency: UrgencyLevel
    title: Optional[str] = None          # override report title if needed
    description: Optional[str] = None    # override report description if needed
    affected_people: Optional[int] = None
    reported_by_org: Optional[str] = None
    admin_notes: Optional[str] = None


class FieldReportResponse(BaseModel):
    id: str
    submitted_by_id: str
    community_need_id: Optional[str] = None
    title: str
    description: str
    area: str
    city: str
    country: str
    estimated_affected: int
    urgency_observation: Optional[str] = None
    status: ReportStatus
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
