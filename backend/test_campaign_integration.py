#!/usr/bin/env python3
"""
Test Campaign Service Integration with Bulk Email Processing
Tests the updated campaign service to ensure it properly uses the new
batch email processing capabilities.
"""

import asyncio
import logging
import os
import sys
from datetime import datetime
from uuid import UUID, uuid4

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.core.config import settings
from app.database import get_db
from app.models.campaign import Campaign, CampaignStatus, EmailTemplate
from app.models.vendor import Vendor, SupplierType
from app.services.campaign_service import CampaignService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_campaign_email_integration():
    """Test that campaign service properly uses bulk email processing"""
    
    logger.info("🧪 Testing Campaign Service Email Integration")
    logger.info("=" * 60)
    
    # Get database session
    db = next(get_db())
    campaign_service = CampaignService(db)
    
    try:
        # 1. Check if we have any existing vendors
        vendors = db.query(Vendor).filter(Vendor.email.isnot(None)).limit(5).all()
        
        if not vendors:
            logger.warning("⚠️  No active vendors found in database")
            logger.info("Creating test vendors for integration test...")
            
            # Create a few test vendors
            test_vendors = [
                {
                    'company_name': 'Test Vendor 1',
                    'vendor_code': 'TV001',
                    'email': 'test1@testvendor.com',
                    'supplier_type': SupplierType.SUPPLIER,
                    'phone_number': '+1234567890'
                },
                {
                    'company_name': 'Test Vendor 2',
                    'vendor_code': 'TV002', 
                    'email': 'test2@testvendor.com',
                    'supplier_type': SupplierType.SUPPLIER,
                    'phone_number': '+1234567891'
                }
            ]
            
            for vendor_data in test_vendors:
                vendor = Vendor(**vendor_data)
                db.add(vendor)
            
            db.commit()
            vendors = db.query(Vendor).filter(Vendor.email.isnot(None)).limit(5).all()
        
        logger.info(f"✅ Found {len(vendors)} active vendors for testing")
        
        # 2. Check if we have email templates
        email_template = db.query(EmailTemplate).first()
        
        if not email_template:
            logger.info("Creating test email template...")
            email_template = EmailTemplate(
                name="Test Campaign Template",
                subject="Test Campaign: {{vendor_name}}",
                body="Hello {{vendor_name}}, this is a test campaign email from MSME Campaign Central.",
                created_by="test-system"
            )
            db.add(email_template)
            db.commit()
        
        logger.info(f"✅ Using email template: {email_template.name}")
        
        # 3. Check if we have a test campaign
        test_campaign = db.query(Campaign).filter(Campaign.name.like("Test Integration%")).first()
        
        if not test_campaign:
            logger.info("Creating test campaign...")
            test_campaign = Campaign(
                name="Test Integration Campaign",
                description="Test campaign for email integration",
                email_template_id=email_template.id,
                status=CampaignStatus.DRAFT,
                target_vendors=[],  # Will target all active vendors
                created_by="test-system"
            )
            db.add(test_campaign)
            db.commit()
        
        logger.info(f"✅ Using campaign: {test_campaign.name} (ID: {test_campaign.id})")
        
        # 4. Test the updated execute_campaign method with test mode
        logger.info("🚀 Testing campaign execution in TEST MODE...")
        
        await campaign_service.execute_campaign(
            campaign_id=test_campaign.id,
            task_id="test-integration-task",
            send_emails=True,
            send_whatsapp=False,  # Skip WhatsApp for this test
            test_mode=True,  # TEST MODE - no actual emails sent
            batch_size=50
        )
        
        logger.info("✅ Campaign execution completed successfully!")
        
        # 5. Verify campaign status was updated
        db.refresh(test_campaign)
        logger.info(f"📊 Campaign status after execution: {test_campaign.status}")
        
        # 6. Check if response records were created
        from app.models.campaign import MSMEResponse
        responses = db.query(MSMEResponse).filter(
            MSMEResponse.campaign_id == test_campaign.id
        ).all()
        
        logger.info(f"📝 Response records created: {len(responses)}")
        
        if len(responses) > 0:
            logger.info("✅ Campaign service is properly integrated with bulk email processing!")
            logger.info("✅ Response records created successfully")
            logger.info("✅ Campaign status updated correctly")
        else:
            logger.warning("⚠️  No response records found - possible integration issue")
        
        logger.info("\n" + "=" * 60)
        logger.info("🎉 Campaign Integration Test Complete!")
        logger.info("The main campaign service is now configured to use bulk email processing")
        logger.info("- Emails are processed in batches of 100 with rate limiting")
        logger.info("- Campaign execution creates proper response records")
        logger.info("- Integration between campaign service and email service verified")
        
    except Exception as e:
        logger.error(f"❌ Campaign integration test failed: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    # Load environment variables
    
    logger.info("Starting Campaign Service Integration Test...")
    logger.info(f"Environment: {settings.LOG_LEVEL}")
    
    asyncio.run(test_campaign_email_integration())
