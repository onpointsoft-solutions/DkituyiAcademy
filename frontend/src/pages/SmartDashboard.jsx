import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/AuthContext';
import Dashboard from './Dashboard';
import Admin from './Admin';

export default function SmartDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Check if user is admin and redirect to admin dashboard
    const isAdmin = user?.is_staff || user?.is_superuser || user?.role === 'admin';
    
    console.log('🔍 DEBUG: SmartDashboard - User:', user);
    console.log('🔍 DEBUG: SmartDashboard - Is admin:', isAdmin);

    if (isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [user, isAuthenticated, navigate]);

  // If not admin, show regular dashboard
  const isAdmin = user?.is_staff || user?.is_superuser || user?.role === 'admin';
  
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-ink-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-ink-500">Redirecting to admin dashboard...</p>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}
