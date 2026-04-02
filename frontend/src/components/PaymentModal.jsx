import React, { useState, useEffect } from 'react';
import { X, CreditCard, Check, AlertCircle, Loader } from 'lucide-react';
import api from '../api/axiosClient';

const PaymentModal = ({ isOpen, onClose, plan, onPaymentSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    if (isOpen && plan) {
      setError('');
      setPaymentData(null);
    }
  }, [isOpen, plan]);

  const handlePayment = async () => {
    if (!plan) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/payment/payments/initiate_payment/', {
        plan_id: plan.id
      });

      if (response.data.authorization_url) {
        setPaymentData(response.data);
        // Redirect to Paystack payment page
        window.location.href = response.data.authorization_url;
      } else {
        setError('Payment initialization failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm">
      <div className="bg-cream-50 rounded-2xl shadow-book w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-cream-300">
          <h2 className="font-reading text-xl font-semibold text-ink-900">Complete Payment</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-ink-500 hover:bg-cream-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {plan && (
            <div className="space-y-4">
              <div className="bg-accent/10 rounded-xl p-4 border border-accent/20">
                <h3 className="font-semibold text-accent text-lg">{plan.name}</h3>
                <p className="text-ink-600 text-sm mt-1">{plan.description}</p>
                <div className="mt-3 flex items-baseline">
                  <span className="text-3xl font-bold text-ink-900">${plan.price}</span>
                  <span className="text-ink-500 ml-2">/{plan.duration_days} days</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-ink-900">What you'll get:</h4>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-ink-600">
                      <Check size={16} className="text-accent flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-cream-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard size={16} className="text-ink-600" />
                  <span className="text-sm font-medium text-ink-900">Secure Payment</span>
                </div>
                <p className="text-xs text-ink-500">
                  Your payment information is encrypted and secure. We use Paystack for payment processing.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl border border-cream-300 text-ink-700 hover:bg-cream-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={loading}
                  className="flex-1 px-4 py-3 rounded-xl bg-accent text-white hover:bg-accent-hover font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay $${plan.price}`
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
