import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { wordpressApi } from '../api/axiosClient';
import { useAuthStore } from '../auth/AuthContext';

export default function LoginRedirect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setError('No authentication token received');
      setStatus('error');
      return;
    }

    // Verify token with WordPress and get user info
    const verifyToken = async () => {
      try {
        // First verify the token with our custom JWT endpoint
        const verifyResponse = await wordpressApi.post('/wp-json/jwt-auth/v1/token/validate', {
          token: token
        });

        if (!verifyResponse.data.valid) {
          setError('Invalid authentication token');
          setStatus('error');
          return;
        }

        // If token is valid, get user info
        const response = await wordpressApi.get('/wp-json/wp/v2/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const user = {
          id: response.data.id,
          email: response.data.email,
          name: response.data.name,
          username: response.data.slug
        };

        setAuth(user, token);
        setStatus('success');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
        
      } catch (err) {
        setError('Failed to verify authentication token');
        setStatus('error');
        console.error('Token verification failed:', err);
      }
    };

    verifyToken();
  }, [searchParams, navigate, setAuth]);

  const getStatusMessage = () => {
    switch (status) {
      case 'processing':
        return 'Authenticating...';
      case 'success':
        return 'Authentication successful! Redirecting...';
      case 'error':
        return error || 'Authentication failed';
      default:
        return 'Processing...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="mb-6">
            {status === 'processing' && (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            )}
            {status === 'success' && (
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            )}
            {status === 'error' && (
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
            )}
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {status === 'success' ? 'Welcome Back!' : 'Authentication'}
          </h1>
          
          <p className={`text-sm ${getStatusColor()} mb-6`}>
            {getStatusMessage()}
          </p>
          
          {status === 'error' && (
            <button
              onClick={() => window.location.href = process.env.REACT_APP_WORDPRESS_URL + '/login'}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
