from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
import uuid

from app.models.vendor import MSMECategory, MSMEStatus


class VendorBase(BaseModel):
    vendor_name: str
    vendor_code: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    msme_status: Optional[MSMEStatus] = None
    msme_category: Optional[MSMECategory] = None
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
    vendor_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    msme_status: Optional[MSMEStatus] = None
    msme_category: Optional[MSMECategory] = None
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
    id: uuid.UUID
    last_updated_date: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
