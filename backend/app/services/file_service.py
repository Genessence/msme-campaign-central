import os
import shutil
import uuid
from pathlib import Path
from typing import List, Optional, Dict, Any
import aiofiles
from fastapi import UploadFile, HTTPException
# import magic  # Commented out due to Windows compatibility issues
import pandas as pd
# from PIL import Image  # Temporarily commented out
import logging

logger = logging.getLogger(__name__)


class FileUploadService:
    def __init__(self):
        self.upload_dir = Path(os.getenv("UPLOAD_PATH", "uploads"))
        self.max_file_size = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB
        self.allowed_extensions = {
            'images': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
            'documents': ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
            'spreadsheets': ['.xlsx', '.xls', '.csv'],
            'archives': ['.zip', '.rar', '.7z']
        }
        self.allowed_mime_types = {
            'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp',
            'application/pdf', 'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain', 'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/zip', 'application/x-rar-compressed'
        }
        
        # Create upload directories
        self._create_directories()

    def _create_directories(self):
        """Create necessary upload directories"""
        directories = [
            self.upload_dir,
            self.upload_dir / "images",
            self.upload_dir / "documents", 
            self.upload_dir / "spreadsheets",
            self.upload_dir / "temp",
            self.upload_dir / "thumbnails"
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)

    async def upload_file(
        self,
        file: UploadFile,
        category: str = "documents",
        user_id: Optional[str] = None,
        create_thumbnail: bool = False
    ) -> Dict[str, Any]:
        """Upload and process a file"""
        try:
            # Validate file
            validation_result = await self._validate_file(file)
            if not validation_result['valid']:
                raise HTTPException(status_code=400, detail=validation_result['error'])

            # Generate unique filename
            file_extension = Path(file.filename).suffix.lower()
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            
            # Determine upload path
            category_dir = self.upload_dir / category
            file_path = category_dir / unique_filename

            # Save file
            await self._save_file(file, file_path)

            # Get file info
            file_info = {
                'id': str(uuid.uuid4()),
                'filename': file.filename,
                'stored_filename': unique_filename,
                'file_path': str(file_path),
                'file_size': file_path.stat().st_size,
                'mime_type': validation_result['mime_type'],
                'category': category,
                'user_id': user_id,
                'upload_url': f"/uploads/{category}/{unique_filename}"
            }

            # Create thumbnail for images
            if create_thumbnail and category == 'images':
                thumbnail_path = await self._create_thumbnail(file_path, unique_filename)
                if thumbnail_path:
                    file_info['thumbnail_url'] = f"/uploads/thumbnails/{Path(thumbnail_path).name}"

            # Process spreadsheet data
            if category == 'spreadsheets' and file_extension in ['.csv', '.xlsx', '.xls']:
                spreadsheet_info = await self._process_spreadsheet(file_path)
                file_info.update(spreadsheet_info)

            logger.info(f"File uploaded successfully: {file.filename} -> {unique_filename}")
            return file_info

        except Exception as e:
            logger.error(f"File upload failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

    async def _validate_file(self, file: UploadFile) -> Dict[str, Any]:
        """Validate uploaded file"""
        try:
            # Check file size
            if hasattr(file, 'size') and file.size > self.max_file_size:
                return {
                    'valid': False,
                    'error': f"File size exceeds maximum limit of {self.max_file_size / 1024 / 1024:.1f}MB"
                }

            # Check file extension
            file_extension = Path(file.filename).suffix.lower()
            all_extensions = []
            for ext_list in self.allowed_extensions.values():
                all_extensions.extend(ext_list)
            
            if file_extension not in all_extensions:
                return {
                    'valid': False,
                    'error': f"File type {file_extension} not allowed"
                }

            # Read file header for MIME type detection
            file_content = await file.read(1024)  # Read first 1KB
            await file.seek(0)  # Reset file pointer

            # Detect MIME type from extension (fallback method)
            mime_map = {
                '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
                '.png': 'image/png', '.gif': 'image/gif',
                '.pdf': 'application/pdf', '.txt': 'text/plain',
                '.csv': 'text/csv', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
            mime_type = mime_map.get(file_extension, 'application/octet-stream')

            # Check MIME type
            if mime_type not in self.allowed_mime_types:
                return {
                    'valid': False,
                    'error': f"MIME type {mime_type} not allowed"
                }

            return {
                'valid': True,
                'mime_type': mime_type
            }

        except Exception as e:
            return {
                'valid': False,
                'error': f"File validation failed: {str(e)}"
            }

    async def _save_file(self, file: UploadFile, file_path: Path):
        """Save uploaded file to disk"""
        async with aiofiles.open(file_path, 'wb') as f:
            while content := await file.read(8192):  # Read in 8KB chunks
                await f.write(content)

    async def _create_thumbnail(self, image_path: Path, filename: str) -> Optional[str]:
        """Create thumbnail for image file"""
        try:
            thumbnail_filename = f"thumb_{filename}"
            thumbnail_path = self.upload_dir / "thumbnails" / thumbnail_filename

            # Thumbnail generation temporarily disabled
            # with Image.open(image_path) as img:
            #     # Convert to RGB if necessary
            #     if img.mode in ('RGBA', 'P'):
            #         img = img.convert('RGB')
            #     
            #     # Create thumbnail
            #     img.thumbnail((200, 200), Image.Resampling.LANCZOS)
            #     img.save(thumbnail_path, 'JPEG', quality=85)

            return str(image_path)  # Return original path for now

        except Exception as e:
            logger.error(f"Thumbnail creation failed: {str(e)}")
            return None

    async def _process_spreadsheet(self, file_path: Path) -> Dict[str, Any]:
        """Process spreadsheet file and extract metadata"""
        try:
            file_extension = file_path.suffix.lower()
            
            if file_extension == '.csv':
                df = pd.read_csv(file_path)
            elif file_extension in ['.xlsx', '.xls']:
                df = pd.read_excel(file_path)
            else:
                return {}

            return {
                'spreadsheet_info': {
                    'rows': len(df),
                    'columns': len(df.columns),
                    'column_names': df.columns.tolist(),
                    'preview': df.head(5).to_dict('records') if len(df) > 0 else []
                }
            }

        except Exception as e:
            logger.error(f"Spreadsheet processing failed: {str(e)}")
            return {'spreadsheet_error': str(e)}

    async def upload_multiple_files(
        self,
        files: List[UploadFile],
        category: str = "documents",
        user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Upload multiple files"""
        results = []
        
        for file in files:
            try:
                result = await self.upload_file(file, category, user_id)
                results.append(result)
            except Exception as e:
                results.append({
                    'filename': file.filename,
                    'error': str(e),
                    'success': False
                })

        return results

    def delete_file(self, file_path: str) -> bool:
        """Delete uploaded file"""
        try:
            full_path = Path(file_path)
            if full_path.exists() and self.upload_dir in full_path.parents:
                full_path.unlink()
                
                # Delete thumbnail if exists
                if 'images' in str(full_path):
                    thumbnail_path = self.upload_dir / "thumbnails" / f"thumb_{full_path.name}"
                    if thumbnail_path.exists():
                        thumbnail_path.unlink()
                
                return True
            return False
        except Exception as e:
            logger.error(f"File deletion failed: {str(e)}")
            return False

    def get_file_info(self, file_path: str) -> Optional[Dict[str, Any]]:
        """Get information about uploaded file"""
        try:
            full_path = Path(file_path)
            if not full_path.exists():
                return None

            stat = full_path.stat()
            
            return {
                'filename': full_path.name,
                'file_size': stat.st_size,
                'created_at': stat.st_ctime,
                'modified_at': stat.st_mtime,
                'file_path': str(full_path)
            }
        except Exception:
            return None

    def cleanup_temp_files(self, max_age_hours: int = 24):
        """Clean up temporary files older than specified age"""
        try:
            temp_dir = self.upload_dir / "temp"
            current_time = pd.Timestamp.now()
            
            for file_path in temp_dir.iterdir():
                if file_path.is_file():
                    file_age = current_time - pd.Timestamp.fromtimestamp(file_path.stat().st_mtime)
                    if file_age.total_seconds() > (max_age_hours * 3600):
                        file_path.unlink()
                        logger.info(f"Cleaned up temp file: {file_path.name}")
        except Exception as e:
            logger.error(f"Temp file cleanup failed: {str(e)}")

    async def import_vendor_csv(self, file_path: Path) -> Dict[str, Any]:
        """Import vendors from CSV file with comprehensive column mapping"""
        try:
            df = pd.read_csv(file_path)
            
            # Column mapping from CSV to database fields
            column_mapping = {
                'company_name': 'company_name',
                'vendor_code': 'vendor_code',
                'contact_person_name': 'contact_person_name',
                'email': 'email',
                'phone_number': 'phone_number',
                'registered_address': 'registered_address',
                'country_origin': 'country_origin',
                'supplier_type': 'supplier_type',
                'supplier_category': 'supplier_category',
                'annual_turnover': 'annual_turnover',
                'year_established': 'year_established',
                'msme_status': 'msme_status',
                'pan_number': 'pan_number',
                'gst_number': 'gst_number',
                'gta_registration': 'gta_registration',
                'incorporation_certificate_path': 'incorporation_certificate_path',
                'currency': 'currency',
                'nda': 'nda',
                'sqa': 'sqa',
                'four_m': 'four_m',
                'code_of_conduct': 'code_of_conduct',
                'compliance_agreement': 'compliance_agreement',
                'self_declaration': 'self_declaration',
                # Legacy mappings for backward compatibility
                'name': 'company_name',
                'phone': 'phone_number',
                'vendor_name': 'company_name'
            }
            
            # Check for required columns (flexible approach)
            required_fields = ['company_name', 'vendor_code', 'email']
            csv_columns = df.columns.tolist()
            
            # Map CSV columns to our required fields
            found_required = []
            for field in required_fields:
                # Check if field exists directly or through mapping
                if field in csv_columns:
                    found_required.append(field)
                else:
                    # Check reverse mapping
                    for csv_col, db_field in column_mapping.items():
                        if db_field == field and csv_col in csv_columns:
                            found_required.append(field)
                            break
            
            missing_required = [f for f in required_fields if f not in found_required]
            if missing_required:
                return {
                    'success': False,
                    'error': f'Missing required columns: {missing_required}',
                    'available_columns': csv_columns,
                    'required_columns': required_fields
                }
            
            vendors_data = []
            errors = []
            
            for index, row in df.iterrows():
                try:
                    vendor_data = {}
                    
                    # Map CSV columns to database fields
                    for csv_col, value in row.items():
                        if pd.isna(value):
                            continue
                            
                        db_field = column_mapping.get(csv_col, csv_col)
                        
                        # Handle boolean conversions
                        if db_field in ['nda', 'sqa', 'four_m', 'code_of_conduct', 'compliance_agreement', 'self_declaration']:
                            if isinstance(value, str):
                                vendor_data[db_field] = value.lower() in ['true', '1', 'yes', 'y']
                            else:
                                vendor_data[db_field] = bool(value)
                        
                        # Handle numeric conversions
                        elif db_field in ['annual_turnover', 'year_established']:
                            try:
                                if db_field == 'year_established':
                                    vendor_data[db_field] = int(float(value))
                                else:
                                    vendor_data[db_field] = float(value)
                            except (ValueError, TypeError):
                                vendor_data[db_field] = None
                        
                        # Handle string fields
                        else:
                            vendor_data[db_field] = str(value).strip()
                    
                    # Ensure required fields are present
                    if not vendor_data.get('company_name'):
                        vendor_data['company_name'] = vendor_data.get('vendor_name', f"Vendor {vendor_data.get('vendor_code', index)}")
                    
                    # Set vendor_name for backward compatibility
                    vendor_data['vendor_name'] = vendor_data['company_name']
                    vendor_data['phone'] = vendor_data.get('phone_number', '')
                    
                    # Validate email format
                    email = vendor_data.get('email', '').strip()
                    if email and '@' not in email:
                        errors.append(f"Row {index + 2}: Invalid email format '{email}'")
                        continue
                    
                    vendors_data.append(vendor_data)
                    
                except Exception as e:
                    errors.append(f"Row {index + 2}: {str(e)}")
            
            return {
                'success': True,
                'vendors_data': vendors_data,
                'total_rows': len(df),
                'valid_vendors': len(vendors_data),
                'errors': errors,
                'columns_mapped': list(column_mapping.keys())
            }
            
        except Exception as e:
            logger.error(f"CSV import failed: {str(e)}")
            return {
                'success': False,
                'error': f'CSV processing failed: {str(e)}'
            }
