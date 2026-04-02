import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, TrendingUp, Award, ChevronRight, Library, Coffee, X, Wallet as WalletIcon, User, Settings, LogOut } from 'lucide-react';
import api from '../api/axiosClient';
import Profile from '../components/Profile';

export default function Dashboard() {
  const [stats, setStats] = useState([]);
  const [recentBooks, setRecentBooks] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔍 DEBUG: Fetching dashboard data...');
      
      const [statsResponse, booksResponse, walletResponse, profileResponse] = await Promise.all([
        api.get('/api/library/user/stats/'),
        api.get('/api/library/user/recent-books/'),
        api.get('/api/payments/wallet/'),
        api.get('/api/user/profile/').catch(err => {
          console.log('🔍 DEBUG: Profile API not available, using fallback');
          return null;
        })
      ]);

      console.log('🔍 DEBUG: Stats response:', statsResponse.data);
      console.log('🔍 DEBUG: Books response:', booksResponse.data);
      console.log('🔍 DEBUG: Wallet response:', walletResponse.data);
      console.log('🔍 DEBUG: Profile response:', profileResponse?.data);

      // Only use real data from backend - no dummy values
      const stats = statsResponse.data || {};
      const books = booksResponse.data?.results || [];
      
      // Be more lenient with stats validation - allow empty stats but still display
      console.log('🔍 DEBUG: Stats data:', stats);
      console.log('🔍 DEBUG: Books data:', books);
      console.log('🔍 DEBUG: Books count:', books.length);
      
      // Get actual book count from books API if stats doesn't have it
      const actualBookCount = stats.totalBooks || books.length;
      
      // Transform real stats data with general reading focus
      const transformedStats = [
        {
          label: 'Books in Library',
          value: actualBookCount.toString(), // Use actual count from database
          icon: Library,
          bg: 'bg-accent/10',
          iconColor: 'text-accent',
        },
        {
          label: 'Books Read',
          value: stats.booksRead?.toString() || '0',
          icon: BookOpen,
          bg: 'bg-yellow-500/10',
          iconColor: 'text-yellow-500',
        },
        {
          label: 'Reading Time',
          value: `${stats.readingTimeHours || 0}h`,
          icon: Clock,
          bg: 'bg-green-500/10',
          iconColor: 'text-green-500',
        },
        {
          label: 'Reading Streak',
          value: `${stats.readingStreak || 0} days`,
          icon: TrendingUp,
          bg: 'bg-ink-600/10',
          iconColor: 'text-ink-600',
        },
        {
          label: 'Achievements',
          value: stats.achievements?.toString() || '0',
          icon: Award,
          bg: 'bg-accent/10',
          iconColor: 'text-accent',
        },
      ];

      // Validate and transform real books data - extract from book_details if present
      const validBooks = books.filter(book => book && book.book).map(book => {
        // API returns book details in different structures
        const bookId = book.book || book.id;
        const bookData = book.book_details || book;
        
        return {
          id: bookId,
          title: book.book_title || bookData.title || 'Untitled',
          author_name: book.author_name || bookData.author_name || 'Unknown Author',
          cover_url: book.book_cover || bookData.cover_url || bookData.cover_display_url,
          cover_display_url: book.book_cover || bookData.cover_display_url || bookData.cover_url,
          reading_progress: book.progress_percentage || book.reading_progress || 0,
          last_read: book.last_read
        };
      }).filter(book => book.id && book.title);
      
      console.log('🔍 DEBUG: Valid books after transformation:', validBooks.length);
      
      setStats(transformedStats);
      setRecentBooks(validBooks);
      setWallet(walletResponse.data);
      setUserProfile(profileResponse?.data || null);
      setError(null); // Clear any previous errors
      console.log(`🔍 DEBUG: Dashboard loaded successfully with ${validBooks.length} real books and ${actualBookCount} total books`);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // Don't set dummy data - show error state instead
      setStats([]);
      setRecentBooks([]);
      setWallet(null);
      setUserProfile(null);
      
      // Only show error if it's a network/server error, not if data is empty
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        setError('Failed to load dashboard data. Please try again.');
      } else {
        setError(null); // Clear error for auth issues - let components handle auth
      }
    } finally {
      setLoading(false);
    }
  };

  const updateReadingProgress = async (bookId, progress) => {
    try {
      console.log(`🔍 DEBUG: Dashboard updating progress for book ${bookId} to ${progress}%`);
      await api.post(`/api/library/user/reading-progress/`, {
        book_id: bookId,
        progress: progress
      });
      
      // Refresh dashboard data to show updated stats
      await fetchDashboardData();
    } catch (error) {
      console.error('Failed to update reading progress:', error);
    }
  };

  // Add real-time refresh effect
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Add visibility change listener to refresh when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchDashboardData();
      }}})
  useEffect(() => {
    const handleReadingProgressUpdate = (event) => {
      console.log('🔍 DEBUG: Dashboard received reading progress update:', event.detail);
      // Refresh dashboard data when reading progress is updated
      fetchDashboardData();
    };

    // Listen for reading progress updates from Reader component
    window.addEventListener('readingProgressUpdated', handleReadingProgressUpdate);
    
    // Also listen for visibility changes to refresh when user returns to dashboard
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔍 DEBUG: Dashboard became visible, refreshing data...');
        fetchDashboardData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('readingProgressUpdated', handleReadingProgressUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          <p className="ml-4 text-ink-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <X size={32} className="text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-ink-900 mb-2">Unable to Load Dashboard</h3>
            <p className="text-ink-600 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={fetchDashboardData}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
              >
                Try Again
              </button>
              <Link
                to="/library"
                className="px-4 py-2 bg-ink-100 text-ink-700 rounded-lg hover:bg-ink-200 transition-colors"
              >
                Go to Library
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-cream-100 flex items-center justify-center mx-auto mb-4">
              <Library size={32} className="text-ink-400" />
            </div>
            <h3 className="text-xl font-semibold text-ink-900 mb-2">No Data Available</h3>
            <p className="text-ink-600 mb-6">Start reading great books to see your statistics and progress.</p>
            <Link
              to="/library"
              className="inline-block px-6 py-3 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors"
            >
              Explore Books
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header with User Info */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="font-reading text-3xl font-bold text-ink-900">
            {activeTab === 'dashboard' ? 'Your Reading Dashboard' : 'My Profile'}
          </h1>
          <div className="animate-pulse">
            {activeTab === 'dashboard' ? <Library size={28} className="text-accent" /> : <User size={28} className="text-accent" />}
          </div>
        </div>
        
        {/* User Info and Actions */}
        <div className="flex items-center gap-4">
          {userProfile && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cream-200 flex items-center justify-center">
                {userProfile.avatar ? (
                  <img
                    src={userProfile.avatar}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User size={20} className="text-ink-400" />
                )}
              </div>
              <div className="text-right">
                <div className="font-semibold text-ink-900">
                  {userProfile.first_name && userProfile.last_name 
                    ? `${userProfile.first_name} ${userProfile.last_name}`
                    : userProfile.username || 'User'
                  }
                </div>
                <div className="text-sm text-ink-500">Member since {new Date(userProfile.date_joined).toLocaleDateString()}</div>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'dashboard' ? 'profile' : 'dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-cream-100 text-ink-700 rounded-lg hover:bg-cream-200 transition-colors"
            >
              {activeTab === 'dashboard' ? <User size={16} /> : <Library size={16} />}
              {activeTab === 'dashboard' ? 'Profile' : 'Dashboard'}
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-cream-100 text-ink-700 rounded-lg hover:bg-cream-200 transition-colors"
            >
              <Settings size={16} />
              Account Settings
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <>
          <p className="text-ink-500 mb-8">Your digital reading journey at a glance</p>

          {/* Wallet Balance Card */}
          {wallet && (
            <div className="bg-white rounded-xl border border-cream-300 shadow-book p-4 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                    <WalletIcon size={20} className="text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink-900">Wallet Balance</h3>
                    <p className="text-sm text-ink-500">Available credits</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-ink-900 font-reading">
                    KES {wallet.balance || '0.00'}
                  </div>
                  <Link
                    to="/wallet"
                    className="text-sm text-accent hover:text-accent-hover font-medium"
                  >
                    Top Up →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={i}
                  className="bg-cream-50 rounded-xl border border-cream-300 p-5 shadow-book hover:shadow-book-hover transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-ink-500">{stat.label}</p>
                      <p className="text-2xl font-bold text-ink-900 mt-0.5 font-reading">{stat.value}</p>
                    </div>
                    <div className={`${stat.bg} p-3 rounded-xl ${stat.iconColor}`}>
                      <Icon size={24} strokeWidth={1.8} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Continue Reading */}
          <section className="bg-cream-50 rounded-xl border border-cream-300 shadow-book overflow-hidden">
            <div className="px-6 py-4 border-b border-cream-300 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="font-reading text-xl font-semibold text-ink-900">Continue Reading</h2>
                <div className="flex items-center gap-2 text-accent">
                  <Library size={16} className="animate-pulse" />
                  <span className="text-sm">Great Stories</span>
                </div>
              </div>
              <Link
                to="/library"
                className="text-sm font-medium text-accent hover:text-accent-hover flex items-center gap-1"
              >
                Browse Library
                <ChevronRight size={16} />
              </Link>
            </div>
            <div className="p-6">
              {recentBooks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="animate-pulse">
                    <Library size={48} className="mx-auto text-ink-300 mb-4" />
                  </div>
                  <h3 className="font-semibold text-ink-900 mb-2">Start Your Reading Journey</h3>
                  <p className="text-ink-500 mb-4">Discover amazing stories and great literature.</p>
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <BookOpen size={20} className="text-accent" />
                    <Coffee size={20} className="text-yellow-600" />
                    <Library size={20} className="text-ink-600" />
                  </div>
                  <Link
                    to="/library"
                    className="inline-block px-6 py-3 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Explore Books
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentBooks.map((book) => (
                    <Link
                      key={book.id}
                      to={`/reader/${book.id}`}
                      className="flex items-center gap-4 p-4 rounded-xl hover:bg-cream-200/80 transition-colors group"
                    >
                      <div className="w-14 h-[4.25rem] rounded-lg bg-cream-300 overflow-hidden flex-shrink-0 shadow-book">
                        <img
                          src={book.cover_display_url || book.cover_url || `https://via.placeholder.com/60x80?text=${encodeURIComponent(book.title?.substring(0, 10) || 'Book')}`}
                          alt={book.title || 'Book cover'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = `https://via.placeholder.com/60x80?text=${encodeURIComponent(book.title?.substring(0, 10) || 'Book')}`;
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-ink-900 group-hover:text-accent transition-colors truncate">
                          {book.title || 'Untitled Book'}
                        </h3>
                        <p className="text-sm text-ink-500">{book.author_name || 'Unknown Author'}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-cream-300 rounded-full overflow-hidden max-w-[120px]">
                            <div
                              className="h-full bg-accent rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, book.reading_progress || 0))}%` }}
                            />
                          </div>
                          <span className="text-xs text-ink-500 tabular-nums">
                            {Math.round(book.reading_progress || 0)}%
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-ink-400 group-hover:text-accent flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <Profile />
      )}
    </div>
  );
}
