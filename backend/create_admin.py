#!/usr/bin/env python3
"""
Quick admin user creation script
Creates a default admin user for initial setup
"""

import sys
import os

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models.user import User
from app.core.security import get_password_hash
from app.models import Base

def create_admin_user():
    """Create default admin user"""
    
    # Admin user details
    admin_email = "admin@msme.com"
    admin_name = "System Administrator"
    admin_password = "admin123"  # Change this in production!
    admin_role = "admin"
    
    # Create database tables if they don't exist
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created/verified")
    except Exception as e:
        print(f"⚠️  Database table creation warning: {e}")
    
    # Create database session
    db: Session = SessionLocal()
    
    try:
        # Check if admin already exists
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        if existing_admin:
            print(f"ℹ️  Admin user '{admin_email}' already exists!")
            print(f"   ID: {existing_admin.id}")
            print(f"   Name: {existing_admin.full_name}")
            print(f"   Role: {existing_admin.role}")
            return True
        
        # Hash the password
        hashed_password = get_password_hash(admin_password)
        
        # Create admin user
        admin_user = User(
            email=admin_email,
            full_name=admin_name,
            hashed_password=hashed_password,
            role=admin_role,
            is_active=True
        )
        
        # Add to database
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print(f"🎉 Admin user created successfully!")
        print(f"   Email: {admin_user.email}")
        print(f"   Password: {admin_password}")
        print(f"   Name: {admin_user.full_name}")
        print(f"   Role: {admin_user.role}")
        print(f"   ID: {admin_user.id}")
        print(f"\n⚠️  Please change the password after first login!")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
        return False
        
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 MSME Campaign Central - Admin User Setup")
    print("=" * 50)
    create_admin_user()
