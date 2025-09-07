from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Dict, Any, Optional
from uuid import UUID
import asyncio
import logging
from datetime import datetime

from app.models.campaign import Campaign, CampaignStatus, EmailTemplate, WhatsAppTemplate, MSMEResponse, ResponseStatus
from app.models.vendor import Vendor
from app.services.email_service import EmailService
from app.services.whatsapp_service import WhatsAppService
from app.services.template_service import TemplateService

logger = logging.getLogger(__name__)


class CampaignService:
    def __init__(self, db: Session):
        self.db = db
        self.email_service = EmailService()
        self.whatsapp_service = WhatsAppService()
        self.template_service = TemplateService()

    async def execute_campaign(
        self,
        campaign_id: UUID,
        task_id: str,
        send_emails: bool = True,
        send_whatsapp: bool = True,
        test_mode: bool = False,
        batch_size: int = 50
    ):
        """Execute campaign in background task using batch processing"""
        try:
            logger.info(f"Starting campaign execution: {campaign_id} (task: {task_id})")
            
            campaign = self.db.query(Campaign).filter(Campaign.id == campaign_id).first()
            if not campaign:
                logger.error(f"Campaign {campaign_id} not found")
                return
            
            # Get target vendors
            vendors = self._get_target_vendors(campaign)
            if not vendors:
                logger.warning(f"No vendors found for campaign {campaign_id}")
                return
            
            logger.info(f"Found {len(vendors)} vendors for campaign {campaign_id}")
            
            # Create response records for all vendors
            try:
                for vendor in vendors:
                    response = MSMEResponse(
                        campaign_id=campaign_id,
                        vendor_id=vendor.id,
                        response_status=ResponseStatus.PENDING
                    )
                    self.db.add(response)
                self.db.commit()
                logger.info(f"Created response records for {len(vendors)} vendors")
            except Exception as e:
                logger.error(f"Failed to create response records: {str(e)}")
                return

            successful_emails = 0
            successful_whatsapp = 0
            failed_sends = 0
            
            # Process emails using bulk email service
            if send_emails and campaign.email_template_id:
                try:
                    email_results = await self._execute_campaign_emails(campaign, vendors, test_mode)
                    successful_emails = email_results.get('successful', 0)
                    failed_sends += email_results.get('failed', 0)
                    logger.info(f"Email campaign results: {successful_emails} successful, {email_results.get('failed', 0)} failed")
                except Exception as e:
                    logger.error(f"Failed to execute email campaign: {str(e)}")
                    failed_sends += len(vendors)
            
            # Process WhatsApp messages individually (until we implement bulk WhatsApp)
            if send_whatsapp and campaign.whatsapp_template_id:
                try:
                    for i in range(0, len(vendors), batch_size):
                        batch = vendors[i:i + batch_size]
                        logger.info(f"Processing WhatsApp batch {i//batch_size + 1} with {len(batch)} vendors")
                        
                        for vendor in batch:
                            try:
                                success = await self._send_campaign_whatsapp(campaign, vendor, test_mode)
                                if success:
                                    successful_whatsapp += 1
                                else:
                                    failed_sends += 1
                            except Exception as e:
                                logger.error(f"Error sending WhatsApp to vendor {vendor.id}: {str(e)}")
                                failed_sends += 1
                        
                        # Small delay between batches
                        await asyncio.sleep(1)
                except Exception as e:
                    logger.error(f"Failed to execute WhatsApp campaign: {str(e)}")
                    failed_sends += len(vendors)
            
            # Update campaign status
            total_processed = successful_emails + successful_whatsapp
            if total_processed > 0:
                campaign.status = CampaignStatus.COMPLETED
            else:
                campaign.status = CampaignStatus.CANCELLED
            
            self.db.commit()
            
            logger.info(f"Campaign {campaign_id} execution completed. "
                       f"Total vendors: {len(vendors)}, Email success: {successful_emails}, "
                       f"WhatsApp success: {successful_whatsapp}, Failed: {failed_sends}")
            
        except Exception as e:
            logger.error(f"Campaign execution failed for {campaign_id}: {str(e)}")
            # Update campaign status to failed/cancelled
            campaign = self.db.query(Campaign).filter(Campaign.id == campaign_id).first()
            if campaign:
                campaign.status = CampaignStatus.CANCELLED
                self.db.commit()

    def _get_target_vendors(self, campaign: Campaign) -> List[Vendor]:
        """Get vendors targeted by the campaign"""
        query = self.db.query(Vendor)
        
        if campaign.target_vendors:
            # Filter by specific vendor IDs or other criteria
            if all(self._is_uuid(v) for v in campaign.target_vendors):
                # Target vendors are UUIDs
                query = query.filter(Vendor.id.in_(campaign.target_vendors))
            else:
                # Target vendors are filter criteria (e.g., industry, state)
                for criteria in campaign.target_vendors:
                    if criteria.startswith('industry:'):
                        industry = criteria.replace('industry:', '')
                        query = query.filter(Vendor.industry_type.ilike(f"%{industry}%"))
                    elif criteria.startswith('state:'):
                        state = criteria.replace('state:', '')
                        query = query.filter(Vendor.state.ilike(f"%{state}%"))
                    elif criteria.startswith('size:'):
                        size = criteria.replace('size:', '')
                        query = query.filter(Vendor.business_size == size)
        
        return query.filter(Vendor.email.isnot(None)).all()

    async def _execute_campaign_emails(self, campaign: Campaign, vendors: List[Vendor], test_mode: bool = False) -> dict:
        """Execute email campaign using bulk email service"""
        try:
            email_template = self.db.query(EmailTemplate).filter(
                EmailTemplate.id == campaign.email_template_id
            ).first()
            
            if not email_template:
                logger.error("Email template not found for campaign")
                return {'successful': 0, 'failed': len(vendors)}
            
            if test_mode:
                logger.info(f"TEST MODE: Would send bulk emails to {len(vendors)} vendors")
                return {'successful': len(vendors), 'failed': 0}
            
            # Prepare email data for bulk sending
            email_data = []
            for vendor in vendors:
                try:
                    # Render template with vendor data
                    subject = self.template_service.render_template(email_template.subject, vendor)
                    body = self.template_service.render_template(email_template.body, vendor)
                    
                    email_data.append({
                        'to_email': vendor.email,
                        'subject': subject,
                        'body': body,
                        'vendor_name': vendor.name
                    })
                except Exception as e:
                    logger.error(f"Failed to prepare email for vendor {vendor.id}: {str(e)}")
            
            if not email_data:
                logger.warning("No email data prepared for bulk sending")
                return {'successful': 0, 'failed': len(vendors)}
            
            logger.info(f"Sending bulk emails to {len(email_data)} vendors using batch processing")
            
            # Use bulk email service with batch processing
            results = await self.email_service.send_bulk_emails(email_data)
            
            successful = results.get('successful', 0)
            failed = results.get('failed', 0)
            
            logger.info(f"Bulk email campaign completed: {successful} successful, {failed} failed")
            return {'successful': successful, 'failed': failed}
            
        except Exception as e:
            logger.error(f"Failed to execute campaign emails: {str(e)}")
            return {'successful': 0, 'failed': len(vendors)}

    async def _send_campaign_email(self, campaign: Campaign, vendor: Vendor, test_mode: bool = False) -> bool:
        """Send email to vendor"""
        try:
            email_template = self.db.query(EmailTemplate).filter(
                EmailTemplate.id == campaign.email_template_id
            ).first()
            
            if not email_template:
                return False
            
            # Render template with vendor data
            subject = self.template_service.render_template(email_template.subject, vendor)
            body = self.template_service.render_template(email_template.body, vendor)
            
            if test_mode:
                logger.info(f"TEST MODE: Would send email to {vendor.email}")
                return True
            
            # Send email
            return await self.email_service.send_email(
                to_email=vendor.email,
                subject=subject,
                body=body,
                vendor_name=vendor.name
            )
            
        except Exception as e:
            logger.error(f"Failed to send email to vendor {vendor.id}: {str(e)}")
            return False

    async def _send_campaign_whatsapp(self, campaign: Campaign, vendor: Vendor, test_mode: bool = False) -> bool:
        """Send WhatsApp message to vendor"""
        try:
            whatsapp_template = self.db.query(WhatsAppTemplate).filter(
                WhatsAppTemplate.id == campaign.whatsapp_template_id
            ).first()
            
            if not whatsapp_template:
                return False
            
            # Render template with vendor data
            message = self.template_service.render_template(whatsapp_template.content, vendor)
            
            if test_mode:
                logger.info(f"TEST MODE: Would send WhatsApp to {vendor.whatsapp}")
                return True
            
            # Send WhatsApp message
            return await self.whatsapp_service.send_message(
                phone_number=vendor.whatsapp,
                message=message,
                vendor_name=vendor.name
            )
            
        except Exception as e:
            logger.error(f"Failed to send WhatsApp to vendor {vendor.id}: {str(e)}")
            return False

    def _is_uuid(self, value: str) -> bool:
        """Check if string is a valid UUID"""
        try:
            UUID(value)
            return True
        except ValueError:
            return False

    def get_campaign_analytics(self, campaign_id: UUID) -> Dict[str, Any]:
        """Get analytics data for a campaign"""
        campaign = self.db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            return {}
        
        # Get response statistics
        response_stats = self.db.query(
            func.count(MSMEResponse.id).label('total_responses'),
            func.count(MSMEResponse.id).filter(MSMEResponse.response_status == ResponseStatus.COMPLETED).label('completed'),
            func.count(MSMEResponse.id).filter(MSMEResponse.response_status == ResponseStatus.PENDING).label('pending'),
            func.count(MSMEResponse.id).filter(MSMEResponse.response_status == ResponseStatus.FAILED).label('failed')
        ).filter(MSMEResponse.campaign_id == campaign_id).first()
        
        vendor_count = len(campaign.target_vendors) if campaign.target_vendors else 0
        
        return {
            'campaign_id': campaign_id,
            'campaign_name': campaign.name,
            'status': campaign.status,
            'total_vendors': vendor_count,
            'total_responses': response_stats.total_responses if response_stats else 0,
            'completed_responses': response_stats.completed if response_stats else 0,
            'pending_responses': response_stats.pending if response_stats else 0,
            'failed_responses': response_stats.failed if response_stats else 0,
            'response_rate': (response_stats.completed / vendor_count * 100) if vendor_count > 0 else 0,
            'created_at': campaign.created_at,
            'updated_at': campaign.updated_at
        }
