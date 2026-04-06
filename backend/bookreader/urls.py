from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .admin import bookreader_admin
from payments.urls import payment_callback

from django.views.static import serve
from django.http import HttpResponse

def media_serve_with_cors(request, path, document_root=None):
    """Serve media files with CORS headers for cross-origin access"""
    response = serve(request, path, document_root)
    # Add CORS headers for images and PDFs
    if path.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf')):
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    return response

urlpatterns = [
    path('admin/', admin.site.urls),
    path('superadmin/', bookreader_admin.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/admin/', include('admin_api.urls')),
    path('api/books/', include('books.urls')),
    path('api/library/', include('library.urls')),
    path('api/user/', include('user_api.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/reader/', include('reader.urls')),
    path('payment/callback/', payment_callback, name='payment-callback'),
]

# Serve media files in both DEBUG and production with CORS
urlpatterns += [
    path('backend/media/<path:path>', media_serve_with_cors, {'document_root': settings.MEDIA_ROOT}),
]
