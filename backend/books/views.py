import re
import io
import logging
import os
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Avg
from django.http import HttpResponse, HttpResponseNotFound
import fitz  # PyMuPDF
import re
import json
from datetime import datetime
from decimal import Decimal
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.utils.encoding import smart_str
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from .models import Book, BookReview
from .serializers import BookSerializer, BookListSerializer, BookReviewSerializer, PublicBookSerializer
from library.models import UserLibrary
from admin_api.permissions import IsStaffUser

logger = logging.getLogger(__name__)


class IsJWTAuthenticated(BasePermission):
    """
    Custom permission class that works with JWT middleware
    """
    def has_permission(self, request, view):
        logger.debug(f"IsJWTAuthenticated.has_permission called for {request.path}")
        
        # Check if JWT middleware has set user_payload
        if hasattr(request, 'user_payload') and request.user_payload:
            return True
        
        # Fallback to standard Django authentication
        has_user = hasattr(request, 'user')
        is_auth = has_user and hasattr(request.user, 'is_authenticated') and request.user.is_authenticated
        
        return is_auth


@method_decorator(csrf_exempt, name='dispatch')
class BookViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and creating books (admin can create, others can read)
    """
    queryset = Book.objects.all()
    authentication_classes = []  # Disable session auth to bypass CSRF
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['categories', 'author', 'language']
    search_fields = ['title', 'subtitle', 'description', 'author__name']
    ordering_fields = ['title', 'created_at', 'price', 'rating', 'publication_date']
    ordering = ['-created_at']
    
    def dispatch(self, request, *args, **kwargs):
        """
        Override dispatch to handle JWT authentication before permission checks
        """
        print(f"DEBUG: BookViewSet.dispatch called for {request.method} {request.path}")
        print(f"DEBUG: hasattr(request, 'user_payload'): {hasattr(request, 'user_payload')}")
        
        # Check if user is authenticated via JWT
        if hasattr(request, 'user_payload') and request.user_payload:
            print(f"DEBUG: User is authenticated via JWT, proceeding with request")
            return super().dispatch(request, *args, **kwargs)
        
        # If not authenticated, check if this is a read-only action
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            print(f"DEBUG: Allowing read-only request without authentication")
            return super().dispatch(request, *args, **kwargs)
        
        # For write operations, require authentication
        print(f"DEBUG: Authentication required for {request.method} request")
        from rest_framework.exceptions import AuthenticationFailed
        raise AuthenticationFailed("Authentication required")
    
    def get_permissions(self):
        """
        Admin users can create books, all users (including guests) can read
        """
        print(f"DEBUG: BookViewSet.get_permissions called for action: {self.action}")
        
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsStaffUser]
            print(f"DEBUG: Using IsStaffUser permission for admin action: {self.action}")
        else:
            # Allow anyone to view books (preview mode)
            permission_classes = [AllowAny]
            print(f"DEBUG: Using AllowAny permission for read action: {self.action}")
        
        permissions = [permission() for permission in permission_classes]
        print(f"DEBUG: Permission classes: {[p.__class__.__name__ for p in permissions]}")
        return permissions
    
    def get_serializer_class(self):
        if self.action == 'list':
            return BookListSerializer
        return BookSerializer
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def create(self, request, *args, **kwargs):
        """Create a new book instance."""
        logger.debug(f"BookViewSet.create called")
        logger.debug(f"Request data: {request.data}")
        logger.debug(f"Request files: {request.FILES}")
        
        serializer = self.get_serializer(data=request.data)
        logger.debug(f"Serializer created: {serializer.__class__.__name__}")
        is_valid = serializer.is_valid()
        logger.debug(f"Serializer is_valid: {is_valid}")
        
        if not is_valid:
            logger.warning(f"Serializer errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        logger.debug("Serializer validated, calling save()")
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        
        logger.info(f"Book created successfully: {serializer.data.get('title', 'Unknown')}")
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        """Get reviews for a specific book"""
        book = self.get_object()
        reviews = book.reviews.all()
        serializer = BookReviewSerializer(reviews, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def add_review(self, request, pk=None):
        """Add a review for a book"""
        book = self.get_object()
        user_id = request.user_payload.get('user_id')
        
        serializer = BookReviewSerializer(data=request.data)
        if serializer.is_valid():
            # Check if user already reviewed this book
            existing_review = BookReview.objects.filter(book=book, user_id=user_id).first()
            if existing_review:
                # Update existing review
                existing_review.rating = serializer.validated_data['rating']
                existing_review.review_text = serializer.validated_data.get('review_text', '')
                existing_review.save()
                
                # Update book rating
                self._update_book_rating(book)
                
                return Response(BookReviewSerializer(existing_review).data)
            else:
                # Create new review
                serializer.save(book=book, user_id=user_id)
                
                # Update book rating
                self._update_book_rating(book)
                
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _update_book_rating(self, book):
        """Update book's average rating"""
        avg_rating = book.reviews.aggregate(avg_rating=Avg('rating'))['avg_rating']
        if avg_rating:
            book.rating = round(avg_rating, 2)
            book.rating_count = book.reviews.count()
            book.save()


