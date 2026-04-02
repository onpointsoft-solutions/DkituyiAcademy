import React, { useState, useEffect } from 'react';
import { Wallet, CreditCard, TrendingUp, Clock, Award } from 'lucide-react';
import api from '../api/axiosClient';

export default function WalletPage() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupData, setTopupData] = useState({ email: '', amount: '' });

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      console.log('🔍 DEBUG: Fetching wallet data...');
      
      const [walletResponse, transactionsResponse] = await Promise.all([
        api.get('/api/payments/wallet/'),
        api.get('/api/payments/wallet/transactions/')
      ]);

      console.log('🔍 DEBUG: Wallet response:', walletResponse.data);
      console.log('🔍 DEBUG: Transactions response:', transactionsResponse.data);

      setWallet(walletResponse.data);
      setTransactions(transactionsResponse.data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
      setError('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleTopup = async () => {
    if (!topupData.email || !topupData.amount) {
      setError('Please enter email and amount');
      return;
    }

    try {
      console.log('🔍 DEBUG: Initiating top-up...');
      const response = await api.post('/api/payments/wallet/topup/', topupData);
      
      console.log('🔍 DEBUG: Top-up response:', response.data);
      
      if (response.data.authorization_url) {
        // Redirect to Paystack payment page
        window.open(response.data.authorization_url, '_blank');
        setShowTopupModal(false);
        setTopupData({ email: '', amount: '' });
        
        // Poll for payment completion
        setTimeout(() => {
          fetchWalletData();
        }, 5000);
      }
    } catch (error) {
      console.error('Failed to initiate top-up:', error);
      setError(error.response?.data?.error || 'Failed to initiate payment');
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 font-reading text-ink-600">Loading wallet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchWalletData}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ink-900 font-reading mb-2">My Wallet</h1>
          <p className="text-ink-600">Manage your reading credits and track transactions</p>
        </div>

        {/* Wallet Balance Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-cream-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                <Wallet size={24} className="text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ink-900">Wallet Balance</h2>
                <p className="text-sm text-ink-500">Available credits for reading</p>
              </div>
            </div>
            <button
              onClick={() => setShowTopupModal(true)}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
            >
              Top Up
            </button>
          </div>
          
          <div className="text-center">
            <div className="text-4xl font-bold text-ink-900 font-reading">
              {wallet ? formatAmount(wallet.balance) : 'KES 0.00'}
            </div>
            <p className="text-sm text-ink-500 mt-1">Current balance</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-cream-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-warm-amber/10 rounded-full flex items-center justify-center">
                <CreditCard size={20} className="text-warm-amber" />
              </div>
              <div>
                <h3 className="font-semibold text-ink-900">Quick Top-up</h3>
                <p className="text-sm text-ink-500">Add credits instantly</p>
              </div>
            </div>
            <button
              onClick={() => setShowTopupModal(true)}
              className="w-full px-4 py-2 bg-warm-amber text-white rounded-lg hover:bg-warm-amber/90 transition-colors"
            >
              Add Credits
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-cream-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                <Clock size={20} className="text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-ink-900">Reading Time</h3>
                <p className="text-sm text-ink-500">Track your progress</p>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-ink-900">0h</div>
              <p className="text-sm text-ink-500">Total reading</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-cream-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-warm-gold/10 rounded-full flex items-center justify-center">
                <Award size={20} className="text-warm-gold" />
              </div>
              <div>
                <h3 className="font-semibold text-ink-900">Achievements</h3>
                <p className="text-sm text-ink-500">Your reading milestones</p>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-ink-900">0</div>
              <p className="text-sm text-ink-500">Achievements earned</p>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-cream-200">
          <h2 className="text-xl font-semibold text-ink-900 mb-4">Transaction History</h2>
          
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={32} className="text-ink-400" />
              </div>
              <h3 className="font-semibold text-ink-900 mb-2">No transactions yet</h3>
              <p className="text-ink-500">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-cream-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.status === 'completed' 
                        ? 'bg-green-100' 
                        : transaction.status === 'pending' 
                        ? 'bg-yellow-100' 
                        : 'bg-red-100'
                    }`}>
                      {transaction.status === 'completed' && <TrendingUp size={20} className="text-green-600" />}
                      {transaction.status === 'pending' && <Clock size={20} className="text-yellow-600" />}
                      {transaction.status === 'failed' && <Award size={20} className="text-red-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-ink-900 capitalize">{transaction.transaction_type}</p>
                      <p className="text-sm text-ink-500">{transaction.description}</p>
                      <p className="text-xs text-ink-400">{formatDate(transaction.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink-900">{formatAmount(transaction.amount)}</p>
                    <p className="text-xs text-ink-500 capitalize">{transaction.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top-up Modal */}
      {showTopupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-ink-900 mb-4">Add Credits</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Email</label>
                <input
                  type="email"
                  value={topupData.email}
                  onChange={(e) => setTopupData({ ...topupData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Amount (KES)</label>
                <input
                  type="number"
                  value={topupData.amount}
                  onChange={(e) => setTopupData({ ...topupData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="Enter amount (min: 20 KES)"
                  min="20"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTopupModal(false)}
                className="flex-1 px-4 py-2 border border-cream-300 text-ink-700 rounded-lg hover:bg-cream-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTopup}
                className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
              >
                Pay with Paystack
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
