"""
Currency conversion utilities for multi-currency payment support
"""
from django.conf import settings

def convert_to_kes(amount, from_currency='USD'):
    """
    Convert amount from specified currency to Kenyan Shillings (KES)
    
    Args:
        amount (float): Amount to convert
        from_currency (str): Source currency code (USD, UGX, TZS, NGN, ZAR)
    
    Returns:
        float: Amount in KES
    """
    if from_currency == 'KES':
        return amount
    
    conversion_rates = getattr(settings, 'CURRENCY_CONVERSION_RATES', {
        'USD': 1.0,
        'KES': 130.0,
        'UGX': 3700.0,
        'TZS': 2500.0,
        'NGN': 750.0,
        'ZAR': 18.5,
    })
    
    # First convert to USD, then to KES
    usd_amount = amount / conversion_rates.get(from_currency, 1.0)
    kes_amount = usd_amount * conversion_rates.get('KES', 130.0)
    
    return round(kes_amount, 2)

def convert_from_kes(amount, to_currency='USD'):
    """
    Convert amount from Kenyan Shillings (KES) to specified currency
    
    Args:
        amount (float): Amount in KES
        to_currency (str): Target currency code (USD, UGX, TZS, NGN, ZAR)
    
    Returns:
        float: Amount in target currency
    """
    if to_currency == 'KES':
        return amount
    
    conversion_rates = getattr(settings, 'CURRENCY_CONVERSION_RATES', {
        'USD': 1.0,
        'KES': 130.0,
        'UGX': 3700.0,
        'TZS': 2500.0,
        'NGN': 750.0,
        'ZAR': 18.5,
    })
    
    # First convert KES to USD, then to target currency
    usd_amount = amount / conversion_rates.get('KES', 130.0)
    target_amount = usd_amount * conversion_rates.get(to_currency, 1.0)
    
    return round(target_amount, 2)

def get_country_currency(country_code):
    """
    Get currency code for a supported country
    
    Args:
        country_code (str): 2-letter country code
    
    Returns:
        str: Currency code or None if not supported
    """
    supported_countries = getattr(settings, 'SUPPORTED_COUNTRIES', {
        'KE': {'currency': 'KES', 'name': 'Kenya'},
        'UG': {'currency': 'UGX', 'name': 'Uganda'},
        'TZ': {'currency': 'TZS', 'name': 'Tanzania'},
        'NG': {'currency': 'NGN', 'name': 'Nigeria'},
        'ZA': {'currency': 'ZAR', 'name': 'South Africa'},
    })
    
    country_info = supported_countries.get(country_code.upper())
    return country_info['currency'] if country_info else None

def is_paystack_supported_country(country_code):
    """
    Check if a country is supported by Paystack
    
    Args:
        country_code (str): 2-letter country code
    
    Returns:
        bool: True if supported by Paystack
    """
    supported_countries = getattr(settings, 'PAYSTACK_SUPPORTED_COUNTRIES', ['KE', 'UG', 'GH', 'ZA', 'NG'])
    return country_code.upper() in supported_countries

def format_currency(amount, currency_code):
    """
    Format amount with currency symbol
    
    Args:
        amount (float): Amount to format
        currency_code (str): Currency code
    
    Returns:
        str: Formatted currency string
    """
    currency_symbols = {
        'USD': '$',
        'KES': 'KSh',
        'UGX': 'UGX',
        'TZS': 'TZS',
        'NGN': '₦',
        'ZAR': 'R',
    }
    
    symbol = currency_symbols.get(currency_code, currency_code)
    
    # Special formatting for different currencies
    if currency_code in ['UGX', 'TZS']:  # These usually don't show decimals
        return f"{symbol} {int(amount):,}"
    else:
        return f"{symbol} {amount:,.2f}"
