#!/usr/bin/env python3
"""
Debug script to check backend authentication and admin access
"""
import os
import sys
import django
import requests

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bookreader.settings')
django.setup()

from django.contrib.auth.models import User
from authentication.views_django import DjangoLoginView

def check_admin_users():
    """Check if there are any admin/staff users"""
    print("=== Checking Admin Users ===")
    staff_users = User.objects.filter(is_staff=True) | User.objects.filter(is_superuser=True)
    
    if staff_users.exists():
        for user in staff_users:
            print(f"User: {user.username}, Email: {user.email}, Staff: {user.is_staff}, Super: {user.is_superuser}")
    else:
        print("❌ No staff or superuser found in database!")
        print("Creating a staff user...")
        
        # Create a staff user for testing
        admin_user = User.objects.create_user(
            username='admin',
            email='admin@dkituyiacademy.org',
            password='admin123',
            is_staff=True,
            is_superuser=True
        )
        print(f"✅ Created staff user: {admin_user.username}")

def test_jwt_auth():
    """Test JWT authentication flow"""
    print("\n=== Testing JWT Authentication ===")
    
    # Test login
    login_data = {
        'username': 'admin',
        'password': 'admin123'
    }
    
    try:
        # Simulate login request
        from django.test import Client
        client = Client()
        
        response = client.post('/api/auth/login/', 
                          data=login_data,
                          content_type='application/json')
        
        print(f"Login response status: {response.status_code}")
        print(f"Login response data: {response.json() if response.content else 'No content'}")
        
        if response.status_code == 200:
            token = response.json().get('token')
            if token:
                print(f"✅ JWT Token generated: {token[:50]}...")
                
                # Test admin API with token
                headers = {'Authorization': f'Bearer {token}'}
                admin_response = client.get('/api/admin/progress/', headers=headers)
                
                print(f"Admin API response status: {admin_response.status_code}")
                print(f"Admin API response: {admin_response.json() if admin_response.content else 'No content'}")
            else:
                print("❌ No token in login response")
        else:
            print(f"❌ Login failed with status: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error during testing: {str(e)}")

if __name__ == '__main__':
    print("🔍 Backend Authentication Debug Tool")
    check_admin_users()
    test_jwt_auth()
