from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from typing import Optional, List
from uuid import UUID

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.campaign import EmailTemplate, WhatsAppTemplate, CustomForm
from app.schemas.campaign import (
    EmailTemplateCreate, EmailTemplateUpdate, EmailTemplateResponse,
    WhatsAppTemplateCreate, WhatsAppTemplateUpdate, WhatsAppTemplateResponse,
    CustomFormCreate, CustomFormUpdate, CustomFormResponse,
    TemplatePreviewRequest, TemplatePreviewResponse
)
from app.core.security import verify_role
from app.services.template_service import TemplateService

router = APIRouter()

# Email Templates
@router.get("/email", response_model=List[EmailTemplateResponse])
async def get_email_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get email templates list"""
    query = db.query(EmailTemplate)
    
    # Search by name or subject
    if search:
        search_filter = or_(
            EmailTemplate.name.ilike(f"%{search}%"),
            EmailTemplate.subject.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    # Role-based filtering
    if current_user.role not in ['admin', 'campaign_manager']:
        query = query.filter(EmailTemplate.created_by == current_user.id)
    
    templates = query.order_by(desc(EmailTemplate.created_at)).offset(skip).limit(limit).all()
    return templates


@router.post("/email", response_model=EmailTemplateResponse)
async def create_email_template(
    template: EmailTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new email template"""
    verify_role(current_user, ['admin', 'campaign_manager'])
    
    db_template = EmailTemplate(
        **template.dict(),
        created_by=current_user.id
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    
    return db_template


@router.get("/email/{template_id}", response_model=EmailTemplateResponse)
async def get_email_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get email template details"""
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Email template not found")
    
    # Role-based access control
    if current_user.role not in ['admin', 'campaign_manager']:
        if template.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return template


@router.put("/email/{template_id}", response_model=EmailTemplateResponse)
async def update_email_template(
    template_id: UUID,
    template_update: EmailTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update email template"""
    verify_role(current_user, ['admin', 'campaign_manager'])
    
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Email template not found")
    
    # Role-based access control
    if current_user.role != 'admin' and template.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Update fields
    update_data = template_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)
    
    db.commit()
    db.refresh(template)
    
    return template


