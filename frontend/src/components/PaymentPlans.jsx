import React, { useState, useEffect } from 'react';
import { Crown, Check, Star, BookOpen, Clock, Users, ArrowRight } from 'lucide-react';
import PaymentModal from './PaymentModal';
import api from '../api/axiosClient';

const PaymentPlans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/api/payment/plans/');
      setPlans(response.data);
    } catch (error) {
      console.error('Failed to fetch payment plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedPlan(null);
    // You might want to refresh user data or show a success message
    window.location.reload();
  };

  const getPlanIcon = (index) => {
    switch (index) {
      case 0:
        return <BookOpen className="w-6 h-6" />;
      case 1:
        return <Star className="w-6 h-6" />;
      case 2:
        return <Crown className="w-6 h-6" />;
      default:
        return <Users className="w-6 h-6" />;
    }
  };

  const getPlanColor = (index) => {
    switch (index) {
      case 0:
        return 'from-blue-500 to-blue-600';
      case 1:
        return 'from-purple-500 to-purple-600';
      case 2:
        return 'from-amber-500 to-amber-600';
      default:
        return 'from-green-500 to-green-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        <p className="ml-4 text-ink-500">Loading payment plans...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-reading text-3xl font-bold text-ink-900 mb-4">
          Choose Your Reading Plan
        </h2>
        <p className="text-ink-600 max-w-2xl mx-auto">
          Unlock unlimited access to our premium book collection. Choose the plan that works best for you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan, index) => (
          <div
            key={plan.id}
            className={`bg-cream-50 rounded-2xl border border-cream-300 shadow-book hover:shadow-book-hover transition-all duration-200 ${
              index === 2 ? 'ring-2 ring-accent transform scale-105' : ''
            }`}
          >
            {index === 2 && (
              <div className="bg-accent text-white text-center py-2 px-4 rounded-t-xl text-sm font-medium">
                MOST POPULAR
              </div>
            )}
            
            <div className="p-6">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${getPlanColor(index)} flex items-center justify-center text-white mb-4`}>
                {getPlanIcon(index)}
              </div>
              
              <h3 className="font-reading text-xl font-bold text-ink-900 mb-2">
                {plan.name}
              </h3>
              
              <p className="text-ink-600 text-sm mb-4">{plan.description}</p>
              
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-ink-900">${plan.price}</span>
                  <span className="text-ink-500 ml-2">/{plan.duration_days} days</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {plan.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-center gap-2">
                    <Check size={16} className="text-accent flex-shrink-0" />
                    <span className="text-sm text-ink-600">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handlePlanSelect(plan)}
                className={`w-full py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                  index === 2
                    ? 'bg-accent text-white hover:bg-accent-hover'
                    : 'bg-ink-900 text-white hover:bg-ink-800'
                }`}
              >
                Get Started
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-cream-100 rounded-2xl p-8 text-center">
        <h3 className="font-reading text-xl font-semibold text-ink-900 mb-4">
          Not sure which plan to choose?
        </h3>
        <p className="text-ink-600 mb-6">
          Start with our Basic plan and upgrade anytime. No hidden fees, cancel anytime.
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-ink-500">
          <div className="flex items-center gap-1">
            <Check size={16} className="text-accent" />
            <span>Secure payment</span>
          </div>
          <div className="flex items-center gap-1">
            <Check size={16} className="text-accent" />
            <span>Instant access</span>
          </div>
          <div className="flex items-center gap-1">
            <Check size={16} className="text-accent" />
            <span>24/7 support</span>
          </div>
        </div>
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        plan={selectedPlan}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default PaymentPlans;
