from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from src.config import settings

is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# SQLite needs check_same_thread=False; PostgreSQL benefits from pool config
if is_sqlite:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_pre_ping=True,       # verify connections before use
        pool_recycle=300,         # recycle connections every 5 minutes
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> bool:
    """Return True if the database is reachable."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
