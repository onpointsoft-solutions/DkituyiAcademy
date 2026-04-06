import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Library,
  History,
  User,
  LogOut,
  X,
  Shield,
  Wallet as WalletIcon,
  TestTube,
} from 'lucide-react';
import { useAuthStore } from '../auth/AuthContext';

export default function Sidebar({ isOpen, toggleSidebar }) {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { path: '/dashboard', icon: Home, label: 'Home' },
    { path: '/library', icon: Library, label: 'My Library' },
    { path: '/books', icon: BookOpen, label: 'Catalog' },
    { path: '/wallet', icon: WalletIcon, label: 'Wallet' },
    { path: '/history', icon: History, label: 'Reading History' },
    { path: '/profile', icon: User, label: 'Profile' },
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
          <span className="font-reading text-xl font-bold tracking-tight">dkituyiacademy</span>
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-lg text-cream-200 hover:bg-ink-700 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => {
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
                      } ${item.adminOnly ? 'border border-accent/50' : ''}`
                    }
                    onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                  >
                    <Icon size={20} strokeWidth={1.8} />
                    <span className="font-medium">{item.label}</span>
                    {item.adminOnly && (
                      <span className="ml-auto text-[10px] uppercase tracking-wider bg-accent/30 text-cream-100 px-2 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-3 border-t border-ink-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-cream-300 hover:bg-ink-700 hover:text-white transition-colors font-medium"
          >
            <LogOut size={20} strokeWidth={1.8} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
