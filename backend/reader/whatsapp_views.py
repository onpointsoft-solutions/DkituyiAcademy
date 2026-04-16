import io
import qrcode
from PIL import Image, ImageDraw, ImageFont
import urllib.parse
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils import timezone
import logging
import os
import base64
import requests
import json
import random

from .models import Highlight, Note
from books.models import Book
from reader.models import UnlockedChapter, UnlockedPage

logger = logging.getLogger(__name__)


def generate_ai_quote(book_title="", author_name="", category="inspirational"):
    """
    Generate an AI quote using Hugging Face free inference API.
    Falls back to curated quotes if API fails.
    """
    # Try Hugging Face API first - load from environment
    hf_token = os.environ.get('HUGGINGFACE_API_TOKEN') or getattr(settings, 'HUGGINGFACE_API_TOKEN', None)
    
    # Free models available without token (rate limited)
    models = [
        "mistralai/Mistral-7B-Instruct-v0.2",
        "meta-llama/Llama-2-7b-chat-hf",
    ]
    
    # Build prompt based on available context
    if book_title and author_name:
        prompt = f"Generate a profound, inspiring quote about {category} in the style of {author_name}, author of '{book_title}'. Return only the quote text, no attribution:"
    elif book_title:
        prompt = f"Generate a profound, inspiring quote related to the themes of '{book_title}'. Return only the quote text, no attribution:"
    else:
        prompt = f"Generate a profound, inspiring {category} quote from literature or philosophy. Return only the quote text, no attribution:"
    
    headers = {"Content-Type": "application/json"}
    if hf_token:
        headers["Authorization"] = f"Bearer {hf_token}"
    
    for model in models:
        try:
            api_url = f"https://api-inference.huggingface.co/models/{model}"
            payload = {
                "inputs": prompt,
                "parameters": {
                    "max_new_tokens": 100,
                    "temperature": 0.7,
                    "return_full_text": False
                }
            }
            
            response = requests.post(api_url, headers=headers, json=payload, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list) and len(result) > 0:
                    generated_text = result[0].get('generated_text', '').strip()
                    # Clean up the quote
                    generated_text = generated_text.strip('"').strip("'")
                    if len(generated_text) > 20 and len(generated_text) < 300:
                        return generated_text
                        
        except Exception as e:
            logger.warning(f"Hugging Face model {model} failed: {e}")
            continue
    
    # Fallback: Curated inspirational quotes
    fallback_quotes = [
        "The only way to do great work is to love what you do.",
        "In the middle of difficulty lies opportunity.",
        "The best time to plant a tree was 20 years ago. The second best time is now.",
        "Your limitation—it's only your imagination.",
        "Push yourself, because no one else is going to do it for you.",
        "Great things never came from comfort zones.",
        "Dream it. Wish it. Do it.",
        "Success doesn't just find you. You have to go out and get it.",
        "The harder you work for something, the greater you'll feel when you achieve it.",
        "Dream bigger. Do bigger.",
        "Don't stop when you're tired. Stop when you're done.",
        "Wake up with determination. Go to bed with satisfaction.",
        "Do something today that your future self will thank you for.",
        "Little things make big days.",
        "The secret of getting ahead is getting started.",
        "Reading is to the mind what exercise is to the body.",
        "A reader lives a thousand lives before he dies.",
        "Books are a uniquely portable magic.",
        "Today a reader, tomorrow a leader.",
        "Knowledge is power."
    ]
    
    return random.choice(fallback_quotes)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_quote_share_image(request):
    """Generate a branded quote image for WhatsApp sharing"""
    try:
        quote_text = request.data.get('quote_text', '').strip()
        book_title = request.data.get('book_title', '').strip()
        author_name = request.data.get('author_name', '').strip()
        user_name = request.data.get('user_name', '').strip()
        generate_ai = request.data.get('generate_ai', False)
        category = request.data.get('category', 'inspirational')
        
        # Generate AI quote if requested or no text provided
        if generate_ai or not quote_text:
            quote_text = generate_ai_quote(book_title, author_name, category)
            is_ai_generated = True
        else:
            is_ai_generated = False
        
        if not quote_text:
            return Response({'error': 'Quote text is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create quote image
        image_data = create_quote_image(quote_text, book_title, author_name, user_name)
        
        # Generate short link
        short_link = generate_short_link('quote', quote_text[:50])
        
        return Response({
            'image_data': image_data,
            'short_link': short_link,
            'whatsapp_url': generate_whatsapp_share_url(quote_text, short_link),
            'quote_text': quote_text,
            'is_ai_generated': is_ai_generated,
            'success': True
        })
        
    except Exception as e:
        logger.error(f"Error generating quote share image: {e}")
        return Response({'error': 'Failed to generate share image'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def share_highlight_to_whatsapp(request):
    """Share a highlight to WhatsApp Status"""
    try:
        highlight_id = request.data.get('highlight_id')
        user_id = request.user.id if hasattr(request.user, 'id') else None
        
        if not highlight_id:
            return Response({'error': 'Highlight ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get highlight
        highlight = get_object_or_404(Highlight, id=highlight_id, user_id=user_id)
        
        # Generate quote image
        quote_text = highlight.selected_text
        book_title = highlight.book.title
        author_name = highlight.book.author.name if highlight.book.author else "Unknown"
        user_name = request.user.username if hasattr(request.user, 'username') else "Reader"
        
        image_data = create_quote_image(quote_text, book_title, author_name, user_name)
        
        # Generate short link
        short_link = generate_short_link('highlight', highlight.id)
        
        # Create WhatsApp share URL
        share_text = f'"{quote_text}"\n\n- {author_name}, "{book_title}"\n\nShared via DK Academy\n{short_link}'
        whatsapp_url = f"https://wa.me/?text={urllib.parse.quote(share_text)}"
        
        # Log share event
        log_share_event(user_id, 'highlight', highlight_id, 'whatsapp_status')
        
        return Response({
            'image_data': image_data,
            'share_text': share_text,
            'whatsapp_url': whatsapp_url,
            'short_link': short_link,
            'success': True
        })
        
    except Exception as e:
        logger.error(f"Error sharing highlight to WhatsApp: {e}")
        return Response({'error': 'Failed to share highlight'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def share_note_to_whatsapp(request):
    """Share a note to WhatsApp Status"""
    try:
        note_id = request.data.get('note_id')
        user_id = request.user.id if hasattr(request.user, 'id') else None
        
        if not note_id:
            return Response({'error': 'Note ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get note
        note = get_object_or_404(Note, id=note_id, user_id=user_id)
        
        # Generate note image
        note_text = note.content[:200] + "..." if len(note.content) > 200 else note.content
        book_title = note.book.title
        author_name = note.book.author.name if note.book.author else "Unknown"
        user_name = request.user.username if hasattr(request.user, 'username') else "Reader"
        
        image_data = create_note_image(note_text, book_title, author_name, user_name)
        
        # Generate short link
        short_link = generate_short_link('note', note.id)
        
        # Create WhatsApp share URL
        share_text = f'Note: "{note_text}"\n\nFrom: "{book_title}" by {author_name}\n\nShared via DK Academy\n{short_link}'
        whatsapp_url = f"https://wa.me/?text={urllib.parse.quote(share_text)}"
        
        # Log share event
        log_share_event(user_id, 'note', note_id, 'whatsapp_status')
        
        return Response({
            'image_data': image_data,
            'share_text': share_text,
            'whatsapp_url': whatsapp_url,
            'short_link': short_link,
            'success': True
        })
        
    except Exception as e:
        logger.error(f"Error sharing note to WhatsApp: {e}")
        return Response({'error': 'Failed to share note'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def share_achievement_to_whatsapp(request):
    """Share milestone achievements to WhatsApp Status"""
    try:
        achievement_type = request.data.get('achievement_type')  # 'chapter_complete', 'book_complete', 'reading_streak'
        book_id = request.data.get('book_id')
        user_id = request.user.id if hasattr(request.user, 'id') else None
        
        if not achievement_type:
            return Response({'error': 'Achievement type is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get book if provided
        book = None
        if book_id:
            book = get_object_or_404(Book, id=book_id)
        
        # Generate achievement image
        user_name = request.user.username if hasattr(request.user, 'username') else "Reader"
        image_data, share_text = create_achievement_image(achievement_type, book, user_name)
        
        # Generate short link
        short_link = generate_short_link('achievement', f"{achievement_type}_{book_id or 'general'}")
        
        # Create WhatsApp share URL
        whatsapp_url = f"https://wa.me/?text={urllib.parse.quote(share_text)}"
        
        # Log share event
        log_share_event(user_id, 'achievement', achievement_type, 'whatsapp_status')
        
        return Response({
            'image_data': image_data,
            'share_text': share_text,
            'whatsapp_url': whatsapp_url,
            'short_link': short_link,
            'success': True
        })
        
    except Exception as e:
        logger.error(f"Error sharing achievement to WhatsApp: {e}")
        return Response({'error': 'Failed to share achievement'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def create_quote_image(quote_text, book_title, author_name, user_name):
    """Create a branded quote image"""
    try:
        # Image dimensions
        width, height = 800, 1200
        
        # Create image with gradient background
        img = Image.new('RGB', (width, height), color='#1a1a2e')
        draw = ImageDraw.Draw(img)
        
        # Add gradient effect
        for y in range(height):
            color_value = int(26 + (y / height) * 20)  # Dark blue gradient
            draw.line([(0, y), (width, y)], fill=f'#{color_value:02x}{color_value:02x}{46:02x}')
        
        # Load fonts (use default fonts if custom fonts not available)
        try:
            quote_font = ImageFont.truetype("arial.ttf", 36)
            title_font = ImageFont.truetype("arial.ttf", 24)
            author_font = ImageFont.truetype("arial.ttf", 20)
            brand_font = ImageFont.truetype("arial.ttf", 16)
        except:
            quote_font = ImageFont.load_default()
            title_font = ImageFont.load_default()
            author_font = ImageFont.load_default()
            brand_font = ImageFont.load_default()
        
        # Add Dkituyi branded header at top
        # Logo background bar
        draw.rounded_rectangle([30, 30, width-30, 110], radius=15, fill='#16213e')
        # Dkituyi diamond symbol and text
        draw.text((60, 48), "◆", fill='#22c55e', font=title_font)
        draw.text((100, 50), "DKITUYI", fill='#ffffff', font=title_font)
        draw.text((240, 55), "ACADEMY", fill='#95a5a6', font=author_font)
        # Decorative line
        draw.line([(60, 130), (width-60, 130)], fill='#22c55e', width=3)
        
        # Wrap quote text
        max_width = width - 80
        quote_lines = wrap_text(quote_text, max_width, quote_font)
        
        # Draw quote text
        y_position = 150
        for line in quote_lines:
            draw.text((40, y_position), line, fill='#ffffff', font=quote_font)
            y_position += 50
        
        # Add book title
        if book_title:
            draw.text((40, y_position + 30), f'"{book_title}"', fill='#f39c12', font=title_font)
        
        # Add author
        if author_name:
            draw.text((40, y_position + 70), f'- {author_name}', fill='#ecf0f1', font=author_font)
        
        # Add user attribution
        draw.text((40, height - 100), f'Shared by {user_name}', fill='#95a5a6', font=author_font)
        
        # Add branding
        draw.text((40, height - 60), "Read more at dkacademy.co.ke", fill='#3498db', font=brand_font)
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG', quality=95)
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
        
    except Exception as e:
        logger.error(f"Error creating quote image: {e}")
        # Return a simple text-based fallback
        return create_text_fallback_image(quote_text, book_title, author_name)


def create_note_image(note_text, book_title, author_name, user_name):
    """Create a branded note image"""
    try:
        # Image dimensions
        width, height = 800, 1000
        
        # Create image with gradient background
        img = Image.new('RGB', (width, height), color='#2c3e50')
        draw = ImageDraw.Draw(img)
        
        # Add gradient effect
        for y in range(height):
            color_value = int(44 + (y / height) * 30)  # Dark gray gradient
            draw.line([(0, y), (width, y)], fill=f'#{color_value:02x}{color_value:02x}{80:02x}')
        
        # Load fonts
        try:
            note_font = ImageFont.truetype("arial.ttf", 28)
            title_font = ImageFont.truetype("arial.ttf", 24)
            brand_font = ImageFont.truetype("arial.ttf", 16)
        except:
            note_font = ImageFont.load_default()
            title_font = ImageFont.load_default()
            brand_font = ImageFont.load_default()
        
        # Add Dkituyi branded header at top
        draw.rounded_rectangle([30, 30, width-30, 110], radius=15, fill='#16213e')
        draw.text((60, 48), "◆", fill='#22c55e', font=title_font)
        draw.text((100, 50), "DKITUYI", fill='#ffffff', font=title_font)
        draw.text((240, 55), "ACADEMY", fill='#95a5a6', font=author_font)
        draw.line([(60, 130), (width-60, 130)], fill='#22c55e', width=3)
        
        # Add "NOTE" header
        draw.text((60, 160), "NOTE", fill='#e74c3c', font=title_font)
        
        # Wrap note text
        max_width = width - 80
        note_lines = wrap_text(note_text, max_width, note_font)
        
        # Draw note text
        y_position = 160
        for line in note_lines:
            draw.text((40, y_position), line, fill='#ffffff', font=note_font)
            y_position += 40
        
        # Add book info
        if book_title:
            draw.text((40, y_position + 30), f'From: "{book_title}"', fill='#f39c12', font=title_font)
        
        if author_name:
            draw.text((40, y_position + 70), f'By: {author_name}', fill='#ecf0f1', font=title_font)
        
        # Add branding
        draw.text((40, height - 60), "Read more at dkacademy.co.ke", fill='#3498db', font=brand_font)
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG', quality=95)
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
        
    except Exception as e:
        logger.error(f"Error creating note image: {e}")
        return create_text_fallback_image(note_text, book_title, author_name)


def create_achievement_image(achievement_type, book, user_name):
    """Create a branded achievement image"""
    try:
        # Image dimensions
        width, height = 800, 800
        
        # Create image with gradient background
        img = Image.new('RGB', (width, height), color='#27ae60')
        draw = ImageDraw.Draw(img)
        
        # Add gradient effect
        for y in range(height):
            color_value = int(39 + (y / height) * 40)  # Green gradient
            draw.line([(0, y), (width, y)], fill=f'#{color_value:02x}{100:02x}{color_value:02x}')
        
        # Load fonts
        try:
            title_font = ImageFont.truetype("arial.ttf", 32)
            text_font = ImageFont.truetype("arial.ttf", 24)
            brand_font = ImageFont.truetype("arial.ttf", 16)
        except:
            title_font = ImageFont.load_default()
            text_font = ImageFont.load_default()
            brand_font = ImageFont.load_default()
        
        # Add Dkituyi branded header at top
        draw.rounded_rectangle([30, 30, width-30, 110], radius=15, fill='#16213e')
        draw.text((60, 48), "◆", fill='#22c55e', font=title_font)
        draw.text((100, 50), "DKITUYI", fill='#ffffff', font=title_font)
        draw.text((240, 55), "ACADEMY", fill='#95a5a6', font=author_font)
        draw.line([(60, 130), (width-60, 130)], fill='#22c55e', width=3)
        
        # Achievement messages
        if achievement_type == 'chapter_complete':
            title = "Chapter Complete! "
            message = f"Finished reading chapter of {book.title if book else 'a book'}"
        elif achievement_type == 'book_complete':
            title = "Book Complete! "
            message = f"Finished reading {book.title if book else 'a book'}"
        elif achievement_type == 'reading_streak':
            title = "Reading Streak! "
            message = "Maintained reading streak for 7 days"
        else:
            title = "Achievement Unlocked! "
            message = "Great job on your reading progress!"
        
        # Draw achievement text
        draw.text((width//2 - 150, height//2 - 50), title, fill='#ffffff', font=title_font)
        draw.text((width//2 - 200, height//2 + 20), message, fill='#ffffff', font=text_font)
        
        # Add user attribution
        draw.text((40, height - 100), f'{user_name}', fill='#ffffff', font=text_font)
        
        # Add branding
        draw.text((40, height - 60), "Join us at dkacademy.co.ke", fill='#ffffff', font=brand_font)
        
        # Share text
        share_text = f"{' '.join(title.split())} {message}\n\nShared via DK Academy Reading App\nJoin us at dkacademy.co.ke"
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG', quality=95)
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}", share_text
        
    except Exception as e:
        logger.error(f"Error creating achievement image: {e}")
        return create_text_fallback_image("Achievement Unlocked!", "", ""), "Achievement unlocked via DK Academy"


def create_text_fallback_image(text, title, author):
    """Create a simple text fallback image"""
    try:
        width, height = 800, 600
        img = Image.new('RGB', (width, height), color='#34495e')
        draw = ImageDraw.Draw(img)
        
        try:
            font = ImageFont.truetype("arial.ttf", 24)
        except:
            font = ImageFont.load_default()
        
        draw.text((40, 50), text[:100], fill='#ffffff', font=font)
        if title:
            draw.text((40, 150), title[:50], fill='#f39c12', font=font)
        if author:
            draw.text((40, 200), author[:50], fill='#ecf0f1', font=font)
        
        buffer = io.BytesIO()
        img.save(buffer, format='PNG', quality=95)
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
        
    except Exception as e:
        logger.error(f"Error creating fallback image: {e}")
        return ""


def wrap_text(text, max_width, font):
    """Wrap text to fit within max_width"""
    words = text.split()
    lines = []
    current_line = []
    
    for word in words:
        test_line = ' '.join(current_line + [word])
        # Approximate text width (character count * average character width)
        if len(test_line) * 12 < max_width:  # Rough approximation
            current_line.append(word)
        else:
            if current_line:
                lines.append(' '.join(current_line))
                current_line = [word]
            else:
                lines.append(word)
    
    if current_line:
        lines.append(' '.join(current_line))
    
    return lines


def generate_short_link(content_type, content_id):
    """Generate a short link for shared content"""
    try:
        # For now, generate a simple URL. In production, use a URL shortener service
        base_url = getattr(settings, 'BASE_URL', 'https://dkacademy.co.ke')
        return f"{base_url}/share/{content_type}/{content_id}"
    except Exception as e:
        logger.error(f"Error generating short link: {e}")
        return "https://dkacademy.co.ke"


def generate_whatsapp_share_url(text, link):
    """Generate WhatsApp share URL"""
    share_text = f'{text}\n\n{link}'
    return f"https://wa.me/?text={urllib.parse.quote(share_text)}"


def log_share_event(user_id, content_type, content_id, platform):
    """Log sharing events for analytics"""
    try:
        logger.info(f"Share event: User {user_id} shared {content_type} {content_id} to {platform}")
        # In production, save to database for analytics
    except Exception as e:
        logger.error(f"Error logging share event: {e}")
