import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  BookOpen,
  BarChart3,
  Settings,
  DollarSign,
  FileText,
  LogOut,
  X,
  Home,
  Bell
} from 'lucide-react';
import { useAuthStore } from '../auth/AuthContext';

export default function AdminSidebar({ isOpen, toggleSidebar }) {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const adminMenuItems = [
    { path: '/admin', icon: Home, label: 'Admin Dashboard' },
    { path: '/admin?tab=users', icon: Users, label: 'User Management' },
    { path: '/admin?tab=books', icon: BookOpen, label: 'Book Management' },
    { path: '/admin?tab=reports', icon: BarChart3, label: 'Reports & Analytics' },
    { path: '/admin?tab=settings', icon: Settings, label: 'System Settings' },
    { path: '/admin?tab=payments', icon: DollarSign, label: 'Payment Management' },
    { path: '/admin?tab=logs', icon: FileText, label: 'System Logs' },
    { path: '/admin?tab=notifications', icon: Bell, label: 'Notifications' },
  ];

  const secondaryMenuItems = [
    { path: '/dashboard', icon: Home, label: 'User Dashboard', note: 'Switch to user view' },
    { path: '/library', icon: BookOpen, label: 'Library', note: 'Browse books' },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-ink-900/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
      <aside
        className={`
          fixed left-0 top-0 h-full w-64 bg-ink-900 text-cream-50 z-50 transform transition-transform duration-300 ease-out
          lg:relative lg:translate-x-0 flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between p-5 border-b border-ink-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent rounded-lg">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <span className="font-reading text-xl font-bold tracking-tight">Admin Panel</span>
              <p className="text-xs text-accent/80">dkituyiacademy</p>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-lg text-cream-200 hover:bg-ink-700 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 overflow-y-auto">
          {/* Admin Navigation */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-ink-400 uppercase tracking-wider px-4 mb-3">
              Administration
            </h3>
            <ul className="space-y-1">
              {adminMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                          isActive
                            ? 'bg-accent text-white'
                            : 'text-cream-300 hover:bg-ink-700 hover:text-cream-50'
                        }`
                      }
                      onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                    >
                      <Icon size={20} strokeWidth={1.8} />
                      <span className="font-medium">{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* User Navigation */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-ink-400 uppercase tracking-wider px-4 mb-3">
              User View
            </h3>
            <ul className="space-y-1">
              {secondaryMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                          isActive
                            ? 'bg-accent/20 text-cream-50'
                            : 'text-cream-300 hover:bg-ink-700 hover:text-cream-50'
                        }`
                      }
                      onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                    >
                      <Icon size={20} strokeWidth={1.8} />
                      <div className="flex-1">
                        <span className="font-medium block">{item.label}</span>
                        {item.note && (
                          <span className="text-xs text-ink-400">{item.note}</span>
                        )}
                      </div>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <div className="p-3 border-t border-ink-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-cream-300 hover:bg-ink-700 hover:text-white transition-colors font-medium"
          >
            <LogOut size={20} strokeWidth={1.8} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
