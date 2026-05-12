from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from src.database import Base


class VolunteerProfile(Base):
    __tablename__ = "volunteer_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    skills = Column(Text, nullable=True)           # comma-separated: "medical,first aid"
    availability = Column(Text, nullable=True)     # JSON string: {"days":["Mon"],"hours":"9am-5pm"}
    preferred_areas = Column(Text, nullable=True)  # comma-separated: "Mumbai,Pune"
    experience_years = Column(Integer, default=0)
    bio = Column(Text, nullable=True)
    is_available = Column(Boolean, default=True)
    total_tasks_completed = Column(Integer, default=0)
    total_hours_contributed = Column(Integer, default=0)  # cumulative volunteer hours
    rating = Column(Integer, default=0)            # 0-5 average rating
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="volunteer_profile")
