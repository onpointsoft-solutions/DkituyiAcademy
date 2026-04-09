# reader/views.py  — book_pdf action uses FileResponse for proper streaming
import os
from django.http import FileResponse, HttpResponse, Http404
from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.csrf import csrf_exempt
from books.models import Book, Category, BookChapter
from library.models import UserLibrary, ReadingProgress, ReadingSession
from django.db import transaction
from django.contrib.auth import get_user_model
from payments.models import Wallet, Transaction
from reader.models import UnlockedPage, Note, Bookmark, Highlight, UnlockedChapter

User = get_user_model()


def send_unlock_notification_email(user_id, book, unlock_type, details, amount_paid):
    """
    Send email notification when a user unlocks a page or chapter
    
    Args:
        user_id: ID of the user who made the unlock
        book: Book object that was unlocked
        unlock_type: 'page' or 'chapter'
        details: dict with additional details (page_number or chapter_number)
        amount_paid: amount paid for the unlock
    """
    try:
        user = User.objects.get(id=user_id)
        
        # Prepare email content
        if unlock_type == 'page':
            subject = f"Page Unlock Notification - {book.title}"
            message = f"""
User: {user.email} ({user.get_full_name() or 'N/A'})
Book: {book.title}
Action: Unlocked Page {details.get('page_number')}
Amount Paid: {amount_paid} KES
Date: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}
User ID: {user_id}
Book ID: {book.id}
"""
        elif unlock_type == 'chapter':
            subject = f"Chapter Unlock Notification - {book.title}"
            message = f"""
User: {user.email} ({user.get_full_name() or 'N/A'})
Book: {book.title}
Action: Unlocked Chapter {details.get('chapter_number')}
Amount Paid: {amount_paid} KES
Date: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}
User ID: {user_id}
Book ID: {book.id}
"""
        else:
            return False
        
        # Send email to books@dkituyiacademy.org
        send_mail(
            subject=subject,
            message=message,
            from_email='dkituyi academy <noreply@dkituyiacademy.com>',
            recipient_list=['books@dkituyiacademy.org'],
            fail_silently=False,
        )
        
        print(f"DEBUG: Unlock notification email sent for {unlock_type} unlock")
        return True
        
    except Exception as e:
        print(f"ERROR: Failed to send unlock notification email: {str(e)}")
        return False


def is_page_unlocked_by_chapters(user_id, book, page_number):
    """
    Check if a page is unlocked through chapter-based unlocking
    """
    try:
        print(f"DEBUG: Checking chapter-based unlock for page {page_number}")
        # Find which chapter this page belongs to
        chapters = book.chapters.all()
        print(f"DEBUG: Book has {chapters.count()} chapters")
        target_chapter = None
        
        for chapter in chapters:
            chapter_pages = chapter.pages.values_list('page_number', flat=True)
            print(f"DEBUG: Chapter {chapter.chapter_number} has pages: {list(chapter_pages)}")
            if page_number in chapter_pages:
                target_chapter = chapter
                print(f"DEBUG: Page {page_number} belongs to chapter {chapter.chapter_number}")
                break
        
        if not target_chapter:
            print(f"DEBUG: Page {page_number} does not belong to any chapter")
            return False
        
        # Check if this chapter is unlocked
        is_unlocked = UnlockedChapter.objects.filter(
            user_id=user_id,
            book=book,
            chapter_number=target_chapter.chapter_number
        ).exists()
        
        print(f"DEBUG: Chapter {target_chapter.chapter_number} unlocked status: {is_unlocked}")
        return is_unlocked
        
    except Exception as e:
        print(f"DEBUG: Error in is_page_unlocked_by_chapters: {str(e)}")
        return False


def is_page_unlocked(user_id, book, page_number):
    """
    Comprehensive check if a page is unlocked (page-based + chapter-based + free preview)
    """
    print(f"DEBUG: is_page_unlocked called for user_id={user_id}, book={book.title}, page={page_number}")
    
    # Check page-based unlocking
    if UnlockedPage.objects.filter(user_id=user_id, book=book, page_number=page_number).exists():
        print(f"DEBUG: Page {page_number} found in UnlockedPage table")
        return True
    
    # Check chapter-based unlocking
    if is_page_unlocked_by_chapters(user_id, book, page_number):
        print(f"DEBUG: Page {page_number} unlocked via chapter")
        return True
    
    # Check free preview (20% of book)
    if book.pages and book.pages > 0:
        free_count = max(1, int(book.pages * 0.2))
        print(f"DEBUG: Book has {book.pages} pages, free preview count: {free_count}")
        if page_number <= free_count:
            print(f"DEBUG: Page {page_number} is within free preview (<= {free_count})")
            return True
        else:
            print(f"DEBUG: Page {page_number} is NOT within free preview (> {free_count})")
    else:
        print(f"DEBUG: Book has no pages data or pages <= 0")
    
    print(f"DEBUG: Page {page_number} is NOT unlocked")
    return False


