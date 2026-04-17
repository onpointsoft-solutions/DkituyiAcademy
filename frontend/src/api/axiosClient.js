import axios from "axios";

// API Configuration
const API_BASE_URL = 'https://ebooks.dkituyiacademy.org/backend';
const WORDPRESS_URL = process.env.REACT_APP_WORDPRESS_URL || "https://dkituyiacademy.org";

// CSRF Token Management
const getCSRFToken = () => {
  const name = 'csrftoken';
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

// Get initial CSRF token
const getCSRFTokenFromAPI = async () => {
  try {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const csrfUrl = `${API_BASE_URL}/api/auth/csrf/`;
    
    const response = await axios.get(csrfUrl, {
      withCredentials: true,
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    return response.data.csrfToken;
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
    return null;
  }
};

// Django Backend API
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // Enable cookies for Django session auth
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// WordPress JWT API
const wordpressApi = axios.create({
  baseURL: WORDPRESS_URL,
  timeout: 10000,
});

// Request interceptor for Django API
api.interceptors.request.use(async config => {
  const token = localStorage.getItem("jwt");
  console.log(`DEBUG: Making request to ${config.url}`);
  console.log(`DEBUG: Token in localStorage: ${token ? 'exists' : 'none'}`);
  
  // Add Authorization header if token exists
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log(`DEBUG: Added Authorization header: Bearer ${token.substring(0, 20)}...`);
  } else {
    console.log(`DEBUG: No token available for request`);
  }
  
  // Add CSRF token for POST, PUT, DELETE, PATCH requests (except login)
  if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
    // Skip CSRF for login endpoint since it's csrf_exempt
    if (!config.url?.includes('/api/auth/login/')) {
      let csrfToken = getCSRFToken();
      
      // If no CSRF token in cookies, try to get it from API
      if (!csrfToken) {
        csrfToken = await getCSRFTokenFromAPI();
      }
      
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
        console.log(`DEBUG: Added CSRF token: ${csrfToken.substring(0, 20)}...`);
      } else {
        console.log(`DEBUG: Could not get CSRF token for ${config.method} ${config.url}`);
      }
    } else {
      console.log(`DEBUG: Skipping CSRF token for login endpoint`);
    }
  }
  
  return config;
});

// Request interceptor for WordPress API
wordpressApi.interceptors.request.use(config => {
  const wpToken = localStorage.getItem("wordpress_jwt");
  console.log(`DEBUG: Making WordPress request to ${config.url}`);
  if (wpToken) {
    config.headers.Authorization = `Bearer ${wpToken}`;
    console.log(`DEBUG: Added WordPress Authorization header`);
  }
  return config;
});

// Response interceptor for Django API
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Clear auth data and redirect to login
      localStorage.removeItem("jwt");
      localStorage.removeItem("wordpress_jwt");
      localStorage.removeItem("user");
      console.log(`DEBUG: 401 Unauthorized - redirecting to login`);
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Response interceptor for WordPress API
wordpressApi.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Clear WordPress token
      localStorage.removeItem("wordpress_jwt");
      console.log(`DEBUG: WordPress 401 Unauthorized - token cleared`);
    }
    return Promise.reject(error);
  }
);

// Initialize CSRF token on app load
export const initializeCSRF = async () => {
  try {
    // Try to get CSRF token from cookies first
    let csrfToken = getCSRFToken();
    
    // If not found, fetch from API
    if (!csrfToken) {
      csrfToken = await getCSRFTokenFromAPI();
    }
    
    if (csrfToken) {
      console.log('DEBUG: CSRF token initialized successfully');
      return csrfToken;
    } else {
      console.warn('DEBUG: Could not initialize CSRF token');
      return null;
    }
  } catch (error) {
    console.error('DEBUG: Error initializing CSRF token:', error);
    return null;
  }
};

// Export CSRF token getter for manual access
export { getCSRFToken };
export const wordpressLogin = async (username, password) => {
  try {
    console.log(`DEBUG: Attempting WordPress login for: ${username}`);
    
    // Step 1: Authenticate with WordPress
    const wpResponse = await wordpressApi.post('/wp-json/jwt-auth/v1/token', {
      username,
      password
    });
    
    const wpToken = wpResponse.data.token;
    const wpUser = {
      email: wpResponse.data.user_email,
      id: wpResponse.data.user_id,
      displayName: wpResponse.data.user_display_name,
      nicename: wpResponse.data.user_nicename
    };
    
    console.log(`DEBUG: WordPress auth successful for: ${wpUser.email}`);
    
    // Step 2: Authenticate with Django backend
    const djangoResponse = await api.post('/api/auth/wordpress-login/', {
      username,
      password
    });
    
    const djangoToken = djangoResponse.data.token;
    const djangoUser = djangoResponse.data.user;
    
    console.log(`DEBUG: Django auth successful for: ${djangoUser.username}`);
    
    // Store tokens
    localStorage.setItem("jwt", djangoToken);
    localStorage.setItem("wordpress_jwt", wpToken);
    localStorage.setItem("user", JSON.stringify({
      ...djangoUser,
      wordpressUser: wpUser
    }));
    
    return {
      success: true,
      user: djangoUser,
      wordpressUser: wpUser,
      djangoToken,
      wpToken
    };
    
  } catch (error) {
    console.error(`DEBUG: WordPress login error:`, error);
    
    // Clear any existing tokens
    localStorage.removeItem("jwt");
    localStorage.removeItem("wordpress_jwt");
    localStorage.removeItem("user");
    
    throw error;
  }
};

// Verify WordPress token
export const verifyWordPressToken = async (wpToken) => {
  try {
    const response = await api.post('/api/auth/verify-wordpress-token/', {
      wordpress_token: wpToken
    });
    
    if (response.data.token) {
      localStorage.setItem("jwt", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      return response.data;
    }
    
    throw new Error('Token verification failed');
    
  } catch (error) {
    console.error(`DEBUG: WordPress token verification error:`, error);
    throw error;
  }
};

// Get authentication status
export const getAuthStatus = async () => {
  try {
    const response = await api.get('/api/auth/status/');
    return response.data;
  } catch (error) {
    console.error(`DEBUG: Auth status check error:`, error);
    return { authenticated: false };
  }
};

// Logout function
export const logout = async () => {
  try {
    // Clear all tokens
    localStorage.removeItem("jwt");
    localStorage.removeItem("wordpress_jwt");
    localStorage.removeItem("user");
    
    console.log(`DEBUG: User logged out successfully`);
    
    // Redirect to login
    window.location.href = "/login";
    
  } catch (error) {
    console.error(`DEBUG: Logout error:`, error);
    // Force logout even if there's an error
    localStorage.removeItem("jwt");
    localStorage.removeItem("wordpress_jwt");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }
};

export { api, wordpressApi };
export default api;
