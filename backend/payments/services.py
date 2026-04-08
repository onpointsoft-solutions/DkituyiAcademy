import requests
import uuid
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from .models import PaystackPayment, Wallet, Transaction

class PaystackService:
    """Paystack payment integration service"""
    
    def __init__(self, simulation_mode=False):
        self.base_url = "https://api.paystack.co"
        self.secret_key = settings.PAYSTACK_SECRET_KEY
        self.callback_url = settings.PAYSTACK_CALLBACK_URL
        self.simulation_mode = simulation_mode
        
    def initialize_transaction(self, email, amount, user_id, callback_url=None, metadata=None, currency='KES', country_code='KE', request_data=None):
        """Initialize Paystack transaction - Multi-currency support"""
        headers = {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json"
        }
        
        # Generate unique reference
        reference = f"DKT{datetime.now().strftime('%Y%m%d%H%M%S')}{str(uuid.uuid4())[:8].upper()}"
        
        # Create Paystack payment record
        paystack_payment = PaystackPayment.objects.create(
            user_id=user_id,
            email=email,
            amount=amount,  # Store in KES internally
            reference=reference,
            currency=currency,  # Store original currency
            country_code=country_code
        )
        
        # Prepare transaction data
        # Convert amount to smallest currency unit (cents/kobo/etc.)
        if currency in ['UGX', 'TZS']:  # These don't have subunits
            amount_in_subunits = int(amount)
        else:
            amount_in_subunits = int(amount * 100)
        
        payload = {
            "email": email,
            "amount": amount_in_subunits,
            "currency": currency,  # Use local currency for Paystack
            "reference": reference,
            "callback_url": callback_url or self.callback_url,
            "metadata": {
                "user_id": user_id,
                "country_code": country_code,
                "original_currency": currency,
                "kes_amount": str(amount)
            }
        }
        
        # Add country-specific parameters
        if country_code.upper() == 'NG':
            payload['metadata']['bypass'] = 'local'  # For Nigeria local cards
        
        try:
            response = requests.post(
                f"{self.base_url}/transaction/initialize",
                json=payload,
                headers=headers
            )
            
            response.raise_for_status()
            
            result = response.json()
            
            # Update payment record with response
            paystack_payment.authorization_url = result.get('data', {}).get('authorization_url')
            paystack_payment.access_code = result.get('data', {}).get('access_code')
            paystack_payment.response_data = result
            paystack_payment.save()
            
            return {
                'success': True,
                'authorization_url': result['data']['authorization_url'],
                'access_code': result['data']['access_code'],
                'reference': reference
            }
            
        except requests.exceptions.HTTPError as e:
            print(f"HTTP Error initializing Paystack transaction: {e}")
            print(f"Response body: {e.response.text if e.response else 'No response'}")
            return {
                'success': False,
                'error': str(e),
                'response_body': e.response.text if e.response else 'No response'
            }
        except Exception as e:
            print(f"Error initializing Paystack transaction: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def verify_transaction(self, reference):
        """Verify Paystack transaction"""
        
        # If in simulation mode, simulate successful verification
        if self.simulation_mode:
            print(f"DEBUG: SIMULATION MODE - Verifying transaction {reference}")
            try:
                paystack_payment = PaystackPayment.objects.get(reference=reference)
                
                # Simulate successful payment
                paystack_payment.status = "completed"
                paystack_payment.processed_at = timezone.now()
                paystack_payment.response_data = {
                    "status": True,
                    "data": {
                        "status": "success",
                        "amount": paystack_payment.amount * 100,  # in kobo
                        "reference": reference
                    }
                }
                paystack_payment.save()
                
                # Add funds to wallet
                wallet, created = Wallet.objects.get_or_create(
                    user_id=paystack_payment.user_id,
                    defaults={"balance": 0}
                )
                wallet.add_funds(paystack_payment.amount)
                
                # Create transaction record
                Transaction.objects.create(
                    user_id=paystack_payment.user_id,
                    transaction_type="topup",
                    amount=paystack_payment.amount,
                    status="completed",
                    description=f"SIMULATED Paystack top-up - {reference}",
                    paystack_reference=reference
                )
                
                return {"success": True, "message": "SIMULATION: Payment verified successfully"}
                
            except PaystackPayment.DoesNotExist:
                return {"success": False, "error": "SIMULATION: Payment record not found"}
            except Exception as e:
                print(f"SIMULATION Error verifying transaction: {e}")
                return {"success": False, "error": f"SIMULATION: {str(e)}"}
        
        # Normal verification flow
        headers = {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.get(
                f"{self.base_url}/transaction/verify/{reference}",
                headers=headers
            )
            response.raise_for_status()
            
            result = response.json()
            
            if result['status'] and result['data']['status'] == 'success':
                # Find the payment record
                paystack_payment = PaystackPayment.objects.get(reference=reference)
                
                # Update payment record
                paystack_payment.status = "completed"
                paystack_payment.processed_at = timezone.now()
                paystack_payment.response_data = result
                paystack_payment.save()
                
                # Add funds to wallet
                wallet, created = Wallet.objects.get_or_create(
                    user_id=paystack_payment.user_id,
                    defaults={"balance": 0}
                )
                wallet.add_funds(paystack_payment.amount)
                
                # Create transaction record
                Transaction.objects.create(
                    user_id=paystack_payment.user_id,
                    transaction_type="topup",
                    amount=paystack_payment.amount,
                    status="completed",
                    description=f"Paystack top-up - {reference}",
                    paystack_reference=reference
                )
                
                return {"success": True, "message": "Payment verified successfully"}
                
            else:
                # Mark payment as failed
                paystack_payment = PaystackPayment.objects.get(reference=reference)
                paystack_payment.status = "failed"
                paystack_payment.save()
                
                return {"success": False, "message": result.get('message', 'Payment verification failed')}
                
        except PaystackPayment.DoesNotExist:
            return {"success": False, "error": "Payment record not found"}
        except Exception as e:
            print(f"Error verifying Paystack transaction: {e}")
            return {"success": False, "error": str(e)}
    
    def process_webhook(self, webhook_data):
        """Process Paystack webhook"""
        try:
            event = webhook_data.get('event')
            data = webhook_data.get('data')
            
            if event == 'charge.success':
                reference = data.get('reference')
                return self.verify_transaction(reference)
            
            elif event == 'charge.failed':
                reference = data.get('reference')
                paystack_payment = PaystackPayment.objects.get(reference=reference)
                paystack_payment.status = "failed"
                paystack_payment.save()
                return {"success": True, "message": "Payment marked as failed"}
            
            return {"success": True, "message": "Webhook processed"}
            
        except Exception as e:
            print(f"Error processing Paystack webhook: {e}")
            return {"success": False, "error": str(e)}

class WalletService:
    """Wallet management service"""
    
    @staticmethod
    def get_user_wallet(user_id):
        """Get or create user wallet"""
        wallet, created = Wallet.objects.get_or_create(
            user_id=user_id,
            defaults={"balance": 0}
        )
        return wallet
    
    @staticmethod
    def get_balance(user_id):
        """Get user wallet balance"""
        wallet = WalletService.get_user_wallet(user_id)
        return float(wallet.balance)
    
    @staticmethod
    def can_unlock_content(user_id, cost):
        """Check if user has sufficient balance to unlock content"""
        balance = WalletService.get_balance(user_id)
        return balance >= cost
    
    @staticmethod
    def unlock_content(user_id, book_id, content_type, content_identifier, cost):
        """Unlock content and deduct from wallet"""
        if not WalletService.can_unlock_content(user_id, cost):
            return {"success": False, "error": "Insufficient balance"}
        
        wallet = WalletService.get_user_wallet(user_id)
        
        if wallet.deduct_funds(cost):
            # Record the unlock
            from .models import ContentUnlock
            ContentUnlock.objects.create(
                user_id=user_id,
                book_id=book_id,
                content_type=content_type,
                content_identifier=content_identifier,
                amount_paid=cost
            )
            
            # Create transaction record
            Transaction.objects.create(
                user_id=user_id,
                transaction_type=f"unlock_{content_type}",
                amount=cost,
                status="completed",
                description=f"Unlocked {content_type} {content_identifier}"
            )
            
            return {"success": True, "message": "Content unlocked successfully"}
        
        return {"success": False, "error": "Failed to deduct funds"}
