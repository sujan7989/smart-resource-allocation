from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from src.database import get_db
from src.models.user import User
from src.schemas.user import UserCreate, UserLogin, Token, UserResponse
from src.auth import verify_password, get_password_hash, create_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(request: Request, user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Public registration. Only volunteer and field_worker roles are allowed.
    Admin accounts must be created by an existing admin via /api/users/.
    Rate limited: 5 requests/minute per IP (enforced by app.state.limiter in main.py).
    """
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

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

    access_token = create_access_token(data={"sub": new_user.id, "role": new_user.role.value})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.from_orm(new_user),
    )


@router.post("/login", response_model=Token)
def login(request: Request, credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Login with email and password. Returns a JWT access token.
    Rate limited: 10 requests/minute per IP (enforced by app.state.limiter in main.py).
    """
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive. Contact your administrator.")

    access_token = create_access_token(data={"sub": user.id, "role": user.role.value})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.from_orm(user),
    )
