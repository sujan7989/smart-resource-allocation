"""
Smart Matching Engine
Scores volunteers against tasks based on:
  - Skill match (40%)
  - Location match (30%)
  - Availability (20%)
  - Experience (10%)
Returns a score 0-100 for each volunteer-task pair.
"""
from typing import List, Tuple
from sqlalchemy.orm import Session
from src.models.user import User, UserRole
from src.models.volunteer import VolunteerProfile
from src.models.task import Task, TaskStatus
from src.models.assignment import Assignment


URGENCY_WEIGHTS = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
}


def compute_urgency_score(affected_people: int, urgency: str) -> float:
    """Compute a numeric urgency score for a community need."""
    base = URGENCY_WEIGHTS.get(urgency, 1)
    people_factor = min(affected_people / 100, 10)  # cap at 10x
    return round(base * (1 + people_factor), 2)


def skill_match_score(volunteer_skills: str, required_skills: str) -> int:
    """Return 0-100 based on how many required skills the volunteer has."""
    if not required_skills:
        return 100  # no specific skills needed — anyone qualifies
    if not volunteer_skills:
        return 0

    v_skills = {s.strip().lower() for s in volunteer_skills.split(",")}
    r_skills = {s.strip().lower() for s in required_skills.split(",")}

    if not r_skills:
        return 100

    matched = v_skills.intersection(r_skills)
    return int((len(matched) / len(r_skills)) * 100)


def location_match_score(volunteer_location: str, task_city: str, preferred_areas: str) -> int:
    """Return 0-100 based on location proximity."""
    if not volunteer_location and not preferred_areas:
        return 50  # neutral

    task_city_lower = task_city.lower()

    # Check preferred areas first
    if preferred_areas:
        areas = [a.strip().lower() for a in preferred_areas.split(",")]
        if task_city_lower in areas:
            return 100

    # Check volunteer's base location
    if volunteer_location and task_city_lower in volunteer_location.lower():
        return 90

    return 30  # different location but still possible


def experience_score(experience_years: int) -> int:
    """Return 0-100 based on experience."""
    if experience_years >= 5:
        return 100
    elif experience_years >= 3:
        return 75
    elif experience_years >= 1:
        return 50
    else:
        return 25


def compute_match_score(
    volunteer: User,
    profile: VolunteerProfile,
    task: Task
) -> int:
    """Compute overall match score (0-100) for a volunteer-task pair."""
    if not profile or not profile.is_available:
        return 0

    skill_score = skill_match_score(profile.skills or "", task.required_skills or "")
    loc_score = location_match_score(
        volunteer.location or "",
        task.city,
        profile.preferred_areas or ""
    )
    exp_score = experience_score(profile.experience_years or 0)
    avail_score = 100 if profile.is_available else 0

    # Weighted average
    total = (
        skill_score * 0.40 +
        loc_score * 0.30 +
        avail_score * 0.20 +
        exp_score * 0.10
    )
    return int(total)


def get_top_volunteers_for_task(
    task: Task,
    db: Session,
    limit: int = 10
) -> List[Tuple[User, VolunteerProfile, int]]:
    """Return top N volunteers for a task, sorted by match score descending."""
    # Get all available volunteers not already assigned to this task
    assigned_ids = {a.volunteer_id for a in db.query(Assignment).filter(
        Assignment.task_id == task.id
    ).all()}

    volunteers = db.query(User).filter(
        User.role == UserRole.VOLUNTEER,
        User.is_active == True,
        ~User.id.in_(assigned_ids)
    ).all()

    scored = []
    for vol in volunteers:
        profile = db.query(VolunteerProfile).filter(
            VolunteerProfile.user_id == vol.id
        ).first()
        score = compute_match_score(vol, profile, task)
        if score > 0:
            scored.append((vol, profile, score))

    scored.sort(key=lambda x: x[2], reverse=True)
    return scored[:limit]


def get_recommended_tasks_for_volunteer(
    volunteer: User,
    db: Session,
    limit: int = 10
) -> List[Tuple[Task, int]]:
    """Return top N tasks recommended for a volunteer, sorted by match score."""
    profile = db.query(VolunteerProfile).filter(
        VolunteerProfile.user_id == volunteer.id
    ).first()

    if not profile or not profile.is_available:
        return []

    open_tasks = db.query(Task).filter(Task.status == TaskStatus.OPEN).all()

    scored = []
    for task in open_tasks:
        score = compute_match_score(volunteer, profile, task)
        if score > 0:
            scored.append((task, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:limit]
