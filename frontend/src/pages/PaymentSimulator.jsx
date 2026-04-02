import React, { useState } from 'react';
import { CreditCard, Smartphone, Wallet, TestTube, CheckCircle, AlertCircle, Play, Pause } from 'lucide-react';
import api from '../api/axiosClient';

export default function PaymentSimulator() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResults, setSimulationResults] = useState([]);
  const [testAmount, setTestAmount] = useState(100);
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [currentStep, setCurrentStep] = useState('');
  const [simulationStatus, setSimulationStatus] = useState('idle');

  const addResult = (step, status, message, details = null) => {
    const result = {
      step,
      status,
      message,
      details,
      timestamp: new Date().toLocaleTimeString()
    };
    setSimulationResults(prev => [...prev, result]);
  };

  const simulatePaymentFlow = async () => {
    setIsSimulating(true);
    setSimulationResults([]);
    setSimulationStatus('running');
    
    try {
      // Step 1: Initialize Payment
      setCurrentStep('Initializing payment...');
      addResult('Payment Initiation', 'processing', 'Starting payment simulation');
      
      const initResponse = await api.post('/api/payments/wallet/topup/', {
        amount: testAmount,
        email: testEmail
      });
      
      if (initResponse.data.authorization_url) {
        addResult('Payment Initiation', 'success', 'Payment initialized successfully', {
          authorization_url: initResponse.data.authorization_url,
          access_code: initResponse.data.access_code,
          reference: initResponse.data.reference
        });
        
        // Step 2: Simulate Paystack Callback
        setCurrentStep('Simulating Paystack callback...');
        addResult('Paystack Callback', 'processing', 'Simulating successful payment callback');
        
        // Simulate callback URL with reference
        const callbackUrl = `/payment/callback?reference=${initResponse.data.reference}`;
        addResult('Paystack Callback', 'success', 'Callback simulated', { callback_url: callbackUrl });
        
        // Step 3: Verify Payment
        setCurrentStep('Verifying payment...');
        addResult('Payment Verification', 'processing', 'Verifying payment with backend');
        
        const verifyResponse = await api.post('/api/payments/verify-payment/', {
          reference: initResponse.data.reference,
          simulation_mode: true
        });
        
        if (verifyResponse.data.message) {
          addResult('Payment Verification', 'success', 'Payment verified successfully', {
            message: verifyResponse.data.message,
            wallet_balance: verifyResponse.data.wallet_balance
          });
          
          // Step 4: Check Wallet Balance
          setCurrentStep('Checking wallet balance...');
          addResult('Wallet Balance Check', 'processing', 'Checking updated wallet balance');
          
          const walletResponse = await api.get('/api/payments/wallet/');
          
          addResult('Wallet Balance Check', 'success', 'Wallet balance updated', {
            balance: walletResponse.data.balance,
            currency: walletResponse.data.currency || 'KES'
          });
          
          // Step 5: Check Transaction History
          setCurrentStep('Checking transaction history...');
          addResult('Transaction History', 'processing', 'Verifying transaction recorded');
          
          const transactionsResponse = await api.get('/api/payments/transactions/');
          
          const latestTransaction = transactionsResponse.data[0];
          if (latestTransaction && latestTransaction.amount === testAmount) {
            addResult('Transaction History', 'success', 'Transaction recorded successfully', {
              transaction_id: latestTransaction.id,
              amount: latestTransaction.amount,
              status: latestTransaction.status,
              created_at: latestTransaction.created_at
            });
          } else {
            addResult('Transaction History', 'error', 'Transaction not found or amount mismatch');
          }
          
          setSimulationStatus('success');
          setCurrentStep('Simulation completed successfully!');
          
        } else {
          addResult('Payment Verification', 'error', 'Payment verification failed');
          setSimulationStatus('error');
          setCurrentStep('Simulation failed at verification step');
        }
      } else {
        addResult('Payment Initiation', 'error', 'Failed to initialize payment', initResponse.data);
        setSimulationStatus('error');
        setCurrentStep('Simulation failed at initiation step');
      }
      
    } catch (error) {
      console.error('Payment simulation error:', error);
      addResult('Simulation Error', 'error', error.response?.data?.error || error.message, {
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      setSimulationStatus('error');
      setCurrentStep('Simulation failed with error');
    } finally {
      setIsSimulating(false);
    }
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    setSimulationStatus('stopped');
    setCurrentStep('Simulation stopped by user');
    addResult('Simulation', 'warning', 'Simulation stopped by user');
  };

  const clearResults = () => {
    setSimulationResults([]);
    setSimulationStatus('idle');
    setCurrentStep('');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle size={16} className="text-green-500" />;
      case 'error': return <AlertCircle size={16} className="text-red-500" />;
      case 'processing': return <Play size={16} className="text-blue-500" />;
      case 'warning': return <Pause size={16} className="text-yellow-500" />;
      default: return <Wallet size={16} className="text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'error': return 'border-red-200 bg-red-50';
      case 'processing': return 'border-blue-200 bg-blue-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <TestTube size={32} className="text-accent" />
          <h1 className="font-reading text-3xl font-bold text-ink-900">Payment Simulator</h1>
        </div>
        <p className="text-ink-500">Test payment flows without real transactions</p>
      </div>

      {/* Simulation Controls */}
      <div className="bg-cream-50 border border-cream-300 rounded-xl p-6 mb-8">
        <h2 className="font-semibold text-ink-900 mb-4">Simulation Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-2">
              Test Amount (KES)
            </label>
            <input
              type="number"
              value={testAmount}
              onChange={(e) => setTestAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
              min="1"
              max="10000"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-2">
              Test Email
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
              placeholder="test@example.com"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={simulatePaymentFlow}
            disabled={isSimulating}
            className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <TestTube size={20} />
            {isSimulating ? 'Simulating...' : 'Start Simulation'}
          </button>
          
          {isSimulating && (
            <button
              onClick={stopSimulation}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <Pause size={20} />
              Stop
            </button>
          )}
          
          <button
            onClick={clearResults}
            disabled={isSimulating}
            className="px-6 py-3 bg-ink-200 text-ink-700 rounded-lg hover:bg-ink-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Clear Results
          </button>
        </div>

        {/* Current Status */}
        {currentStep && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-blue-700 font-medium">{currentStep}</span>
            </div>
          </div>
        )}

        {/* Overall Status */}
        {simulationStatus !== 'idle' && (
          <div className={`mt-4 p-3 rounded-lg border ${
            simulationStatus === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
            simulationStatus === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
            simulationStatus === 'stopped' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
            'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            <div className="flex items-center gap-2">
              {simulationStatus === 'success' && <CheckCircle size={16} />}
              {simulationStatus === 'error' && <AlertCircle size={16} />}
              {simulationStatus === 'stopped' && <Pause size={16} />}
              {simulationStatus === 'running' && <Play size={16} />}
              <span className="text-sm font-medium">
                Simulation {simulationStatus === 'success' ? 'completed successfully' :
                           simulationStatus === 'error' ? 'failed' :
                           simulationStatus === 'stopped' ? 'stopped' :
                           'in progress...'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Simulation Results */}
      {simulationResults.length > 0 && (
        <div className="bg-white border border-cream-300 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-cream-300">
            <h2 className="font-semibold text-ink-900">Simulation Results</h2>
          </div>
          
          <div className="divide-y divide-cream-200">
            {simulationResults.map((result, index) => (
              <div key={index} className={`p-4 ${getStatusColor(result.status)}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(result.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-ink-900">{result.step}</h3>
                      <span className="text-xs text-ink-500">{result.timestamp}</span>
                    </div>
                    <p className="text-sm text-ink-600 mb-2">{result.message}</p>
                    
                    {result.details && (
                      <div className="bg-white/50 rounded-lg p-3 text-xs">
                        <pre className="text-ink-700 whitespace-pre-wrap">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Instructions */}
      <div className="mt-8 bg-cream-50 border border-cream-300 rounded-xl p-6">
        <h2 className="font-semibold text-ink-900 mb-3">How to Use</h2>
        <div className="space-y-2 text-sm text-ink-600">
          <p>• Set the test amount and email for the simulation</p>
          <p>• Click "Start Simulation" to begin the payment flow test</p>
          <p>• The simulator will test: Payment initiation → Callback simulation → Verification → Wallet update</p>
          <p>• Review the detailed results to ensure each step works correctly</p>
          <p>• Use this to identify and fix payment flow issues before real transactions</p>
        </div>
      </div>
    </div>
  );
}
