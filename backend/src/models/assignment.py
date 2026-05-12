from sqlalchemy import Column, String, DateTime, Enum as SAEnum, Text, Integer, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from src.database import Base


class AssignmentStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COMPLETED = "completed"


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    volunteer_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(SAEnum(AssignmentStatus), nullable=False, default=AssignmentStatus.PENDING)
    match_score = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    assigned_at = Column(DateTime, server_default=func.now(), nullable=False)
    completed_at = Column(DateTime, nullable=True)
    feedback = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)  # 1-5 rating given by volunteer after completion

    # Relationships
    task = relationship("Task", back_populates="assignments")
    volunteer = relationship("User", back_populates="assignments")