class PDFStreamingView(APIView):
    """
    Stream PDF files with range request support - public access for preview
    """
    permission_classes = [AllowAny]
    
    def get(self, request, book_id):
        try:
            # Get book and verify access
            book = get_object_or_404(Book, id=book_id)
            
            # Check if user has access to this book
            user_id = None
            is_admin = False
            
            if hasattr(request, 'user') and request.user.is_authenticated:
                user_id = request.user.id
                is_admin = request.user.is_staff or request.user.is_superuser
            elif hasattr(request, 'user_payload') and request.user_payload and 'user_id' in request.user_payload:
                user_id = request.user_payload['user_id']
                # Check admin status from JWT payload
                is_admin = request.user_payload.get('is_staff', False) or request.user_payload.get('is_superuser', False)
            
            # For public preview mode, skip library access check - everyone can view PDFs
            
            # Get PDF file path
            if not book.pdf_file:
                logger.warning(f"Book {book_id} ({book.title}) has no PDF file")
                return HttpResponseNotFound(
                    "PDF file not available for this book.",
                    content_type="text/plain"
                )
            
            pdf_path = book.pdf_file.path
            
            if not os.path.exists(pdf_path):
                logger.error(f"PDF file not found: {pdf_path}")
                return HttpResponseNotFound(
                    "PDF file not found on server.",
                    content_type="text/plain"
                )
            
            # Get file size
            file_size = os.path.getsize(pdf_path)
            
            # Handle range requests for streaming
            range_header = request.META.get('HTTP_RANGE', '').strip()
            
            if range_header:
                # Parse range header: "bytes=0-1024"
                try:
                    range_match = range_header.replace('bytes=', '').split('-')
                    start = int(range_match[0]) if range_match[0] else 0
                    end = int(range_match[1]) if len(range_match) > 1 and range_match[1] else file_size - 1
                    
                    # Validate range
                    if start >= file_size or end >= file_size or start > end:
                        return HttpResponse(
                            "Requested Range Not Satisfiable",
                            status=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
                            headers={
                                'Content-Range': f'bytes */{file_size}'
                            }
                        )
                    
                    # Read the requested range
                    with open(pdf_path, 'rb') as f:
                        f.seek(start)
                        data = f.read(end - start + 1)
                    
                    # Return partial content
                    response = HttpResponse(
                        data,
                        content_type='application/pdf',
                        status=status.HTTP_206_PARTIAL_CONTENT,
                        headers={
                            'Content-Range': f'bytes {start}-{end}/{file_size}',
                            'Accept-Ranges': 'bytes',
                            'Content-Length': str(len(data)),
                            'Cache-Control': 'public, max-age=3600',
                            'Content-Disposition': f'inline; filename="{smart_str(book.title)}.pdf"',
                            'X-Content-Type-Options': 'nosniff',
                            'X-Frame-Options': 'SAMEORIGIN',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'GET, OPTIONS',
                            'Access-Control-Allow-Headers': 'Range, Authorization',
                        }
                    )
                    
                    logger.info(f"PDF range request: {book.title} - bytes {start}-{end}/{file_size}")
                    return response
                    
                except (ValueError, IndexError) as e:
                    logger.error(f"Invalid range request: {range_header}, error: {e}")
                    return HttpResponse(
                        "Invalid range request",
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Full file request
            with open(pdf_path, 'rb') as f:
                data = f.read()
            
            response = HttpResponse(
                data,
                content_type='application/pdf',
                headers={
                    'Content-Length': str(file_size),
                    'Accept-Ranges': 'bytes',
                    'Cache-Control': 'public, max-age=3600',
                    'Content-Disposition': f'inline; filename="{smart_str(book.title)}.pdf"',
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'SAMEORIGIN',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Range, Authorization',
                }
            )
            
            logger.info(f"PDF full request: {book.title} - {file_size} bytes")
            return response
            
        except Exception as e:
            logger.error(f"Error serving PDF: {str(e)}")
            return HttpResponse(
                "Internal server error while loading PDF.",
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BookProgressView(APIView):
    """
    Update reading progress for a book
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, book_id):
        try:
            book = get_object_or_404(Book, id=book_id)
            
            # Verify user has access
            user_id = None
            if hasattr(request, 'user') and request.user.is_authenticated:
                user_id = request.user.id
            elif hasattr(request, 'user_payload') and 'user_id' in request.user_payload:
                user_id = request.user_payload['user_id']
            
            if not UserLibrary.objects.filter(
                user_id=user_id,
                book=book,
                is_active=True
            ).exists():
                return Response(
                    {"error": "You don't have access to this book"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get progress data
            page = request.data.get('page', 1)
            progress_percentage = request.data.get('progress_percentage', 0)
            
            # Update or create progress (you might want to use a Progress model)
            # For now, just log it
            logger.info(f"Progress update: User {user_id}, Book {book.title}, Page {page}, Progress {progress_percentage}%")
            
            return Response({
                "success": True,
                "page": page,
                "progress_percentage": progress_percentage,
                "message": "Progress updated successfully"
            })
            
        except Exception as e:
            logger.error(f"Error updating progress: {str(e)}")
            return Response(
                {"error": "Failed to update progress"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PublicBookViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public ViewSet for viewing books without authentication
    """
    queryset = Book.objects.all()
    permission_classes = [AllowAny]  # Explicitly allow any access
    serializer_class = PublicBookSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['categories', 'author', 'language']
    search_fields = ['title', 'subtitle', 'description', 'author__name']
    ordering_fields = ['title', 'created_at', 'price', 'rating']


@api_view(['GET'])
def test_public_books(request):
    """Test endpoint for public books access"""
    print(f"just DEBUG: test_public_books called for {request.path}")
    print(f"just DEBUG: Request method: {request.method}")
    print(f"just DEBUG: Request user: {getattr(request, 'user', 'No user')}")
    print(f"just DEBUG: Request user_payload: {getattr(request, 'user_payload', 'No user_payload')}")
    
    from .models import Book
    books = Book.objects.all()  # Remove limit to get all books
    data = []
    for book in books:
        data.append({
            'id': book.id,
            'title': book.title,
            'author_name': book.author.name if book.author else 'Unknown',
            'price': float(book.price),
            'is_free': book.is_free,
            'pages': book.pages,
            'cover_url': book.cover_display_url,  # Use the property that handles both cover_image and cover_url
            'cover_display_url': book.cover_display_url,  # Add both fields for compatibility
            'description': book.description if book.description else '',
            'isbn': book.isbn if book.isbn else '',
            'publication_date': book.publication_date.isoformat() if book.publication_date else None,
        })
    
    print(f"just DEBUG: Returning {len(data)} books with cover URLs")
    return Response(data)


class PDFMetadataExtractionView(APIView):
    """
    Extract metadata and chapters from uploaded PDF
    """
    permission_classes = [IsStaffUser]

    def post(self, request):
        try:
            pdf_file = request.FILES.get('pdf_file')

            if not pdf_file:
                return Response({'error': 'No PDF file provided'}, status=400)

            if not pdf_file.name.lower().endswith('.pdf'):
                return Response({'error': 'File must be a PDF'}, status=400)

            # Reset pointer and read file
            pdf_file.seek(0)
            pdf_content = pdf_file.read()

            metadata = {}

            try:
                # Use PyMuPDF for better chapter extraction
                pdf_document = fitz.open(stream=pdf_content, filetype="pdf")
                
                # -----------------------------
                # BASIC METADATA
                # -----------------------------
                if pdf_document.metadata:
                    metadata.update({
                        'title': (pdf_document.metadata.get('title') or '').strip(),
                        'author': (pdf_document.metadata.get('author') or '').strip(),
                        'subject': (pdf_document.metadata.get('subject') or '').strip(),
                        'creator': (pdf_document.metadata.get('creator') or '').strip(),
                        'producer': (pdf_document.metadata.get('producer') or '').strip(),
                    })

                metadata['pages'] = pdf_document.page_count

                # -----------------------------
                # EXTRACT CHAPTERS FROM OUTLINE
                # -----------------------------
                chapters = []

                try:
                    outline = pdf_document.get_outline()
                    logger.info(f"DEBUG: PyMuPDF outline found with {len(outline)} items")
                    
                    if outline:
                        def extract_outline(outline_items, level=0):
                            extracted = []
                            for i, item in enumerate(outline_items):
                                try:
                                    # PyMuPDF outline item structure
                                    title = item[1] if len(item) > 1 else str(item)
                                    page_dest = item[2] if len(item) > 2 else None
                                    
                                    logger.info(f"DEBUG: Processing outline item {i} at level {level}: '{title}'")
                                    
                                    # Get page number from destination
                                    page_num = None
                                    if page_dest:
                                        if isinstance(page_dest, fitz.Point):
                                            # Simple page reference
                                            page_num = page_dest.y + 1
                                        elif isinstance(page_dest, tuple) and len(page_dest) > 0:
                                            # Page reference in tuple
                                            page_num = page_dest[0] + 1
                                        elif hasattr(page_dest, 'page'):
                                            page_num = page_dest.page + 1
                                    
                                    if page_num is None:
                                        # Try to find the page by searching for the title
                                            for page_idx in range(pdf_document.page_count):
                                                page = pdf_document[page_idx]
                                                if title.lower() in page.get_text().lower():
                                                    page_num = page_idx + 1
                                                    break
                                    
                                    logger.info(f"DEBUG: Outline item - title: '{title}', page: {page_num}")
                                    
                                    # Clean title
                                    title = re.sub(r'\d+\.$', '', title).strip()
                                    
                                    # Check if this looks like a chapter
                                    is_chapter = (
                                        re.search(r'\b(chapter|ch|section|part)\b', title, re.IGNORECASE) or
                                        re.search(r'^\d+[\.\)]', title) or
                                        re.search(r'^[A-Z][A-Z\s]{5,}$', title) or
                                        len(title.split()) <= 5
                                    )
                                    
                                    logger.info(f"DEBUG: Is chapter: {is_chapter}")
                                    
                                    if is_chapter and page_num:
                                        extracted.append({
                                            'title': title,
                                            'page_start': page_num,
                                            'level': level
                                        })
                                        logger.info(f"DEBUG: Added chapter: '{title}' at page {page_num}")
                                    elif not is_chapter:
                                        logger.debug(f"DEBUG: Skipped non-chapter item: '{title}'")
                                    
                                except Exception as e:
                                    logger.error(f"DEBUG: Error processing outline item {i}: {e}")
                                    import traceback
                                    logger.error(f"DEBUG: Traceback: {traceback.format_exc()}")
                                    continue
                            
                            return extracted

                        chapters = extract_outline(outline)
                        logger.info(f"DEBUG: Extracted {len(chapters)} chapters from outline")
                        
                    else:
                        logger.info(f"DEBUG: No outline found in PDF")
                        
                except Exception as e:
                    logger.error(f"DEBUG: Error extracting outline: {e}")
                    import traceback
                    logger.error(f"DEBUG: Traceback: {traceback.format_exc()}")

                # -----------------------------
                # FALLBACK: TEXT-BASED CHAPTER DETECTION
                # -----------------------------
                if not chapters:
                    logger.info(f"DEBUG: Using fallback text-based chapter detection")
                    
                    # Chapter patterns
                    chapter_patterns = [
                        r'^\s*(?:Chapter|CHAPTER)\s+\d+.*',
                        r'^\s*Chapter\s+\d+.*',
                        r'^\s*\d+\.\s+.*',
                        r'^\s*\d+\)\s+.*',
                        r'^\s*[A-Z][A-Z\s]{5,}\s*$',
                        r'^\s*Section\s+\d+.*',
                        r'^\s*Part\s+\d+.*'
                    ]
                    
                    # Scan first 50 pages for chapter patterns
                    for i in range(min(50, pdf_document.page_count)):
                        page = pdf_document[i]
                        text = page.get_text()
                        lines = text.split('\n')
                        
                        logger.info(f"DEBUG: Scanning page {i+1} - extracted {len(lines)} lines")
                        
                        for j, line in enumerate(lines):
                            line = line.strip()
                            if len(line) > 0 and len(line) < 100:
                                for pattern in chapter_patterns:
                                    if re.match(pattern, line, re.IGNORECASE):
                                        logger.info(f"DEBUG: Found chapter in text: '{line}' on page {i+1}")
                                        chapters.append({
                                            'title': line,
                                            'page_start': i + 1,
                                            'level': 0
                                        })
                                        break
                    
                    logger.info(f"DEBUG: Found {len(chapters)} chapters using text detection")

                # -----------------------------
                # PROCESS CHAPTERS AND CALCULATE PAGE RANGES
                # -----------------------------
                if chapters:
                    logger.info(f"DEBUG: Processing {len(chapters)} chapters")
                    
                    processed_chapters = []
                    for i, chapter in enumerate(chapters):
                        # Calculate page range
                        if i < len(chapters) - 1:
                            page_end = chapters[i + 1]['page_start'] - 1
                        else:
                            page_end = pdf_document.page_count
                        
                        # Ensure page range is valid
                        page_start = max(1, chapter['page_start'])
                        page_end = min(pdf_document.page_count, page_end)
                        
                        pages_count = page_end - page_start + 1
                        
                        # Clean title
                        title = chapter['title']
                        title = re.sub(r'^\d+[\.\)]\s*', '', title)  # Remove leading numbers
                        title = re.sub(r'^(?:Chapter|CHAPTER)\s+\d+\s*[:\.-]?\s*', '', title)  # Remove "Chapter X" prefix
                        title = title.strip()
                        
                        if not title:
                            title = f"Chapter {i + 1}"
                        
                        processed_chapter = {
                            'chapter_number': i + 1,
                            'title': title,
                            'page_start': page_start,
                            'page_end': page_end,
                            'pages_count': pages_count,
                            'level': chapter.get('level', 0)
                        }
                        
                        processed_chapters.append(processed_chapter)
                        logger.info(f"DEBUG: Processed chapter {i+1}: '{title}' (pages {page_start}-{page_end}, {pages_count} pages)")
                    
                    metadata['chapters'] = processed_chapters
                    logger.info(f"DEBUG: Final chapters metadata: {processed_chapters}")
                else:
                    logger.info(f"DEBUG: No chapters found")
                    metadata['chapters'] = []

                pdf_document.close()

            except Exception as e:
                logger.error(f"DEBUG: Error processing PDF: {e}")
                import traceback
                logger.error(f"DEBUG: Traceback: {traceback.format_exc()}")
                return Response({'error': f'Failed to process PDF: {str(e)}'}, status=500)

            # Return metadata with chapters
            return Response({
                'message': 'PDF metadata extracted successfully',
                'metadata': metadata,
                'chapters_found': len(metadata.get('chapters', []))
            })

        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return Response(
                {'error': 'Unexpected server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )