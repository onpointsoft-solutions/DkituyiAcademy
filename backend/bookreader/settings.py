import os
from pathlib import Path
from decouple import config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-me-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# Get allowed hosts from environment or use default with production domain
env_hosts = config('ALLOWED_HOSTS', default='', cast=str)
print(f"DEBUG: env_hosts = '{env_hosts}'")
if env_hosts:
    ALLOWED_HOSTS = [s.strip() for s in env_hosts.split(',')]
    # Force add all hosts if environment doesn't include *
    if '*' not in env_hosts:
        ALLOWED_HOSTS.append('ebooks.dkituyiacademy.org')
else:
    # Allow all hosts for now
    ALLOWED_HOSTS = ['ebooks.dkituyiacademy.org']
print(f"DEBUG: ALLOWED_HOSTS = {ALLOWED_HOSTS}")

# Application definition
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'corsheaders',
]

LOCAL_APPS = [
    'authentication',
    'books',
    'library',
    'reader',
    'admin_api',
    'user_api',
    'payments',  # Updated to payments app
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'authentication.middleware_csrf.DisableCSRFMiddleware',  # Disable CSRF for API endpoints
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'authentication.middleware.JWTAuthMiddleware',  # Move after Django's auth middleware
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# CSRF Settings for production
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = False
CSRF_USE_SESSIONS = False
CSRF_COOKIE_SAMESITE = 'Lax'

ROOT_URLCONF = 'bookreader.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'bookreader.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'viyykxmm_ebooksdb',
        'USER': 'viyykxmm_ebooksadmin',
        'PASSWORD': '@Admin@2026',
        'HOST': 'localhost',  # or your server IP
        'PORT': '3306',
    }
}
# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

MEDIA_URL = '/backend/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',  # Allow unauthenticated access by default
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_FORMAT_SUFFIX': None,
    'DEFAULT_SCHEMA_CLASS': 'rest_framework.schemas.coreapi.AutoSchema',
}

# CORS settings
CORS_ALLOWED_ORIGINS =["ebooks.dkituyiacademy.org"]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_ALL_HEADERS = True
CORS_ALLOW_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
CORS_PREFLIGHT_MAX_AGE = 86400  # 24 hours

# Specific headers to allow
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-language',
    'content-language',
    'content-type',
    'authorization',
    'x-requested-with',
    'x-csrftoken',  # Add CSRF token header
    'accept-ranges',
    'range',
    'if-range',
    'if-modified-since',
    'if-none-match',
]

# CSRF Settings for admin API
CSRF_TRUSTED_ORIGINS =["ebooks.dkituyiacademy.org"]

# JWT Settings
JWT_SECRET_KEY = config('JWT_SECRET_KEY', default='your-jwt-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_DELTA = 3600  # 1 hour in seconds

# WordPress Integration
WORDPRESS_URL = config('WORDPRESS_URL', default='https://dkituyiacademy.org')
WOOCOMMERCE_API_URL = config('WOOCOMMERCE_API_URL', default='https://dkituyiacademy.org/wp-json/wc/v3')
WOOCOMMERCE_CONSUMER_KEY = config('WOOCOMMERCE_CONSUMER_KEY', default='')
WOOCOMMERCE_CONSUMER_SECRET = config('WOOCOMMERCE_CONSUMER_SECRET', default='')

# Paystack Payment Integration
PAYSTACK_SECRET_KEY = config('PAYSTACK_SECRET_KEY', default='sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
PAYSTACK_PUBLIC_KEY = config('PAYSTACK_PUBLIC_KEY', default='pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
PAYSTACK_CALLBACK_URL = config('PAYSTACK_CALLBACK_URL', default='https://ebooks.dkituyiacademy.org/payment/callback')
PAYSTACK_WEBHOOK_SECRET = config('PAYSTACK_WEBHOOK_SECRET', default='your-webhook-secret-key')
FRONTEND_URL = config('FRONTEND_URL', default='https://ebooks.dkituyiacademy.org')

# File Upload Settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024  # 50MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024  # 50MB

# Payment Settings
PAYMENT_CURRENCY = 'USD'
DEFAULT_BOOK_PRICE = 9.99

# Email Settings for dkituyi academy
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='mail.dkituyiacademy.org')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='ebooks@dkituyiacademy.org')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='@Admin@2026')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='dkituyi academy <noreply@dkituyiacademy.org>')
ADMIN_EMAIL = config('ADMIN_EMAIL', default='admin@dkituyiacademy.org')

# Email Settings for Development
if DEBUG:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    DEFAULT_FROM_EMAIL = 'dkituyi academy <test@dkituyiacademy.org>'
    ADMIN_EMAIL = 'admin@dkituyiacademy.org'

# dkituyi academy Branding
ACADEMY_NAME = 'dkituyi academy'
ACADEMY_TAGLINE = 'Celebrating Great Literature & Digital Reading'
ACADEMY_URL = config('ACADEMY_URL', default='https://dkituyiacademy.org')

# Payment Settings (in KES)
CHAPTER_PRICE = 25
SECTION_PRICE = 49
BOOK_PRICE_MIN = 99
BOOK_PRICE_MAX = 149
BOOK_PRICE_DEFAULT = 129
SUBSCRIPTION_WEEKLY = 99
SUBSCRIPTION_MONTHLY = 299
SUBSCRIPTION_PREMIUM = 499

# Production Security Settings
SECURE_SSL_REDIRECT = not DEBUG  # Only redirect to HTTPS in production
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = not DEBUG  # Only require secure cookies in production
CSRF_COOKIE_SECURE = not DEBUG  # Only require secure CSRF cookies in production
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Rate Limiting
RATELIMIT_ENABLE = True
RATELIMIT_USE_CACHE = 'default'
