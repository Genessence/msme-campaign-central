#!/usr/bin/env python3

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, SessionLocal
from app.models.campaign import EmailTemplate, WhatsAppTemplate
import uuid

def create_test_templates():
    """Create some basic test templates"""
    try:
        db = SessionLocal()
        
        # Check if templates already exist
        existing_email = db.query(EmailTemplate).first()
        existing_whatsapp = db.query(WhatsAppTemplate).first()
        
        if not existing_email:
            print("Creating test email template...")
            email_template = EmailTemplate(
                id="test-email-template-1",
                name="Basic MSME Status Update",
                subject="MSME Status Update Required",
                body="Dear {{vendor_name}},\n\nPlease update your MSME status information.\n\nBest regards,\nAmber Compliance Team",
                created_by="b54fbfe9-6d2a-4eb3-bd7c-d7771210f2e5"  # Admin user ID
            )
            db.add(email_template)
            print(f"Created email template: {email_template.id}")
        
        if not existing_whatsapp:
            print("Creating test WhatsApp template...")
            whatsapp_template = WhatsAppTemplate(
                id="test-whatsapp-template-1",
                name="MSME Status WhatsApp",
                content="Hi {{vendor_name}}, please update your MSME status via our portal. Thank you!",
                created_by="b54fbfe9-6d2a-4eb3-bd7c-d7771210f2e5"  # Admin user ID
            )
            db.add(whatsapp_template)
            print(f"Created WhatsApp template: {whatsapp_template.id}")
        
        db.commit()
        
        # List all templates
        email_templates = db.query(EmailTemplate).all()
        whatsapp_templates = db.query(WhatsAppTemplate).all()
        
        print(f"\nTotal Email Templates: {len(email_templates)}")
        for template in email_templates:
            print(f"  - {template.name} (ID: {template.id})")
            
        print(f"\nTotal WhatsApp Templates: {len(whatsapp_templates)}")
        for template in whatsapp_templates:
            print(f"  - {template.name} (ID: {template.id})")
        
        db.close()
        print("\nTest templates created successfully!")
        
    except Exception as e:
        print(f"Error creating test templates: {e}")
        sys.exit(1)

if __name__ == "__main__":
    create_test_templates()
