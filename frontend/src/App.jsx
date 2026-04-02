import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import { useAuthStore } from './auth/AuthContext';
import { initializeCSRF } from './api';

// Layout Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import AdminLayout from './components/AdminLayout';
import CatchAllRedirect from './components/CatchAllRedirect';

// Page Components
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import SmartDashboard from './pages/SmartDashboard';
import Library from './pages/Library';
import Books from './pages/Books';
import BookPreview from './pages/BookPreview';
import ReadingHistory from './pages/ReadingHistory';
import PDFReader from './pages/PDFReader';
import ModernPDFReader from './pages/ModernPDFReader';
import AdminPanel from './pages/AdminPanel';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import LoginRedirect from './pages/LoginRedirect';
import Login from './pages/Login';
import Admin from './pages/Admin';
import TestAuth from './pages/TestAuth';
import PaymentSimulator from './pages/PaymentSimulator';
import PaymentVerify from './pages/PaymentVerify';
import PaymentCallback from './pages/PaymentCallback';
import AdminProtectedRoute from './auth/AdminProtectedRoute';

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-cream-100">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  const { checkAuth } = useAuthStore();

  // Check authentication on app load
  useEffect(() => {
    checkAuth();
    
    // Initialize CSRF token globally
    initializeCSRF().then(csrfToken => {
      if (csrfToken) {
        console.log('DEBUG: Global CSRF token initialized');
      }
    }).catch(error => {
      console.error('DEBUG: Failed to initialize global CSRF token:', error);
    });
  }, [checkAuth]);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/test-auth" element={<TestAuth />} />
        
        {/* Home Route - Public */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={
          <AdminProtectedRoute>
            <Admin />
          </AdminProtectedRoute>
        } />
        
        <Route path="/admin-panel" element={
          <AdminProtectedRoute>
            <AdminPanel />
          </AdminProtectedRoute>
        } />
        
        {/* Admin tab routes - keep within admin section */}
        <Route path="/admin/:tab" element={
          <AdminProtectedRoute>
            <Admin />
          </AdminProtectedRoute>
        } />
        
        {/* Authentication Callback (for WordPress later) */}
        <Route path="/auth/callback" element={<LoginRedirect />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout>
              <SmartDashboard />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/library" element={
          <ProtectedRoute>
            <Layout>
              <Library />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/books" element={
          <ProtectedRoute>
            <Layout>
              <Books />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/preview/:bookId" element={<BookPreview />} />
        
        <Route path="/reader/:bookId" element={<ModernPDFReader />} />
        
        <Route path="/reader-classic/:bookId" element={
          <ProtectedRoute>
            <PDFReader />
          </ProtectedRoute>
        } />
        
        <Route path="/wallet" element={
          <ProtectedRoute>
            <Layout>
              <Wallet />
            </Layout>
          </ProtectedRoute>
        } />
        
        {/* Payment Routes */}
        <Route path="/payment/verify/:paymentId" element={<PaymentVerify />} />
        <Route path="/payment/callback" element={<PaymentCallback />} />
        <Route path="/payment/simulator" element={
          <ProtectedRoute>
            <Layout>
              <PaymentSimulator />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/books" element={
          <ProtectedRoute>
            <Layout>
              <Books />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/history" element={
          <ProtectedRoute>
            <Layout>
              <ReadingHistory />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        } />
        
        {/* Catch all route - redirect non-admin routes to dashboard */}
        <Route path="*" element={<CatchAllRedirect />} />
      </Routes>
    </Router>
  );
}

export default App;
