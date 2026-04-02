import React, { useState, useEffect } from 'react';
import { CreditCard, Wallet, TrendingUp, DollarSign } from 'lucide-react';

export default function PaymentManagement() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    activeWallets: 0,
    averageTopup: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - would fetch from /api/payments/stats/ endpoint
    setTimeout(() => {
      setStats({
        totalRevenue: 12500,
        totalTransactions: 342,
        activeWallets: 156,
        averageTopup: 36.50
      });
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 rounded-xl">
          <CreditCard size={24} className="text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Payment Management</h2>
          <p className="text-sm text-stone-500">Wallet transactions and revenue</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign size={20} className="text-green-600" />
            <span className="text-sm text-stone-500">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-stone-900">${stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard size={20} className="text-blue-600" />
            <span className="text-sm text-stone-500">Transactions</span>
          </div>
          <p className="text-2xl font-bold text-stone-900">{stats.totalTransactions}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <Wallet size={20} className="text-purple-600" />
            <span className="text-sm text-stone-500">Active Wallets</span>
          </div>
          <p className="text-2xl font-bold text-stone-900">{stats.activeWallets}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp size={20} className="text-amber-600" />
            <span className="text-sm text-stone-500">Avg Top-up</span>
          </div>
          <p className="text-2xl font-bold text-stone-900">${stats.averageTopup}</p>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Payment Overview</h3>
        <p className="text-stone-600 mb-4">
          Payment management allows you to view transaction history, manage wallet balances,
          and process refunds. Full payment management features coming soon.
        </p>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
            View Transactions
          </button>
          <button className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors">
            Export Reports
          </button>
        </div>
      </div>
    </div>
  );
}
