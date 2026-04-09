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
                import PyPDF2

                pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))

                # -----------------------------
                # BASIC METADATA
                # -----------------------------
                if pdf_reader.metadata:
                    metadata.update({
                        'title': (pdf_reader.metadata.get('/Title') or '').strip(),
                        'author': (pdf_reader.metadata.get('/Author') or '').strip(),
                        'subject': (pdf_reader.metadata.get('/Subject') or '').strip(),
                        'creator': (pdf_reader.metadata.get('/Creator') or '').strip(),
                        'producer': (pdf_reader.metadata.get('/Producer') or '').strip(),
                    })

                metadata['pages'] = len(pdf_reader.pages)

                # -----------------------------
                # EXTRACT CHAPTERS FROM OUTLINE
                # -----------------------------
                chapters = []
                
                try:
                    logger.info(f"DEBUG: Checking PDF outline...")
                    logger.info(f"DEBUG: pdf_reader.outline exists: {hasattr(pdf_reader, 'outline')}")
                    
                    if hasattr(pdf_reader, 'outline') and pdf_reader.outline:
                        logger.info(f"DEBUG: PDF outline found with {len(pdf_reader.outline)} items")
                        
                        def extract_outline(outline, level=0):
                            extracted = []
                            
                            for i, item in enumerate(outline):
                                logger.info(f"DEBUG: Processing outline item {i} at level {level}: {type(item)}")
                                
                                if isinstance(item, list):
                                    logger.info(f"DEBUG: Found nested list with {len(item)} items")
                                    extracted.extend(extract_outline(item, level + 1))
                                else:
                                    try:
                                        title = item.title if hasattr(item, 'title') else str(item)
                                        page_num = pdf_reader.get_destination_page_number(item) + 1 if hasattr(item, 'dest') else None
                                        
                                        logger.info(f"DEBUG: Outline item - title: '{title}', page: {page_num}")
                                        
                                        # Check if this looks like a chapter
                                        is_chapter = (
                                            'chapter' in title.lower() or
                                            'ch.' in title.lower() or
                                            'section' in title.lower() or
                                            level <= 2 or
                                            (title.strip() and title[0].isdigit())
                                        )
                                        
                                        logger.info(f"DEBUG: Is chapter: {is_chapter}")
                                        
                                        if is_chapter:
                                            extracted.append({
                                                'title': title,
                                                'page_start': page_num,
                                                'level': level
                                            })
                                            logger.info(f"DEBUG: Added chapter: '{title}' at page {page_num}")
                                        
                                    except Exception as e:
                                        logger.warning(f"Outline parse error for item {i}: {e}")
                                        logger.warning(f"DEBUG: Item details: {item}")
                            
                            return extracted
                        
                        chapters = extract_outline(pdf_reader.outline)
                        logger.info(f"DEBUG: Extracted {len(chapters)} chapters from outline")
                    else:
                        logger.info("DEBUG: No PDF outline found")
                        
                except Exception as e:
                    logger.error(f"DEBUG: Outline extraction failed with error: {e}")
                    import traceback
                    logger.error(f"DEBUG: Traceback: {traceback.format_exc()}")

                # -----------------------------
                # FALLBACK: TEXT-BASED DETECTION
                # -----------------------------
                if not chapters:
                    logger.info("DEBUG: No chapters from outline, scanning text for chapters...")
                    logger.info(f"DEBUG: Scanning first {min(50, len(pdf_reader.pages))} pages")

                    for i, page in enumerate(pdf_reader.pages[:50]):
                        try:
                            text = page.extract_text() or ""
                            lines = text.split('\n')
                            
                            logger.info(f"DEBUG: Page {i+1} - extracted {len(lines)} lines")

                            for j, line in enumerate(lines):
                                line = line.strip()
                                
                                if line:  # Only log non-empty lines
                                    logger.debug(f"DEBUG: Page {i+1}, Line {j+1}: '{line[:50]}...'")

                                if (
                                    re.match(r'^\s*(chapter|ch\.|section)\s+[\divx]+', line, re.IGNORECASE) or
                                    re.match(r'^\s*\d+[\.\)]\s+[A-Z]', line) or
                                    re.match(r'^[A-Z][A-Z\s]{5,}$', line)
                                ):
                                    chapters.append({
                                        'title': line,
                                        'page_start': i + 1,
                                        'level': 0
                                    })
                                    logger.info(f"DEBUG: Found chapter in text: '{line}' on page {i+1}")
                                    break

                        except Exception as e:
                            logger.warning(f"DEBUG: Error scanning page {i+1}: {e}")
                    
                    logger.info(f"DEBUG: Text-based detection found {len(chapters)} chapters")
                else:
                    logger.info(f"DEBUG: Using outline chapters: {len(chapters)} found")

                # -----------------------------
                # CLEAN CHAPTERS + PAGE RANGES
                # -----------------------------
                if chapters:
                    cleaned_chapters = []

                    for i, chapter in enumerate(chapters):
                        title = re.sub(r'^\d+[\.\)]?\s*', '', chapter['title']).strip()

                        page_start = chapter.get('page_start', 1)
                        next_start = chapters[i + 1]['page_start'] if i + 1 < len(chapters) else len(pdf_reader.pages)

                        page_end = next_start - 1 if next_start > page_start else page_start

                        cleaned_chapters.append({
                            'chapter_number': i + 1,
                            'title': title,
                            'page_start': page_start,
                            'page_end': page_end,
                            'pages_count': page_end - page_start + 1,
                            'level': chapter.get('level', 0)
                        })

                    metadata['chapters'] = cleaned_chapters
                    logger.info(f"✅ Extracted {len(cleaned_chapters)} chapters")
                else:
                    metadata['chapters'] = []

                # -----------------------------
                # TEXT EXTRACTION (DESCRIPTION)
                # -----------------------------
                text = ""

                try:
                    first_page = pdf_reader.pages[0]
                    text = first_page.extract_text() or ""

                    if text:
                        cleaned_text = ' '.join(text.split())
                        metadata['description'] = cleaned_text[:500] + (
                            '...' if len(cleaned_text) > 500 else ''
                        )

                except Exception as e:
                    logger.warning(f"Text extraction failed: {e}")

                # -----------------------------
                # ISBN EXTRACTION
                # -----------------------------
                try:
                    isbn_pattern = r'(?:ISBN[-\s]*:?[\s]*)?(97[89][\d-]{10,}|\d[\d-]{9}[\dXx])'
                    matches = re.findall(isbn_pattern, text)

                    if matches:
                        isbn = re.sub(r'[-\s]', '', matches[0])
                        metadata['isbn'] = isbn

                except Exception as e:
                    logger.warning(f"ISBN extraction failed: {e}")

                # -----------------------------
                # PUBLICATION DATE
                # -----------------------------
                if not metadata.get('publication_date') and pdf_reader.metadata:
                    creation_date = pdf_reader.metadata.get('/CreationDate', '')

                    if creation_date and len(creation_date) > 10:
                        try:
                            date_str = creation_date[2:10]
                            metadata['publication_date'] = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
                        except Exception as e:
                            logger.warning(f"Date parsing failed: {e}")

                # -----------------------------
                # DEFAULT LANGUAGE
                # -----------------------------
                if not metadata.get('language'):
                    metadata['language'] = 'en'

                # -----------------------------
                # CLEAN METADATA
                # -----------------------------
                cleaned_metadata = {
                    k: v for k, v in metadata.items()
                    if v and (not isinstance(v, str) or v.strip())
                }

                logger.info(f"✅ PDF metadata extracted successfully")

                return Response({'metadata': cleaned_metadata})

            except Exception as e:
                logger.error(f"PDF processing failed: {e}")
                return Response(
                    {'error': f'Failed to process PDF: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return Response(
                {'error': 'Unexpected server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )