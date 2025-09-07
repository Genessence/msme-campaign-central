from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from typing import Optional, List
from uuid import UUID
import uuid
import logging

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.campaign import Campaign, CampaignStatus, EmailTemplate, WhatsAppTemplate, CustomForm, MSMEResponse, ResponseStatus
from app.models.vendor import Vendor
from app.schemas.campaign import (
    CampaignCreate, CampaignUpdate, CampaignResponse, CampaignList,
    CampaignExecutionRequest, CampaignExecutionResponse, CampaignStatusResponse,
    EmailTemplateCreate, EmailTemplateUpdate, EmailTemplateResponse,
    WhatsAppTemplateCreate, WhatsAppTemplateUpdate, WhatsAppTemplateResponse,
    CustomFormCreate, CustomFormUpdate, CustomFormResponse,
    MSMEResponseCreate, MSMEResponseUpdate, MSMEResponseResponse,
    TemplatePreviewRequest, TemplatePreviewResponse,
    TestEmailRequest, SendEmailsRequest
)
from app.core.security import verify_role
from app.services.campaign_service import CampaignService
from app.services.template_service import TemplateService
from app.services.email_service import EmailService
from app.services.whatsapp_service import WhatsAppService

logger = logging.getLogger(__name__)
router = APIRouter()

