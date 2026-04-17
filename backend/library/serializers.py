from rest_framework import serializers
from .models import UserLibrary, ReadingProgress, ReadingSession
from books.serializers import BookListSerializer


class UserLibrarySerializer(serializers.ModelSerializer):
    book = BookListSerializer(read_only=True)
    user_reading_progress = serializers.SerializerMethodField()
    last_read = serializers.SerializerMethodField()
    
    class Meta:
        model = UserLibrary
        fields = [
            'id', 'book', 'purchase_date', 'access_expires', 'is_active',
            'user_reading_progress', 'last_read'
        ]
    
    def get_user_reading_progress(self, obj):
        """Get reading progress for this book"""
        # Use cached progress data if available from context
        progress_cache = self.context.get('progress_cache', {})
        cache_key = f"{obj.user_id}_{obj.book_id}"
        if cache_key in progress_cache:
            return progress_cache[cache_key]['progress_percentage']
        
        try:
            progress = ReadingProgress.objects.get(
                user_id=obj.user_id, 
                book=obj.book
            )
            return progress.progress_percentage
        except ReadingProgress.DoesNotExist:
            return 0.0
        except Exception as e:
            print(f"DEBUG: Error getting reading progress: {str(e)}")
            return 0.0
    
    def get_last_read(self, obj):
        """Get last read date for this book"""
        # Use cached progress data if available from context
        progress_cache = self.context.get('progress_cache', {})
        cache_key = f"{obj.user_id}_{obj.book_id}"
        if cache_key in progress_cache:
            return progress_cache[cache_key]['last_read']
        
        try:
            progress = ReadingProgress.objects.get(
                user_id=obj.user_id, 
                book=obj.book
            )
            return progress.last_read
        except ReadingProgress.DoesNotExist:
            return None
        except Exception as e:
            print(f"DEBUG: Error getting last_read: {str(e)}")
            return None


class ReadingProgressSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book.title', read_only=True)
    book_cover = serializers.SerializerMethodField()
    book_details = BookListSerializer(source='book', read_only=True)
    author_name = serializers.CharField(source='book.author.name', read_only=True)
    
    class Meta:
        model = ReadingProgress
        fields = [
            'id', 'book', 'book_title', 'book_cover', 'book_details', 'author_name',
            'current_page', 'total_pages', 'progress_percentage', 'last_read', 
            'is_completed', 'reading_time_minutes'
        ]
    
    def get_book_cover(self, obj):
        return obj.book.cover_url


class ReadingSessionSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book.title', read_only=True)
    
    class Meta:
        model = ReadingSession
        fields = [
            'id', 'book', 'book_title', 'start_page', 'end_page',
            'start_time', 'end_time', 'duration_minutes'
        ]
