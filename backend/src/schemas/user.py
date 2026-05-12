from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional
from datetime import datetime
from src.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    # Public registration is restricted to non-admin roles only.
    # Admins are created by existing admins via /api/users/ (AdminCreateUser).
    role: UserRole = UserRole.VOLUNTEER
    phone: Optional[str] = None
    location: Optional[str] = None

    @field_validator("role")
    @classmethod
    def block_admin_self_registration(cls, v: UserRole) -> UserRole:
        if v == UserRole.ADMIN:
            raise ValueError("Admin accounts cannot be self-registered. Contact your administrator.")
        return v

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters")
        if len(v) > 100:
            raise ValueError("Full name must be at most 100 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    phone: Optional[str] = None
    location: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) < 2:
                raise ValueError("Full name must be at least 2 characters")
            if len(v) > 100:
                raise ValueError("Full name must be at most 100 characters")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 20:
            raise ValueError("Phone number too long")
        return v

    @field_validator("location")
    @classmethod
    def validate_location(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 100:
            raise ValueError("Location too long")
        return v


class PasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class AdminCreateUser(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: UserRole
    phone: Optional[str] = None
    location: Optional[str] = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class AdminUpdateUser(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    phone: Optional[str] = None
    location: Optional[str] = None


class AdminResetPassword(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
