import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/axiosClient';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing your payment...');

  const reference = searchParams.get('reference');
  const trxref = searchParams.get('trxref');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setStatus('error');
        setMessage('No payment reference found');
        return;
      }

      try {
        setStatus('verifying');
        setMessage('Verifying your payment with Paystack...');
        
        // Verify payment with backend
        const response = await api.post('/api/payments/verify-payment/', {
          reference: reference,
          simulation_mode: searchParams.get('simulation') === 'true'
        });

        if (response.data.message) {
          const isSimulation = response.data.simulation_mode;
          setStatus('success');
          setMessage(isSimulation ? 
            '🧪 Payment simulation successful! Your wallet has been credited (SIMULATION MODE).' :
            '🎉 Payment successful! Your wallet has been credited.'
          );
          
          // Redirect to wallet after 3 seconds
          setTimeout(() => {
            navigate('/profile');
          }, 3000);
        } else {
          setStatus('error');
          setMessage('Payment verification failed. Please contact support.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Payment verification failed. Please try again or contact support.');
        console.error('Payment verification error:', error);
      }
    };

    verifyPayment();
  }, [reference, navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
      case 'verifying':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '🔄';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-book p-8 text-center">
        {/* Status Icon */}
        <div className="text-6xl mb-4 animate-pulse">
          {getStatusIcon()}
        </div>

        {/* Status Message */}
        <h1 className={`text-2xl font-bold mb-2 font-reading ${getStatusColor()}`}>
          {status === 'success' ? 'Payment Successful!' : 
           status === 'error' ? 'Payment Failed' : 'Processing Payment'}
        </h1>
        
        <p className="text-ink-600 mb-6 leading-relaxed">
          {message}
        </p>

        {/* Payment Details */}
        {reference && (
          <div className="bg-cream-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-ink-900 mb-2">Payment Details</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-600">Reference:</span>
                <span className="font-mono text-ink-900">{reference}</span>
              </div>
              {trxref && (
                <div className="flex justify-between">
                  <span className="text-ink-600">Transaction Ref:</span>
                  <span className="font-mono text-ink-900">{trxref}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {status === 'success' && (
            <button
              onClick={() => navigate('/profile')}
              className="px-6 py-3 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors font-medium"
            >
              Go to Wallet
            </button>
          )}
          
          {status === 'error' && (
            <>
              <button
                onClick={() => navigate('/profile')}
                className="px-6 py-3 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = 'mailto:support@dkituyiacademy.com'}
                className="px-6 py-3 border border-ink-300 text-ink-700 rounded-xl hover:bg-cream-50 transition-colors font-medium"
              >
                Contact Support
              </button>
            </>
          )}
          
          {status === 'processing' && (
            <button
              onClick={() => navigate('/profile')}
              className="px-6 py-3 border border-ink-300 text-ink-700 rounded-xl hover:bg-cream-50 transition-colors font-medium"
            >
              Back to Profile
            </button>
          )}
        </div>

        {/* Additional Info */}
        <div className="mt-6 pt-6 border-t border-cream-200">
          <p className="text-xs text-ink-500">
            If you have any questions about this payment, please contact us at{' '}
            <a href="mailto:support@dkituyiacademy.org" className="text-accent hover:underline">
              support@dkituyiacademy.org
            </a>
          </p>
          <p className="text-xs text-ink-500 mt-2">
            Reference: <span className="font-mono">{reference}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentCallback;
