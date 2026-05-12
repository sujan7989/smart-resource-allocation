from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from src.database import get_db
from src.models.user import User, UserRole
from src.schemas.user import UserResponse, UserUpdate, PasswordChange, AdminCreateUser, AdminUpdateUser, AdminResetPassword
from src.auth import get_current_user, get_password_hash, verify_password, require_admin

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(
    updates: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Any user can update their own name, phone, location."""
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/change-password")
def change_password(
    data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Any user can change their own password (requires current password)."""
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


# ── Admin user management ──────────────────────────────────────────────────────

@router.get("/", response_model=List[UserResponse])
def list_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin: list all users."""
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("/", response_model=UserResponse, status_code=201)
def admin_create_user(
    data: AdminCreateUser,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Admin: create any user (admin, volunteer, field_worker).
    Only one admin account is allowed at a time.
    To add a second admin, the existing admin must first demote themselves or delete the current admin.
    """
    # Enforce single-admin rule
    if data.role == UserRole.ADMIN:
        existing_admin_count = db.query(User).filter(User.role == UserRole.ADMIN).count()
        if existing_admin_count >= 1:
            raise HTTPException(
                status_code=400,
                detail="Only one admin account is allowed. Demote or delete the current admin first.",
            )

    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        email=data.email,
        full_name=data.full_name.strip(),
        hashed_password=get_password_hash(data.password),
        role=data.role,
        phone=data.phone,
        location=data.location,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.patch("/{user_id}", response_model=UserResponse)
def admin_update_user(
    user_id: str,
    updates: AdminUpdateUser,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin: update any user's role, status, name."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent admin from deactivating themselves
    if user.id == current_user.id and updates.is_active is False:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    # Enforce single-admin rule when promoting someone to admin
    if updates.role == UserRole.ADMIN and user.role != UserRole.ADMIN:
        existing_admin_count = db.query(User).filter(User.role == UserRole.ADMIN).count()
        if existing_admin_count >= 1:
            raise HTTPException(
                status_code=400,
                detail="Only one admin account is allowed. Demote the current admin first.",
            )

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/reset-password")
def admin_reset_password(
    user_id: str,
    data: AdminResetPassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin: reset any user's password without knowing the current one."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return {"message": f"Password reset for {user.full_name}"}


@router.delete("/{user_id}", status_code=204)
def admin_delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin: delete a user. Cannot delete yourself."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
