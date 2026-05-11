from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from src.database import get_db
from src.models.field_report import FieldReport, ReportStatus
from src.models.user import User
from src.schemas.field_report import FieldReportCreate, FieldReportUpdate, FieldReportResponse
from src.auth import get_current_user, require_admin

router = APIRouter(prefix="/api/field-reports", tags=["Field Reports"])


@router.get("/", response_model=List[FieldReportResponse])
def list_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value == "admin":
        return db.query(FieldReport).order_by(FieldReport.created_at.desc()).all()
    # Field workers see only their own reports
    return db.query(FieldReport).filter(
        FieldReport.submitted_by_id == current_user.id
    ).order_by(FieldReport.created_at.desc()).all()


@router.post("/", response_model=FieldReportResponse, status_code=201)
def submit_report(
    report_data: FieldReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = FieldReport(
        submitted_by_id=current_user.id,
        **report_data.model_dump()
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/{report_id}", response_model=FieldReportResponse)
def get_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = db.query(FieldReport).filter(FieldReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if current_user.role.value != "admin" and report.submitted_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return report


@router.patch("/{report_id}", response_model=FieldReportResponse)
def review_report(
    report_id: str,
    updates: FieldReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    report = db.query(FieldReport).filter(FieldReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(report, field, value)

    db.commit()
    db.refresh(report)
    return report