@router.delete("/email/{template_id}")
async def delete_email_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete email template"""
    verify_role(current_user, ['admin', 'campaign_manager'])
    
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Email template not found")
    
    # Role-based access control
    if current_user.role != 'admin' and template.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db.delete(template)
    db.commit()
    
    return {"message": "Email template deleted successfully"}


# WhatsApp Templates
@router.get("/whatsapp", response_model=List[WhatsAppTemplateResponse])
async def get_whatsapp_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get WhatsApp templates list"""
    query = db.query(WhatsAppTemplate)
    
    # Search by name or content
    if search:
        search_filter = or_(
            WhatsAppTemplate.name.ilike(f"%{search}%"),
            WhatsAppTemplate.content.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    # Role-based filtering
    if current_user.role not in ['admin', 'campaign_manager']:
        query = query.filter(WhatsAppTemplate.created_by == current_user.id)
    
    templates = query.order_by(desc(WhatsAppTemplate.created_at)).offset(skip).limit(limit).all()
    return templates


@router.post("/whatsapp", response_model=WhatsAppTemplateResponse)
async def create_whatsapp_template(
    template: WhatsAppTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new WhatsApp template"""
    verify_role(current_user, ['admin', 'campaign_manager'])
    
    db_template = WhatsAppTemplate(
        **template.dict(),
        created_by=current_user.id
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    
    return db_template


@router.get("/whatsapp/{template_id}", response_model=WhatsAppTemplateResponse)
async def get_whatsapp_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get WhatsApp template details"""
    template = db.query(WhatsAppTemplate).filter(WhatsAppTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="WhatsApp template not found")
    
    # Role-based access control
    if current_user.role not in ['admin', 'campaign_manager']:
        if template.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return template


@router.put("/whatsapp/{template_id}", response_model=WhatsAppTemplateResponse)
async def update_whatsapp_template(
    template_id: UUID,
    template_update: WhatsAppTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update WhatsApp template"""
    verify_role(current_user, ['admin', 'campaign_manager'])
    
    template = db.query(WhatsAppTemplate).filter(WhatsAppTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="WhatsApp template not found")
    
    # Role-based access control
    if current_user.role != 'admin' and template.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Update fields
    update_data = template_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)
    
    db.commit()
    db.refresh(template)
    
    return template


@router.delete("/whatsapp/{template_id}")
async def delete_whatsapp_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete WhatsApp template"""
    verify_role(current_user, ['admin', 'campaign_manager'])
    
    template = db.query(WhatsAppTemplate).filter(WhatsAppTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="WhatsApp template not found")
    
    # Role-based access control
    if current_user.role != 'admin' and template.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db.delete(template)
    db.commit()
    
    return {"message": "WhatsApp template deleted successfully"}


# Custom Forms
@router.get("/forms", response_model=List[CustomFormResponse])
async def get_custom_forms(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get custom forms list"""
    query = db.query(CustomForm)
    
    # Filter active forms
    if active_only:
        query = query.filter(CustomForm.is_active == True)
    
    # Search by name or title
    if search:
        search_filter = or_(
            CustomForm.name.ilike(f"%{search}%"),
            CustomForm.title.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    # Role-based filtering
    if current_user.role not in ['admin', 'campaign_manager']:
        query = query.filter(CustomForm.created_by == current_user.id)
    
    forms = query.order_by(desc(CustomForm.created_at)).offset(skip).limit(limit).all()
    return forms


@router.post("/forms", response_model=CustomFormResponse)
async def create_custom_form(
    form: CustomFormCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new custom form"""
    verify_role(current_user, ['admin', 'campaign_manager'])
    
    # Check if slug is unique
    existing_form = db.query(CustomForm).filter(CustomForm.slug == form.slug).first()
    if existing_form:
        raise HTTPException(status_code=400, detail="Form slug already exists")
    
    db_form = CustomForm(
        **form.dict(),
        created_by=current_user.id
    )
    db.add(db_form)
    db.commit()
    db.refresh(db_form)
    
    return db_form


@router.get("/forms/{form_id}", response_model=CustomFormResponse)
async def get_custom_form(
    form_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get custom form details"""
    form = db.query(CustomForm).filter(CustomForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Custom form not found")
    
    # Role-based access control
    if current_user.role not in ['admin', 'campaign_manager']:
        if form.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return form


@router.put("/forms/{form_id}", response_model=CustomFormResponse)
async def update_custom_form(
    form_id: UUID,
    form_update: CustomFormUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update custom form"""
    verify_role(current_user, ['admin', 'campaign_manager'])
    
    form = db.query(CustomForm).filter(CustomForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Custom form not found")
    
    # Role-based access control
    if current_user.role != 'admin' and form.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Update fields
    update_data = form_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(form, field, value)
    
    db.commit()
    db.refresh(form)
    
    return form


@router.delete("/forms/{form_id}")
async def delete_custom_form(
    form_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete custom form"""
    verify_role(current_user, ['admin', 'campaign_manager'])
    
    form = db.query(CustomForm).filter(CustomForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Custom form not found")
    
    # Role-based access control
    if current_user.role != 'admin' and form.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db.delete(form)
    db.commit()
    
    return {"message": "Custom form deleted successfully"}


# Template Preview
@router.post("/preview", response_model=TemplatePreviewResponse)
async def preview_template(
    preview_request: TemplatePreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Preview template with sample or real data"""
    template_service = TemplateService()
    
    # Get vendor data if vendor_id is provided
    vendor = None
    if preview_request.vendor_id:
        from app.models.vendor import Vendor
        vendor = db.query(Vendor).filter(Vendor.id == preview_request.vendor_id).first()
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Preview template
    preview_result = template_service.preview_template(
        template_content=preview_request.template_content,
        vendor=vendor,
        variables=preview_request.variables
    )
    
    if not preview_result['success']:
        raise HTTPException(status_code=400, detail=f"Template preview failed: {preview_result['error']}")
    
    # Extract variables
    variables_used = template_service.extract_variables(preview_request.template_content)
    missing_variables = []
    
    if preview_request.variables:
        provided_vars = set(preview_request.variables.keys())
        required_vars = set(variables_used)
        missing_variables = list(required_vars - provided_vars)
    
    return TemplatePreviewResponse(
        rendered_content=preview_result['rendered_content'],
        subject=None,  # Could extract subject for email templates
        variables_used=variables_used,
        missing_variables=missing_variables
    )
