from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Wallet, Transaction, PaystackPayment, Subscription, ContentUnlock
from .serializers import WalletSerializer, TransactionSerializer, PaystackPaymentSerializer, SubscriptionSerializer, ContentUnlockSerializer
from .services import PaystackService, WalletService


@method_decorator(csrf_exempt, name='dispatch')
class WalletViewSet(viewsets.ViewSet):
    """
    ViewSet for wallet management
    """
    permission_classes = []  # Remove IsAuthenticated to use custom auth
    authentication_classes = []  # Disable session auth to bypass CSRF
    
    @csrf_exempt
    def dispatch(self, request, *args, **kwargs):
        # Mark the request as CSRF exempt
        request._dont_enforce_csrf_checks = True
        return super().dispatch(request, *args, **kwargs)
    
    def get_object(self):
        """Get user wallet"""
        user_id = self.request.user_payload.get('user_id') if self.request.user_payload else None
        if not user_id:
            return None
        return WalletService.get_user_wallet(user_id)
    
    def list(self, request):
        """Get user wallet balance"""
        user_id = request.user_payload.get('user_id') if request.user_payload else None
        if not user_id:
            return Response(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        wallet = WalletService.get_user_wallet(user_id)
        serializer = WalletSerializer(wallet)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def topup(self, request):
        """Initiate wallet top-up via Paystack - Multi-currency support"""
        user_id = request.user_payload.get('user_id') if request.user_payload else None
        if not user_id:
            return Response(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        email = request.data.get('email')
        amount = request.data.get('amount')
        country_code = request.data.get('country_code', 'KE')  # Default to Kenya
        
        if not email or not amount:
            return Response(
                {'error': 'Email and amount are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if country is supported by Paystack
        from core.currency import is_paystack_supported_country
        if not is_paystack_supported_country(country_code):
            return Response(
                {'error': f'Country {country_code} is not supported for payments'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get currency for the country
        from core.currency import get_country_currency, convert_to_kes
        currency = get_country_currency(country_code)
        if not currency:
            currency = 'KES'  # Default to KES if country not found
        
        # Convert amount to KES for internal storage
        try:
            local_amount = float(amount)
            kes_amount = convert_to_kes(local_amount, currency)
            
            # Validate amount (minimum 20 KES equivalent)
            if kes_amount < 20:
                return Response(
                    {'error': f'Minimum top-up amount is KES 20 (equivalent to {currency} {local_amount:.2f})'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        except ValueError:
            return Response(
                {'error': 'Invalid amount'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Initiate Paystack payment
        paystack_service = PaystackService()
        result = paystack_service.initialize_transaction(
            email=email,
            amount=local_amount,  # Send local amount (not KES converted)
            user_id=user_id,
            currency=currency,  # Pass local currency for Paystack
            country_code=country_code,
            request_data=request.data,  # Pass request data for mobile money options
            metadata={"custom_fields": [
                {
                    "display_name": "DKT User ID",
                    "variable_name": "user_id",
                    "value": user_id
                },
                {
                    "display_name": "Country",
                    "variable_name": "country_code", 
                    "value": country_code.upper()
                },
                {
                    "display_name": "Original Currency",
                    "variable_name": "original_currency",
                    "value": currency
                },
                {
                    "display_name": "Original Amount",
                    "variable_name": "original_amount", 
                    "value": str(local_amount)
                }
            ]}
        )
        
        if result['success']:
            return Response({
                'message': 'Payment initiated successfully',
                'authorization_url': result['authorization_url'],
                'access_code': result['access_code'],
                'reference': result['reference']
            })
        else:
            return Response(
                {'error': result['error']}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def verify_payment(self, request):
        """Verify Paystack payment"""
        user_id = request.user_payload.get('user_id') if request.user_payload else None
        if not user_id:
            return Response(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        reference = request.data.get('reference')
        simulation_mode = request.data.get('simulation_mode', False)
        
        print(f"DEBUG: Payment verification request - reference: {reference}, simulation_mode: {simulation_mode}")
        
        if not reference:
            return Response(
                {'error': 'Reference is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        paystack_service = PaystackService(simulation_mode=simulation_mode)
        result = paystack_service.verify_transaction(reference)
        
        if result['success']:
            return Response({
                'message': result['message'],
                'wallet_balance': WalletService.get_balance(user_id),
                'simulation_mode': simulation_mode
            })
        else:
            return Response(
                {'error': result.get('error', result.get('message', 'Unknown error occurred'))}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def mobile_money_options(self, request):
        """Get available mobile money options by country"""
        country_code = request.query_params.get('country_code', 'KE').upper()
        
        mobile_options = {
            'KE': {
                'name': 'Kenya',
                'currency': 'KES',
                'mobile_money_options': [
                    {
                        'code': 'mpesa',
                        'name': 'M-Pesa',
                        'description': 'Safaricom mobile money',
                        'icon': '📱'
                    },
                    {
                        'code': 'airtel_money',
                        'name': 'Airtel Money',
                        'description': 'Airtel mobile money',
                        'icon': '📱'
                    },
                    {
                        'code': 'tkash',
                        'name': 'T-Kash',
                        'description': 'Telkom mobile money',
                        'icon': '📱'
                    },
                    {
                        'code': 'equity',
                        'name': 'Equity',
                        'description': 'Equity Bank mobile money',
                        'icon': '📱'
                    }
                ]
            },
            'UG': {
                'name': 'Uganda',
                'currency': 'UGX',
                'mobile_money_options': [
                    {
                        'code': 'mtn',
                        'name': 'MTN Mobile Money',
                        'description': 'MTN Uganda mobile money',
                        'icon': '📱'
                    },
                    {
                        'code': 'airtel_money',
                        'name': 'Airtel Money',
                        'description': 'Airtel Uganda mobile money',
                        'icon': '📱'
                    },
                    {
                        'code': 'warid',
                        'name': 'Warid',
                        'description': 'Warid Pesa',
                        'icon': '📱'
                    }
                ]
            },
            'NG': {
                'name': 'Nigeria',
                'currency': 'NGN',
                'mobile_money_options': [
                    {
                        'code': 'paga',
                        'name': 'PAGA',
                        'description': 'PAGA payment platform',
                        'icon': '📱'
                    },
                    {
                        'code': 'opay',
                        'name': 'OPay',
                        'description': 'OPay payment platform',
                        'icon': '📱'
                    },
                    {
                        'code': 'flutterwave',
                        'name': 'Flutterwave',
                        'description': 'Flutterwave payment platform',
                        'icon': '📱'
                    }
                ]
            },
            'TZ': {
                'name': 'Tanzania',
                'currency': 'TZS',
                'mobile_money_options': [
                    {
                        'code': 'tigopesa',
                        'name': 'Tigo Pesa',
                        'description': 'Tigo Pesa mobile money',
                        'icon': '📱'
                    },
                    {
                        'code': 'mtn',
                        'name': 'MTN Mobile Money',
                        'description': 'MTN Tanzania mobile money',
                        'icon': '📱'
                    },
                    {
                        'code': 'airtel_money',
                        'name': 'Airtel Money',
                        'description': 'Airtel Tanzania mobile money',
                        'icon': '📱'
                    },
                    {
                        'code': 'halopesa',
                        'name': 'Halopesa',
                        'description': 'Halopesa mobile money',
                        'icon': '📱'
                    }
                ]
            },
            'ZA': {
                'name': 'South Africa',
                'currency': 'ZAR',
                'mobile_money_options': [
                    {
                        'code': 'snapscan',
                        'name': 'SnapScan',
                        'description': 'SnapScan payment platform',
                        'icon': '📱'
                    },
                    {
                        'code': 'ozow',
                        'name': 'Ozow',
                        'description': 'Ozow payment platform',
                        'icon': '📱'
                    },
                    {
                        'code': 'siyapay',
                        'name': 'siyapay',
                        'description': 'siyapay payment platform',
                        'icon': '📱'
                    }
                ]
            }
        }
        
        if country_code in mobile_options:
            return Response({
                'country': mobile_options[country_code],
                'supported_mobile_money': mobile_options[country_code]['mobile_money_options'],
                'message': f'Mobile money options available for {mobile_options[country_code]["name"]}'
            })
        else:
            return Response({
                'error': f'Country {country_code} not supported for mobile money options',
                'supported_countries': list(mobile_options.keys())
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def transactions(self, request):
        """Get user transaction history"""
        user_id = request.user_payload.get('user_id') if request.user_payload else None
        if not user_id:
            return Response(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        transactions = Transaction.objects.filter(user_id=user_id).order_by('-created_at')
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def payment_methods_status(self, request):
        """Check payment methods status for debugging"""
        user_id = request.user_payload.get('user_id') if request.user_payload else None
        
        return Response({
            'message': 'Payment system is operational',
            'features': {
                'multi_currency': True,
                'mobile_money': True,
                'paystack_integration': True,
                'supported_countries': ['KE', 'UG', 'TZ', 'NG', 'ZA'],
                'supported_currencies': ['KES', 'UGX', 'TZS', 'NGN', 'ZAR']
            },
            'endpoints': {
                'wallet_topup': '/api/payments/wallet/topup/',
                'mobile_money_options': '/api/payments/wallet/mobile-money-options/',
                'payment_plans': '/api/payment/plans/',
                'transactions': '/api/payments/wallet/transactions/'
            },
            'debug_info': {
                'user_id': user_id,
                'request_data': dict(request.data) if request.data else {},
                'query_params': dict(request.query_params) if request.query_params else {}
            }
        })

class ContentUnlockViewSet(viewsets.ViewSet):
    """
    ViewSet for content unlocking
    """
    permission_classes = []  # Remove IsAuthenticated to use custom auth
    
    @action(detail=False, methods=['post'])
    def unlock_chapter(self, request):
        """Unlock a chapter"""
        user_id = request.user_payload.get('user_id') if request.user_payload else None
        if not user_id:
            return Response(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        book_id = request.data.get('book_id')
        chapter_number = request.data.get('chapter_number')
        
        if not book_id or not chapter_number:
            return Response(
                {'error': 'Book ID and chapter number are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already unlocked
        if ContentUnlock.objects.filter(
            user_id=user_id,
            book_id=book_id,
            content_type='chapter',
            content_identifier=str(chapter_number)
        ).exists():
            return Response({
                'message': 'Chapter already unlocked',
                'unlocked': True
            })
        
        # Unlock chapter (20-30 KES per chapter)
        cost = 25  # Default chapter price
        
        result = WalletService.unlock_content(
            user_id=user_id,
            book_id=book_id,
            content_type='chapter',
            content_identifier=str(chapter_number),
            cost=cost
        )
        
        if result['success']:
            return Response({
                'message': 'Chapter unlocked successfully',
                'unlocked': True,
                'cost': cost
            })
        else:
            return Response(
                {'error': result['error']}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def unlock_section(self, request):
        """Unlock a section"""
        user_id = request.user_payload.get('user_id') if request.user_payload else None
        if not user_id:
            return Response(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        book_id = request.data.get('book_id')
        section_name = request.data.get('section_name')
        
        if not book_id or not section_name:
            return Response(
                {'error': 'Book ID and section name are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already unlocked
        if ContentUnlock.objects.filter(
            user_id=user_id,
            book_id=book_id,
            content_type='section',
            content_identifier=section_name
        ).exists():
            return Response({
                'message': 'Section already unlocked',
                'unlocked': True
            })
        
        # Unlock section (49 KES per section)
        cost = 49
        
        result = WalletService.unlock_content(
            user_id=user_id,
            book_id=book_id,
            content_type='section',
            content_identifier=section_name,
            cost=cost
        )
        
        if result['success']:
            return Response({
                'message': 'Section unlocked successfully',
                'unlocked': True,
                'cost': cost
            })
        else:
            return Response(
                {'error': result['error']}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def unlock_book(self, request):
        """Unlock full book"""
        user_id = request.user_payload.get('user_id') if request.user_payload else None
        if not user_id:
            return Response(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        book_id = request.data.get('book_id')
        
        if not book_id:
            return Response(
                {'error': 'Book ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already unlocked
        if ContentUnlock.objects.filter(
            user_id=user_id,
            book_id=book_id,
            content_type='book',
            content_identifier='full_book'
        ).exists():
            return Response({
                'message': 'Book already unlocked',
                'unlocked': True
            })
        
        # Unlock full book (99-149 KES)
        cost = 129  # Default full book price
        
        result = WalletService.unlock_content(
            user_id=user_id,
            book_id=book_id,
            content_type='book',
            content_identifier='full_book',
            cost=cost
        )
        
        if result['success']:
            return Response({
                'message': 'Book unlocked successfully',
                'unlocked': True,
                'cost': cost
            })
        else:
            return Response(
                {'error': result['error']}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def check_access(self, request):
        """Check if user has access to content"""
        user_id = request.user_payload.get('user_id') if request.user_payload else None
        if not user_id:
            return Response(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        book_id = request.query_params.get('book_id')
        content_type = request.query_params.get('content_type')
        content_identifier = request.query_params.get('content_identifier')
        
        if not all([book_id, content_type, content_identifier]):
            return Response(
                {'error': 'Book ID, content type, and content identifier are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if content is unlocked
        is_unlocked = ContentUnlock.objects.filter(
            user_id=user_id,
            book_id=book_id,
            content_type=content_type,
            content_identifier=content_identifier
        ).exists()
        
        # Check if user has active subscription
        has_subscription = Subscription.objects.filter(
            user_id=user_id,
            status='active'
        ).exists()
        
        return Response({
            'has_access': is_unlocked or has_subscription,
            'is_unlocked': is_unlocked,
            'has_subscription': has_subscription
        })

class SubscriptionViewSet(viewsets.ViewSet):
    """
    ViewSet for subscription management
    """
    permission_classes = []  # Remove IsAuthenticated to use custom auth
    
    @action(detail=False, methods=['post'])
    def subscribe(self, request):
        """Subscribe to a plan"""
        user_id = request.user_payload.get('user_id') if request.user_payload else None
        if not user_id:
            return Response(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        plan_type = request.data.get('plan_type')
        
        if not plan_type:
            return Response(
                {'error': 'Plan type is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Plan pricing
        plan_prices = {
            'weekly': 99,
            'monthly': 299,
            'premium': 499
        }
        
        if plan_type not in plan_prices:
            return Response(
                {'error': 'Invalid plan type'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cost = plan_prices[plan_type]
        
        # Check wallet balance
        if not WalletService.can_unlock_content(user_id, cost):
            return Response(
                {'error': 'Insufficient balance'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create subscription
        from django.utils import timezone
        from datetime import timedelta
        
        start_date = timezone.now()
        if plan_type == 'weekly':
            end_date = start_date + timedelta(weeks=1)
        elif plan_type == 'monthly':
            end_date = start_date + timedelta(days=30)
        else:  # premium
            end_date = start_date + timedelta(days=30)
        
        subscription = Subscription.objects.create(
            user_id=user_id,
            plan_type=plan_type,
            amount_paid=cost,
            start_date=start_date,
            end_date=end_date
        )
        
        # Deduct from wallet
        wallet = WalletService.get_user_wallet(user_id)
        wallet.deduct_funds(cost)
        
        # Create transaction record
        Transaction.objects.create(
            user_id=user_id,
            transaction_type='subscription',
            amount=cost,
            status='completed',
            description=f"{plan_type} subscription"
        )
        
        return Response({
            'message': 'Subscription created successfully',
            'subscription': {
                'plan_type': plan_type,
                'start_date': start_date,
                'end_date': end_date,
                'amount_paid': cost
            }
        })
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current subscription"""
        user_id = request.user_payload.get('user_id') if request.user_payload else None
        if not user_id:
            return Response(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        subscription = Subscription.objects.filter(
            user_id=user_id,
            status='active'
        ).first()
        
        if subscription and subscription.is_active():
            serializer = SubscriptionSerializer(subscription)
            return Response(serializer.data)
        
        return Response({'subscription': None})
