from django.utils.deprecation import MiddlewareMixin
from django.http import HttpResponse

class DisableCSRFMiddleware(MiddlewareMixin):
    """
    Middleware to disable CSRF protection for authentication, admin, user, payment, and reader endpoints
    """
    
    def process_request(self, request):
        # Disable CSRF for authentication, admin, user, payment, reader, and books endpoints
        # Handle both /api/... and /backend/api/... paths (from proxy)
        path = request.path
        if (path.startswith('/api/auth/') or path.startswith('/backend/api/auth/') or
            path.startswith('/api/admin/') or path.startswith('/backend/api/admin/') or
            path.startswith('/api/user/') or path.startswith('/backend/api/user/') or
            path.startswith('/api/payments/') or path.startswith('/backend/api/payments/') or
            path.startswith('/api/reader/') or path.startswith('/backend/api/reader/') or
            path.startswith('/api/books/') or path.startswith('/backend/api/books/')):
            setattr(request, '_dont_enforce_csrf_checks', True)
            print(f"DEBUG: CSRF disabled for {path}")
        return None
    
    def process_response(self, request, response):
        # Add CORS headers for authentication, admin, user, payment, reader, and books endpoints
        # Handle both /api/... and /backend/api/... paths (from proxy)
        path = request.path
        if (path.startswith('/api/auth/') or path.startswith('/backend/api/auth/') or
            path.startswith('/api/admin/') or path.startswith('/backend/api/admin/') or
            path.startswith('/api/user/') or path.startswith('/backend/api/user/') or
            path.startswith('/api/payments/') or path.startswith('/backend/api/payments/') or
            path.startswith('/api/reader/') or path.startswith('/backend/api/reader/') or
            path.startswith('/api/books/') or path.startswith('/backend/api/books/')):
            
            # Determine allowed origin dynamically
            allowed_origins = [
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                'https://ebooks.dkituyiacademy.org',
                'https://dkituyiacademy.org',
            ]
            origin = request.headers.get('Origin', '')
            allow_origin = origin if origin in allowed_origins else 'https://ebooks.dkituyiacademy.org'

            # Handle preflight requests
            if request.method == 'OPTIONS':
                response = HttpResponse(status=204)
                response['Access-Control-Allow-Origin'] = allow_origin
                response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
                response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Accept-Ranges, Range, X-CSRFToken, X-Requested-With'
                response['Access-Control-Allow-Credentials'] = 'true'
                response['Access-Control-Max-Age'] = '86400'
                return response

            # Add CORS headers for actual requests
            response['Access-Control-Allow-Origin'] = allow_origin
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Accept-Ranges, Range, X-CSRFToken, X-Requested-With'
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Max-Age'] = '86400'
            
        return response
