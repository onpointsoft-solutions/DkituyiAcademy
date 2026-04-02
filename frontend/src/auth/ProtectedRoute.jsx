import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from './AuthContext';

export default function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    if (!checkAuth()) {
      // Redirect to Django login page instead of WordPress
      navigate('/login');
      return;
    }
  }, [navigate, checkAuth]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return children;
}
