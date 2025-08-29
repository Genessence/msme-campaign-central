from sqlalchemy import Column, String, DateTime, Numeric, Date, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from app.database import Base


class MSMECategory(str, enum.Enum):
    MICRO = "Micro"
    SMALL = "Small"
    MEDIUM = "Medium"
    OTHERS = "Others"


class MSMEStatus(str, enum.Enum):
    CERTIFIED = "MSME Certified"
    NON_MSME = "Non MSME"
    PENDING = "MSME Application Pending"
    OTHERS = "Others"
    MSME = "MSME"


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_name = Column(String, nullable=False)
    vendor_code = Column(String, unique=True, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    msme_status = Column(Enum(MSMEStatus), nullable=True)
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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
