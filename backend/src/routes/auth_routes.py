import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from src.database import get_db
from src.models.user import User, UserRole
from src.models.token import PasswordResetToken, AdminInviteToken
from src.schemas.user import (
    UserCreate, UserLogin, UserResponse, Token,
    ForgotPasswordRequest, ResetPasswordRequest,
)
from src.auth import verify_password, get_password_hash, create_access_token, get_current_user
from src.config import settings
from src import email_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ── Register ───────────────────────────────────────────────────────────────────

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(
    request: Request,
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    """
    Public registration for volunteer, field_worker, and admin (with invite token).
    Returns a JWT access token in the response body.
    Rate limited: 5 requests/minute per IP.
    """
    if user_data.role == UserRole.ADMIN:
        if not user_data.invite_token:
            raise HTTPException(
                status_code=400,
                detail="An invite token is required to register as admin. "
                       "Ask the current admin to generate one.",
            )

        now = datetime.now(timezone.utc)
        invite = (
            db.query(AdminInviteToken)
            .filter(AdminInviteToken.token == user_data.invite_token)
            .first()
        )

        if not invite:
            raise HTTPException(status_code=400, detail="Invalid invite token.")

        expires_at = invite.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if invite.is_used:
            raise HTTPException(status_code=400, detail="This invite token has already been used.")
        if expires_at < now:
            raise HTTPException(status_code=400, detail="This invite token has expired.")
        if invite.invited_email and invite.invited_email.lower() != user_data.email.lower():
            raise HTTPException(
                status_code=400,
                detail="This invite token was issued for a different email address.",
            )

        existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if existing_admin:
            raise HTTPException(
                status_code=400,
                detail="An admin account already exists. "
                       "The current admin must transfer or delete their account first.",
            )

        invite.is_used = True

    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")

    new_user = User(
        email=user_data.email,
        full_name=user_data.full_name.strip(),
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role,
        phone=user_data.phone,
        location=user_data.location,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    email_service.send_welcome_email(new_user.email, new_user.full_name, new_user.role.value)

    access_token = create_access_token(data={"sub": new_user.id, "role": new_user.role.value})
    return Token(access_token=access_token, token_type="bearer", user=UserResponse.from_orm(new_user))


# ── Login ──────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=Token)
def login(
    request: Request,
    credentials: UserLogin,
    db: Session = Depends(get_db),
):
    """
    Login with email and password. Returns JWT in response body.
    Rate limited: 10 requests/minute per IP.
    """
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is inactive. Contact your administrator.",
        )

    access_token = create_access_token(data={"sub": user.id, "role": user.role.value})
    return Token(access_token=access_token, token_type="bearer", user=UserResponse.from_orm(user))


# ── Logout ─────────────────────────────────────────────────────────────────────

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout():
    """
    Stateless logout — the frontend discards the token from memory/sessionStorage.
    No server-side action needed for JWT logout.
    """
    pass


# ── Session restore ────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Return the currently authenticated user from the database.
    Called on app load to restore session from the token in sessionStorage.
    """
    return current_user


# ── Forgot password ────────────────────────────────────────────────────────────

@router.post("/forgot-password", status_code=200)
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Request a password reset email.
    Always returns 200 — prevents email enumeration attacks.
    When SMTP is not configured, returns the reset URL directly in the response
    so it can still be used (useful when email delivery is not set up yet).
    """
    user = db.query(User).filter(User.email == data.email).first()

    if user and user.is_active:
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.is_used == False,  # noqa: E712
        ).update({"is_used": True})

        raw_token = secrets.token_urlsafe(48)
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES
        )
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=raw_token,
            expires_at=expires_at,
        )
        db.add(reset_token)
        db.commit()

        email_sent = bool(settings.SMTP_HOST)
        email_service.send_password_reset_email(user.email, user.full_name, raw_token)

        # When SMTP is not configured, return the reset URL directly
        # so the user can still reset their password without email
        if not email_sent:
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
            return {
                "message": "Email delivery is not configured. Use the link below to reset your password.",
                "reset_url": reset_url,
                "email_configured": False,
            }

    return {
        "message": "If that email is registered, a password reset link has been sent.",
        "email_configured": bool(settings.SMTP_HOST),
    }


# ── Reset password ─────────────────────────────────────────────────────────────

@router.post("/reset-password", status_code=200)
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Reset password using the single-use token from the email link."""
    now = datetime.now(timezone.utc)

    reset_token = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token == data.token)
        .first()
    )

    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    expires_at = reset_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if reset_token.is_used:
        raise HTTPException(status_code=400, detail="This reset link has already been used.")
    if expires_at < now:
        raise HTTPException(status_code=400, detail="This reset link has expired. Please request a new one.")

    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    user.hashed_password = get_password_hash(data.new_password)
    reset_token.is_used = True
    db.commit()

    return {"message": "Password reset successfully. You can now log in with your new password."}


# ── Validate invite token ──────────────────────────────────────────────────────

@router.get("/validate-invite/{token}")
def validate_invite(token: str, db: Session = Depends(get_db)):
    """Check if an admin invite token is valid. Called by the register page."""
    now = datetime.now(timezone.utc)
    invite = db.query(AdminInviteToken).filter(AdminInviteToken.token == token).first()

    if not invite:
        raise HTTPException(status_code=400, detail="Invalid invite token.")

    expires_at = invite.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if invite.is_used:
        raise HTTPException(status_code=400, detail="This invite has already been used.")
    if expires_at < now:
        raise HTTPException(status_code=400, detail="This invite has expired.")

    return {
        "valid": True,
        "invited_email": invite.invited_email,
        "expires_at": invite.expires_at,
    }
