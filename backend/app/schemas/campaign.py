from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum


class CampaignStatus(str, Enum):
    DRAFT = "Draft"
    ACTIVE = "Active"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


class ResponseStatus(str, Enum):
    PENDING = "Pending"
    COMPLETED = "Completed"
    PARTIAL = "Partial"
    FAILED = "Failed"


# Campaign Schemas
class CampaignBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    communication_only: bool = False
    email_template_id: Optional[UUID] = None
    whatsapp_template_id: Optional[UUID] = None
    form_id: Optional[UUID] = None
    target_vendors: Optional[List[str]] = None
    deadline: Optional[datetime] = None


class CampaignCreate(CampaignBase):
    pass


class CampaignUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[CampaignStatus] = None
    communication_only: Optional[bool] = None
    email_template_id: Optional[UUID] = None
    whatsapp_template_id: Optional[UUID] = None
    form_id: Optional[UUID] = None
    target_vendors: Optional[List[str]] = None
    deadline: Optional[datetime] = None


class CampaignResponse(CampaignBase):
    id: UUID
    status: CampaignStatus
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class CampaignList(BaseModel):
    campaigns: List[CampaignResponse]
    total: int
    page: int
    size: int
    pages: int


# Campaign Execution Schemas
class CampaignExecutionRequest(BaseModel):
    send_emails: bool = True
    send_whatsapp: bool = True
    test_mode: bool = False
    batch_size: Optional[int] = Field(50, ge=1, le=100)


class CampaignExecutionResponse(BaseModel):
    task_id: str
    message: str
    estimated_duration: Optional[str] = None


class CampaignStatusResponse(BaseModel):
    id: UUID
    status: CampaignStatus
    execution_progress: Optional[Dict[str, Any]] = None
    total_vendors: Optional[int] = None
    emails_sent: Optional[int] = None
    whatsapp_sent: Optional[int] = None
    failed_sends: Optional[int] = None
    last_updated: datetime


# Email Template Schemas
class EmailTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    subject: str = Field(..., min_length=1, max_length=500)
    body: str = Field(..., min_length=1)
    variables: Optional[List[str]] = None


class EmailTemplateCreate(EmailTemplateBase):
    pass


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    subject: Optional[str] = Field(None, min_length=1, max_length=500)
    body: Optional[str] = Field(None, min_length=1)
    variables: Optional[List[str]] = None


class EmailTemplateResponse(EmailTemplateBase):
    id: UUID
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# WhatsApp Template Schemas
class WhatsAppTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    variables: Optional[List[str]] = None


class WhatsAppTemplateCreate(WhatsAppTemplateBase):
    pass


class WhatsAppTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1)
    variables: Optional[List[str]] = None


class WhatsAppTemplateResponse(WhatsAppTemplateBase):
    id: UUID
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Custom Form Schemas
class CustomFormBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    title: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=100, pattern=r'^[a-z0-9-]+$')
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    is_active: bool = True


class CustomFormCreate(CustomFormBase):
    pass


class CustomFormUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class CustomFormResponse(CustomFormBase):
    id: UUID
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# MSME Response Schemas
class MSMEResponseBase(BaseModel):
    campaign_id: Optional[UUID] = None
    vendor_id: Optional[UUID] = None
    form_data: Optional[Dict[str, Any]] = None


class MSMEResponseCreate(MSMEResponseBase):
    pass


class MSMEResponseUpdate(BaseModel):
    form_data: Optional[Dict[str, Any]] = None
    response_status: Optional[ResponseStatus] = None


class MSMEResponseResponse(MSMEResponseBase):
    id: UUID
    response_status: ResponseStatus
    submitted_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Template Preview Schema
class TemplatePreviewRequest(BaseModel):
    template_type: str = Field(..., pattern=r'^(email|whatsapp)$')
    template_content: str
    variables: Optional[Dict[str, str]] = None
    vendor_id: Optional[UUID] = None  # For real vendor data substitution


class TemplatePreviewResponse(BaseModel):
    rendered_content: str
    subject: Optional[str] = None  # For email templates
    variables_used: List[str]
    missing_variables: List[str]
