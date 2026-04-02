import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../auth/AuthContext';

export default function CatchAllRedirect() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();
  const pathname = location.pathname;

  // If already authenticated and trying to access an admin route, redirect to admin
  if (isAuthenticated && pathname.startsWith('/admin')) {
    return <Navigate to="/admin" replace />;
  }

  // If already authenticated and trying to access a protected route, redirect to dashboard
  if (isAuthenticated && (pathname.startsWith('/dashboard') || pathname.startsWith('/profile') || pathname.startsWith('/books') || pathname.startsWith('/history') || pathname.startsWith('/wallet'))) {
    return <Navigate to="/dashboard" replace />;
  }

  // Default redirect to dashboard for authenticated users, login for unauthenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  } else {
    return <Navigate to="/login" replace />;
  }
}
