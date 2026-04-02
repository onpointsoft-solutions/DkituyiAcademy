import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Users,
  BarChart3,
  Settings,
  Activity,
  DollarSign,
  Eye,
  Clock,
  AlertCircle,
  RefreshCw,
  Shield,
  Database,
  UserCheck,
  TrendingUp,
  Zap,
  ChevronRight,
  Circle,
  Plus,
  Upload,
} from 'lucide-react';
import api from '../api/axiosClient';
import BookUpload from '../components/BookUpload';

// ─── helpers ────────────────────────────────────────────────────────────────

function normaliseActivity(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.recent_activity)) return data.recent_activity;
  console.warn('AdminDashboard: unexpected activity shape', data);
  return [];
}

// ─── sub-components ──────────────────────────────────────────────────────────

function StatusPill({ ok, label }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide
        ${ok
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
          : 'bg-red-50 text-red-700 ring-1 ring-red-200'
        }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}
      />
      {label}
    </span>
  );
}

function HealthRow({ label, status, okText, failText, Icon }) {
  const ok = status === 'healthy';
  return (
    <div className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-lg ${ok ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <Icon size={15} className={ok ? 'text-emerald-600' : 'text-red-500'} />
        </div>
        <span className="text-sm font-medium text-stone-700">{label}</span>
      </div>
      <StatusPill ok={ok} label={ok ? okText : failText} />
    </div>
  );
}

function MetricCard({ label, value, note, ValueIcon, gradient, delay = 0 }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 shadow-sm ring-1 ring-black/5"
      style={{
        background: gradient,
        animationDelay: `${delay}ms`,
      }}
    >
      {/* Decorative circle */}
      <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white/80 uppercase tracking-wider">{label}</span>
          <div className="p-2 rounded-xl bg-white/20">
            <ValueIcon size={18} className="text-white" />
          </div>
        </div>
        <div>
          <p className="text-3xl font-bold text-white leading-none">{value}</p>
          {note && (
            <p className="text-xs text-white/70 mt-1.5 flex items-center gap-1">
              <TrendingUp size={11} />
              {note}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ to, gradient, Icon, title, subtitle }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 p-4 bg-white rounded-2xl ring-1 ring-stone-200 hover:ring-stone-300 hover:shadow-md transition-all duration-200"
    >
      <div
        className="p-2.5 rounded-xl flex-shrink-0"
        style={{ background: gradient }}
      >
        <Icon size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-stone-800 text-sm">{title}</p>
        <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>
      </div>
      <ChevronRight
        size={16}
        className="text-stone-300 group-hover:text-stone-500 group-hover:translate-x-0.5 transition-all"
      />
    </Link>
  );
}

const ACTIVITY_CONFIG = {
  user_register: { gradient: 'linear-gradient(135deg,#34d399,#059669)', label: 'User',     Icon: Users      },
  book_read:     { gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', label: 'Reading',  Icon: BookOpen   },
  purchase:      { gradient: 'linear-gradient(135deg,#60a5fa,#3b82f6)', label: 'Purchase', Icon: DollarSign },
  admin_action:  { gradient: 'linear-gradient(135deg,#a78bfa,#7c3aed)', label: 'Admin',    Icon: Shield     },
};

function ActivityRow({ activity }) {
  const cfg = ACTIVITY_CONFIG[activity.type] ?? {
    gradient: 'linear-gradient(135deg,#94a3b8,#64748b)',
    label: 'System',
    Icon: Activity,
  };
  const { gradient, label, Icon } = cfg;

  return (
    <div className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-0">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: gradient }}
      >
        <Icon size={14} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-800 truncate">
          {activity.description || 'System activity'}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-stone-400">
            {activity.timestamp
              ? new Date(activity.timestamp).toLocaleString([], {
                  month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })
              : 'Just now'}
          </span>
          <span className="w-1 h-1 rounded-full bg-stone-300" />
          <span
            className="text-xs font-medium px-1.5 py-0.5 rounded-md text-white"
            style={{ background: gradient }}
          >
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-bold text-stone-800 tracking-tight">{title}</h2>
      {action}
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function AdminDashboard({ onNavigate }) {
  const [stats, setStats]                   = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemHealth, setSystemHealth]     = useState(null);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [error, setError]                   = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [userProgress, setUserProgress]     = useState(null);

  const fetchAdminData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setRefreshing(true);

      const [statsRes, activityRes, healthRes, progressRes] = await Promise.all([
        api.get('/api/admin/stats/'),
        api.get('/api/admin/recent-activity/'),
        api.get('/api/admin/system-health/'),
        api.get('/api/admin/progress/'),
      ]);

      setStats(statsRes.data);
      setRecentActivity(activityRes.data);
      setSystemHealth(healthRes.data);
      setUserProgress(progressRes.data);
      setError(null);
    } catch (err) {
      console.error('AdminDashboard: fetch failed', err);
      // Set mock data on error so dashboard still works
      if (isInitial) {
        setStats({
          totalBooks: 0,
          totalUsers: 0,
          totalReads: 0,
          totalLibraryEntries: 0,
          completedReads: 0,
          monthlyGrowth: 0,
          avgRating: 0,
          revenue: 0,
        });
        setRecentActivity([]);
        setSystemHealth({
          database_status: 'healthy',
          api_status: 'healthy',
          uptime_days: 0,
          memory_usage: 'N/A',
        });
        setError('Failed to load admin dashboard data. Showing mock data.');
      }
    } finally {
      if (isInitial) setLoading(false);
      else setRefreshing(false);
    }
  }, []);

  const handleUploadSuccess = (uploadedBook) => {
    console.log('Book uploaded successfully:', uploadedBook);
    setShowUploadModal(false);
    // Refresh stats to include the new book
    fetchAdminData(false);
  };

  const handleQuickActions = (action) => {
    switch (action) {
      case 'upload':
        setShowUploadModal(true);
        break;
      case 'manage':
        onNavigate?.('books');
        break;
      case 'users':
        onNavigate?.('users');
        break;
      case 'reports':
        onNavigate?.('reports');
        break;
      case 'settings':
        onNavigate?.('settings');
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    fetchAdminData(true);
    const interval = setInterval(() => fetchAdminData(false), 30_000);
    return () => clearInterval(interval);
  }, [fetchAdminData]);

  // ── loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-stone-400 font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  // ── error ──
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4 ring-1 ring-red-100">
            <AlertCircle size={26} className="text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-stone-900 mb-1">Something went wrong</h3>
          <p className="text-sm text-stone-500 mb-5">{error}</p>
          <button
            onClick={() => fetchAdminData(true)}
            className="px-5 py-2.5 bg-stone-900 text-white text-sm font-semibold rounded-xl hover:bg-stone-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const allHealthy =
    systemHealth?.database_status === 'healthy' &&
    systemHealth?.api_status === 'healthy';

  // ── main render ──
  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto space-y-7">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3.5">
          <div
            className="p-2.5 rounded-2xl"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}
          >
            <Shield size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-stone-400 mt-0.5">System overview &amp; management</p>
          </div>
        </div>

        {/* Overall health badge */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl ring-1 ring-stone-200 text-sm">
          <span
            className={`w-2 h-2 rounded-full ${allHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}
          />
          <span className="font-medium text-stone-600">
            {allHealthy ? 'All systems normal' : 'Issues detected'}
          </span>
        </div>
      </div>

      {/* ── Stats grid ── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Users"
            value={(stats.totalUsers ?? 0).toLocaleString()}
            note="Active accounts"
            ValueIcon={Users}
            gradient="linear-gradient(135deg,#667eea,#5a67d8)"
            delay={0}
          />
          <MetricCard
            label="Books"
            value={(stats.totalBooks ?? 0).toLocaleString()}
            note="Library collection"
            ValueIcon={BookOpen}
            gradient="linear-gradient(135deg,#f59e0b,#d97706)"
            delay={60}
          />
          <MetricCard
            label="Reads"
            value={(stats.totalReads ?? 0).toLocaleString()}
            note="Reading sessions"
            ValueIcon={Eye}
            gradient="linear-gradient(135deg,#34d399,#059669)"
            delay={120}
          />
          <MetricCard
            label="Completed"
            value={(stats.completedReads ?? 0).toLocaleString()}
            note="Finished books"
            ValueIcon={Activity}
            gradient="linear-gradient(135deg,#f87171,#ef4444)"
            delay={180}
          />
        </div>
      )}

      {/* ── Two-column: System Health + Quick Actions ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* System Health */}
        {systemHealth && (
          <div className="bg-white rounded-2xl ring-1 ring-stone-200 p-5 shadow-sm">
            <SectionHeader title="System Health" />
            <HealthRow
              label="Database"
              status={systemHealth.database_status}
              okText="Healthy"
              failText="Error"
              Icon={Database}
            />
            <HealthRow
              label="API Server"
              status={systemHealth.api_status}
              okText="Running"
              failText="Down"
              Icon={Zap}
            />
            <div className="mt-3 pt-3 grid grid-cols-2 gap-3 border-t border-stone-100">
              <div className="bg-stone-50 rounded-xl p-3">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">Uptime</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-stone-800">{systemHealth.uptime_days ?? 0}</span>
                  <span className="text-xs text-stone-500">days</span>
                </div>
              </div>
              <div className="bg-stone-50 rounded-xl p-3">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">Memory</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-stone-800">{systemHealth.memory_usage ?? 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl ring-1 ring-stone-200 p-5 shadow-sm">
          <SectionHeader title="Quick Actions" />
          <div className="grid grid-cols-1 gap-2.5">
            <QuickAction
              to="/admin"
              gradient="linear-gradient(135deg,#667eea,#5a67d8)"
              Icon={Settings}
              title="Admin Panel"
              subtitle="Full admin interface"
            />
            <QuickAction
              to="/admin?tab=users"
              gradient="linear-gradient(135deg,#f59e0b,#d97706)"
              Icon={UserCheck}
              title="Manage Users"
              subtitle="Roles, access & accounts"
            />
            <QuickAction
              to="/admin?tab=books"
              gradient="linear-gradient(135deg,#34d399,#059669)"
              Icon={BookOpen}
              title="Manage Books"
              subtitle="Library & content"
            />
            <QuickAction
              to="/admin?tab=reports"
              gradient="linear-gradient(135deg,#f87171,#ef4444)"
              Icon={BarChart3}
              title="View Reports"
              subtitle="Analytics & insights"
            />
          </div>
        </div>
      </div>

      {/* ── Recent Activity ── */}
      {recentActivity.length > 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-stone-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-800 tracking-tight">Recent Activity</h2>
              <p className="text-xs text-stone-400 mt-0.5">{recentActivity.length} events</p>
            </div>
            <button
              onClick={() => fetchAdminData(false)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-600
                         bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-stone-50">
            {recentActivity.map((activity, index) => (
              <ActivityRow key={activity.id ?? index} activity={activity} />
            ))}
          </div>
          <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
            <span className="text-xs text-stone-400">Auto-refreshes every 30 seconds</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-stone-400">Live</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Book Management Section ── */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-stone-900">Book Management</h2>
          <button
            onClick={() => handleQuickActions('upload')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Upload size={16} />
            Quick Upload
          </button>
        </div>
        
        <div className="bg-white rounded-xl ring-1 ring-stone-200 overflow-hidden">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Upload size={24} className="text-amber-600" />
                </div>
                <h3 className="font-semibold text-stone-900 mb-1">Quick Upload</h3>
                <p className="text-sm text-stone-600 mb-3">Upload PDF books instantly</p>
                <button
                  onClick={() => handleQuickActions('upload')}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  Upload Book →
                </button>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Settings size={24} className="text-blue-600" />
                </div>
                <h3 className="font-semibold text-stone-900 mb-1">Manage Books</h3>
                <p className="text-sm text-stone-600 mb-3">Edit, delete, or update existing books</p>
                <button
                  onClick={() => handleQuickActions('manage')}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  Manage Books →
                </button>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Users size={24} className="text-green-600" />
                </div>
                <h3 className="font-semibold text-stone-900 mb-1">User Management</h3>
                <p className="text-sm text-stone-600 mb-3">View and manage user accounts</p>
                <button
                  onClick={() => handleQuickActions('users')}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  Manage Users →
                </button>
              </div>
            </div>
            
            {/* Additional Actions */}
            <div className="mt-6 pt-6 border-t border-stone-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleQuickActions('reports')}
                  className="flex items-center justify-center gap-2 p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors"
                >
                  <BarChart3 size={20} className="text-stone-600" />
                  <span className="text-sm font-medium text-stone-700">View Reports</span>
                </button>
                <button
                  onClick={() => handleQuickActions('settings')}
                  className="flex items-center justify-center gap-2 p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors"
                >
                  <Settings size={20} className="text-stone-600" />
                  <span className="text-sm font-medium text-stone-700">System Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <BookUpload
          onUploadSuccess={handleUploadSuccess}
          onCancel={() => setShowUploadModal(false)}
        />
      )}

      {/* User Progress Section */}
      {userProgress && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-stone-900">User Progress Tracking</h2>
            <div className="text-sm text-stone-500">
              {userProgress.username} - {userProgress.total_books_in_library} books in library
            </div>
          </div>
          
          <div className="bg-white rounded-xl ring-1 ring-stone-200 overflow-hidden">
            <div className="p-6">
              {userProgress.progress_data.length > 0 ? (
                <div className="space-y-4">
                  {userProgress.progress_data.map((book) => (
                    <div key={book.book_id} className="border-b border-stone-100 pb-4 last:border-b-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-stone-900">{book.book_title}</h3>
                          <p className="text-sm text-stone-600 mb-2">by {book.book_author}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-stone-500">Progress:</span>
                              <span className="ml-2 font-medium text-stone-900">
                                {book.current_page}/{book.total_pages} ({book.progress_percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div>
                              <span className="text-stone-500">Unlocked Pages:</span>
                              <span className="ml-2 font-medium text-stone-900">
                                {book.unlocked_pages_count}
                              </span>
                            </div>
                            <div>
                              <span className="text-stone-500">Status:</span>
                              <span className={`ml-2 font-medium ${book.is_completed ? 'text-green-600' : 'text-blue-600'}`}>
                                {book.is_completed ? 'Completed' : 'In Progress'}
                              </span>
                            </div>
                            <div>
                              <span className="text-stone-500">Last Read:</span>
                              <span className="ml-2 font-medium text-stone-900">
                                {book.last_read ? new Date(book.last_read).toLocaleDateString() : 'Never'}
                              </span>
                            </div>
                          </div>
                          
                          {book.unlocked_pages.length > 0 && (
                            <div className="mt-2">
                              <span className="text-xs text-stone-500">Unlocked pages: </span>
                              <span className="text-xs text-stone-700">
                                {book.unlocked_pages.slice(0, 5).join(', ')}
                                {book.unlocked_pages.length > 5 && `... +${book.unlocked_pages.length - 5} more`}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="ml-4">
                          <div className="w-16 bg-stone-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${book.progress_percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-stone-500">
                  No progress data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}