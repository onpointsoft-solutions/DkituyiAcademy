import PyPDF2
import io
import re
import logging
from datetime import datetime

from rest_framework import serializers
from books.models import Book, Author
from books.serializers import BookListSerializer

logger = logging.getLogger(__name__)


class AdminBookListSerializer(serializers.ModelSerializer):
    """Serializer for listing books (read-only)."""
    
    author_name = serializers.CharField(source='author.name', read_only=True)
    cover_display_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Book
        fields = [
            'id', 'title', 'subtitle', 'description',
            'author_name', 'isbn', 'publication_date', 
            'pages', 'language', 'cover_display_url',
            'price', 'is_free', 'rating', 'rating_count',
            'file_size', 'created_at'
        ]
    
    def get_cover_display_url(self, obj):
        """Get cover URL, preferring uploaded image over external URL"""
        if obj.cover_image:
            return obj.cover_image.url
        elif obj.cover_url:
            return obj.cover_url
        return None


class AdminBookWriteSerializer(serializers.ModelSerializer):
    """Serializer for create/update; accepts author as string (name)."""

    author = serializers.CharField(write_only=True, required=False, allow_blank=True)
    author_name = serializers.CharField(source='author.name', read_only=True)
    author_bio = serializers.CharField(write_only=True, required=False, allow_blank=True)

    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0.00)
    is_free = serializers.BooleanField(required=False, default=False)

    class Meta:
        model = Book
        fields = [
            'id', 'title', 'subtitle', 'description',
            'author', 'author_name', 'author_bio',
            'isbn', 'publication_date', 'pages', 'language',
            'cover_image', 'cover_url', 'pdf_file',
            'price', 'is_free'
        ]

        extra_kwargs = {
            'description': {'required': False, 'allow_blank': True},
            'subtitle': {'allow_blank': True},
            'isbn': {'allow_blank': True, 'allow_null': True},
            'publication_date': {'allow_null': True},
            'pages': {'required': False, 'default': 0},
            'cover_url': {'allow_blank': True, 'allow_null': True},
            'cover_image': {'required': False, 'allow_null': True},
            'pdf_file': {'required': False, 'allow_null': True},
            'title': {'required': False, 'allow_blank': True},
        }

    # -----------------------------
    # ISBN CLEANING
    # -----------------------------
    def clean_isbn(self, isbn):
        if not isbn:
            return None

        isbn = str(isbn).upper()

        for prefix in ['ISBN:', 'ISBN-', 'ISBN ', 'ISBN']:
            if isbn.startswith(prefix):
                isbn = isbn[len(prefix):]

        isbn = re.sub(r'[^0-9X]', '', isbn)

        return isbn if len(isbn) in [10, 13] else None

    # -----------------------------
    # PDF METADATA EXTRACTION
    # -----------------------------
    def extract_pdf_metadata(self, pdf_file):
        try:
            if not pdf_file:
                return {}

            # Read safely
            if hasattr(pdf_file, 'path') and pdf_file.path:
                with open(pdf_file.path, 'rb') as f:
                    pdf_content = f.read()
            else:
                pdf_file.seek(0)
                pdf_content = pdf_file.read()
                pdf_file.seek(0)

            metadata = {}

            pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
            info = pdf_reader.metadata

            # BASIC FIELDS
            if info:
                title = (info.get('/Title') or '').strip()
                if title:
                    metadata['title'] = title

                author = (info.get('/Author') or '').strip()
                if author:
                    metadata['author_name'] = author
                    metadata['author_bio'] = f"{author} is an author extracted from PDF metadata."

            metadata['pages'] = len(pdf_reader.pages)

            # ISBN
            if info:
                for field in ['/ISBN', '/Identifier', '/Subject']:
                    val = info.get(field)
                    if val:
                        isbn = self.clean_isbn(val)
                        if isbn:
                            metadata['isbn'] = isbn
                            break

            # DATE
            if info and info.get('/CreationDate'):
                date_str = info['/CreationDate']
                if date_str.startswith('D:'):
                    try:
                        d = date_str[2:10]
                        metadata['publication_date'] = datetime(
                            int(d[:4]), int(d[4:6]), int(d[6:8])
                        ).date()
                    except:
                        pass

            # DESCRIPTION
            if info:
                for field in ['/Subject', '/Keywords']:
                    val = info.get(field)
                    if val and len(val.strip()) > 10:
                        metadata['description'] = val.strip()
                        break

            metadata['language'] = 'en'
            metadata['content_source'] = 'pdf'

            return metadata

        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            return {}

    # -----------------------------
    # CREATE
    # -----------------------------
    def create(self, validated_data):
        pdf_file = validated_data.get('pdf_file')
        extracted_metadata = {}

        if pdf_file:
            extracted_metadata = self.extract_pdf_metadata(pdf_file)

        # TITLE
        if not validated_data.get('title'):
            validated_data['title'] = (
                extracted_metadata.get('title')
                or pdf_file.name.replace('.pdf', '').title()
                if pdf_file else "Untitled Book"
            )

        # AUTHOR
        author_name = (
            validated_data.pop('author', None)
            or extracted_metadata.get('author_name')
            or "Unknown Author"
        )

        author_bio = (
            validated_data.pop('author_bio', None)
            or extracted_metadata.get('author_bio')
            or "No bio available"
        )

        author, _ = Author.objects.get_or_create(
            name=author_name,
            defaults={'bio': author_bio}
        )

        validated_data['author'] = author

        # OTHER FIELDS
        validated_data.setdefault('description',
            extracted_metadata.get('description') or f"A book by {author.name}"
        )

        validated_data.setdefault('pages',
            extracted_metadata.get('pages', 0)
        )

        isbn = validated_data.get('isbn') or extracted_metadata.get('isbn')
        cleaned_isbn = self.clean_isbn(isbn)
        if cleaned_isbn:
            validated_data['isbn'] = cleaned_isbn
        else:
            validated_data.pop('isbn', None)

        validated_data.setdefault('publication_date',
            extracted_metadata.get('publication_date')
        )

        validated_data.setdefault('language',
            extracted_metadata.get('language', 'en')
        )

        # FILE SIZE
        if pdf_file:
            validated_data['file_size'] = pdf_file.size

        # CREATE BOOK
        book = super().create(validated_data)

        # Create chapters from PDF if available
        if pdf_file and extracted_metadata.get('chapters'):
            try:
                from books.models import BookChapter, BookPage
                logger.info(f"DEBUG: Creating {len(extracted_metadata['chapters'])} chapters for book {book.title}")
                logger.info(f"DEBUG: Chapter data: {extracted_metadata['chapters']}")
                
                for chapter_data in extracted_metadata['chapters']:
                    logger.info(f"DEBUG: Creating chapter {chapter_data['chapter_number']}: {chapter_data['title']}")
                    
                    # Create chapter
                    chapter = BookChapter.objects.create(
                        book=book,
                        chapter_number=chapter_data['chapter_number'],
                        title=chapter_data['title'],
                        pages_count=chapter_data['pages_count'],
                        is_free=chapter_data['chapter_number'] <= 2  # First 2 chapters are free
                    )
                    
                    logger.info(f"DEBUG: Created BookChapter with ID: {chapter.id}")
                    
                    # Create page mappings for this chapter
                    pages_created = 0
                    for page_num in range(chapter_data['page_start'], chapter_data['page_end'] + 1):
                        BookPage.objects.create(
                            chapter=chapter,
                            page_number=page_num
                        )
                        pages_created += 1
                    
                    logger.info(f"DEBUG: Created {pages_created} BookPage records for chapter {chapter_data['chapter_number']}: pages {chapter_data['page_start']}-{chapter_data['page_end']}")
                
                logger.info(f"DEBUG: Successfully created {len(extracted_metadata['chapters'])} chapters with page mappings for book {book.title}")
                
                # Verify chapters were created
                created_chapters = BookChapter.objects.filter(book=book).count()
                logger.info(f"DEBUG: Verification: {created_chapters} chapters exist in database for book {book.title}")
                
            except Exception as e:
                logger.error(f"DEBUG: Error creating chapters from PDF: {e}")
                import traceback
                logger.error(f"DEBUG: Traceback: {traceback.format_exc()}")
                # Don't fail the book creation if chapter creation fails
        else:
            logger.info(f"DEBUG: No chapters to create - pdf_file: {bool(pdf_file)}, chapters in metadata: {bool(extracted_metadata.get('chapters'))}")
            if extracted_metadata.get('chapters'):
                logger.info(f"DEBUG: Chapters metadata found: {extracted_metadata['chapters']}")

        return book

    # -----------------------------
    # UPDATE
    # -----------------------------
    def update(self, instance, validated_data):
        pdf_file = validated_data.get('pdf_file')

        if pdf_file:
            extracted_metadata = self.extract_pdf_metadata(pdf_file)

            if not validated_data.get('title'):
                validated_data['title'] = extracted_metadata.get('title')

            if not validated_data.get('pages'):
                validated_data['pages'] = extracted_metadata.get('pages')

        # AUTHOR UPDATE
        author_name = validated_data.pop('author', None)
        if author_name:
            author, _ = Author.objects.get_or_create(name=author_name)
            validated_data['author'] = author

        return super().update(instance, validated_data)