import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, Mail, GraduationCap, BookOpen, Brain, Sparkles, Book, Coffee, PenTool } from 'lucide-react';
import { api } from '../api';
import { initializeCSRF } from '../api';
import { useAuthStore } from '../auth/AuthContext';

// Fallback images for digital reading themes
const FALLBACK_IMAGES = [
  'https://via.placeholder.com/400x300/222222/ffffff?text=Student+Reading+Ebook',
  'https://via.placeholder.com/400x300/333333/ffffff?text=Woman+Reading+Digital+Book',
  'https://via.placeholder.com/400x300/444444/ffffff?text=Man+with+Ebook+Reader',
  'https://via.placeholder.com/400x300/555555/ffffff?text=Educator+Digital+Reading',
  'https://via.placeholder.com/400x300/666666/ffffff?text=Library+Ebook+Reading',
  'https://via.placeholder.com/400x300/777777/ffffff?text=Students+Reading+Ebooks',
];

// High-quality digital reading images (using reliable sources)
const HERO_IMAGES = [
  'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400', // Student studying
  'https://images.pexels.com/photos/1181359/pexels-photo-1181359.jpeg?auto=compress&cs=tinysrgb&w=400', // Person reading
  'https://images.pexels.com/photos/1108101/pexels-photo-1108101.jpeg?auto=compress&cs=tinysrgb&w=400', // Student with books
  'https://images.pexels.com/photos/267889/pexels-photo-267889.jpeg?auto=compress&cs=tinysrgb&w=400', // Educator teaching
  'https://images.pexels.com/photos/269078/pexels-photo-269078.jpeg?auto=compress&cs=tinysrgb&w=400', // Person in library
  'https://images.pexels.com/photos/1020315/pexels-photo-1020315.jpeg?auto=compress&cs=tinysrgb&w=400', // Students learning
  'https://images.pexels.com/photos/5438966/pexels-photo-5438966.jpeg?auto=compress&cs=tinysrgb&w=400', // Person with tablet
  'https://images.pexels.com/photos/4148604/pexels-photo-4148604.jpeg?auto=compress&cs=tinysrgb&w=400', // Woman reading
  'https://images.pexels.com/photos/4148605/pexels-photo-4148605.jpeg?auto=compress&cs=tinysrgb&w=400', // Man reading ebook
];

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageErrors, setImageErrors] = useState([false, false, false]);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [emailSent, setEmailSent] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  
  // Get book context from location state
  const { redirectTo, bookTitle } = location.state || {};

  // Animation frames for reading animation
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame((prev) => (prev + 1) % 4);
    }, 2000);

    // Initialize CSRF token on component mount
    initializeCSRF().then(csrfToken => {
      if (csrfToken) {
        console.log('DEBUG: CSRF token initialized in Login component');
      }
    }).catch(error => {
      console.error('DEBUG: Failed to initialize CSRF token:', error);
    });

    return () => clearInterval(interval);
  }, []);

  const handleImageError = (index) => {
    setImageErrors(prev => {
      const newErrors = [...prev];
      newErrors[index] = true;
      return newErrors;
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      setError('Please enter your email address');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await api.post('/api/auth/password-reset/', { email: resetEmail });
      setEmailSent(true);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = isLogin ? '/api/auth/login/' : '/api/auth/register/';
      console.log(`🔍 DEBUG: Making request to ${endpoint} with data:`, formData);
      const response = await api.post(endpoint, formData);
      console.log(`🔍 DEBUG: Full response received:`, response);
      console.log(`🔍 DEBUG: Response status:`, response.status);
      console.log(`🔍 DEBUG: Response headers:`, response.headers);
      console.log(`🔍 DEBUG: Response data:`, response.data);
      
      if (response.data.user) {
        // Pass both user and token to setAuth
        setAuth(response.data.user, response.data.token);
        console.log(`🔍 DEBUG: Login successful, token stored: ${response.data.token ? 'yes' : 'no'}`);
        
        const isSuperAdmin =
          response.data.user.is_superuser ||
          response.data.user.is_staff ||
          response.data.user.username === 'dkituyi' ||
          response.data.user.username === 'admin' ||
          response.data.user.email?.includes('admin');
        navigate(isSuperAdmin ? '/admin' : '/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Reading animation component
  const ReadingAnimation = () => {
    const animations = [
      { icon: <Book size={24} />, text: "Reading" },
      { icon: <Coffee size={24} />, text: "Learning" },
      { icon: <PenTool size={24} />, text: "Writing" },
      { icon: <Sparkles size={24} />, text: "Discovering" }
    ];
    
    return (
      <div className="flex items-center gap-3 text-white/80">
        <div className="animate-pulse">
          {animations[animationFrame].icon}
        </div>
        <span className="text-sm font-medium">
          {animations[animationFrame].text}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left: Image / Brand Panel */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-[55%] min-h-[280px] lg:min-h-screen flex-col justify-between p-10 xl:p-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/95 via-accent-hover/90 to-ink-900" />
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${HERO_IMAGES[0]})`,
            }}
          />
        </div>
        <div className="relative z-10 flex flex-col">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <BookOpen size={28} className="text-white" />
            </div>
            <span className="font-reading text-2xl font-bold text-white tracking-tight">
              dkituyi academy
            </span>
          </div>
          <div className="mt-4">
            <ReadingAnimation />
          </div>
        </div>
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex gap-4">
            {HERO_IMAGES.slice(0, 3).map((src, i) => (
              <div
                key={i}
                className="flex-1 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 transform transition-all duration-300 hover:scale-105"
              >
                <img
                  src={imageErrors[i] ? FALLBACK_IMAGES[i] : src}
                  alt="Student reading ebook"
                  className="w-full h-32 xl:h-40 object-cover"
                  onError={() => handleImageError(i)}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
          <p className="text-white/90 text-lg font-reading max-w-md">
            Discover great stories and knowledge. Sign in to access our digital library and ebook collection.
          </p>
          <div className="flex items-center gap-4 text-white/70 text-sm">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="animate-spin" />
              <span>Premium Content</span>
            </div>
            <div className="flex items-center gap-2">
              <Book size={16} />
              <span>10,000+ Books</span>
            </div>
            <div className="flex items-center gap-2">
              <Coffee size={16} />
              <span>Expert Authors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 lg:px-12 bg-gradient-to-br from-cream-100 via-cream-50 to-cream-200">
        <div className="w-full max-w-md flex flex-col items-center">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
              <BookOpen size={28} className="text-white" />
            </div>
            <span className="font-reading text-2xl font-bold text-ink-900">dkituyi academy</span>
          </div>

          <div className="w-full space-y-6">
            <div className="text-center lg:text-left">
              <h1 className="font-reading text-2xl lg:text-3xl font-bold text-ink-900">
                {isLogin ? 'Welcome back' : 'Join our reading community'}
              </h1>
              <p className="mt-2 text-ink-500">
                {isLogin
                  ? 'Continue your reading journey with us'
                  : 'Join dkituyi academy and discover amazing ebooks'}
              </p>
              {isLogin && (
                <p className="mt-2 text-xs text-accent">
                  Admin users are redirected to the admin panel.
                </p>
              )}
            </div>

            <div className="bg-cream-50/90 backdrop-blur shadow-book rounded-2xl border border-cream-300 p-6 lg:p-8 transform transition-all duration-300 hover:shadow-book-hover">
              {showResetForm ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="font-reading text-xl font-bold text-ink-900 mb-2">
                      Reset Password
                    </h3>
                    <p className="text-ink-600 text-sm">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                  </div>
                  
                  {emailSent ? (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
                      Password reset email sent! Please check your inbox.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="reset_email" className="block text-sm font-medium text-ink-700 mb-1.5">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                          <input
                            id="reset_email"
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="w-full pl-10 pr-3 py-3 bg-cream-100 border border-cream-300 rounded-xl text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                            placeholder="Enter your email"
                          />
                        </div>
                      </div>
                      
                      <button
                        onClick={handlePasswordReset}
                        disabled={loading}
                        className="w-full py-3 px-4 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? (
                          <span className="inline-flex items-center justify-center gap-2">
                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Sending...
                          </span>
                        ) : (
                          'Send Reset Link'
                        )}
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={() => {
                      setShowResetForm(false);
                      setEmailSent(false);
                      setResetEmail('');
                    }}
                    className="w-full text-accent hover:text-accent-hover text-sm font-medium"
                  >
                    Back to {isLogin ? 'Login' : 'Register'}
                  </button>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={handleSubmit}>
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-pulse">
                      {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-ink-700 mb-1.5">
                      Username
                    </label>
                    <div className="relative">
                      <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                      <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        value={formData.username}
                        onChange={handleChange}
                        className="w-full pl-10 pr-3 py-3 bg-cream-100 border border-cream-300 rounded-xl text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transform transition-all duration-200 focus:scale-[1.02]"
                        placeholder="Enter your username"
                      />
                    </div>
                  </div>

                  {!isLogin && (
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-ink-700 mb-1.5">
                        Email
                      </label>
                      <div className="relative">
                        <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required={!isLogin}
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full pl-10 pr-3 py-3 bg-cream-100 border border-cream-300 rounded-xl text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transform transition-all duration-200 focus:scale-[1.02]"
                          placeholder="Enter your email"
                        />
                      </div>
                    </div>
                  )}

                  {!isLogin && (
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label htmlFor="first_name" className="block text-sm font-medium text-ink-700 mb-1.5">
                          First name
                        </label>
                        <input
                          id="first_name"
                          name="first_name"
                          type="text"
                          value={formData.first_name}
                          onChange={handleChange}
                          className="w-full px-3 py-3 bg-cream-100 border border-cream-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transform transition-all duration-200 focus:scale-[1.02]"
                          placeholder="First name"
                        />
                      </div>
                      <div className="flex-1">
                        <label htmlFor="last_name" className="block text-sm font-medium text-ink-700 mb-1.5">
                          Last name
                        </label>
                        <input
                          id="last_name"
                          name="last_name"
                          type="text"
                          value={formData.last_name}
                          onChange={handleChange}
                          className="w-full px-3 py-3 bg-cream-100 border border-cream-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transform transition-all duration-200 focus:scale-[1.02]"
                          placeholder="Last name"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-ink-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full pl-10 pr-10 py-3 bg-cream-100 border border-cream-300 rounded-xl text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transform transition-all duration-200 focus:scale-[1.02]"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {loading ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {isLogin ? 'Signing in...' : 'Creating account...'}
                      </span>
                    ) : (
                      isLogin ? 'Sign in' : 'Create account'
                    )}
                  </button>
                </form>
              )}

              {!showResetForm && (
                <div className="mt-6 pt-6 border-t border-cream-300 flex justify-between items-center">
                  <p className="text-sm text-ink-500">
                    {isLogin ? "Don't have an account? " : 'Already have an account? '}
                    <button
                      type="button"
                      onClick={() => setIsLogin(!isLogin)}
                      className="font-medium text-accent hover:text-accent-hover transition-colors"
                    >
                      {isLogin ? 'Sign up' : 'Sign in'}
                    </button>
                  </p>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setShowResetForm(true)}
                      className="text-sm text-accent hover:text-accent-hover transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
              )}
            </div>

            <p className="text-center text-sm text-ink-500">
              &copy; {new Date().getFullYear()} dkituyi academy - Celebrating Great Literature
            </p>
            <p className="text-center text-xs text-ink-400 mt-1">
              Your gateway to great stories and digital reading
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
