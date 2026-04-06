from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import BasePermission
from rest_framework.views import APIView
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.db.models import Sum, Avg, Count, Q
from django.shortcuts import get_object_or_404

from .models import UserLibrary, ReadingProgress, ReadingSession
from .serializers import (
    UserLibrarySerializer, 
    ReadingProgressSerializer, 
    ReadingSessionSerializer
)
from books.models import Book


# Custom APIView base that bypasses CSRF for JWT endpoints
class CSRFExemptAPIView(APIView):
    """Base APIView that bypasses CSRF checks"""
    authentication_classes = []
    
    def dispatch(self, request, *args, **kwargs):
        # Mark the request as CSRF exempt at the Django level
        request._dont_enforce_csrf_checks = True
        return super().dispatch(request, *args, **kwargs)


class IsJWTAuthenticated(BasePermission):
    """
    Custom permission class that works with JWT middleware
    """
    def has_permission(self, request, view):
        print(f"DEBUG: Library IsJWTAuthenticated.has_permission called for {request.path}")
        print(f"DEBUG: Request method: {request.method}")
        print(f"DEBUG: hasattr(request, 'user_payload'): {hasattr(request, 'user_payload')}")
        if hasattr(request, 'user_payload'):
            print(f"DEBUG: request.user_payload: {request.user_payload}")
        
        result = hasattr(request, 'user_payload') and request.user_payload is not None
        print(f"DEBUG: IsJWTAuthenticated result: {result}")
        return result


def get_jwt_user_id(request) -> int:
    """Helper function to get user ID from JWT payload."""
    return getattr(request, 'user_payload', {}).get('user_id')


class LibraryViewSet(viewsets.ReadOnlyModelViewSet):
    """Main library ViewSet for general library operations"""
    permission_classes = [IsJWTAuthenticated]
    serializer_class = UserLibrarySerializer
    
    def get_queryset(self):
        return UserLibrary.objects.filter(is_active=True)
    
    @action(detail=False, methods=['get'])
    def available_books(self, request):
        """Get all available books in the library"""
        books = Book.objects.filter(
            Q(is_free=True) | 
            Q(userlibrary__is_active=True)
        ).distinct()
        
        # Get user's library if authenticated
        user_library = {}
        if hasattr(request, 'user_payload') and request.user_payload:
            user_id = get_jwt_user_id(request)
            if user_id:
                user_library = UserLibrary.objects.filter(
                    user_id=user_id, 
                    is_active=True
                ).values_list('book_id', flat=True)
        
        data = []
        for book in books:
            book_data = {
                'id': book.id,
                'title': book.title,
                'author': book.author.name,
                'description': book.description[:200] + '...' if len(book.description) > 200 else book.description,
                'cover_url': book.cover_display_url,
                'price': float(book.price),
                'is_free': book.is_free,
                'pages': book.pages,
                'rating': float(book.rating),
                'in_library': book.id in user_library if user_library else False
            }
            data.append(book_data)
        
        return Response(data)


