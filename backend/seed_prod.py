"""
Production seed — creates the admin account ONLY if no admin exists.

- NO fake or demo data is created.
- Real users, needs, tasks, and reports are entered by your team.
- Safe to run on every deploy (skips if admin already exists).

Admin credentials come from environment variables:
  ADMIN_EMAIL     (default: admin@smartalloc.org)
  ADMIN_PASSWORD  (set this in Render/Railway env — do NOT use the default)
  ADMIN_FULL_NAME (default: Platform Admin)
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.database import SessionLocal, Base, engine
from src.models.user import User, UserRole
from src.auth import get_password_hash
from src.config import settings

# Create all tables (safe — does nothing if tables already exist)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Skip if admin already exists
if db.query(User).filter(User.role == UserRole.ADMIN).count() > 0:
    print("✅ Admin account already exists. Skipping seed.")
    db.close()
    sys.exit(0)

admin_email    = settings.ADMIN_EMAIL
admin_password = settings.ADMIN_PASSWORD
admin_name     = settings.ADMIN_FULL_NAME

# Warn if using default password on any cloud platform
is_cloud = any(os.getenv(k) for k in ["RENDER", "RAILWAY_ENVIRONMENT", "DYNO", "FLY_APP_NAME"])
if admin_password == "Admin@123" and is_cloud:
    print("⚠️  WARNING: Using default admin password in production!")
    print("   Set ADMIN_PASSWORD environment variable immediately.")

# Warn if password doesn't meet policy
if (len(admin_password) < 8
        or not any(c.isupper() for c in admin_password)
        or not any(c.isdigit() for c in admin_password)):
    print("⚠️  WARNING: Admin password does not meet security policy.")
    print("   Requires: 8+ characters, 1 uppercase letter, 1 digit.")

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
print(f"   Email:    {admin_email}")
print("   Password: [from ADMIN_PASSWORD env var]")
print()
print("Next steps:")
print("  1. Log in at your frontend URL")
print("  2. Go to User Management → Add your team members")
print("  3. Go to Community Needs → Add real needs from your area")
print("  4. Go to Tasks → Create tasks linked to those needs")
db.close()
