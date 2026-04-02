#!/usr/bin/env python3
"""
Debug script to test JWT middleware
"""
import os
import sys
import django
import requests

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bookreader.settings')
django.setup()

from django.test import Client
from django.contrib.auth.models import User

def test_jwt_middleware():
    """Test JWT middleware functionality"""
    print("=== Testing JWT Middleware ===")
    
    # Get a valid token
    client = Client()
    login_data = {'username': 'dkituyi', 'password': '@Admin@2026'}
    
    response = client.post('/api/auth/login/', 
                      data=login_data,
                      content_type='application/json')
    
    if response.status_code == 200:
        token = response.json().get('token')
        print(f"✅ Got token: {token[:30]}...")
        
        # Test with real requests library
        import requests
        headers = {'Authorization': f'Bearer {token}'}
        
        # Test user profile endpoint
        profile_response = requests.get('http://localhost:8001/api/user/profile/', headers=headers)
        print(f"📊 Profile response status: {profile_response.status_code}")
        print(f"📊 Profile response: {profile_response.text[:200]}...")
        
    else:
        print(f"❌ Login failed: {response.status_code}")

if __name__ == '__main__':
    test_jwt_middleware()
