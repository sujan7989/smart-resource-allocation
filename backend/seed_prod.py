"""
Production seed — only creates the admin account if database is empty.
NO fake/sample data. Real users will enter real data.
Safe to run on every deploy.

Admin credentials are read from environment variables:
  ADMIN_EMAIL     (default: admin@smartalloc.org)
  ADMIN_PASSWORD  (REQUIRED in production — set this in your env)
  ADMIN_FULL_NAME (default: Platform Admin)
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.database import SessionLocal, Base, engine
from src.models.user import User, UserRole
from src.auth import get_password_hash
from src.config import settings

# Create all tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Only seed if no admin exists
if db.query(User).filter(User.role == UserRole.ADMIN).count() > 0:
    print("Admin account already exists. Skipping seed.")
    db.close()
    sys.exit(0)

admin_email = settings.ADMIN_EMAIL
admin_password = settings.ADMIN_PASSWORD
admin_name = settings.ADMIN_FULL_NAME

if admin_password == "Admin@123":
    cloud_env = os.getenv("RENDER") or os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("DYNO") or os.getenv("FLY_APP_NAME")
    if cloud_env:
        print("⚠️  WARNING: Using default admin password in production. Set ADMIN_PASSWORD env var immediately.")

# Validate password meets policy
if len(admin_password) < 8 or not any(c.isupper() for c in admin_password) or not any(c.isdigit() for c in admin_password):
    print("⚠️  WARNING: Admin password does not meet security policy (8+ chars, 1 uppercase, 1 digit).")

print(f"Creating admin account: {admin_email}")

admin = User(
    email=admin_email,
    full_name=admin_name,
    hashed_password=get_password_hash(admin_password),
    role=UserRole.ADMIN,
)
db.add(admin)
db.commit()

print("✅ Admin account created.")
print(f"   Email: {admin_email}")
print("   Password: [set via ADMIN_PASSWORD env var]")
print("   All other data will be entered by real users.")
db.close()
