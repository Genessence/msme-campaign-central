from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path
import os

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.vendor import Vendor
from app.core.security import verify_role
from app.services.file_service import FileUploadService
from app.services.email_service import EmailService
from app.services.whatsapp_service import WhatsAppService
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    category: str = Form("documents"),
    create_thumbnail: bool = Form(False),
    current_user: User = Depends(get_current_user)
):
    """Upload a single file"""
    file_service = FileUploadService()
    
    result = await file_service.upload_file(
        file=file,
        category=category,
        user_id=str(current_user.id),
        create_thumbnail=create_thumbnail
    )
    
    return {
        "message": "File uploaded successfully",
        "file_info": result
    }


@router.post("/upload-multiple")
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    category: str = Form("documents"),
    current_user: User = Depends(get_current_user)
):
    """Upload multiple files"""
    file_service = FileUploadService()
    
    results = await file_service.upload_multiple_files(
        files=files,
        category=category,
        user_id=str(current_user.id)
    )
    
    successful_uploads = [r for r in results if 'error' not in r]
    failed_uploads = [r for r in results if 'error' in r]
    
    return {
        "message": f"Uploaded {len(successful_uploads)} of {len(files)} files",
        "successful_uploads": successful_uploads,
        "failed_uploads": failed_uploads,
        "total_files": len(files),
        "success_count": len(successful_uploads),
        "error_count": len(failed_uploads)
    }