@method_decorator(csrf_exempt, name='dispatch')
class UserLibraryViewSet(viewsets.ModelViewSet):
    """User library management ViewSet"""
    serializer_class = UserLibrarySerializer
    permission_classes = [IsJWTAuthenticated]
    authentication_classes = []  # Disable session auth to bypass CSRF
    
    @csrf_exempt
    def dispatch(self, request, *args, **kwargs):
        # Mark the request as CSRF exempt
        request._dont_enforce_csrf_checks = True
        return super().dispatch(request, *args, **kwargs)
    
    def get_queryset(self):
        user_id = get_jwt_user_id(self.request)
        if not user_id:
            print(f"DEBUG: No user_id found in request")
            return UserLibrary.objects.none()
        
        print(f"DEBUG: Getting library for user_id: {user_id}")
        try:
            queryset = UserLibrary.objects.filter(user_id=user_id, is_active=True)
            print(f"DEBUG: Found {queryset.count()} library entries for user {user_id}")
            return queryset
        except Exception as e:
            print(f"DEBUG: Error in get_queryset: {str(e)}")
            return UserLibrary.objects.none()
    
    def get_serializer_context(self):
        """Ensure request context is passed to serializer for reading progress"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def list(self, request, *args, **kwargs):
        """Override list method to add error handling"""
        try:
            print(f"DEBUG: UserLibraryViewSet.list called")
            response = super().list(request, *args, **kwargs)
            print(f"DEBUG: Library list response: {response.data}")
            return response
        except Exception as e:
            print(f"DEBUG: Error in UserLibraryViewSet.list: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': 'Failed to fetch library data', 'detail': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def create(self, request, *args, **kwargs):
        """
        Add a book to user's library.
        
        Expected POST data:
        {
            "book_id": 123
        }
        """
        # Debug JWT authentication
        print(f"DEBUG: UserLibraryViewSet.create called")
        print(f"DEBUG: hasattr(request, 'user_payload'): {hasattr(request, 'user_payload')}")
        if hasattr(request, 'user_payload'):
            print(f"DEBUG: request.user_payload: {request.user_payload}")
        
        # Get user ID from JWT payload
        user_id = get_jwt_user_id(request)
        if not user_id:
            print(f"DEBUG: No user_id found in request")
            return Response(
                {'error': 'Authentication required - no user ID found'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        print(f"DEBUG: Processing request for user_id: {user_id}")
        
        # Get book_id from request data
        book_id = request.data.get('book_id')
        if not book_id:
            return Response(
                {'error': 'book_id is required in request body'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate book exists
        try:
            book = Book.objects.get(pk=book_id)
            print(f"DEBUG: Found book: {book.title}")
        except Book.DoesNotExist:
            return Response(
                {'error': f'Book with ID {book_id} not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if already in library
        if UserLibrary.objects.filter(user_id=user_id, book=book, is_active=True).exists():
            return Response(
                {'error': 'Book already in library', 'book_id': book_id}, 
                status=status.HTTP_409_CONFLICT
            )
        
        # Create library entry
        try:
            library_entry = UserLibrary.objects.create(
                user_id=user_id,
                book=book,
                purchased=True,
                is_active=True
            )
            print(f"DEBUG: Created library entry: {library_entry.id}")
        except Exception as e:
            print(f"DEBUG: Error creating library entry: {e}")
            return Response(
                {'error': 'Failed to add book to library'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Initialize reading progress
        ReadingProgress.objects.get_or_create(
            user_id=user_id,
            book=book,
            defaults={
                'current_page': 1,
                'total_pages': book.pages or 0,
                'progress_percentage': 0.0
            }
        )
        
        # Return success response
        serializer = self.get_serializer(library_entry)
        return Response(
            {
                'message': 'Book added to library successfully',
                'data': serializer.data
            }, 
            status=status.HTTP_201_CREATED
        )
    
    def perform_create(self, serializer):
        user_id = getattr(self.request, 'user_payload', {}).get('user_id')
        if user_id:
            serializer.save(user_id=user_id)
    
    @action(detail=True, methods=['post'])
    def add_to_library(self, request, pk=None):
        """Add a book to user's library"""
        user_id = get_jwt_user_id(request)
        if not user_id:
            return Response(
                {'error': 'User ID required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        book = get_object_or_404(Book, pk=pk)
        
        # Check if already in library
        if UserLibrary.objects.filter(user_id=user_id, book=book).exists():
            return Response(
                {'error': 'Book already in library'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Add to library
        UserLibrary.objects.create(
            user_id=user_id,
            book=book,
            purchased=True
        )
        
        # Initialize reading progress
        ReadingProgress.objects.get_or_create(
            user_id=user_id,
            book=book,
            defaults={
                'current_page': 1,
                'total_pages': book.pages or 0
            }
        )
        
        return Response({'message': 'Book added to library successfully'})
    
    @action(detail=True, methods=['delete'])
    def remove_from_library(self, request, pk=None):
        """Remove a book from user's library"""
        user_id = get_jwt_user_id(request)
        if not user_id:
            return Response(
                {'error': 'User ID required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        book = get_object_or_404(Book, pk=pk)
        
        try:
            library_entry = UserLibrary.objects.get(
                user_id=user_id, 
                book=book,
                is_active=True
            )
            library_entry.is_active = False
            library_entry.save()
            
            return Response({'message': 'Book removed from library'})
        except UserLibrary.DoesNotExist:
            return Response(
                {'error': 'Book not found in library'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class UserStatsViewSet(viewsets.ReadOnlyModelViewSet):
    """User reading statistics ViewSet"""
    serializer_class = UserLibrarySerializer  # Required by DRF, though we use custom action
    permission_classes = [IsJWTAuthenticated]
    
    def get_queryset(self):
        return ReadingProgress.objects.none()  # This ViewSet doesn't use queryset directly
    
    @action(detail=False, methods=['get'])
    def reading_stats(self, request):
        """Get user's reading statistics"""
        user_id = get_jwt_user_id(request)
        if not user_id:
            return Response({'error': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get reading progress stats
        progress_stats = ReadingProgress.objects.filter(user_id=user_id).aggregate(
            total_books=Count('id'),
            completed_books=Count('id', filter=Q(is_completed=True)),
            avg_progress=Avg('progress_percentage'),
            total_reading_time=Sum('reading_time_minutes')
        )
        
        # Get library stats
        library_stats = UserLibrary.objects.filter(
            user_id=user_id, 
            is_active=True
        ).aggregate(
            total_purchased=Count('id', filter=Q(purchased=True)),
            total_books=Count('id')
        )
        
        # Get recent activity
        recent_sessions = ReadingSession.objects.filter(
            user_id=user_id,
            end_time__isnull=False
        ).order_by('-end_time')[:5]
        
        session_data = ReadingSessionSerializer(recent_sessions, many=True).data
        
        data = {
            'library': {
                'total_books': library_stats['total_books'] or 0,
                'purchased_books': library_stats['total_purchased'] or 0,
            },
            'reading': {
                'total_books_started': progress_stats['total_books'] or 0,
                'completed_books': progress_stats['completed_books'] or 0,
                'average_progress': round(progress_stats['avg_progress'] or 0, 2),
                'total_reading_minutes': progress_stats['total_reading_time'] or 0,
            },
            'recent_sessions': session_data
        }
        
        return Response(data)


class UserRecentBooksViewSet(viewsets.ReadOnlyModelViewSet):
    """User's recently read books ViewSet"""
    serializer_class = ReadingProgressSerializer
    permission_classes = [IsJWTAuthenticated]
    
    def get_queryset(self):
        user_id = getattr(self.request, 'user_payload', {}).get('user_id')
        if not user_id:
            return ReadingProgress.objects.none()
        return ReadingProgress.objects.filter(
            user_id=user_id
        ).order_by('-last_read')[:10]


@method_decorator(csrf_exempt, name='dispatch')
class UserReadingProgressViewSet(viewsets.ModelViewSet):
    """User reading progress management ViewSet"""
    serializer_class = ReadingProgressSerializer
    permission_classes = [IsJWTAuthenticated]
    authentication_classes = []  # Disable session auth to bypass CSRF
    
    @csrf_exempt
    def dispatch(self, request, *args, **kwargs):
        # Mark the request as CSRF exempt
        request._dont_enforce_csrf_checks = True
        return super().dispatch(request, *args, **kwargs)
    
    def get_queryset(self):
        user_id = getattr(self.request, 'user_payload', {}).get('user_id')
        if not user_id:
            return ReadingProgress.objects.none()
        return ReadingProgress.objects.filter(user_id=user_id)
    
    def perform_create(self, serializer):
        user_id = getattr(self.request, 'user_payload', {}).get('user_id')
        if user_id:
            serializer.save(user_id=user_id)
    
    @action(detail=True, methods=['post'])
    def update_progress(self, request, pk=None):
        """Update reading progress for a book"""
        user_id = get_jwt_user_id(request)
        if not user_id:
            return Response(
                {'error': 'User ID required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        progress = get_object_or_404(ReadingProgress, pk=pk, user_id=user_id)
        
        current_page = request.data.get('current_page')
        total_pages = request.data.get('total_pages')
        
        if current_page is not None:
            try:
                current_page = int(current_page)
                if current_page < 1:
                    return Response(
                        {'error': 'Page number must be positive'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except ValueError:
                return Response(
                    {'error': 'Invalid page number'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if total_pages is not None:
            try:
                total_pages = int(total_pages)
                if total_pages < 1:
                    return Response(
                        {'error': 'Total pages must be positive'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except ValueError:
                return Response(
                    {'error': 'Invalid total pages'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        progress.update_progress(current_page, total_pages)
        
        return Response(ReadingProgressSerializer(progress).data)
    
    @action(detail=True, methods=['post'])
    def start_reading_session(self, request, pk=None):
        """Start a reading session for a book"""
        user_id = get_jwt_user_id(request)
        if not user_id:
            return Response(
                {'error': 'User ID required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        progress = get_object_or_404(ReadingProgress, pk=pk, user_id=user_id)
        
        start_page = request.data.get('start_page', progress.current_page)
        
        try:
            start_page = int(start_page)
        except ValueError:
            return Response(
                {'error': 'Invalid start page'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new reading session
        session = ReadingSession.objects.create(
            user_id=user_id,
            book=progress.book,
            start_page=start_page,
            start_time=timezone.now()
        )
        
        return Response(ReadingSessionSerializer(session).data)
    
    @action(detail=True, methods=['post'])
    def end_reading_session(self, request, pk=None):
        """End the current reading session for a book"""
        user_id = get_jwt_user_id(request)
        if not user_id:
            return Response(
                {'error': 'User ID required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        progress = get_object_or_404(ReadingProgress, pk=pk, user_id=user_id)
        
        end_page = request.data.get('end_page')
        if end_page is None:
            return Response(
                {'error': 'End page required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            end_page = int(end_page)
        except ValueError:
            return Response(
                {'error': 'Invalid end page'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find the most recent active session
        session = ReadingSession.objects.filter(
            user_id=user_id,
            book=progress.book,
            end_time__isnull=True
        ).order_by('-start_time').first()
        
        if not session:
            return Response(
                {'error': 'No active reading session found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # End the session
        session.end_session(end_page)
        
        # Update reading progress
        progress.update_progress(end_page)
        
        # Update total reading time
        progress.reading_time_minutes += session.duration_minutes
        progress.save()
        
        return Response({
            'session': ReadingSessionSerializer(session).data,
            'progress': ReadingProgressSerializer(progress).data
        })