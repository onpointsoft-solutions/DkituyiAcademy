from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import ReaderViewSet, unlock_page, get_unlocked_pages, create_note, get_notes, delete_note, create_bookmark, get_bookmarks, delete_bookmark, mark_page_completed, create_highlight, get_highlights, delete_highlight, get_categories, get_books_by_category, unlock_chapter, get_unlocked_chapters, get_chapter_info, get_book_chapters, test_endpoint
# from .whatsapp_views import generate_quote_share_image, share_highlight_to_whatsapp, share_note_to_whatsapp, share_achievement_to_whatsapp
# WhatsApp views file needs to be deployed to server
from .annotation_views import ReadingFeaturesViewSet
from .simple_views import SimpleReaderViewSet
from .pdf_reader_views import PDFReaderViewSet

router = SimpleRouter()
router.register(r'', ReaderViewSet, basename='reader')

urlpatterns = [
    path('', include(router.urls)),
    # Page unlocking endpoints
    path('features/unlock_page/', unlock_page, name='unlock_page'),
    path('features/unlocked_pages/<int:book_id>/', get_unlocked_pages, name='get_unlocked_pages'),
    path('features/mark_completed/', mark_page_completed, name='mark_page_completed'),
    
    # Notes endpoints
    path('features/notes/', create_note, name='create_note'),
    path('features/notes/<int:book_id>/', get_notes, name='get_notes'),
    path('features/notes/<int:note_id>/', delete_note, name='delete_note'),
    
    # Bookmarks endpoints
    path('features/bookmarks/', create_bookmark, name='create_bookmark'),
    path('features/bookmarks/<int:book_id>/', get_bookmarks, name='get_bookmarks'),
    path('features/bookmarks/<int:bookmark_id>/', delete_bookmark, name='delete_bookmark'),
    
    # Highlights endpoints
    path('features/highlights/', create_highlight, name='create_highlight'),
    path('features/highlights/<int:book_id>/', get_highlights, name='get_highlights'),
    path('features/highlights/<int:highlight_id>/', delete_highlight, name='delete_highlight'),
    
    # Categorization endpoints
    path('categories/', get_categories, name='get_categories'),
    path('books/category/<int:category_id>/', get_books_by_category, name='get_books_by_category'),
    path('books/', get_books_by_category, name='get_all_books'),
    
    # Chapter unlocking endpoints
    path('chapters/unlock/', unlock_chapter, name='unlock_chapter'),
    path('books/<int:book_id>/chapters/unlocked/', get_unlocked_chapters, name='get_unlocked_chapters'),
    path('books/<int:book_id>/chapters/<int:chapter_number>/', get_chapter_info, name='get_chapter_info'),
    path('books/<int:book_id>/chapters/', get_book_chapters, name='get_book_chapters'),
    
    # WhatsApp sharing endpoints (commented out until file deployed)
    # path('share/quote-image/', generate_quote_share_image, name='generate_quote_share_image'),
    # path('share/highlight/', share_highlight_to_whatsapp, name='share_highlight_to_whatsapp'),
    # path('share/note/', share_note_to_whatsapp, name='share_note_to_whatsapp'),
    # path('share/achievement/', share_achievement_to_whatsapp, name='share_achievement_to_whatsapp'),
    
    # Test endpoint
    path('test/', test_endpoint, name='test_endpoint'),
]