@router.post("/import-vendors")
async def import_vendors_from_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import vendors from CSV file"""
    verify_role(current_user, ['admin', 'campaign_manager'])
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    file_service = FileUploadService()
    
    # Upload file temporarily
    upload_result = await file_service.upload_file(
        file=file,
        category="temp",
        user_id=str(current_user.id)
    )
    
    try:
        # Process CSV and extract vendor data
        file_path = Path(upload_result['file_path'])
        import_result = await file_service.import_vendor_csv(file_path)
        
        if not import_result['success']:
            return {
                "success": False,
                "error": import_result['error'],
                "available_columns": import_result.get('available_columns', [])
            }
        
        # Check if we have any valid vendor data
        if not import_result.get('vendors_data') or len(import_result['vendors_data']) == 0:
            return {
                "success": False,
                "error": "No valid records found. Please ensure vendor_code, company_name, valid email, and valid phone_number are provided.",
                "total_rows": import_result.get('total_rows', 0),
                "processing_errors": import_result.get('errors', []),
                "available_columns": import_result.get('available_columns', []),
                "required_columns": ['company_name', 'vendor_code', 'email']
            }
        
        # Create vendors in database
        created_vendors = []
        creation_errors = []
        
        for vendor_data in import_result['vendors_data']:
            try:
                # Check if vendor already exists
                existing_vendor = db.query(Vendor).filter(Vendor.email == vendor_data['email']).first()
                if existing_vendor:
                    creation_errors.append(f"Vendor with email {vendor_data['email']} already exists")
                    continue
                
                # Create new vendor with comprehensive data
                new_vendor = Vendor(
                    # Primary identification
                    company_name=vendor_data.get('company_name', ''),
                    vendor_code=vendor_data.get('vendor_code', ''),
                    contact_person_name=vendor_data.get('contact_person_name', ''),
                    
                    # Contact information
                    email=vendor_data.get('email', ''),
                    phone_number=vendor_data.get('phone_number', ''),
                    
                    # Address and location
                    registered_address=vendor_data.get('registered_address', ''),
                    country_origin=vendor_data.get('country_origin', ''),
                    
                    # Business information
                    supplier_type=vendor_data.get('supplier_type'),
                    supplier_category=vendor_data.get('supplier_category', ''),
                    annual_turnover=vendor_data.get('annual_turnover'),
                    year_established=vendor_data.get('year_established'),
                    currency=vendor_data.get('currency', 'INR'),
                    
                    # MSME status
                    msme_status=vendor_data.get('msme_status'),
                    
                    # Legal information
                    pan_number=vendor_data.get('pan_number', ''),
                    gst_number=vendor_data.get('gst_number', ''),
                    gta_registration=vendor_data.get('gta_registration', ''),
                    incorporation_certificate_path=vendor_data.get('incorporation_certificate_path', ''),
                    
                    # Compliance flags
                    nda=vendor_data.get('nda', False),
                    sqa=vendor_data.get('sqa', False),
                    four_m=vendor_data.get('four_m', False),
                    code_of_conduct=vendor_data.get('code_of_conduct', False),
                    compliance_agreement=vendor_data.get('compliance_agreement', False),
                    self_declaration=vendor_data.get('self_declaration', False),
                    
                    # Legacy fields for backward compatibility
                    vendor_name=vendor_data.get('company_name', ''),
                    phone=vendor_data.get('phone_number', ''),
                    created_by=str(current_user.id)
                )
                
                db.add(new_vendor)
                created_vendors.append(vendor_data.get('email', vendor_data.get('vendor_code', 'unknown')))
                
            except Exception as e:
                creation_errors.append(f"Failed to create vendor {vendor_data.get('email', vendor_data.get('vendor_code', 'unknown'))}: {str(e)}")
        
        # Commit all changes
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
        # Clean up temporary file
        file_service.delete_file(upload_result['file_path'])
        
        return {
            "success": True,
            "message": f"Imported {len(created_vendors)} vendors successfully",
            "total_rows_processed": import_result['total_rows'],
            "vendors_created": len(created_vendors),
            "import_errors": import_result['errors'],
            "creation_errors": creation_errors,
            "created_vendor_emails": created_vendors
        }
        
    except Exception as e:
        # Clean up temporary file on error
        file_service.delete_file(upload_result['file_path'])
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.get("/download/{category}/{filename}")
async def download_file(
    category: str,
    filename: str,
    current_user: User = Depends(get_current_user)
):
    """Download uploaded file"""
    file_service = FileUploadService()
    file_path = file_service.upload_dir / category / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type='application/octet-stream'
    )


@router.delete("/delete")
async def delete_file(
    file_path: str = Query(...),
    current_user: User = Depends(get_current_user)
):
    """Delete uploaded file"""
    verify_role(current_user, ['admin', 'campaign_manager'])
    
    file_service = FileUploadService()
    success = file_service.delete_file(file_path)
    
    if success:
        return {"message": "File deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="File not found or deletion failed")


@router.get("/info")
async def get_file_info(
    file_path: str = Query(...),
    current_user: User = Depends(get_current_user)
):
    """Get file information"""
    file_service = FileUploadService()
    file_info = file_service.get_file_info(file_path)
    
    if file_info:
        return file_info
    else:
        raise HTTPException(status_code=404, detail="File not found")


@router.post("/test-email-config")
async def test_email_configuration(
    test_email: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """Test email service configuration"""
    verify_role(current_user, ['admin', 'campaign_manager'])
    
    email_service = EmailService()
    
    # First test SMTP connection
    connection_test = email_service.test_smtp_connection()
    
    if not connection_test['success']:
        return {
            "success": False,
            "message": "SMTP connection failed",
            "details": connection_test
        }
    
    # Send test email
    test_result = await email_service.send_test_email(test_email)
    
    return {
        "success": test_result['success'],
        "message": test_result['message'],
        "smtp_connection": connection_test,
        "test_email_result": test_result
    }


@router.post("/test-whatsapp-config")
async def test_whatsapp_configuration(
    test_phone: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """Test WhatsApp service configuration"""
    verify_role(current_user, ['admin', 'campaign_manager'])
    
    whatsapp_service = WhatsAppService()
    
    # Test API connection
    connection_test = whatsapp_service.test_api_connection()
    
    if not connection_test['success']:
        return {
            "success": False,
            "message": "WhatsApp API configuration issue",
            "details": connection_test
        }
    
    # Send test message
    test_result = await whatsapp_service.send_test_message(test_phone)
    
    return {
        "success": test_result['success'],
        "message": test_result['message'],
        "api_connection": connection_test,
        "test_message_result": test_result
    }


@router.post("/cleanup-temp")
async def cleanup_temp_files(
    max_age_hours: int = Form(24),
    current_user: User = Depends(get_current_user)
):
    """Clean up temporary files"""
    verify_role(current_user, ['admin'])
    
    file_service = FileUploadService()
    file_service.cleanup_temp_files(max_age_hours)
    
    return {
        "message": f"Temporary files older than {max_age_hours} hours have been cleaned up"
    }


@router.get("/storage-info")
async def get_storage_info(
    current_user: User = Depends(get_current_user)
):
    """Get storage usage information"""
    verify_role(current_user, ['admin', 'campaign_manager'])
    
    file_service = FileUploadService()
    upload_dir = file_service.upload_dir
    
    try:
        total_size = 0
        file_count = 0
        category_stats = {}
        
        for category in ['images', 'documents', 'spreadsheets', 'temp']:
            category_dir = upload_dir / category
            if category_dir.exists():
                category_size = 0
                category_files = 0
                
                for file_path in category_dir.rglob('*'):
                    if file_path.is_file():
                        file_size = file_path.stat().st_size
                        category_size += file_size
                        total_size += file_size
                        category_files += 1
                        file_count += 1
                
                category_stats[category] = {
                    'files': category_files,
                    'size_bytes': category_size,
                    'size_mb': round(category_size / 1024 / 1024, 2)
                }
        
        return {
            "total_files": file_count,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / 1024 / 1024, 2),
            "category_breakdown": category_stats,
            "upload_directory": str(upload_dir)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get storage info: {str(e)}")


@router.get("/health")
async def check_file_service_health():
    """Check file service health"""
    file_service = FileUploadService()
    
    try:
        # Check if upload directories exist
        directories_ok = all([
            (file_service.upload_dir / subdir).exists() 
            for subdir in ['images', 'documents', 'spreadsheets', 'temp']
        ])
        
        # Check write permissions
        test_file = file_service.upload_dir / "temp" / "health_check.txt"
        try:
            test_file.write_text("health check")
            test_file.unlink()
            write_permissions_ok = True
        except:
            write_permissions_ok = False
        
        return {
            "status": "healthy" if directories_ok and write_permissions_ok else "unhealthy",
            "directories_exist": directories_ok,
            "write_permissions": write_permissions_ok,
            "upload_directory": str(file_service.upload_dir),
            "max_file_size_mb": file_service.max_file_size / 1024 / 1024
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


# SMTP Test endpoint (no authentication required)
@router.get("/smtp-test")
async def test_smtp_configuration():
    """Test SMTP configuration - public endpoint for debugging"""
    try:
        logger.info("SMTP test endpoint called via files router")
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
        return {
            "status": "error",
            "message": str(e),
            "connection_test": {
                "success": False,
                "message": "SMTP test failed",
                "details": str(e)
            }
        }
