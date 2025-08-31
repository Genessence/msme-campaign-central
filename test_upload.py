#!/usr/bin/env python3
"""
Test script to verify upload functionality
"""

import requests
import json
import os

# Backend URL
BASE_URL = "http://localhost:8000/api/v1"

def test_health():
    """Test backend health"""
    try:
        response = requests.get(f"{BASE_URL.replace('/api/v1', '')}/health")
        print(f"Health check: {response.status_code}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_login():
    """Test login to get token"""
    try:
        login_data = {
            "username": "admin@msme.com",
            "password": "admin123"
        }
        
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get('access_token')
        else:
            print(f"Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"Login test failed: {e}")
        return None

def test_file_upload_endpoint(token):
    """Test file upload endpoint"""
    if not token:
        print("No token available")
        return False
        
    try:
        # Create a test CSV file
        test_csv_content = """company_name,vendor_code,email,contact_person_name,phone_number
Test Company 1,TEST001,test1@example.com,John Doe,+1234567890
Test Company 2,TEST002,test2@example.com,Jane Smith,+1234567891"""
        
        with open('test_vendors.csv', 'w') as f:
            f.write(test_csv_content)
        
        # Test the upload endpoint
        with open('test_vendors.csv', 'rb') as f:
            files = {'file': ('test_vendors.csv', f, 'text/csv')}
            
            response = requests.post(
                f"{BASE_URL}/files/import-vendors",
                files=files,
                headers={"Authorization": f"Bearer {token}"}
            )
        
        print(f"Upload response status: {response.status_code}")
        print(f"Upload response: {response.text}")
        
        # Clean up test file
        if os.path.exists('test_vendors.csv'):
            os.remove('test_vendors.csv')
        
        return response.status_code in [200, 201]
        
    except Exception as e:
        print(f"Upload test failed: {e}")
        return False

def test_files_health():
    """Test files service health"""
    try:
        response = requests.get(f"{BASE_URL}/files/health")
        print(f"Files health: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Files service status: {data}")
        return response.status_code == 200
    except Exception as e:
        print(f"Files health check failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing Upload Functionality")
    print("=" * 50)
    
    # Test 1: Backend health
    if test_health():
        print("✅ Backend is running")
        
        # Test 2: Files service health
        test_files_health()
        
        # Test 3: Login
        token = test_login()
        
        # Test 4: File upload
        if token:
            print("✅ Login successful")
            if test_file_upload_endpoint(token):
                print("✅ Upload endpoint is working")
            else:
                print("❌ Upload endpoint failed")
        else:
            print("❌ Login failed")
    else:
        print("❌ Backend is not running")
        print("\n💡 Make sure the backend is running with:")
        print("   cd backend")
        print("   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
