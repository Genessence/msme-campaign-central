#!/usr/bin/env python3
"""
Test script to verify backend authentication
"""

import requests
import json

# Backend URL
BASE_URL = "http://localhost:8000/api/v1"

def test_backend_health():
    """Test if backend is running"""
    try:
        response = requests.get(f"{BASE_URL.replace('/api/v1', '')}/health")
        print(f"Backend health check: {response.status_code}")
        if response.status_code == 200:
            print("✅ Backend is running")
            return True
        else:
            print("❌ Backend health check failed")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        return False

def test_login():
    """Test admin login"""
    try:
        # Test data
        login_data = {
            "username": "admin@msme.com",
            "password": "admin123"
        }
        
        # Make login request
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        print(f"Login response status: {response.status_code}")
        print(f"Login response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Login successful!")
            print(f"Token: {data.get('access_token', 'No token')[:50]}...")
            return data.get('access_token')
        else:
            print(f"❌ Login failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Login test failed: {e}")
        return None

def test_me_endpoint(token):
    """Test /me endpoint with token"""
    if not token:
        print("❌ No token available for /me test")
        return
        
    try:
        response = requests.get(
            f"{BASE_URL}/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"/me response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ /me endpoint successful!")
            print(f"User: {data.get('email')} - {data.get('full_name')}")
        else:
            print(f"❌ /me endpoint failed: {response.text}")
            
    except Exception as e:
        print(f"❌ /me test failed: {e}")

if __name__ == "__main__":
    print("🧪 Testing MSME Campaign Central Backend")
    print("=" * 50)
    
    # Test 1: Backend health
    if test_backend_health():
        # Test 2: Login
        token = test_login()
        
        # Test 3: /me endpoint
        if token:
            test_me_endpoint(token)
    else:
        print("\n💡 Make sure the backend is running with:")
        print("   cd backend")
        print("   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