# Campaign CRUD Operations
@router.get("/", response_model=CampaignList)
async def get_campaigns(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[CampaignStatus] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get campaigns list with pagination and filtering"""
    query = db.query(Campaign)
    
    # Filter by status if provided
    if status:
        query = query.filter(Campaign.status == status)
    
    # Search by name or description
    if search:
        search_filter = or_(
            Campaign.name.ilike(f"%{search}%"),
            Campaign.description.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    # Role-based filtering
    if current_user.role not in ['admin', 'campaign_manager']:
        query = query.filter(Campaign.created_by == current_user.id)
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    campaigns = query.order_by(desc(Campaign.created_at)).offset(skip).limit(limit).all()
    
    return CampaignList(
        campaigns=campaigns,
        total=total,
        page=skip // limit + 1,
        size=limit,
        pages=(total + limit - 1) // limit
    )


@router.post("/", response_model=CampaignResponse)
async def create_campaign(
    campaign: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new campaign"""
    # verify_role(current_user, ['admin', 'campaign_manager'])  # Temporarily disabled
    
    # Validate template and form references
    if campaign.email_template_id:
        email_template = db.query(EmailTemplate).filter(EmailTemplate.id == campaign.email_template_id).first()
        if not email_template:
            raise HTTPException(status_code=404, detail="Email template not found")
    
    if campaign.whatsapp_template_id:
        whatsapp_template = db.query(WhatsAppTemplate).filter(WhatsAppTemplate.id == campaign.whatsapp_template_id).first()
        if not whatsapp_template:
            raise HTTPException(status_code=404, detail="WhatsApp template not found")
    
    if campaign.form_id:
        form = db.query(CustomForm).filter(CustomForm.id == campaign.form_id).first()
        if not form:
            raise HTTPException(status_code=404, detail="Custom form not found")
    
    # Create campaign
    db_campaign = Campaign(
        **campaign.dict(),
        created_by=current_user.id
    )
    db.add(db_campaign)
    db.commit()
    db.refresh(db_campaign)
    
    return db_campaign


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get campaign details"""
    # Convert UUID to string for database query since IDs are stored as strings
    campaign = db.query(Campaign).filter(Campaign.id == str(campaign_id)).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Role-based access control
    if current_user.role not in ['admin', 'campaign_manager']:
        if campaign.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return campaign


@router.put("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: UUID,
    campaign_update: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update campaign"""
    # verify_role(current_user, ['admin', 'campaign_manager'])  # Temporarily disabled
    
    # Convert UUID to string for database query since IDs are stored as strings
    campaign = db.query(Campaign).filter(Campaign.id == str(campaign_id)).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Role-based access control
    if current_user.role != 'admin' and campaign.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Update fields
    update_data = campaign_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(campaign, field, value)
    
    db.commit()
    db.refresh(campaign)
    
    return campaign


@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete campaign"""
    # verify_role(current_user, ['admin', 'campaign_manager'])  # Temporarily disabled
    
    # Convert UUID to string for database query since IDs are stored as strings
    campaign = db.query(Campaign).filter(Campaign.id == str(campaign_id)).first()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Role-based access control
    if current_user.role != 'admin' and campaign.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Check if campaign can be deleted
    if campaign.status == CampaignStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Cannot delete active campaign")
    
    db.delete(campaign)
    db.commit()
    
    return {"message": "Campaign deleted successfully"}


# Campaign Execution
@router.post("/{campaign_id}/execute", response_model=CampaignExecutionResponse)
async def execute_campaign(
    campaign_id: UUID,
    execution_request: CampaignExecutionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Execute campaign - send emails and WhatsApp messages"""
    verify_role(current_user, ['admin', 'campaign_manager'])
    
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status != CampaignStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft campaigns can be executed")
    
    # Start campaign execution in background
    task_id = str(uuid.uuid4())
    campaign_service = CampaignService(db)
    
    background_tasks.add_task(
        campaign_service.execute_campaign,
        campaign_id=campaign_id,
        task_id=task_id,
        send_emails=execution_request.send_emails,
        send_whatsapp=execution_request.send_whatsapp,
        test_mode=execution_request.test_mode,
        batch_size=execution_request.batch_size
    )
    
    # Update campaign status
    campaign.status = CampaignStatus.ACTIVE
    db.commit()
    
    return CampaignExecutionResponse(
        task_id=task_id,
        message="Campaign execution started",
        estimated_duration="5-15 minutes depending on vendor count"
    )


@router.get("/{campaign_id}/status", response_model=CampaignStatusResponse)
async def get_campaign_status(
    campaign_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get campaign execution status and progress"""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get response statistics
    response_stats = db.query(
        func.count(MSMEResponse.id).label('total'),
        func.count(MSMEResponse.id).filter(MSMEResponse.response_status == ResponseStatus.COMPLETED).label('completed'),
        func.count(MSMEResponse.id).filter(MSMEResponse.response_status == ResponseStatus.PENDING).label('pending'),
        func.count(MSMEResponse.id).filter(MSMEResponse.response_status == ResponseStatus.FAILED).label('failed')
    ).filter(MSMEResponse.campaign_id == campaign_id).first()
    
    # Get vendor count
    vendor_count = len(campaign.target_vendors) if campaign.target_vendors else 0
    
    return CampaignStatusResponse(
        id=campaign.id,
        status=campaign.status,
        execution_progress={
            "total_vendors": vendor_count,
            "emails_sent": response_stats.total if response_stats else 0,
            "whatsapp_sent": response_stats.total if response_stats else 0,
            "completed_responses": response_stats.completed if response_stats else 0,
            "pending_responses": response_stats.pending if response_stats else 0,
            "failed_responses": response_stats.failed if response_stats else 0
        },
        total_vendors=vendor_count,
        emails_sent=response_stats.total if response_stats else 0,
        whatsapp_sent=response_stats.total if response_stats else 0,
        failed_sends=response_stats.failed if response_stats else 0,
        last_updated=campaign.updated_at or campaign.created_at
    )


# Email functionality endpoints
@router.post("/{campaign_id}/test-email")
async def send_test_email(
    campaign_id: UUID,
    request: TestEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a test email for the campaign"""
    try:
        # Convert UUID to string for database query
        campaign = db.query(Campaign).filter(Campaign.id == str(campaign_id)).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Get template based on type and ID
        if request.template_type == 'email':
            template = db.query(EmailTemplate).filter(EmailTemplate.id == request.template_id).first()
        else:
            template = db.query(WhatsAppTemplate).filter(WhatsAppTemplate.id == request.template_id).first()
        
        if not template:
            raise HTTPException(status_code=404, detail=f"{request.template_type.title()} template not found")
        
        # Send test email
        email_service = EmailService()
        
        # Debug SMTP configuration
        logger.info(f"SMTP Config - Server: {email_service.smtp_server}, Port: {email_service.smtp_port}")
        logger.info(f"SMTP Username: {email_service.smtp_username}")
        logger.info(f"From Email: {email_service.from_email}")
        
        # Test SMTP connection first
        connection_test = email_service.test_smtp_connection()
        logger.info(f"SMTP Connection Test: {connection_test}")
        
        if not connection_test['success']:
            raise HTTPException(status_code=500, detail=f"SMTP Configuration Error: {connection_test['message']} - {connection_test['details']}")
        
        if request.template_type == 'email':
            subject = template.subject or f"Test Email - {campaign.name}"
            body = template.body
        else:
            subject = f"Test WhatsApp Message - {campaign.name}"
            body = template.content
        
        # Replace placeholder variables for test
        body = body.replace('{vendor_name}', 'Test Vendor')
        body = body.replace('{company_name}', 'Test Company')
        
        logger.info(f"Sending test email to: {request.email}")
        logger.info(f"Subject: {subject}")
        logger.info(f"Body preview: {body[:100]}...")
        
        success = await email_service.send_email(
            to_email=request.email,
            subject=subject,
            body=body,
            vendor_name="Test Vendor"
        )
        
        if success:
            return {"message": "Test email sent successfully", "email": request.email}
        else:
            raise HTTPException(status_code=500, detail="Failed to send test email")
            
    except Exception as e:
        logger.error(f"Test email failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Test email failed: {str(e)}")


@router.post("/{campaign_id}/send-emails")
async def send_campaign_emails(
    campaign_id: UUID,
    request: SendEmailsRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send emails to selected vendors for the campaign"""
    try:
        # Convert UUID to string for database query
        campaign = db.query(Campaign).filter(Campaign.id == str(campaign_id)).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Get template
        if request.template_type == 'email':
            template = db.query(EmailTemplate).filter(EmailTemplate.id == request.template_id).first()
        else:
            template = db.query(WhatsAppTemplate).filter(WhatsAppTemplate.id == request.template_id).first()
        
        if not template:
            raise HTTPException(status_code=404, detail=f"{request.template_type.title()} template not found")
        
        # Get vendor details
        vendors = db.query(Vendor).filter(Vendor.id.in_(request.vendor_ids)).all()
        if not vendors:
            raise HTTPException(status_code=404, detail="No vendors found")
        
        # Prepare email data
        email_list = []
        for vendor in vendors:
            if vendor.email:
                email_data = {
                    'email': vendor.email,
                    'vendor_name': vendor.contact_person_name or vendor.company_name,
                    'company_name': vendor.company_name,
                    'name': vendor.contact_person_name or vendor.company_name
                }
                email_list.append(email_data)
        
        if not email_list:
            raise HTTPException(status_code=400, detail="No vendors with valid email addresses found")
        
        # Start email sending in background
        async def send_bulk_emails_task():
            email_service = EmailService()
            
            if request.template_type == 'email':
                subject_template = template.subject or f"Message from {campaign.name}"
                body_template = template.body
            else:
                subject_template = f"WhatsApp Message - {campaign.name}"
                body_template = template.content
            
            # Replace template variables
            subject_template = subject_template.replace('{campaign_name}', campaign.name)
            body_template = body_template.replace('{campaign_name}', campaign.name)
            
            result = await email_service.send_bulk_emails(
                email_list=email_list,
                subject_template=subject_template,
                body_template=body_template,
                batch_size=100,  # Process 100 emails per batch
                delay_between_batches=3.0  # 3 second delay between batches
            )
            
            logger.info(f"Bulk email result for campaign {campaign_id}: {result}")
            return result
        
        # Add to background tasks
        background_tasks.add_task(send_bulk_emails_task)
        
        return {
            "message": f"Email sending started for {len(email_list)} vendors",
            "campaign_id": str(campaign_id),
            "vendor_count": len(email_list),
            "test_mode": request.test_mode
        }
        
    except Exception as e:
        logger.error(f"Bulk email sending failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start email sending: {str(e)}")


# SMTP Test endpoint for debugging
@router.get("/smtp-test")
async def test_smtp_configuration():
    """Test SMTP configuration - no authentication required for debugging"""
    try:
        logger.info("SMTP test endpoint called")
        email_service = EmailService()
        logger.info("EmailService created")
        
        # Test connection
        result = email_service.test_smtp_connection()
        logger.info(f"SMTP test result: {result}")
        
        response_data = {
            "smtp_server": email_service.smtp_server,
            "smtp_port": email_service.smtp_port,
            "smtp_username": email_service.smtp_username,
            "from_email": email_service.from_email,
            "connection_test": result
        }
        logger.info(f"Returning response: {response_data}")
        return response_data
        
    except Exception as e:
        logger.error(f"SMTP test failed with exception: {str(e)}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"SMTP test failed: {str(e)}")


# Simple test endpoint
@router.get("/test-simple")
async def simple_test():
    """Simple test endpoint"""
    return {"message": "Simple test works", "status": "ok"}
