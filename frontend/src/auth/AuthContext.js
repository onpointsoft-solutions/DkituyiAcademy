import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      setAuth: (user, token = null) => {
        if (token) {
          localStorage.setItem('jwt', token);
        }
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
      },
      
      logout: () => {
        localStorage.removeItem('jwt');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false });
      },
      
      checkAuth: () => {
        // Check for JWT token first
        const token = localStorage.getItem('jwt');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            set({ 
              user: { 
                id: payload.user_id, 
                email: payload.user_email,
                username: payload.username,
                is_staff: payload.is_staff || false,
                is_superuser: payload.is_superuser || false,
                role: payload.role || 'user'
              }, 
              token, 
              isAuthenticated: true 
            });
            return true;
          } catch (error) {
            localStorage.removeItem('jwt');
          }
        }
        
        // Check for Django session auth as fallback
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            set({ user, token: localStorage.getItem('jwt'), isAuthenticated: true });
            return true;
          } catch (error) {
            localStorage.removeItem('user');
          }
        }
        
        return false;
      }
    }),
    {
      name: 'auth-storage',
    }
  )
);
