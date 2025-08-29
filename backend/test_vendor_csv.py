#!/usr/bin/env python3
"""
Test script to verify vendor CSV upload functionality
"""
import sys
import os
from pathlib import Path
import asyncio
import csv
import tempfile

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.services.file_service import FileUploadService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Sample CSV data based on your structure
SAMPLE_CSV_DATA = [
    {
        'company_name': 'Tech Solutions Pvt Ltd',
        'vendor_code': 'TECH001',
        'contact_person_name': 'Rajesh Kumar',
        'email': 'rajesh@techsolutions.com',
        'phone_number': '+91-9876543210',
        'registered_address': '123 Tech Park, Bangalore, Karnataka, 560001',
        'country_origin': 'India',
        'supplier_type': 'service',
        'supplier_category': 'IT Services',
        'annual_turnover': '50000000.00',
        'year_established': '2010',
        'msme_status': 'micro',
        'pan_number': 'ABCDE1234F',
        'gst_number': '29ABCDE1234F1Z5',
        'gta_registration': 'GTA12345',
        'incorporation_certificate_path': '/docs/cert_tech001.pdf',
        'currency': 'INR',
        'nda': 'true',
        'sqa': 'true',
        'four_m': 'false',
        'code_of_conduct': 'true',
        'compliance_agreement': 'true',
        'self_declaration': 'true'
    },
    {
        'company_name': 'Manufacturing Co Ltd',
        'vendor_code': 'MFG002',
        'contact_person_name': 'Priya Sharma',
        'email': 'priya@mfgco.com',
        'phone_number': '+91-9876543211',
        'registered_address': '456 Industrial Area, Chennai, Tamil Nadu, 600001',
        'country_origin': 'India',
        'supplier_type': 'product',
        'supplier_category': 'Manufacturing',
        'annual_turnover': '75000000.00',
        'year_established': '2005',
        'msme_status': 'small',
        'pan_number': 'FGHIJ5678K',
        'gst_number': '33FGHIJ5678K1Z5',
        'gta_registration': 'GTA67890',
        'incorporation_certificate_path': '/docs/cert_mfg002.pdf',
        'currency': 'INR',
        'nda': 'true',
        'sqa': 'false',
        'four_m': 'true',
        'code_of_conduct': 'true',
        'compliance_agreement': 'true',
        'self_declaration': 'false'
    }
]

async def test_csv_import():
    """Test the CSV import functionality"""
    try:
        # Create a temporary CSV file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, newline='') as f:
            fieldnames = SAMPLE_CSV_DATA[0].keys()
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(SAMPLE_CSV_DATA)
            temp_csv_path = Path(f.name)
        
        logger.info(f"Created test CSV file: {temp_csv_path}")
        
        # Test the file service
        file_service = FileUploadService()
        result = await file_service.import_vendor_csv(temp_csv_path)
        
        logger.info("CSV Import Result:")
        logger.info(f"Success: {result.get('success')}")
        logger.info(f"Total rows: {result.get('total_rows')}")
        logger.info(f"Valid vendors: {result.get('valid_vendors')}")
        logger.info(f"Errors: {result.get('errors')}")
        logger.info(f"Columns mapped: {result.get('columns_mapped', [])}")
        
        if result.get('vendors_data'):
            logger.info(f"Sample vendor data:")
            for i, vendor in enumerate(result['vendors_data'][:2]):
                logger.info(f"Vendor {i+1}: {vendor.get('company_name')} ({vendor.get('vendor_code')})")
        
        # Clean up
        temp_csv_path.unlink()
        logger.info("Test completed successfully!")
        
        return result
        
    except Exception as e:
        logger.error(f"Test failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(test_csv_import())
