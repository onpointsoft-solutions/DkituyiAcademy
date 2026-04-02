import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from './AuthContext';

export default function AdminProtectedRoute({ children }) {
  const navigate = useNavigate();
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const hasChecked = useRef(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Only check once to avoid loops
    if (hasChecked.current) return;
    hasChecked.current = true;
    
    console.log('🔍 DEBUG: AdminProtectedRoute - Checking auth...');
    
    // Check and restore auth state from localStorage
    const isAuthValid = checkAuth();
    console.log('🔍 DEBUG: AdminProtectedRoute - checkAuth result:', isAuthValid);
    
    if (!isAuthValid) {
      console.log('🔍 DEBUG: AdminProtectedRoute - Not authenticated, redirecting to login');
      navigate('/login', { replace: true });
      return;
    }
    
    // Get fresh state after checkAuth
    const { user: currentUser } = useAuthStore.getState();
    console.log('🔍 DEBUG: AdminProtectedRoute - user after checkAuth:', currentUser);
    
    // Enhanced admin check - distinguish between super admin and regular admin
    const isSuperAdmin = currentUser?.is_superuser === true;
    const isAdmin = currentUser?.is_staff === true || currentUser?.role === 'admin';
    const hasAdminAccess = isSuperAdmin || isAdmin;
    
    console.log('🔍 DEBUG: AdminProtectedRoute - User roles:', {
      isSuperAdmin,
      isAdmin,
      hasAdminAccess,
      userRole: currentUser?.role,
      isStaff: currentUser?.is_staff,
      isSuperuser: currentUser?.is_superuser
    });
    
    if (!hasAdminAccess) {
      console.log('🔍 DEBUG: AdminProtectedRoute - User is not admin, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
      return;
    }
    
    // Mark as ready to render
    setIsReady(true);
    
    // Add page close prevention for admin users
    const handleBeforeUnload = (e) => {
      if (hasAdminAccess) {
        e.preventDefault();
        e.returnValue = 'You are accessing the admin panel. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    // Add visibility change detection
    const handleVisibilityChange = () => {
      if (document.hidden && hasAdminAccess) {
        console.log('🔍 Admin page hidden - user may be switching tabs');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    
  }, []); // Empty deps - only run once on mount

  // Show loading state while checking auth
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking admin access...</p>
        </div>
      </div>
    );
  }

  // Get fresh state for final check
  const { isAuthenticated: currentIsAuth, user: currentUser } = useAuthStore.getState();
  const isSuperAdmin = currentUser?.is_superuser === true;
  const isAdmin = currentUser?.is_staff === true || currentUser?.role === 'admin';
  const hasAdminAccess = isSuperAdmin || isAdmin;

  if (!currentIsAuth) {
    console.log('🔍 DEBUG: AdminProtectedRoute - Not authenticated (render check)');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">You don't have permission to access the admin panel.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  console.log('🔍 DEBUG: AdminProtectedRoute - Rendering children for', isSuperAdmin ? 'Super Admin' : 'Admin');
  return children;
}
