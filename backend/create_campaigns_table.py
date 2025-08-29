#!/usr/bin/env python3

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from app.models.campaign import Campaign, EmailTemplate, WhatsAppTemplate, CustomForm, MSMEResponse
from app.models.user import User
from app.models.vendor import Vendor

def create_campaign_tables():
    """Create all campaign-related tables"""
    try:
        print("Creating campaign tables...")
        
        # This will create all tables defined in the models
        Campaign.metadata.create_all(bind=engine)
        EmailTemplate.metadata.create_all(bind=engine)
        WhatsAppTemplate.metadata.create_all(bind=engine)
        CustomForm.metadata.create_all(bind=engine)
        MSMEResponse.metadata.create_all(bind=engine)
        
        print("Campaign tables created successfully!")
        
        # List all tables to verify
        import sqlite3
        conn = sqlite3.connect('msme_campaign.db')
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("\nAvailable tables:")
        for table in tables:
            print(f"  - {table[0]}")
        conn.close()
        
    except Exception as e:
        print(f"Error creating campaign tables: {e}")
        sys.exit(1)

if __name__ == "__main__":
    create_campaign_tables()
