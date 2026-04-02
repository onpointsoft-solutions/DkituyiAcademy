import React from 'react';
import { Menu, Search, Bell, User, Shield, Settings } from 'lucide-react';
import { useAuthStore } from '../auth/AuthContext';

export default function AdminNavbar({ toggleSidebar }) {
  const { user } = useAuthStore();

  return (
    <header className="bg-ink-900/95 backdrop-blur-sm border-b border-ink-700 shadow-book flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-cream-200 hover:bg-ink-700 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={22} strokeWidth={1.8} />
          </button>
          <div className="relative hidden sm:block">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              type="text"
              placeholder="Search admin functions..."
              className="w-56 lg:w-64 pl-9 pr-4 py-2 bg-ink-800 border border-ink-600 rounded-xl text-cream-50 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Admin Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-accent/20 border border-accent/50 rounded-lg">
            <Shield size={16} className="text-accent" />
            <span className="text-xs font-medium text-accent">Admin</span>
          </div>

          {/* Notifications */}
          <button
            type="button"
            className="relative p-2 rounded-lg text-cream-200 hover:bg-ink-700 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} strokeWidth={1.8} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
          </button>

          {/* Settings */}
          <button
            type="button"
            className="p-2 rounded-lg text-cream-200 hover:bg-ink-700 transition-colors"
            aria-label="Settings"
          >
            <Settings size={20} strokeWidth={1.8} />
          </button>

          {/* User Menu */}
          <div className="flex items-center gap-2 pl-2 border-l border-ink-700">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-white" strokeWidth={2} />
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-medium text-cream-50 block">
                {user?.email || user?.username || 'Admin'}
              </span>
              <span className="text-xs text-ink-400">Administrator</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
