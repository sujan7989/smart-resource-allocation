from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from src.database import get_db
from src.models.field_report import FieldReport, ReportStatus
from src.models.community_need import CommunityNeed, NeedCategory, UrgencyLevel, NeedStatus
from src.models.user import User
from src.schemas.field_report import (
    FieldReportCreate,
    FieldReportUpdate,
    FieldReportResponse,
    FieldReportConvert,
)
from src.auth import get_current_user, require_admin
from src.matching_engine import compute_urgency_score

router = APIRouter(prefix="/api/field-reports", tags=["Field Reports"])


@router.get("/", response_model=List[FieldReportResponse])
def list_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.value == "admin":
        return (
            db.query(FieldReport)
            .order_by(FieldReport.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    # Non-admins see only their own reports
    return (
        db.query(FieldReport)
        .filter(FieldReport.submitted_by_id == current_user.id)
        .order_by(FieldReport.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/", response_model=FieldReportResponse, status_code=201)
def submit_report(
    report_data: FieldReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = FieldReport(
        submitted_by_id=current_user.id,
        **report_data.model_dump(),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/{report_id}", response_model=FieldReportResponse)
def get_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = db.query(FieldReport).filter(FieldReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if current_user.role.value != "admin" and report.submitted_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this report")
    return report


@router.patch("/{report_id}", response_model=FieldReportResponse)
def review_report(
    report_id: str,
    updates: FieldReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    report = db.query(FieldReport).filter(FieldReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(report, field, value)

    db.commit()
    db.refresh(report)
    return report


@router.post("/{report_id}/convert", response_model=FieldReportResponse, status_code=201)
def convert_report_to_need(
    report_id: str,
    data: FieldReportConvert,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Convert a field report into a Community Need.
    Creates a new CommunityNeed from the report data and links them.
    """
    report = db.query(FieldReport).filter(FieldReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.status == ReportStatus.CONVERTED:
        raise HTTPException(status_code=400, detail="Report has already been converted to a need")

    urgency_score = compute_urgency_score(
        data.affected_people or report.estimated_affected,
        data.urgency.value,
    )

    need = CommunityNeed(
        title=data.title or report.title,
        description=data.description or report.description,
        category=data.category,
        urgency=data.urgency,
        status=NeedStatus.OPEN,
        area=report.area,
        city=report.city,
        country=report.country,
        affected_people=data.affected_people or report.estimated_affected,
        urgency_score=urgency_score,
        reported_by_org=data.reported_by_org,
        is_verified=True,  # admin-converted reports are auto-verified
    )
    db.add(need)
    db.flush()  # get need.id before commit

    # Link report to the new need and mark as converted
    report.community_need_id = need.id
    report.status = ReportStatus.CONVERTED
    report.admin_notes = data.admin_notes or report.admin_notes

    db.commit()
    db.refresh(report)
    return report
