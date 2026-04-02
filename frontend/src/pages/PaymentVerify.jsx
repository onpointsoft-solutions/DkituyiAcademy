import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader, ArrowLeft } from 'lucide-react';
import api from '../api/axiosClient';

const PaymentVerify = () => {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('');
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    if (paymentId) {
      verifyPayment();
    }
  }, [paymentId]);

  const verifyPayment = async () => {
    try {
      setStatus('processing');
      setMessage('Verifying your payment...');

      // First, get the payment details to get the reference
      const paymentResponse = await api.get(`/api/payment/payments/${paymentId}/`);
      const payment = paymentResponse.data;

      if (payment.status === 'completed') {
        setStatus('success');
        setMessage('Payment successful! Your subscription is now active.');
        setPaymentData(payment);
        return;
      }

      // If payment is still pending, verify with Paystack
      if (payment.status === 'pending' && payment.paystack_reference) {
        const verifyResponse = await api.post('/api/payment/payments/verify_payment/', {
          reference: payment.paystack_reference
        });

        if (verifyResponse.data.payment && verifyResponse.data.payment.status === 'completed') {
          setStatus('success');
          setMessage('Payment successful! Your subscription is now active.');
          setPaymentData(verifyResponse.data.payment);
        } else {
          setStatus('error');
          setMessage('Payment verification failed. Please contact support.');
        }
      } else {
        setStatus('error');
        setMessage('Payment not found or already processed.');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('error');
      setMessage(error.response?.data?.error || 'Payment verification failed. Please try again.');
    }
  };

  const handleGoToLibrary = () => {
    navigate('/library');
  };

  const handleRetry = () => {
    verifyPayment();
  };

  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-book p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader className="w-8 h-8 text-accent animate-spin" />
          </div>
          <h2 className="font-reading text-2xl font-bold text-ink-900 mb-4">
            Verifying Payment
          </h2>
          <p className="text-ink-600 mb-6">{message}</p>
          <div className="bg-cream-100 rounded-lg p-4">
            <p className="text-sm text-ink-500">
              Please wait while we verify your payment with our secure payment provider...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-book p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="font-reading text-2xl font-bold text-ink-900 mb-4">
            Payment Successful!
          </h2>
          <p className="text-ink-600 mb-6">{message}</p>
          
          {paymentData && (
            <div className="bg-cream-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-ink-900 mb-3">Payment Details:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-600">Payment ID:</span>
                  <span className="font-medium text-ink-900">{paymentData.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-600">Plan:</span>
                  <span className="font-medium text-ink-900">{paymentData.plan?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-600">Amount:</span>
                  <span className="font-medium text-ink-900">${paymentData.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-600">Status:</span>
                  <span className="font-medium text-green-600">Completed</span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleGoToLibrary}
            className="w-full bg-accent text-white py-3 px-6 rounded-xl font-medium hover:bg-accent-hover transition-colors"
          >
            Go to Library
          </button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-book p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="font-reading text-2xl font-bold text-ink-900 mb-4">
            Payment Failed
          </h2>
          <p className="text-ink-600 mb-6">{message}</p>
          
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full bg-accent text-white py-3 px-6 rounded-xl font-medium hover:bg-accent-hover transition-colors"
            >
              Retry Verification
            </button>
            
            <button
              onClick={() => navigate('/payment/plans')}
              className="w-full border border-cream-300 text-ink-700 py-3 px-6 rounded-xl font-medium hover:bg-cream-200 transition-colors"
            >
              Choose Different Plan
            </button>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full text-accent py-3 px-6 rounded-xl font-medium hover:text-accent-hover transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PaymentVerify;
