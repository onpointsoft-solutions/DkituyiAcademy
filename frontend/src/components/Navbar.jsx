import React from 'react';
import { Menu, Search, Bell, User } from 'lucide-react';
import { useAuthStore } from '../auth/AuthContext';

export default function Navbar({ toggleSidebar }) {
  const { user } = useAuthStore();

  return (
    <header className="bg-cream-50/95 backdrop-blur-sm border-b border-cream-300 shadow-book flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-ink-600 hover:bg-cream-200 transition-colors"
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
              placeholder="Search books..."
              className="w-56 lg:w-64 pl-9 pr-4 py-2 bg-cream-100 border border-cream-300 rounded-xl text-ink-800 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="relative p-2 rounded-lg text-ink-600 hover:bg-cream-200 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} strokeWidth={1.8} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
          </button>
          <div className="flex items-center gap-2 pl-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-white" strokeWidth={2} />
            </div>
            <span className="text-sm font-medium text-ink-700 hidden sm:inline max-w-[120px] truncate">
              {user?.email || user?.username || 'User'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
