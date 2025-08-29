from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, date
from decimal import Decimal

from app.models.vendor import MSMECategory, MSMEStatus, SupplierType


class VendorBase(BaseModel):
    # Primary identification
    company_name: str
    vendor_code: str
    contact_person_name: Optional[str] = None
    
    # Contact information
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    
    # Address and location
    registered_address: Optional[str] = None
    country_origin: Optional[str] = None
    
    # Business information
    supplier_type: Optional[SupplierType] = None
    supplier_category: Optional[str] = None
    annual_turnover: Optional[Decimal] = None
    year_established: Optional[int] = None
    currency: Optional[str] = None
    
    # MSME and compliance
    msme_status: Optional[MSMEStatus] = None
    msme_category: Optional[MSMECategory] = None
    
    # Legal information
    pan_number: Optional[str] = None
    gst_number: Optional[str] = None
    gta_registration: Optional[str] = None
    incorporation_certificate_path: Optional[str] = None
    
    # Compliance flags
    nda: Optional[bool] = False
    sqa: Optional[bool] = False
    four_m: Optional[bool] = False
    code_of_conduct: Optional[bool] = False
    compliance_agreement: Optional[bool] = False
    self_declaration: Optional[bool] = False
    
    # Legacy fields for backward compatibility
    vendor_name: Optional[str] = None
    phone: Optional[str] = None
    business_category: Optional[str] = None
    group_category: Optional[str] = None
    location: Optional[str] = None
    registration_date: Optional[date] = None
    udyam_number: Optional[str] = None
    opening_balance: Optional[Decimal] = None
    credit_amount: Optional[Decimal] = None
    debit_amount: Optional[Decimal] = None
    closing_balance: Optional[Decimal] = None


class VendorCreate(VendorBase):
    pass


class VendorUpdate(BaseModel):
    # Primary identification
    company_name: Optional[str] = None
    contact_person_name: Optional[str] = None
    
    # Contact information
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    
    # Address and location
    registered_address: Optional[str] = None
    country_origin: Optional[str] = None
    
    # Business information
    supplier_type: Optional[SupplierType] = None
    supplier_category: Optional[str] = None
    annual_turnover: Optional[Decimal] = None
    year_established: Optional[int] = None
    currency: Optional[str] = None
    
    # MSME and compliance
    msme_status: Optional[MSMEStatus] = None
    msme_category: Optional[MSMECategory] = None
    
    # Legal information
    pan_number: Optional[str] = None
    gst_number: Optional[str] = None
    gta_registration: Optional[str] = None
    incorporation_certificate_path: Optional[str] = None
    
    # Compliance flags
    nda: Optional[bool] = None
    sqa: Optional[bool] = None
    four_m: Optional[bool] = None
    code_of_conduct: Optional[bool] = None
    compliance_agreement: Optional[bool] = None
    self_declaration: Optional[bool] = None
    
    # Legacy fields for backward compatibility
    vendor_name: Optional[str] = None
    phone: Optional[str] = None
    business_category: Optional[str] = None
    group_category: Optional[str] = None
    location: Optional[str] = None
    registration_date: Optional[date] = None
    udyam_number: Optional[str] = None
    opening_balance: Optional[Decimal] = None
    credit_amount: Optional[Decimal] = None
    debit_amount: Optional[Decimal] = None
    closing_balance: Optional[Decimal] = None


class VendorResponse(VendorBase):
    id: str
    last_updated_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
