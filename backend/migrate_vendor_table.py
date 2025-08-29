#!/usr/bin/env python3
"""
Migration script to update vendor table with comprehensive fields
"""
import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text
from app.core.config import settings
from app.database import SessionLocal
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_vendor_table():
    """Add new columns to vendor table"""
    engine = create_engine(settings.DATABASE_URL)
    
    migrations = [
        # Primary identification fields
        "ALTER TABLE vendors ADD COLUMN company_name VARCHAR",
        "ALTER TABLE vendors ADD COLUMN contact_person_name VARCHAR",
        
        # Contact information
        "ALTER TABLE vendors ADD COLUMN phone_number VARCHAR",
        
        # Address and location
        "ALTER TABLE vendors ADD COLUMN registered_address TEXT",
        "ALTER TABLE vendors ADD COLUMN country_origin VARCHAR",
        
        # Business information
        "ALTER TABLE vendors ADD COLUMN supplier_type VARCHAR",
        "ALTER TABLE vendors ADD COLUMN supplier_category VARCHAR",
        "ALTER TABLE vendors ADD COLUMN annual_turnover DECIMAL",
        "ALTER TABLE vendors ADD COLUMN year_established INTEGER",
        "ALTER TABLE vendors ADD COLUMN currency VARCHAR DEFAULT 'INR'",
        
        # Legal information
        "ALTER TABLE vendors ADD COLUMN pan_number VARCHAR",
        "ALTER TABLE vendors ADD COLUMN gta_registration VARCHAR",
        "ALTER TABLE vendors ADD COLUMN incorporation_certificate_path VARCHAR",
        
        # Compliance flags
        "ALTER TABLE vendors ADD COLUMN nda BOOLEAN DEFAULT FALSE",
        "ALTER TABLE vendors ADD COLUMN sqa BOOLEAN DEFAULT FALSE",
        "ALTER TABLE vendors ADD COLUMN four_m BOOLEAN DEFAULT FALSE",
        "ALTER TABLE vendors ADD COLUMN code_of_conduct BOOLEAN DEFAULT FALSE",
        "ALTER TABLE vendors ADD COLUMN compliance_agreement BOOLEAN DEFAULT FALSE",
        "ALTER TABLE vendors ADD COLUMN self_declaration BOOLEAN DEFAULT FALSE",
    ]
    
    try:
        with engine.connect() as conn:
            # Check if company_name column already exists
            result = conn.execute(text("PRAGMA table_info(vendors)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'company_name' in columns:
                logger.info("Migration already appears to have been run. Skipping...")
                return
            
            logger.info("Starting vendor table migration...")
            
            for migration in migrations:
                try:
                    conn.execute(text(migration))
                    logger.info(f"Executed: {migration}")
                except Exception as e:
                    logger.warning(f"Migration failed (may already exist): {migration} - {e}")
            
            # Update existing records to populate company_name from vendor_name
            conn.execute(text("""
                UPDATE vendors 
                SET company_name = vendor_name 
                WHERE company_name IS NULL AND vendor_name IS NOT NULL
            """))
            
            # Update phone_number from phone
            conn.execute(text("""
                UPDATE vendors 
                SET phone_number = phone 
                WHERE phone_number IS NULL AND phone IS NOT NULL
            """))
            
            conn.commit()
            logger.info("Vendor table migration completed successfully!")
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise

if __name__ == "__main__":
    migrate_vendor_table()
