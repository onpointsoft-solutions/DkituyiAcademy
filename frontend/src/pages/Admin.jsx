import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import UserManagement from './admin/UserManagement';
import BookManagement from './admin/BookManagement';
import ReportsAnalytics from './admin/ReportsAnalytics';
import SystemSettings from './admin/SystemSettings';
import PaymentManagement from './admin/PaymentManagement';
import SystemLogs from './admin/SystemLogs';
import Notifications from './admin/Notifications';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart3,
  Settings,
  CreditCard,
  FileText,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react';
import { useAuthStore } from '../auth/AuthContext';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'books', label: 'Books', icon: BookOpen },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'logs', label: 'System Logs', icon: FileText },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Admin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with URL query params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tabs.find(t => t.id === tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('dashboard');
    }
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard onNavigate={handleTabChange} />;
      case 'users':
        return <UserManagement />;
      case 'books':
        return <BookManagement />;
      case 'reports':
        return <ReportsAnalytics />;
      case 'settings':
        return <SystemSettings />;
      case 'payments':
        return <PaymentManagement />;
      case 'logs':
        return <SystemLogs />;
      case 'notifications':
        return <Notifications />;
      default:
        return <AdminDashboard onNavigate={handleTabChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 flex">
      {/* Mobile Overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          isMobile
            ? mobileMenuOpen
              ? 'translate-x-0 fixed inset-y-0 left-0 z-50'
              : '-translate-x-full fixed inset-y-0 left-0 z-50'
            : isSidebarOpen
            ? 'w-64 relative'
            : 'w-20 relative'
        } bg-gradient-to-b from-white to-stone-50 border-r border-stone-200 transition-all duration-300 flex flex-col shadow-xl`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-stone-200 bg-white">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && !isMobile && 'justify-center'}`}>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center flex-shrink-0 shadow-lg shadow-accent/20">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            {(isSidebarOpen || isMobile) && (
              <div className="animate-fadeIn">
                <h1 className="font-bold text-stone-800 text-lg">Admin Panel</h1>
                <p className="text-xs text-stone-500">Management</p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Toggle button */}
        {!isMobile && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute -right-3 top-24 w-7 h-7 bg-accent text-white rounded-full flex items-center justify-center shadow-lg hover:bg-accent-hover transition-all duration-200 z-10 hover:scale-110"
          >
            <ChevronLeft
              size={16}
              className={`transition-transform duration-300 ${!isSidebarOpen && 'rotate-180'}`}
            />
          </button>
        )}

        {/* Mobile Close button */}
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X size={24} />
          </button>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-accent to-accent-hover text-white shadow-md shadow-accent/20'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                } ${!isSidebarOpen && !isMobile && 'justify-center'}`}
                title={tab.label}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-white/20' : 'bg-stone-100 group-hover:bg-white'
                }`}>
                  <Icon size={20} className="flex-shrink-0" />
                </div>
                {(isSidebarOpen || isMobile) && (
                  <span className="font-medium text-sm whitespace-nowrap">{tab.label}</span>
                )}
                {isActive && (isSidebarOpen || isMobile) && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-stone-200 bg-white/50">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200 group ${
              !isSidebarOpen && !isMobile && 'justify-center'
            }`}
            title="Logout"
          >
            <div className="p-1.5 rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors">
              <LogOut size={20} className="flex-shrink-0" />
            </div>
            {(isSidebarOpen || isMobile) && (
              <span className="font-medium text-sm">Logout</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-stone-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 text-stone-600 hover:text-accent hover:bg-stone-100 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-stone-800">Admin</span>
          </div>
        </div>

        {renderContent()}
      </main>
    </div>
  );
}
