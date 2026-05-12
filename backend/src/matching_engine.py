"""
Smart Matching Engine v2
Scores volunteers against tasks based on:
  - Skill match        (40%)
  - Location match     (30%)
  - Availability       (20%)  — now uses structured availability JSON
  - Experience         (10%)

Returns a score 0–100 for each volunteer–task pair.
"""
import json
from typing import List, Tuple, Optional
from datetime import datetime, timezone
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
    people_factor = min(affected_people / 100, 10)  # cap at 10×
    return round(base * (1 + people_factor), 2)


def skill_match_score(volunteer_skills: Optional[str], required_skills: Optional[str]) -> int:
    """Return 0–100 based on how many required skills the volunteer has."""
    if not required_skills or not required_skills.strip():
        return 100  # no specific skills needed — anyone qualifies

    if not volunteer_skills or not volunteer_skills.strip():
        return 0

    v_skills = {s.strip().lower() for s in volunteer_skills.split(",") if s.strip()}
    r_skills = {s.strip().lower() for s in required_skills.split(",") if s.strip()}

    if not r_skills:
        return 100

    matched = v_skills.intersection(r_skills)
    return int((len(matched) / len(r_skills)) * 100)


def location_match_score(
    volunteer_location: Optional[str],
    task_city: str,
    preferred_areas: Optional[str],
) -> int:
    """Return 0–100 based on location proximity."""
    task_city_lower = task_city.strip().lower()

    # Check preferred areas first (highest priority)
    if preferred_areas:
        areas = [a.strip().lower() for a in preferred_areas.split(",") if a.strip()]
        if task_city_lower in areas:
            return 100

    # Check volunteer's base location
    if volunteer_location:
        if task_city_lower in volunteer_location.strip().lower():
            return 90

    # If neither field is set, return neutral
    if not volunteer_location and not preferred_areas:
        return 50

    return 30  # different location but still possible


def availability_score(availability_json: Optional[str], task_deadline: Optional[datetime]) -> int:
    """
    Parse the structured availability JSON and return 0–100.
    Falls back to 100 if no structured data (assume available).
    """
    if not availability_json or not availability_json.strip():
        return 80  # no structured data — assume mostly available

    try:
        data = json.loads(availability_json)
    except (json.JSONDecodeError, ValueError):
        return 80  # malformed JSON — assume available

    score = 100

    # Check day availability if task has a deadline
    if task_deadline and "days" in data:
        available_days = [d.strip().lower() for d in data.get("days", [])]
        if available_days:
            # Get the day of week for the deadline
            deadline_day = task_deadline.strftime("%A").lower()
            if deadline_day not in available_days:
                score -= 40  # penalise if deadline falls on unavailable day

    # Bonus for full-week availability
    if "days" in data:
        available_days = data.get("days", [])
        if len(available_days) >= 5:
            score = min(score + 10, 100)

    return max(score, 0)


def experience_score(experience_years: int) -> int:
    """Return 0–100 based on experience."""
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
    profile: Optional[VolunteerProfile],
    task: Task,
) -> int:
    """Compute overall match score (0–100) for a volunteer–task pair."""
    if not profile or not profile.is_available:
        return 0

    s_score = skill_match_score(profile.skills, task.required_skills)
    l_score = location_match_score(volunteer.location, task.city, profile.preferred_areas)
    a_score = availability_score(profile.availability, task.deadline)
    e_score = experience_score(profile.experience_years or 0)

    # Weighted average: skill 40%, location 30%, availability 20%, experience 10%
    total = (
        s_score * 0.40
        + l_score * 0.30
        + a_score * 0.20
        + e_score * 0.10
    )
    return int(total)


def get_top_volunteers_for_task(
    task: Task,
    db: Session,
    limit: int = 10,
) -> List[Tuple[User, VolunteerProfile, int]]:
    """Return top N volunteers for a task, sorted by match score descending."""
    from src.models.assignment import AssignmentStatus

    # Exclude volunteers already actively assigned to this task
    active_volunteer_ids = {
        a.volunteer_id
        for a in db.query(Assignment).filter(
            Assignment.task_id == task.id,
            Assignment.status.in_([AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED]),
        ).all()
    }

    volunteers = (
        db.query(User)
        .filter(
            User.role == UserRole.VOLUNTEER,
            User.is_active == True,
            ~User.id.in_(active_volunteer_ids),
        )
        .all()
    )

    scored: List[Tuple[User, VolunteerProfile, int]] = []
    for vol in volunteers:
        profile = (
            db.query(VolunteerProfile)
            .filter(VolunteerProfile.user_id == vol.id)
            .first()
        )
        score = compute_match_score(vol, profile, task)
        if score > 0:
            scored.append((vol, profile, score))

    scored.sort(key=lambda x: x[2], reverse=True)
    return scored[:limit]


def get_recommended_tasks_for_volunteer(
    volunteer: User,
    db: Session,
    limit: int = 10,
) -> List[Tuple[Task, int]]:
    """Return top N tasks recommended for a volunteer, sorted by match score."""
    profile = (
        db.query(VolunteerProfile)
        .filter(VolunteerProfile.user_id == volunteer.id)
        .first()
    )

    if not profile or not profile.is_available:
        return []

    # Exclude tasks the volunteer is already assigned to (pending or accepted)
    from src.models.assignment import AssignmentStatus
    assigned_task_ids = {
        a.task_id
        for a in db.query(Assignment).filter(
            Assignment.volunteer_id == volunteer.id,
            Assignment.status.in_([AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED]),
        ).all()
    }

    open_tasks = (
        db.query(Task)
        .filter(
            Task.status == TaskStatus.OPEN,
            ~Task.id.in_(assigned_task_ids),
        )
        .all()
    )

    scored: List[Tuple[Task, int]] = []
    for task in open_tasks:
        score = compute_match_score(volunteer, profile, task)
        if score > 0:
            scored.append((task, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:limit]
