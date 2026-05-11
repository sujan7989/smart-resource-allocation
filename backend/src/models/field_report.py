from sqlalchemy import Column, String, DateTime, Enum as SAEnum, Text, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from src.database import Base


class ReportStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    REVIEWED = "reviewed"
    CONVERTED = "converted"
    REJECTED = "rejected"


class FieldReport(Base):
    __tablename__ = "field_reports"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    submitted_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    community_need_id = Column(String, ForeignKey("community_needs.id"), nullable=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    area = Column(String, nullable=False)
    city = Column(String, nullable=False)
    country = Column(String, nullable=False, default="India")
    estimated_affected = Column(Integer, default=0)
    urgency_observation = Column(String, nullable=True)
    status = Column(SAEnum(ReportStatus), nullable=False, default=ReportStatus.SUBMITTED)
    admin_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    submitted_by = relationship("User", back_populates="field_reports")
    community_need = relationship("CommunityNeed", back_populates="field_reports")
