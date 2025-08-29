from sqlalchemy import Column, String, DateTime, Boolean, Text, ForeignKey, Enum, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum

from app.database import Base


class CampaignStatus(str, enum.Enum):
    DRAFT = "Draft"
    ACTIVE = "Active"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


class ResponseStatus(str, enum.Enum):
    PENDING = "Pending"
    COMPLETED = "Completed"
    PARTIAL = "Partial"
    FAILED = "Failed"


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(CampaignStatus), default=CampaignStatus.DRAFT)
    communication_only = Column(Boolean, default=False)
    email_template_id = Column(String, ForeignKey("email_templates.id"), nullable=True)
    whatsapp_template_id = Column(String, ForeignKey("whatsapp_templates.id"), nullable=True)
    form_id = Column(String, ForeignKey("custom_forms.id"), nullable=True)
    target_vendors = Column(JSON, nullable=True)  # Store as JSON array for SQLite compatibility
    deadline = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    variables = Column(JSON, nullable=True)  # Store as JSON array for SQLite compatibility
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class WhatsAppTemplate(Base):
    __tablename__ = "whatsapp_templates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    variables = Column(JSON, nullable=True)  # Store as JSON array for SQLite compatibility
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class CustomForm(Base):
    __tablename__ = "custom_forms"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    title = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    settings = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class MSMEResponse(Base):
    __tablename__ = "msme_responses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=True)
    vendor_id = Column(String, ForeignKey("vendors.id"), nullable=True)
    form_data = Column(JSON, nullable=True)
    response_status = Column(Enum(ResponseStatus), default=ResponseStatus.PENDING)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    campaign = relationship("Campaign", backref="responses")
    vendor = relationship("Vendor", backref="responses")
