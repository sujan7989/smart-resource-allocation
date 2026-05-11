from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from src.models.field_report import ReportStatus


class FieldReportCreate(BaseModel):
    title: str
    description: str
    area: str
    city: str
    country: str = "India"
    estimated_affected: int = 0
    urgency_observation: Optional[str] = None


class FieldReportUpdate(BaseModel):
    status: Optional[ReportStatus] = None
    admin_notes: Optional[str] = None
    community_need_id: Optional[str] = None


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

    class Config:
        from_attributes = True
