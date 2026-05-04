from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import logging

logger = logging.getLogger(__name__)

def log_email_config():
    """Log email configuration for debugging"""
    logger.info("=== EMAIL CONFIGURATION DEBUG ===")
    logger.info(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    logger.info(f"EMAIL_HOST: {settings.EMAIL_HOST}")
    logger.info(f"EMAIL_PORT: {settings.EMAIL_PORT}")
    logger.info(f"EMAIL_USE_TLS: {getattr(settings, 'EMAIL_USE_TLS', 'Not set')}")
    logger.info(f"EMAIL_USE_SSL: {getattr(settings, 'EMAIL_USE_SSL', 'Not set')}")
    logger.info(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    logger.info(f"EMAIL_HOST_PASSWORD: {'SET' if settings.EMAIL_HOST_PASSWORD else 'NOT SET'}")
    logger.info(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    logger.info(f"ADMIN_EMAIL: {settings.ADMIN_EMAIL}")
    logger.info("================================")

class EmailService:
    """Email service for dkituyi academy with digital reading branding"""
    
    @staticmethod
    def send_welcome_email(user_email, user_name, user_id):
        """Send welcome email to new users"""
        log_email_config()
        logger.info(f"Attempting to send welcome email to {user_email}")
        
        try:
            subject = "Welcome to dkituyi academy - Your Digital Reading Journey Begins!"
            
            logger.info(f"Rendering welcome email template for user: {user_name}")
            html_message = render_to_string('emails/welcome.html', {
                'user_name': user_name,
                'user_email': user_email,
                'user_id': user_id,
                'academy_name': 'dkituyi academy',
                'tagline': 'Celebrating Great Literature & Digital Reading'
            })
            
            plain_message = strip_tags(html_message)
            
            logger.info(f"Sending email via {settings.EMAIL_BACKEND}")
            result = send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user_email],
                html_message=html_message,
                fail_silently=False
            )
            
            logger.info(f"Welcome email sent successfully to {user_email}. Result: {result}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send welcome email to {user_email}: {str(e)}")
            logger.error(f"Email config: Backend={settings.EMAIL_BACKEND}, Host={settings.EMAIL_HOST}, Port={settings.EMAIL_PORT}")
            return False
    
    @staticmethod
    def send_book_notification(user_email, book_title, author_name, book_description):
        """Send notification when new books are added"""
        try:
            subject = f"New Book Available: {book_title} - dkituyi academy"
            
            html_message = render_to_string('emails/new_book.html', {
                'book_title': book_title,
                'author_name': author_name,
                'book_description': book_description,
                'academy_name': 'dkituyi academy',
                'tagline': 'Celebrating Great Literature & Digital Reading'
            })
            
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user_email],
                html_message=html_message,
                fail_silently=False
            )
            
            logger.info(f"Book notification sent to {user_email} for {book_title}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send book notification to {user_email}: {str(e)}")
            return False
    
    @staticmethod
    def send_password_reset_email(user_email, reset_link, user_name):
        """Send password reset email"""
        log_email_config()
        logger.info(f"Attempting to send password reset email to {user_email}")
        
        try:
            subject = "Reset Your Password - dkituyi academy"
            
            logger.info(f"Rendering password reset email template for user: {user_name}")
            html_message = render_to_string('emails/password_reset.html', {
                'user_name': user_name,
                'reset_link': reset_link,
                'academy_name': 'dkituyi academy',
                'tagline': 'Celebrating Great Literature & Digital Reading'
            })
            
            plain_message = strip_tags(html_message)
            
            logger.info(f"Sending password reset email via {settings.EMAIL_BACKEND}")
            result = send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user_email],
                html_message=html_message,
                fail_silently=False
            )
            
            logger.info(f"Password reset email sent successfully to {user_email}. Result: {result}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send password reset email to {user_email}: {str(e)}")
            logger.error(f"Email config: Backend={settings.EMAIL_BACKEND}, Host={settings.EMAIL_HOST}, Port={settings.EMAIL_PORT}")
            return False
    
    @staticmethod
    def send_subscription_confirmation(user_email, plan_name, amount, start_date, end_date):
        """Send subscription confirmation email"""
        try:
            subject = f"Subscription Confirmed - {plan_name} - dkituyi academy"
            
            html_message = render_to_string('emails/subscription_confirmed.html', {
                'plan_name': plan_name,
                'amount': amount,
                'start_date': start_date,
                'end_date': end_date,
                'academy_name': 'dkituyi academy',
                'tagline': 'Celebrating Great Literature & Digital Reading'
            })
            
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user_email],
                html_message=html_message,
                fail_silently=False
            )
            
            logger.info(f"Subscription confirmation sent to {user_email} for {plan_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send subscription confirmation to {user_email}: {str(e)}")
            return False
    
    @staticmethod
    def send_admin_notification(subject, message, admin_emails=None):
        """Send notification to admin users"""
        log_email_config()
        
        if admin_emails is None:
            admin_emails = [settings.ADMIN_EMAIL]
        
        logger.info(f"Attempting to send admin notification: {subject} to {admin_emails}")
        
        try:
            logger.info(f"Rendering admin notification email template")
            html_message = render_to_string('emails/admin_notification.html', {
                'subject': subject,
                'message': message,
                'academy_name': 'dkituyi academy',
                'tagline': 'Celebrating Great Literature & Digital Reading'
            })
            
            plain_message = strip_tags(html_message)
            
            logger.info(f"Sending admin notification via {settings.EMAIL_BACKEND}")
            result = send_mail(
                subject=f"[Admin Alert] {subject} - dkituyi academy",
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=admin_emails,
                html_message=html_message,
                fail_silently=False
            )
            
            logger.info(f"Admin notification sent successfully: {subject}. Result: {result}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send admin notification: {str(e)}")
            logger.error(f"Email config: Backend={settings.EMAIL_BACKEND}, Host={settings.EMAIL_HOST}, Port={settings.EMAIL_PORT}")
            return False
