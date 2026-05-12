from sqlalchemy import Column, String, Integer, Float, DateTime, Enum as SAEnum, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from src.database import Base


class NeedCategory(str, enum.Enum):
    FOOD = "food"
    MEDICAL = "medical"
    EDUCATION = "education"
    SHELTER = "shelter"
    WATER = "water"
    SANITATION = "sanitation"
    MENTAL_HEALTH = "mental_health"
    ELDERLY_CARE = "elderly_care"
    CHILD_CARE = "child_care"
    DISASTER_RELIEF = "disaster_relief"
    OTHER = "other"


class UrgencyLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class NeedStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class CommunityNeed(Base):
    __tablename__ = "community_needs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(SAEnum(NeedCategory), nullable=False)
    urgency = Column(SAEnum(UrgencyLevel), nullable=False, default=UrgencyLevel.MEDIUM)
    status = Column(SAEnum(NeedStatus), nullable=False, default=NeedStatus.OPEN)

    # Location
    area = Column(String, nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=True)
    country = Column(String, nullable=False, default="")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Impact
    affected_people = Column(Integer, default=0)
    urgency_score = Column(Float, default=0.0)

    # Meta
    reported_by_org = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    tasks = relationship("Task", back_populates="community_need", cascade="all, delete-orphan")
    field_reports = relationship("FieldReport", back_populates="community_need")
