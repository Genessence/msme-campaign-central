#!/usr/bin/env python3
"""
Script to recreate the database with SQLite-compatible schema
"""
import sys
import os
import time
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine
from app.core.config import settings
from app.database import Base
import logging

# Import all models to ensure they're registered with Base
from app.models.user import User
from app.models.vendor import Vendor
from app.models.campaign import Campaign, EmailTemplate, WhatsAppTemplate, CustomForm, MSMEResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def recreate_database():
    """Drop and recreate all tables"""
    try:
        # Rename the existing database file if it exists
        db_file = Path("msme_campaign.db")
        if db_file.exists():
            try:
                backup_file = Path(f"msme_campaign_backup_{int(time.time())}.db")
                db_file.rename(backup_file)
                logger.info(f"Renamed existing database to {backup_file}")
            except Exception as e:
                logger.warning(f"Could not rename database file: {e}")
                # Continue anyway, SQLAlchemy will handle the schema updates
        
        # Create new database
        engine = create_engine(settings.DATABASE_URL)
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Created all database tables with SQLite-compatible schema")
        
        return engine
        
    except Exception as e:
        logger.error(f"Database recreation failed: {e}")
        raise

if __name__ == "__main__":
    recreate_database()
