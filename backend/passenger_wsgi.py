import os
import sys

# Add the project directory to Python path
INTERP = "/home/viyykxmm/virtualenv/ebook/3.13/bin/python"
if sys.executable != INTERP:
    os.execl(INTERP, INTERP, *sys.argv)

# Add project to path
sys.path.insert(0, '/home/viyykxmm/ebook')

# Set environment variables
os.environ['DJANGO_SETTINGS_MODULE'] = 'bookreader.settings'

# Import Django and create WSGI application
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