def get_user_from_jwt(request):
    if hasattr(request, 'user_payload') and request.user_payload:
        try:
            return User.objects.get(id=request.user_payload['user_id'])
        except (User.DoesNotExist, KeyError):
            return None
    return None


@api_view(['POST'])
@permission_classes([])
@csrf_exempt
def unlock_page(request):
    """Unlock a specific page of a book with sequential reading validation"""
    print(f"debug {request.data}")
    book_id     = request.data.get('book_id')
    page_number = request.data.get('page_number')
    
    # Debug logging for request data
    print(f"DEBUG: Unlock request - user_id: {getattr(request, 'user_payload', {}).get('user_id')}, book_id: {book_id}, page_number: {page_number}")
    print(f"DEBUG: Full request data: {request.data}")
    
    # Get user from JWT payload
    user_payload = getattr(request, 'user_payload', {})
    user_id = user_payload.get('user_id')
    
    if not user_id:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    if not book_id or page_number is None:
        return Response(
            {'error': 'book_id and page_number are required', 'received_data': request.data}, 
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        book = Book.objects.get(id=book_id)
        print(f"just  DEBUG: Book found: {book.title}")
    except Book.DoesNotExist:
        print("just  DEBUG: Book not found")
        return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)

    # Get user from JWT payload
    user_payload = getattr(request, 'user_payload', {})
    user_id = user_payload.get('user_id')
    
    if not user_id:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    # Check if user has library entry (purchased or free access)
    library_entry = UserLibrary.objects.filter(user_id=user_id, book=book).first()
    if library_entry:
        print(f"just  DEBUG: Library entry found: User {user_id} - Book {library_entry.book.title}")
    else:
        print(f"just  DEBUG: No library entry found for User {user_id}")
    
    # Allow page unlocking if:
    # 1. Book is free, OR
    # 2. User has purchased the book, OR  
    # 3. User is within 20% free preview range
    free_preview_pages = 1  # Always allow page 1
    if book.pages and book.pages > 0:
        free_preview_pages = max(1, int(book.pages * 0.2))  # 20% free preview
    
    if not book.is_free and not library_entry and page_number > free_preview_pages:
        print("just  DEBUG: No library entry and beyond free preview range")
        return Response(
            {'error': 'You must purchase this book first'},
            status=status.HTTP_403_FORBIDDEN,
        )
    
    # Check if page is already unlocked (either by page or chapter)
    if is_page_unlocked(user_id, book, page_number):
        print("just  DEBUG: Page already unlocked through page-based or chapter-based unlocking")
        return Response({'error': 'Page already unlocked'}, status=status.HTTP_400_BAD_REQUEST)

    # NEW: Sequential reading validation - check if previous page is completed
    if page_number > 1:
        previous_page = page_number - 1
        previous_progress = ReadingProgress.objects.filter(
            user_id=user_id, 
            book=book,
            current_page=previous_page,
            is_completed=True
        ).first()
        """ print(previous_progress)
        if previous_progress:
            print("You are stuck here")
            return Response({
                'error': f'You must complete page {previous_page} first',
                'previous_page': previous_page,
            }, status=status.HTTP_400_BAD_REQUEST)"""
    wallet, _ = Wallet.objects.get_or_create(user_id=user_id)
    print(f"just  DEBUG: Wallet: {wallet.balance} coins")
    
    # Calculate per-page cost using same logic as serializers
    from decimal import Decimal
    if book.is_free or not book.price or book.price <= 0:
        page_cost = Decimal('0')
    elif book.pages and book.pages > 0:
        # Use same calculation as serializers with Decimal for consistency
        page_cost = Decimal(str(book.price)) / Decimal(str(book.pages))
        page_cost = page_cost.quantize(Decimal('0.0001'))  # Round to 4 decimal places
        # Ensure minimum cost of 1 coin per page
        page_cost = max(Decimal('1'), page_cost)
    else:
        page_cost = Decimal('10')  # Fallback for books without page count
    
    print(f"just  DEBUG: Calculated page cost: {page_cost} coins (Book price: {book.price} KES, Pages: {book.pages})")

    if wallet.balance < page_cost:
        print(f"just  DEBUG: Insufficient balance: {wallet.balance} < {page_cost}")
        return Response({'error': 'Insufficient balance'}, status=status.HTTP_402_PAYMENT_REQUIRED)

    print(f"just  DEBUG: Starting transaction...")
    try:
        with transaction.atomic():
            print(f"just  DEBUG: Deducting {page_cost} from wallet balance {wallet.balance}")
            wallet.balance -= page_cost
            print(f"just  DEBUG: New wallet balance: {wallet.balance}")
            wallet.save()
            print(f"just  DEBUG: Wallet saved successfully")
            
            print(f"just  DEBUG: Creating transaction record...")
            Transaction.objects.create(
                user_id=user_id,
                transaction_type='unlock_page',
                amount=-page_cost,
                description=f'Unlocked page {page_number} of {book.title}',
                status='completed'
            )
            print(f"just  DEBUG: Transaction record created")
            
            print(f"just  DEBUG: Creating unlocked page record...")
            UnlockedPage.objects.create(user_id=user_id, book=book, page_number=page_number)
            print(f"just  DEBUG: Unlocked page record created")
            
            # Send email notification
            send_unlock_notification_email(
                user_id=user_id,
                book=book,
                unlock_type='page',
                details={'page_number': page_number},
                amount_paid=page_cost
            )
            
            print(f"just  DEBUG: Transaction completed successfully")
        
        print(f"just  DEBUG: Creating response...")
        return Response({
            'message': 'Page unlocked successfully', 
            'remaining_balance': wallet.balance,
            'page_cost': page_cost,
            'book_price': float(book.price),
            'book_pages': book.pages,
            'per_page_cost': float(round(book.price / book.pages, 2)) if book.pages > 0 and book.price > 0 else 0
        })
    except Exception as e:
        print(f"just  DEBUG: CRITICAL ERROR in transaction: {str(e)}")
        print(f"just  DEBUG: Error type: {type(e)}")
        return Response({'error': f'Transaction failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([])
@csrf_exempt
def mark_page_completed(request):
    """Mark a page as completed and update reading progress"""
    # Get user from JWT payload (works even when auth is skipped)
    user_payload = getattr(request, 'user_payload', {})
    user_id = user_payload.get('user_id')
    
    if not user_id:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    book_id = request.data.get('book_id')
    page_number = request.data.get('page_number')

    # Debug logging for request data
    print(f"DEBUG: Mark completed request - user_id: {user_id}, book_id: {book_id}, page_number: {page_number}")
    print(f"DEBUG: Full request data: {request.data}")

    if not book_id or page_number is None:
        return Response(
            {'error': 'book_id and page_number are required', 'received_data': request.data}, 
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not book_id or page_number is None:
        return Response({'error': 'book_id and page_number are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(id=user_id)
        book = Book.objects.get(id=book_id)
    except (User.DoesNotExist, Book.DoesNotExist):
        return Response({'error': 'User or book not found'}, status=status.HTTP_404_NOT_FOUND)

    # Update or create reading progress
    progress, created = ReadingProgress.objects.get_or_create(
        user_id=user_id, 
        book=book,
        defaults={'current_page': page_number, 'total_pages': book.pages}
    )
    
    # Use the update_progress method to properly calculate percentage
    progress.update_progress(current_page=page_number, total_pages=book.pages)
    
    # Mark the current page as completed
    progress.is_completed = True
    progress.last_read = timezone.now()
    progress.save()

    return Response({
        'message': f'Page {page_number} marked as completed',
        'progress': {
            'current_page': progress.current_page,
            'total_pages': progress.total_pages,
            'progress_percentage': progress.progress_percentage,
            'is_completed': progress.is_completed,
            'last_read': progress.last_read
        }
    })


@api_view(['GET'])
@permission_classes([])
def get_unlocked_pages(request, book_id):
    # Get user from JWT payload (works even when auth is skipped)
    user_payload = getattr(request, 'user_payload', {})
    user_id = user_payload.get('user_id')
    print(f"DEBUG: Getting unlocked pages for user_id: {user_id}, book_id: {book_id}")
    
    if not user_id:
        print(f"DEBUG: No user_id found in request")
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        book = Book.objects.get(id=book_id)
        print(f"DEBUG: Found book: {book.title}")
    except Book.DoesNotExist:
        print(f"DEBUG: Book {book_id} not found")
        return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        print(f"DEBUG: Starting to get unlocked pages for {book.title}")
        
        # Get page-based unlocked pages
        page_unlocked = set(UnlockedPage.objects.filter(
            user_id=user_id, book=book
        ).values_list('page_number', flat=True))
        print(f"DEBUG: Page-based unlocked: {sorted(page_unlocked)}")
        
        # Get chapter-based unlocked pages
        chapter_unlocked_pages = set()
        unlocked_chapters = UnlockedChapter.objects.filter(
            user_id=user_id, book=book
        ).values_list('chapter_number', flat=True)
        print(f"DEBUG: Unlocked chapters: {sorted(unlocked_chapters)}")
        
        # For each unlocked chapter, get all pages in that chapter
        for chapter_num in unlocked_chapters:
            try:
                chapter = book.chapters.get(chapter_number=chapter_num)
                print(f"DEBUG: Found chapter {chapter_num}: {chapter.title}")
                # Get all pages in this chapter
                chapter_pages = chapter.pages.values_list('page_number', flat=True)
                chapter_unlocked_pages.update(chapter_pages)
                print(f"DEBUG: Chapter {chapter_num} pages: {list(chapter_pages)}")
            except BookChapter.DoesNotExist:
                print(f"DEBUG: Chapter {chapter_num} not found for book {book.title}")
                continue
            except Exception as e:
                print(f"DEBUG: Error getting chapter {chapter_num} pages: {str(e)}")
                continue
        
        # Combine both sets of unlocked pages
        all_unlocked_pages = page_unlocked.union(chapter_unlocked_pages)
        
        # Add free preview pages (20% of book)
        free_preview_pages = set()
        if book.pages and book.pages > 0:
            free_count = max(1, int(book.pages * 0.2))
            free_preview_pages = set(range(1, free_count + 1))
        
        # Final unlocked pages = page_unlocked + chapter_unlocked + free_preview
        final_unlocked = all_unlocked_pages.union(free_preview_pages)
        
        print(f"DEBUG: Chapter-based unlocked: {sorted(chapter_unlocked_pages)}")
        print(f"DEBUG: Free preview: {sorted(free_preview_pages)}")
        print(f"DEBUG: Final unlocked pages: {sorted(final_unlocked)}")
        
        return Response({
            'unlocked_pages': sorted(final_unlocked),
            'page_unlocked': sorted(page_unlocked),
            'chapter_unlocked': sorted(chapter_unlocked_pages),
            'free_preview': sorted(free_preview_pages)
        })
    except Exception as e:
        print(f"ERROR: get_unlocked_pages failed: {str(e)}")
        print(f"ERROR: Exception type: {type(e)}")
        import traceback
        print(f"ERROR: Traceback: {traceback.format_exc()}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([])
def create_note(request):
    """Create a new note for a page"""
    user = get_user_from_jwt(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    book_id = request.data.get('book_id')
    page_number = request.data.get('page_number')
    content = request.data.get('content')

    if not book_id or page_number is None or not content:
        return Response({'error': 'book_id, page_number, and content are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        book = Book.objects.get(id=book_id)
    except Book.DoesNotExist:
        return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)

    note = Note.objects.create(
        user_id=user_id,
        book=book,
        page_number=page_number,
        content=content
    )

    return Response({
        'id': note.id,
        'content': note.content,
        'page_number': note.page_number,
        'created_at': note.created_at
    })


@api_view(['GET'])
@permission_classes([])
def get_notes(request, book_id):
    """Get all notes for a book"""
    user = get_user_from_jwt(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        book = Book.objects.get(id=book_id)
    except Book.DoesNotExist:
        return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)

    notes = Note.objects.filter(user_id=user_id, book=book).order_by('created_at')
    return Response([{
        'id': note.id,
        'content': note.content,
        'page_number': note.page_number,
        'created_at': note.created_at
    } for note in notes])


@api_view(['DELETE'])
@permission_classes([])
def delete_note(request, note_id):
    """Delete a specific note"""
    user = get_user_from_jwt(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        note = Note.objects.get(id=note_id, user_id=user_id)
        note.delete()
        return Response({'message': 'Note deleted successfully'})
    except Note.DoesNotExist:
        return Response({'error': 'Note not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([])
def create_bookmark(request):
    """Create a new bookmark"""
    user = get_user_from_jwt(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    book_id = request.data.get('book_id')
    page_number = request.data.get('page_number')
    title = request.data.get('title', f'Page {page_number}')

    if not book_id or page_number is None:
        return Response({'error': 'book_id and page_number are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        book = Book.objects.get(id=book_id)
    except Book.DoesNotExist:
        return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)

    bookmark = Bookmark.objects.create(
        user_id=user_id,
        book=book,
        page_number=page_number,
        title=title
    )

    return Response({
        'id': bookmark.id,
        'title': bookmark.title,
        'page_number': bookmark.page_number,
        'created_at': bookmark.created_at
    })


@api_view(['GET'])
@permission_classes([])
def get_bookmarks(request, book_id):
    """Get all bookmarks for a book"""
    user = get_user_from_jwt(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        book = Book.objects.get(id=book_id)
    except Book.DoesNotExist:
        return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)

    bookmarks = Bookmark.objects.filter(user_id=user_id, book=book).order_by('page_number')
    return Response([{
        'id': bookmark.id,
        'title': bookmark.title,
        'page_number': bookmark.page_number,
        'created_at': bookmark.created_at
    } for bookmark in bookmarks])


@api_view(['DELETE'])
@permission_classes([])
def delete_bookmark(request, bookmark_id):
    """Delete a specific bookmark"""
    user = get_user_from_jwt(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        bookmark = Bookmark.objects.get(id=bookmark_id, user_id=user_id)
        bookmark.delete()
        return Response({'message': 'Bookmark deleted successfully'})
    except Bookmark.DoesNotExist:
        return Response({'error': 'Bookmark not found'}, status=status.HTTP_404_NOT_FOUND)


class ReaderViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Get all reading progress for the authenticated user"""
        user_id = request.user_payload.get('user_id')
        if not user_id:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            progress_records = ReadingProgress.objects.filter(user_id=user_id).select_related('book')
            return Response([{
                'id': progress.id,
                'book_id': progress.book.id,
                'book_title': progress.book.title,
                'author_name': progress.book.author.name if progress.book.author else 'Unknown Author',
                'current_page': progress.current_page,
                'total_pages': progress.total_pages,
                'progress_percentage': progress.progress_percentage,
                'is_completed': progress.is_completed,
                'last_read': progress.last_read,
                'reading_time_minutes': progress.reading_time_minutes
            } for progress in progress_records])
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def progress(self, request):
        user_id    = request.user_payload.get('user_id')
        book_id    = request.data.get('book_id')
        page       = request.data.get('page', 1)
        total_pages = request.data.get('total_pages')

        if not book_id:
            return Response({'error': 'book_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            book = Book.objects.prefetch_related('userlibrary_set').get(id=book_id)
        except Book.DoesNotExist:
            return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)

        if not book.userlibrary_set.filter(user_id=user_id).exists():
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        progress, _ = ReadingProgress.objects.get_or_create(
            user_id=user_id, book=book,
            defaults={'current_page': page, 'total_pages': total_pages or book.pages},
        )
        progress.update_progress(page, total_pages or book.pages)

        return Response({
            'message': 'Progress updated',
            'progress': {
                'current_page':        progress.current_page,
                'total_pages':         progress.total_pages,
                'progress_percentage': progress.progress_percentage,
                'is_completed':        progress.is_completed,
            },
        })

    @action(detail=False, methods=['post'])
    def start_session(self, request):
        user_id    = request.user_payload.get('user_id')
        book_id    = request.data.get('book_id')
        start_page = request.data.get('start_page', 1)

        if not book_id:
            return Response({'error': 'book_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            book = Book.objects.prefetch_related('userlibrary_set').get(id=book_id)
        except Book.DoesNotExist:
            return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)

        if not book.userlibrary_set.filter(user_id=user_id).exists():
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        session = ReadingSession.objects.create(
            user_id=user_id, book=book,
            start_page=start_page, start_time=timezone.now(),
        )
        return Response({'session_id': session.id, 'message': 'Session started'},
                        status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def create_note(self, request):
        """Create a new note for a book"""
        user_id = request.user_payload.get('user_id')
        book_id = request.data.get('book_id')
        page_number = request.data.get('page_number')
        content = request.data.get('content')
        position = request.data.get('position', {})
        color = request.data.get('color', '#ffffff')
        is_private = request.data.get('is_private', True)

        if not all([book_id, page_number, content]):
            return Response({'error': 'book_id, page_number, and content are required'}, 
                           status=status.HTTP_400_BAD_REQUEST)

        try:
            book = Book.objects.get(id=book_id)
        except Book.DoesNotExist:
            return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)

        note = Note.objects.create(
            user_id=user_id,
            book=book,
            page_number=page_number,
            content=content,
            position=position,
            color=color,
            is_private=is_private
        )

        return Response({
            'id': note.id,
            'book_id': note.book.id,
            'page_number': note.page_number,
            'content': note.content,
            'position': note.position,
            'color': note.color,
            'is_private': note.is_private,
            'created_at': note.created_at
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def notes(self, request):
        """Get all notes for a user's book"""
        user_id = request.user_payload.get('user_id')
        book_id = request.GET.get('book_id')

        if not book_id:
            return Response({'error': 'book_id is required'}, 
                           status=status.HTTP_400_BAD_REQUEST)

        try:
            book = Book.objects.get(id=book_id)
        except Book.DoesNotExist:
            return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)

        notes = Note.objects.filter(user_id=user_id, book=book).order_by('page_number', 'created_at')
        
        return Response([{
            'id': note.id,
            'page_number': note.page_number,
            'content': note.content,
            'position': note.position,
            'color': note.color,
            'is_private': note.is_private,
            'created_at': note.created_at,
            'updated_at': note.updated_at
        } for note in notes])

    @action(detail=False, methods=['delete'])
    def delete_note(self, request):
        """Delete a note"""
        user_id = request.user_payload.get('user_id')
        note_id = request.data.get('note_id')

        if not note_id:
            return Response({'error': 'note_id is required'}, 
                           status=status.HTTP_400_BAD_REQUEST)

        try:
            note = Note.objects.get(id=note_id, user_id=user_id)
            note.delete()
            return Response({'message': 'Note deleted successfully'})
        except Note.DoesNotExist:
            return Response({'error': 'Note not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def create_bookmark(self, request):
        """Create a new bookmark for a book"""
        user_id = request.user_payload.get('user_id')
        book_id = request.data.get('book_id')
        page_number = request.data.get('page_number')
        position = request.data.get('position', {})
        title = request.data.get('title', '')
        note = request.data.get('note', '')

        if not all([book_id, page_number]):
            return Response({'error': 'book_id and page_number are required'}, 
                           status=status.HTTP_400_BAD_REQUEST)

        try:
            book = Book.objects.get(id=book_id)
        except Book.DoesNotExist:
            return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)

        bookmark, created = Bookmark.objects.get_or_create(
            user_id=user_id,
            book=book,
            page_number=page_number,
            defaults={
                'position': position,
                'title': title,
                'note': note
            }
        )

        if not created:
            # Update existing bookmark
            bookmark.position = position
            bookmark.title = title
            bookmark.note = note
            bookmark.save()

        return Response({
            'id': bookmark.id,
            'book_id': bookmark.book.id,
            'page_number': bookmark.page_number,
            'position': bookmark.position,
            'title': bookmark.title,
            'note': bookmark.note,
            'created_at': bookmark.created_at,
            'updated_at': bookmark.updated_at
        })

    @action(detail=False, methods=['get'])
    def bookmarks(self, request):
        """Get all bookmarks for a user's book"""
        user_id = request.user_payload.get('user_id')
        book_id = request.GET.get('book_id')

        if not book_id:
            return Response({'error': 'book_id is required'}, 
                           status=status.HTTP_400_BAD_REQUEST)

        try:
            book = Book.objects.get(id=book_id)
        except Book.DoesNotExist:
            return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)

        bookmarks = Bookmark.objects.filter(user_id=user_id, book=book).order_by('page_number')
        
        return Response([{
            'id': bookmark.id,
            'page_number': bookmark.page_number,
            'position': bookmark.position,
            'title': bookmark.title,
            'note': bookmark.note,
            'created_at': bookmark.created_at,
            'updated_at': bookmark.updated_at
        } for bookmark in bookmarks])

    @action(detail=False, methods=['delete'])
    def delete_bookmark(self, request):
        """Delete a bookmark"""
        user_id = request.user_payload.get('user_id')
        bookmark_id = request.data.get('bookmark_id')

        if not bookmark_id:
            return Response({'error': 'bookmark_id is required'}, 
                           status=status.HTTP_400_BAD_REQUEST)

        try:
            bookmark = Bookmark.objects.get(id=bookmark_id, user_id=user_id)
            bookmark.delete()
            return Response({'message': 'Bookmark deleted successfully'})
        except Bookmark.DoesNotExist:
            return Response({'error': 'Bookmark not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def create_highlight(self, request):
        """Create a new highlight for a book"""
        user_id = request.user_payload.get('user_id')
        book_id = request.data.get('book_id')
        page_number = request.data.get('page_number')
        start_position = request.data.get('start_position', {})
        end_position = request.data.get('end_position', {})
        selected_text = request.data.get('selected_text', '')
        color = request.data.get('color', '#ffff00')
        note = request.data.get('note', '')

        if not all([book_id, page_number]):
            return Response({'error': 'book_id and page_number are required'}, 
                           status=status.HTTP_400_BAD_REQUEST)

        try:
            book = Book.objects.get(id=book_id)
        except Book.DoesNotExist:
            return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)

        highlight = Highlight.objects.create(
            user_id=user_id,
            book=book,
            page_number=page_number,
            start_position=start_position,
            end_position=end_position,
            selected_text=selected_text,
            color=color,
            note=note
        )

        return Response({
            'id': highlight.id,
            'book_id': highlight.book.id,
            'page_number': highlight.page_number,
            'start_position': highlight.start_position,
            'end_position': highlight.end_position,
            'selected_text': highlight.selected_text,
            'color': highlight.color,
            'note': highlight.note,
            'created_at': highlight.created_at
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def highlights(self, request):
        """Get all highlights for a user's book"""
        user_id = request.user_payload.get('user_id')
        book_id = request.GET.get('book_id')

        if not book_id:
            return Response({'error': 'book_id is required'}, 
                           status=status.HTTP_400_BAD_REQUEST)

        try:
            book = Book.objects.get(id=book_id)
        except Book.DoesNotExist:
            return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)

        highlights = Highlight.objects.filter(user_id=user_id, book=book).order_by('page_number', 'created_at')
        
        return Response([{
            'id': highlight.id,
            'page_number': highlight.page_number,
            'start_position': highlight.start_position,
            'end_position': highlight.end_position,
            'selected_text': highlight.selected_text,
            'color': highlight.color,
            'note': highlight.note,
            'created_at': highlight.created_at,
            'updated_at': highlight.updated_at
        } for highlight in highlights])

    @action(detail=False, methods=['delete'])
    def delete_highlight(self, request):
        """Delete a highlight"""
        user_id = request.user_payload.get('user_id')
        highlight_id = request.data.get('highlight_id')

        if not highlight_id:
            return Response({'error': 'highlight_id is required'}, 
                           status=status.HTTP_400_BAD_REQUEST)

        try:
            highlight = Highlight.objects.get(id=highlight_id, user_id=user_id)
            highlight.delete()
            return Response({'message': 'Highlight deleted successfully'})
        except Highlight.DoesNotExist:
            return Response({'error': 'Highlight not found'}, status=status.HTTP_404_NOT_FOUND)


# Standalone view functions for URL patterns
@api_view(['POST'])
@permission_classes([])
@csrf_exempt
def create_highlight(request):
    """Create a new highlight for a book"""
    user_id = get_user_from_jwt(request)
    if not user_id:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    book_id = request.data.get('book_id')
    page_number = request.data.get('page_number')
    start_position = request.data.get('start_position', {})
    end_position = request.data.get('end_position', {})
    selected_text = request.data.get('selected_text', '')
    color = request.data.get('color', '#ffff00')
    note = request.data.get('note', '')

    if not all([book_id, page_number]):
        return Response({'error': 'book_id and page_number are required'}, 
                       status=status.HTTP_400_BAD_REQUEST)

    try:
        book = Book.objects.get(id=book_id)
    except Book.DoesNotExist:
        return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)

    highlight = Highlight.objects.create(
        user_id=user_id,
        book=book,
        page_number=page_number,
        start_position=start_position,
        end_position=end_position,
        selected_text=selected_text,
        color=color,
        note=note
    )

    return Response({
        'id': highlight.id,
        'book_id': highlight.book.id,
        'page_number': highlight.page_number,
        'start_position': highlight.start_position,
        'end_position': highlight.end_position,
        'selected_text': highlight.selected_text,
        'color': highlight.color,
        'note': highlight.note,
        'created_at': highlight.created_at
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([])
def get_highlights(request, book_id):
    """Get all highlights for a user's book"""
    user_id = get_user_from_jwt(request)
    if not user_id:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        book = Book.objects.get(id=book_id)
    except Book.DoesNotExist:
        return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)

    highlights = Highlight.objects.filter(user_id=user_id, book=book).order_by('page_number', 'created_at')
    
    return Response([{
        'id': highlight.id,
        'page_number': highlight.page_number,
        'start_position': highlight.start_position,
        'end_position': highlight.end_position,
        'selected_text': highlight.selected_text,
        'color': highlight.color,
        'note': highlight.note,
        'created_at': highlight.created_at,
        'updated_at': highlight.updated_at
    } for highlight in highlights])


@api_view(['DELETE'])
@permission_classes([])
@csrf_exempt
def delete_highlight(request, highlight_id):
    """Delete a highlight"""
    user_id = get_user_from_jwt(request)
    if not user_id:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        highlight = Highlight.objects.get(id=highlight_id, user_id=user_id)
        highlight.delete()
        return Response({'message': 'Highlight deleted successfully'})
    except Highlight.DoesNotExist:
        return Response({'error': 'Highlight not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([])
def get_categories(request):
    """Get all book categories"""
    categories = Category.objects.all().order_by('name')
    return Response([{
        'id': category.id,
        'name': category.name,
        'description': category.description
    } for category in categories])


@api_view(['GET'])
@permission_classes([])
def get_books_by_category(request, category_id=None):
    """Get books filtered by category"""
    user_id = get_user_from_jwt(request)
    if not user_id:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        if category_id:
            category = Category.objects.get(id=category_id)
            books = Book.objects.filter(categories=category)
        else:
            books = Book.objects.all()
        
        # Filter books that user has access to
        books = books.filter(userlibrary__user_id=user_id).distinct()
        
        return Response([{
            'id': book.id,
            'title': book.title,
            'subtitle': book.subtitle,
            'author': book.author.name if book.author else 'Unknown',
            'description': book.description,
            'cover_url': book.cover_display_url,
            'pages': book.total_pages,
            'price': float(book.price),
            'is_free': book.is_free,
            'rating': float(book.rating),
            'categories': [cat.name for cat in book.categories.all()]
        } for book in books])
    except Category.DoesNotExist:
        return Response({'error': 'Category not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([])
@csrf_exempt
def unlock_chapter(request):
    """Unlock a chapter for a book (30 KES per chapter)"""
    user_id = get_user_from_jwt(request)
    if not user_id:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    book_id = request.data.get('book_id')
    chapter_number = request.data.get('chapter_number')
    
    if not all([book_id, chapter_number]):
        return Response({'error': 'book_id and chapter_number are required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    try:
        book = Book.objects.get(id=book_id)
    except Book.DoesNotExist:
        return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if chapter is already unlocked
    if UnlockedChapter.objects.filter(user_id=user_id, book=book, chapter_number=chapter_number).exists():
        return Response({'error': 'Chapter already unlocked'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user has access to the book
    if not UserLibrary.objects.filter(user_id=user_id, book=book).exists():
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Check if chapter exists
    try:
        chapter = book.chapters.get(chapter_number=chapter_number)
    except BookChapter.DoesNotExist:
        return Response({'error': 'Chapter not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check if chapter is free
    if chapter.is_free:
        unlocked_chapter = UnlockedChapter.objects.create(
            user_id=user_id,
            book=book,
            chapter_number=chapter_number,
            amount_paid=0.00
        )
        
        # Send email notification for free chapter
        send_unlock_notification_email(
            user_id=user_id,
            book=book,
            unlock_type='chapter',
            details={'chapter_number': chapter_number},
            amount_paid=0.00
        )
        
        return Response({
            'message': 'Free chapter unlocked successfully',
            'chapter_number': chapter_number,
            'amount_paid': 0.00
        })
    
    # Process payment for chapter (30 KES)
    CHAPTER_PRICE = 30.00
    
    try:
        # Get user's wallet
        wallet = Wallet.objects.get(user_id=user_id)
        
        if wallet.balance < CHAPTER_PRICE:
            return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create transaction and unlock chapter
        with transaction.atomic():
            # Deduct from wallet
            wallet.balance -= CHAPTER_PRICE
            wallet.save()
            
            # Create transaction record
            Transaction.objects.create(
                user_id=user_id,
                amount=CHAPTER_PRICE,
                transaction_type='CHAPTER_UNLOCK',
                description=f'Unlocked Chapter {chapter_number} of {book.title}',
                status='completed'
            )
            
            # Unlock chapter
            unlocked_chapter = UnlockedChapter.objects.create(
                user_id=user_id,
                book=book,
                chapter_number=chapter_number,
                amount_paid=CHAPTER_PRICE
            )
            
            # Send email notification
            send_unlock_notification_email(
                user_id=user_id,
                book=book,
                unlock_type='chapter',
                details={'chapter_number': chapter_number},
                amount_paid=CHAPTER_PRICE
            )
        
        return Response({
            'message': 'Chapter unlocked successfully',
            'chapter_number': chapter_number,
            'amount_paid': CHAPTER_PRICE,
            'remaining_balance': float(wallet.balance)
        })
        
    except Wallet.DoesNotExist:
        return Response({'error': 'Wallet not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': f'Payment failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([])
def get_unlocked_chapters(request, book_id):
    """Get all unlocked chapters for a user's book"""
    user_id = get_user_from_jwt(request)
    if not user_id:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        book = Book.objects.get(id=book_id)
    except Book.DoesNotExist:
        return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)
    
    unlocked_chapters = UnlockedChapter.objects.filter(user_id=user_id, book=book).order_by('chapter_number')
    
    return Response([{
        'chapter_number': uc.chapter_number,
        'amount_paid': float(uc.amount_paid),
        'unlocked_at': uc.unlocked_at
    } for uc in unlocked_chapters])


@api_view(['GET'])
@permission_classes([])
def get_chapter_info(request, book_id, chapter_number):
    """Get information about a specific chapter"""
    user_id = get_user_from_jwt(request)
    if not user_id:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        book = Book.objects.get(id=book_id)
        chapter = book.chapters.get(chapter_number=chapter_number)
        
        # Check if chapter is unlocked
        is_unlocked = UnlockedChapter.objects.filter(
            user_id=user_id, 
            book=book, 
            chapter_number=chapter_number
        ).exists()
        
        return Response({
            'chapter_number': chapter.chapter_number,
            'title': chapter.title,
            'pages_count': chapter.pages_count,
            'is_free': chapter.is_free,
            'is_unlocked': is_unlocked,
            'price': 0.00 if chapter.is_free else 30.00
        })
        
    except Book.DoesNotExist:
        return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)
    except BookChapter.DoesNotExist:
        return Response({'error': 'Chapter not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([])
def get_book_chapters(request, book_id):
    """Get all chapters for a book with page mappings"""
    user_id = get_user_from_jwt(request)
    if not user_id:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        book = Book.objects.get(id=book_id)
    except Book.DoesNotExist:
        return Response({'error': 'Book not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get all chapters with their page ranges
    chapters_data = []
    for chapter in book.chapters.all().order_by('chapter_number'):
        # Get all pages in this chapter
        pages = chapter.pages.all().order_by('page_number')
        page_numbers = [page.page_number for page in pages]
        
        # Check if chapter is unlocked
        is_unlocked = UnlockedChapter.objects.filter(
            user_id=user_id,
            book=book,
            chapter_number=chapter.chapter_number
        ).exists()
        
        chapters_data.append({
            'chapter_number': chapter.chapter_number,
            'title': chapter.title,
            'pages_count': chapter.pages_count,
            'page_numbers': page_numbers,
            'page_range': {
                'start': min(page_numbers) if page_numbers else None,
                'end': max(page_numbers) if page_numbers else None
            },
            'is_free': chapter.is_free,
            'is_unlocked': is_unlocked,
            'price': 0.00 if chapter.is_free else 30.00
        })
    
    return Response({
        'book_id': book.id,
        'book_title': book.title,
        'total_pages': book.total_pages,
        'chapters': chapters_data
    })