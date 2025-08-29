from sqlalchemy import Column, String, DateTime, Numeric, Date, Enum, Boolean, Integer, Text
from sqlalchemy.sql import func
import uuid
import enum

from app.database import Base


class MSMECategory(str, enum.Enum):
    MICRO = "micro"
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"
    OTHERS = "others"


class MSMEStatus(str, enum.Enum):
    CERTIFIED = "msme_certified"
    NON_MSME = "non_msme"
    PENDING = "msme_pending"
    MICRO = "micro"
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"
    OTHERS = "others"


class SupplierType(str, enum.Enum):
    SUPPLIER = "supplier"
    SERVICE_PROVIDER = "service_provider"
    DISTRIBUTOR = "distributor"
    MANUFACTURER = "manufacturer"


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Basic Information
    company_name = Column(String, nullable=False)
    vendor_code = Column(String, unique=True, nullable=False)
    contact_person_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    
    # Address & Location
    registered_address = Column(Text, nullable=True)
    country_origin = Column(String, nullable=True)
    
    # Business Classification
    supplier_type = Column(Enum(SupplierType), nullable=True)
    supplier_category = Column(String, nullable=True)
    
    # Financial Information
    annual_turnover = Column(Numeric, nullable=True)
    year_established = Column(Integer, nullable=True)
    currency = Column(String, default="INR")
    
    # MSME Status
    msme_status = Column(Enum(MSMEStatus), nullable=True)
    
    # Legal & Compliance
    pan_number = Column(String, nullable=True)
    gst_number = Column(String, nullable=True)
    gta_registration = Column(String, nullable=True)
    incorporation_certificate_path = Column(String, nullable=True)
    
    # Compliance Flags
    nda = Column(Boolean, default=False)
    sqa = Column(Boolean, default=False)
    four_m = Column(Boolean, default=False)
    code_of_conduct = Column(Boolean, default=False)
    compliance_agreement = Column(Boolean, default=False)
    self_declaration = Column(Boolean, default=False)
    
    # Legacy fields (for backward compatibility)
    vendor_name = Column(String, nullable=True)  # Will map to company_name
    phone = Column(String, nullable=True)  # Will map to phone_number
    msme_category = Column(Enum(MSMECategory), nullable=True)
    business_category = Column(String, nullable=True)
    group_category = Column(String, nullable=True)
    location = Column(String, nullable=True)
    registration_date = Column(Date, nullable=True)
    udyam_number = Column(String, nullable=True)
    opening_balance = Column(Numeric, nullable=True)
    credit_amount = Column(Numeric, nullable=True)
    debit_amount = Column(Numeric, nullable=True)
    closing_balance = Column(Numeric, nullable=True)
    last_updated_date = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
