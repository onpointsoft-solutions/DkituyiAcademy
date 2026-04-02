import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, BookOpen, Award, TrendingUp, Clock, LogOut, Settings, Edit3, Library, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosClient';
import { useAuthStore } from '../auth/AuthContext';

export default function Profile() {
  const navigate = useNavigate();
  const { logout, user: authUser } = useAuthStore();
  const [userStats, setUserStats] = useState(null);
  const [userBooks, setUserBooks] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      console.log('🔍 DEBUG: Fetching profile data...');
      
      // Get user from localStorage as fallback
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      const [statsResponse, libraryResponse] = await Promise.all([
        api.get('/api/library/user/stats/'),
        api.get('/api/library/user/library/')
      ]);

      console.log('🔍 DEBUG: Stats response:', statsResponse.data);
      console.log('🔍 DEBUG: Library response:', libraryResponse.data);

      const stats = statsResponse.data || {};
      const books = libraryResponse.data?.results || [];
      
      // Transform user stats
      const transformedStats = {
        totalBooks: stats.totalBooks || 0,
        booksRead: stats.booksRead || 0,
        readingTime: stats.readingTimeHours || 0,
        readingStreak: stats.readingStreak || 0,
        achievements: stats.achievements || 0,
        libraryBooks: books.length,
        pagesRead: stats.pagesRead || 0
      };

      setUserStats(transformedStats);
      setUserBooks(books.slice(0, 6));
      // Use stored user or auth context user
      setUserProfile(storedUser || authUser);
      setError(null);
      console.log('🔍 DEBUG: Profile data loaded successfully');
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
      // Don't set error for 401 - let axios interceptor handle it
      if (error.response?.status !== 401) {
        setError('Failed to load profile data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 font-reading text-ink-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchProfileData}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const displayName = userProfile?.first_name && userProfile?.last_name
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : userProfile?.username || 'Reader';

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header with User Info */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center border-2 border-accent/20">
              <User size={40} className="text-accent" />
            </div>
            <div>
              <h1 className="font-reading text-3xl font-bold text-ink-900">{displayName}</h1>
              <p className="text-ink-500">{userProfile?.email || 'reader@example.com'}</p>
              <p className="text-sm text-ink-400 mt-1">Member since {formatDate(userProfile?.date_joined)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-cream-100 text-ink-700 rounded-xl hover:bg-cream-200 transition-colors">
              <Edit3 size={18} />
              Edit Profile
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard 
          icon={BookOpen} 
          label="Books Read" 
          value={userStats?.booksRead || 0} 
          color="bg-blue-500" 
        />
        <StatCard 
          icon={Clock} 
          label="Reading Time" 
          value={`${userStats?.readingTime || 0}h`} 
          color="bg-amber-500" 
        />
        <StatCard 
          icon={TrendingUp} 
          label="Streak" 
          value={userStats?.readingStreak || 0} 
          color="bg-green-500" 
        />
        <StatCard 
          icon={Library} 
          label="Library" 
          value={userStats?.libraryBooks || 0} 
          color="bg-purple-500" 
        />
        <StatCard 
          icon={Award} 
          label="Achievements" 
          value={userStats?.achievements || 0} 
          color="bg-pink-500" 
        />
        <StatCard 
          icon={BookOpen} 
          label="Pages Read" 
          value={userStats?.pagesRead || 0} 
          color="bg-teal-500" 
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Goals & Settings */}
        <div className="space-y-6">
          {/* Reading Goals */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-cream-200">
            <h2 className="text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
              <Award size={20} className="text-accent" />
              Reading Goals
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-ink-600">Monthly Target (2 books)</span>
                  <span className="text-sm font-medium text-ink-900">{userStats?.booksRead || 0}/2</span>
                </div>
                <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((userStats?.booksRead || 0) / 2 * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-ink-600">Yearly Target (12 books)</span>
                  <span className="text-sm font-medium text-ink-900">{userStats?.booksRead || 0}/12</span>
                </div>
                <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-warm-gold rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((userStats?.booksRead || 0) / 12 * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-cream-200">
            <h2 className="text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
              <Settings size={20} className="text-accent" />
              Quick Actions
            </h2>
            <div className="space-y-2">
              <button 
                onClick={() => navigate('/library')}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-cream-50 transition-colors text-left"
              >
                <span className="text-ink-700">My Library</span>
                <ChevronRight size={18} className="text-ink-400" />
              </button>
              <button 
                onClick={() => navigate('/books')}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-cream-50 transition-colors text-left"
              >
                <span className="text-ink-700">Browse Books</span>
                <ChevronRight size={18} className="text-ink-400" />
              </button>
              <button 
                onClick={() => navigate('/wallet')}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-cream-50 transition-colors text-left"
              >
                <span className="text-ink-700">My Wallet</span>
                <ChevronRight size={18} className="text-ink-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Recent Books */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-cream-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-ink-900 flex items-center gap-2">
                <Library size={20} className="text-accent" />
                Recently Added Books
              </h2>
              <button 
                onClick={() => navigate('/library')}
                className="text-sm text-accent hover:text-accent-hover font-medium"
              >
                View All →
              </button>
            </div>
            
            {userBooks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen size={32} className="text-ink-400" />
                </div>
                <p className="text-ink-600 mb-2">No books in your library yet</p>
                <button 
                  onClick={() => navigate('/books')}
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
                >
                  Browse Books
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {userBooks.map((book) => (
                  <div 
                    key={book.id} 
                    onClick={() => navigate(`/reader/${book.book || book.id}`)}
                    className="group cursor-pointer"
                  >
                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-cream-200 mb-2 shadow-book group-hover:shadow-book-hover transition-all">
                      <img
                        src={book.book_cover || book.cover_url || `https://via.placeholder.com/150x200?text=${encodeURIComponent(book.book_title || book.title || 'Book')}`}
                        alt={book.book_title || book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <h3 className="font-medium text-ink-900 text-sm line-clamp-1">{book.book_title || book.title}</h3>
                    <p className="text-xs text-ink-500">{book.author_name || 'Unknown Author'}</p>
                    {book.progress_percentage > 0 && (
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-cream-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-accent rounded-full"
                            style={{ width: `${book.progress_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-ink-500">{Math.round(book.progress_percentage)}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 border border-cream-200 hover:shadow-lg transition-shadow">
      <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-3`}>
        <Icon size={20} className="text-white" />
      </div>
      <p className="text-2xl font-bold text-ink-900">{value}</p>
      <p className="text-sm text-ink-500">{label}</p>
    </div>
  );
}
