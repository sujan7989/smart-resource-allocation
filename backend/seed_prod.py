"""
Production seed — only seeds if the database is empty.
Safe to run on every deploy.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.database import SessionLocal, Base, engine
from src.models.user import User, UserRole
from src.models.community_need import CommunityNeed, NeedCategory, UrgencyLevel, NeedStatus
from src.models.volunteer import VolunteerProfile
from src.models.task import Task, TaskStatus
from src.models.field_report import FieldReport
from src.auth import get_password_hash
from src.matching_engine import compute_urgency_score

# Create all tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Only seed if no users exist
if db.query(User).count() > 0:
    print("Database already seeded. Skipping.")
    db.close()
    sys.exit(0)

print("Seeding production database with demo data...")

# Admin
admin = User(
    email="admin@smartalloc.org",
    full_name="Admin User",
    hashed_password=get_password_hash("Admin@123"),
    role=UserRole.ADMIN,
    location="Mumbai",
    phone="+91-9000000001"
)

v1 = User(
    email="priya@volunteer.org",
    full_name="Priya Sharma",
    hashed_password=get_password_hash("Volunteer@123"),
    role=UserRole.VOLUNTEER,
    location="Mumbai",
    phone="+91-9000000002"
)
v2 = User(
    email="rahul@volunteer.org",
    full_name="Rahul Verma",
    hashed_password=get_password_hash("Volunteer@123"),
    role=UserRole.VOLUNTEER,
    location="Delhi",
    phone="+91-9000000003"
)
fw1 = User(
    email="field@ngo.org",
    full_name="Suresh Kumar",
    hashed_password=get_password_hash("Field@123"),
    role=UserRole.FIELD_WORKER,
    location="Chennai",
    phone="+91-9000000005"
)

db.add_all([admin, v1, v2, fw1])
db.commit()

p1 = VolunteerProfile(
    user_id=v1.id,
    skills="medical,first aid,nursing",
    availability='{"days": ["Saturday", "Sunday"]}',
    preferred_areas="Mumbai,Pune",
    experience_years=3,
    bio="Trained nurse with 3 years of community health experience.",
    is_available=True
)
p2 = VolunteerProfile(
    user_id=v2.id,
    skills="teaching,education,mentoring",
    availability='{"days": ["Monday", "Wednesday", "Friday"]}',
    preferred_areas="Delhi,Noida",
    experience_years=5,
    bio="School teacher passionate about rural education.",
    is_available=True
)
db.add_all([p1, p2])
db.commit()

n1 = CommunityNeed(
    title="Emergency Medical Aid - Flood Victims",
    description="Flood-affected families in Dharavi need urgent medical attention.",
    category=NeedCategory.MEDICAL,
    urgency=UrgencyLevel.CRITICAL,
    status=NeedStatus.OPEN,
    area="Dharavi", city="Mumbai", state="Maharashtra", country="India",
    affected_people=500, reported_by_org="Mumbai Relief NGO", is_verified=True,
    urgency_score=compute_urgency_score(500, "critical")
)
n2 = CommunityNeed(
    title="Food Distribution - Migrant Workers",
    description="Migrant workers in Surat industrial area have not received food for 2 days.",
    category=NeedCategory.FOOD,
    urgency=UrgencyLevel.HIGH,
    status=NeedStatus.OPEN,
    area="Surat Industrial Zone", city="Surat", state="Gujarat", country="India",
    affected_people=200, reported_by_org="Gujarat Workers Union", is_verified=True,
    urgency_score=compute_urgency_score(200, "high")
)
n3 = CommunityNeed(
    title="Education Support - Slum Children",
    description="Children in Yamuna Pushta slum have no access to schooling.",
    category=NeedCategory.EDUCATION,
    urgency=UrgencyLevel.MEDIUM,
    status=NeedStatus.OPEN,
    area="Yamuna Pushta", city="Delhi", state="Delhi", country="India",
    affected_people=150, reported_by_org="Delhi Education Trust", is_verified=True,
    urgency_score=compute_urgency_score(150, "medium")
)
db.add_all([n1, n2, n3])
db.commit()

t1 = Task(
    community_need_id=n1.id,
    title="Medical Camp Setup - Dharavi",
    description="Set up and run a medical camp for flood victims.",
    required_skills="medical,first aid,nursing",
    required_volunteers=5, status=TaskStatus.OPEN,
    area="Dharavi", city="Mumbai"
)
t2 = Task(
    community_need_id=n2.id,
    title="Food Packet Distribution - Surat",
    description="Distribute 500 food packets to migrant workers.",
    required_skills="food distribution,logistics",
    required_volunteers=3, status=TaskStatus.OPEN,
    area="Surat Industrial Zone", city="Surat"
)
db.add_all([t1, t2])
db.commit()

print("✅ Production seed complete!")
db.close()
