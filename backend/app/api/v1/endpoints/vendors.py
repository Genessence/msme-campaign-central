from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.api.deps import get_current_active_user, require_role
from app.models.user import User
from app.models.vendor import Vendor
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorResponse

router = APIRouter()


@router.get("/", response_model=List[VendorResponse])
async def get_vendors(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100000),  # Increased limit for campaign vendor selection
    search: Optional[str] = Query(None),
    msme_status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get vendors list with pagination and filters"""
    query = db.query(Vendor)
    
    if search:
        query = query.filter(
            Vendor.company_name.icontains(search) |
            Vendor.vendor_name.icontains(search) |
            Vendor.vendor_code.icontains(search) |
            Vendor.email.icontains(search)
        )
    
    if msme_status:
        query = query.filter(Vendor.msme_status == msme_status)
    
    vendors = query.offset(skip).limit(limit).all()
    return vendors


@router.post("/", response_model=VendorResponse)
async def create_vendor(
    vendor_in: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "campaign_manager"]))
):
    """Create a new vendor"""
    # Check if vendor code already exists
    existing = db.query(Vendor).filter(Vendor.vendor_code == vendor_in.vendor_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vendor code already exists")
    
    vendor = Vendor(**vendor_in.dict())
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.get("/{vendor_id}", response_model=VendorResponse)
async def get_vendor(
    vendor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get vendor by ID"""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@router.put("/{vendor_id}", response_model=VendorResponse)
async def update_vendor(
    vendor_id: str,
    vendor_update: VendorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "campaign_manager"]))
):
    """Update vendor"""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    update_data = vendor_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vendor, field, value)
    
    db.commit()
    db.refresh(vendor)
    return vendor


@router.delete("/{vendor_id}")
async def delete_vendor(
    vendor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Delete vendor"""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    db.delete(vendor)
    db.commit()
    return {"message": "Vendor deleted successfully"}
