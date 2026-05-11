"""
Production seed — only creates the admin account if database is empty.
NO fake/sample data. Real users will enter real data.
Safe to run on every deploy.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.database import SessionLocal, Base, engine
from src.models.user import User, UserRole
from src.auth import get_password_hash

# Create all tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Only seed if no users exist
if db.query(User).count() > 0:
    print("Database already has users. Skipping seed.")
    db.close()
    sys.exit(0)

print("Creating admin account...")

admin = User(
    email="admin@smartalloc.org",
    full_name="Admin",
    hashed_password=get_password_hash("Admin@123"),
    role=UserRole.ADMIN,
)
db.add(admin)
db.commit()

print("✅ Admin account created.")
print("   Email:    admin@smartalloc.org")
print("   Password: Admin@123")
print("   All other data will be entered by real users.")
db.close()
