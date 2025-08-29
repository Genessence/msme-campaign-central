#!/usr/bin/env python3
"""
User creation script for MSME Campaign Central
Usage: python create_user.py
"""

import sys
import os
from getpass import getpass

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models.user import User
from app.core.security import get_password_hash
from app.models import Base

def create_user(email: str, full_name: str, password: str, role: str = "user"):
    """Create a new user in the database"""
    
    # Create database tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # Create database session
    db: Session = SessionLocal()
    
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"❌ User with email '{email}' already exists!")
            return False
        
        # Hash the password
        hashed_password = get_password_hash(password)
        
        # Create new user
        user = User(
            email=email,
            full_name=full_name,
            hashed_password=hashed_password,
            role=role,
            is_active=True
        )
        
        # Add to database
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"✅ User created successfully!")
        print(f"   ID: {user.id}")
        print(f"   Email: {user.email}")
        print(f"   Name: {user.full_name}")
        print(f"   Role: {user.role}")
        print(f"   Active: {user.is_active}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        db.rollback()
        return False
        
    finally:
        db.close()

def main():
    """Interactive user creation"""
    print("🚀 MSME Campaign Central - User Creation Tool")
    print("=" * 50)
    
    try:
        # Get user input
        email = input("Enter email: ").strip()
        if not email:
            print("❌ Email is required!")
            return
            
        full_name = input("Enter full name: ").strip()
        if not full_name:
            print("❌ Full name is required!")
            return
            
        password = getpass("Enter password: ")
        if not password:
            print("❌ Password is required!")
            return
            
        # Confirm password
        password_confirm = getpass("Confirm password: ")
        if password != password_confirm:
            print("❌ Passwords don't match!")
            return
            
        print("\nAvailable roles:")
        print("1. admin - Full system access")
        print("2. campaign_manager - Manage campaigns and vendors")
        print("3. viewer - Read-only access")
        print("4. user - Basic user access")
        
        role_choice = input("Enter role (1-4) or type custom role: ").strip()
        
        role_map = {
            "1": "admin",
            "2": "campaign_manager", 
            "3": "viewer",
            "4": "user"
        }
        
        role = role_map.get(role_choice, role_choice)
        
        print(f"\n📝 Creating user:")
        print(f"   Email: {email}")
        print(f"   Name: {full_name}")
        print(f"   Role: {role}")
        
        confirm = input("\nProceed? (y/N): ").strip().lower()
        if confirm != 'y':
            print("❌ User creation cancelled.")
            return
            
        # Create the user
        success = create_user(email, full_name, password, role)
        
        if success:
            print(f"\n🎉 User '{email}' created successfully!")
            print(f"You can now login with these credentials.")
        
    except KeyboardInterrupt:
        print("\n❌ User creation cancelled.")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()
