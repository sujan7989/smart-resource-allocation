"""
Seed script — populates the database with demo data.
Run: python seed.py
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

Base.metadata.create_all(bind=engine)
db = SessionLocal()


def seed():
    print("Seeding database...")

    # Admin
    admin = User(
        email="admin@smartalloc.org",
        full_name="Admin User",
        hashed_password=get_password_hash("Admin@123"),
        role=UserRole.ADMIN,
        location="Mumbai",
        phone="+91-9000000001"
    )

    # Volunteers
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
    v3 = User(
        email="anita@volunteer.org",
        full_name="Anita Patel",
        hashed_password=get_password_hash("Volunteer@123"),
        role=UserRole.VOLUNTEER,
        location="Ahmedabad",
        phone="+91-9000000004"
    )

    # Field Worker
    fw1 = User(
        email="field@ngo.org",
        full_name="Suresh Kumar",
        hashed_password=get_password_hash("Field@123"),
        role=UserRole.FIELD_WORKER,
        location="Chennai",
        phone="+91-9000000005"
    )

    db.add_all([admin, v1, v2, v3, fw1])
    db.commit()

    # Volunteer profiles
    p1 = VolunteerProfile(
        user_id=v1.id,
        skills="medical,first aid,nursing",
        availability='{"days": ["Saturday", "Sunday"], "hours": "9am-5pm"}',
        preferred_areas="Mumbai,Pune",
        experience_years=3,
        bio="Trained nurse with 3 years of community health experience.",
        is_available=True
    )
    p2 = VolunteerProfile(
        user_id=v2.id,
        skills="teaching,education,mentoring",
        availability='{"days": ["Monday", "Wednesday", "Friday"], "hours": "4pm-8pm"}',
        preferred_areas="Delhi,Noida",
        experience_years=5,
        bio="School teacher passionate about rural education.",
        is_available=True
    )
    p3 = VolunteerProfile(
        user_id=v3.id,
        skills="food distribution,logistics,driving",
        availability='{"days": ["Saturday", "Sunday"], "hours": "8am-6pm"}',
        preferred_areas="Ahmedabad,Surat",
        experience_years=2,
        bio="Logistics coordinator for food relief programs.",
        is_available=True
    )
    db.add_all([p1, p2, p3])
    db.commit()

    # Community Needs
    n1 = CommunityNeed(
        title="Emergency Medical Aid - Flood Victims",
        description="Flood-affected families in Dharavi need urgent medical attention. Many have skin infections and fever.",
        category=NeedCategory.MEDICAL,
        urgency=UrgencyLevel.CRITICAL,
        status=NeedStatus.OPEN,
        area="Dharavi",
        city="Mumbai",
        state="Maharashtra",
        country="India",
        affected_people=500,
        reported_by_org="Mumbai Relief NGO",
        is_verified=True,
        urgency_score=compute_urgency_score(500, "critical")
    )
    n2 = CommunityNeed(
        title="Food Distribution - Migrant Workers",
        description="Migrant workers in Surat industrial area have not received food for 2 days.",
        category=NeedCategory.FOOD,
        urgency=UrgencyLevel.HIGH,
        status=NeedStatus.OPEN,
        area="Surat Industrial Zone",
        city="Surat",
        state="Gujarat",
        country="India",
        affected_people=200,
        reported_by_org="Gujarat Workers Union",
        is_verified=True,
        urgency_score=compute_urgency_score(200, "high")
    )
    n3 = CommunityNeed(
        title="Education Support - Slum Children",
        description="Children in Yamuna Pushta slum have no access to schooling since school closure.",
        category=NeedCategory.EDUCATION,
        urgency=UrgencyLevel.MEDIUM,
        status=NeedStatus.OPEN,
        area="Yamuna Pushta",
        city="Delhi",
        state="Delhi",
        country="India",
        affected_people=150,
        reported_by_org="Delhi Education Trust",
        is_verified=True,
        urgency_score=compute_urgency_score(150, "medium")
    )
    n4 = CommunityNeed(
        title="Clean Water Access - Rural Village",
        description="Village of Rampur has contaminated water supply. Residents are falling ill.",
        category=NeedCategory.WATER,
        urgency=UrgencyLevel.HIGH,
        status=NeedStatus.OPEN,
        area="Rampur Village",
        city="Lucknow",
        state="Uttar Pradesh",
        country="India",
        affected_people=300,
        reported_by_org="UP Rural Development",
        is_verified=False,
        urgency_score=compute_urgency_score(300, "high")
    )
    db.add_all([n1, n2, n3, n4])
    db.commit()

    # Tasks
    t1 = Task(
        community_need_id=n1.id,
        title="Medical Camp Setup - Dharavi",
        description="Set up and run a medical camp for flood victims. Provide first aid and basic medication.",
        required_skills="medical,first aid,nursing",
        required_volunteers=5,
        status=TaskStatus.OPEN,
        area="Dharavi",
        city="Mumbai"
    )
    t2 = Task(
        community_need_id=n2.id,
        title="Food Packet Distribution - Surat",
        description="Distribute 500 food packets to migrant workers in the industrial zone.",
        required_skills="food distribution,logistics",
        required_volunteers=3,
        status=TaskStatus.OPEN,
        area="Surat Industrial Zone",
        city="Surat"
    )
    t3 = Task(
        community_need_id=n3.id,
        title="After-School Tutoring - Delhi",
        description="Provide daily tutoring sessions for 50 children aged 8-14.",
        required_skills="teaching,education",
        required_volunteers=4,
        status=TaskStatus.OPEN,
        area="Yamuna Pushta",
        city="Delhi"
    )
    db.add_all([t1, t2, t3])
    db.commit()

    # Field Report
    fr1 = FieldReport(
        submitted_by_id=fw1.id,
        title="Elderly Isolation - Chennai Suburb",
        description="Visited 3 streets in Tambaram. Found 40+ elderly residents living alone with no support.",
        area="Tambaram",
        city="Chennai",
        country="India",
        estimated_affected=45,
        urgency_observation="High — several have no food or medicine access"
    )
    db.add(fr1)
    db.commit()

    print("✅ Seed complete!")
    print("\nDemo accounts:")
    print("  Admin:        admin@smartalloc.org  / Admin@123")
    print("  Volunteer 1:  priya@volunteer.org   / Volunteer@123")
    print("  Volunteer 2:  rahul@volunteer.org   / Volunteer@123")
    print("  Field Worker: field@ngo.org         / Field@123")


if __name__ == "__main__":
    seed()
    db.close()
