import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, Calendar, TrendingUp, Search, Filter, Book, Award, Star } from 'lucide-react';
import api from '../api/axiosClient';
import { useNavigate } from 'react-router-dom';

export default function ReadingHistoryPage() {
  const navigate = useNavigate();
  const [readingHistory, setReadingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const loadReadingHistory = async () => {
      try {
        console.log('🔍 DEBUG: Loading reading history...');
        
        // Get user library with reading progress
        const libraryResponse = await api.get('/api/library/user/library/');
        console.log('🔍 DEBUG: Library response:', libraryResponse.data);
        
        const userBooks = libraryResponse.data.results || [];
        
        // Flatten the nested book data like in Library component
        const flattenedBooks = userBooks.map(libraryEntry => ({
          id: libraryEntry.id,
          book: {
            id: libraryEntry.book.id,
            title: libraryEntry.book.title,
            author_name: libraryEntry.book.author_name,
            cover_display_url: libraryEntry.book.cover_display_url,
            cover_url: libraryEntry.book.cover_url,
            pages: libraryEntry.book.pages,
            rating: libraryEntry.book.rating,
            price: libraryEntry.book.price,
            is_free: libraryEntry.book.is_free,
            content_source: libraryEntry.book.content_source
          },
          reading_progress: libraryEntry.user_reading_progress || 0,
          last_read: libraryEntry.last_read,
          purchase_date: libraryEntry.purchase_date
        }));
        
        // Sort by last_read date, most recent first
        const sortedHistory = flattenedBooks
          .filter(book => book.last_read) // Only include books that have been read
          .sort((a, b) => new Date(b.last_read) - new Date(a.last_read));
        
        setReadingHistory(sortedHistory);
        
        console.log(`🔍 DEBUG: Loaded ${sortedHistory.length} books with reading history`);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch reading history:', err);
        setReadingHistory([]);
        setLoading(false);
      }
    };

    loadReadingHistory();
  }, []);

  const filteredHistory = readingHistory.filter((item) => {
    const matchSearch =
      item.book?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.book?.author_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'completed' && item.reading_progress === 100) ||
      (filter === 'reading' && item.reading_progress > 0 && item.reading_progress < 100) ||
      (filter === 'recent' && item.last_read);
    return matchSearch && matchFilter;
  });

  const openReader = (bookId) => navigate(`/reader/${bookId}`);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getReadingStats = () => {
    const totalBooks = readingHistory.length;
    const completedBooks = readingHistory.filter(item => item.reading_progress === 100).length;
    const totalPages = readingHistory.reduce((sum, item) => sum + (item.book?.pages || 0), 0);
    const avgProgress = totalBooks > 0 
      ? Math.round(readingHistory.reduce((sum, item) => sum + item.reading_progress, 0) / totalBooks)
      : 0;

    return { totalBooks, completedBooks, totalPages, avgProgress };
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-ink-500 font-reading">Loading reading history...</p>
        </div>
      </div>
    );
  }

  const stats = getReadingStats();

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-reading text-3xl font-bold text-ink-900">Reading History</h1>
          <div className="animate-pulse">
            <Clock size={32} className="text-accent" />
          </div>
        </div>
        <p className="text-ink-500 mb-6">Your reading journey</p>
      </div>

      {/* Reading Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-cream-50 border border-cream-300 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={20} className="text-accent" />
            <span className="text-sm text-ink-600 font-medium">Books Read</span>
          </div>
          <p className="text-2xl font-bold text-ink-900">{stats.totalBooks}</p>
        </div>
        
        <div className="bg-cream-50 border border-cream-300 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award size={20} className="text-green-600" />
            <span className="text-sm text-ink-600 font-medium">Completed</span>
          </div>
          <p className="text-2xl font-bold text-ink-900">{stats.completedBooks}</p>
        </div>
        
        <div className="bg-cream-50 border border-cream-300 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={20} className="text-warm-amber" />
            <span className="text-sm text-ink-600 font-medium">Avg Progress</span>
          </div>
          <p className="text-2xl font-bold text-ink-900">{stats.avgProgress}%</p>
        </div>
        
        <div className="bg-cream-50 border border-cream-300 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={20} className="text-purple-600" />
            <span className="text-sm text-ink-600 font-medium">Total Pages</span>
          </div>
          <p className="text-2xl font-bold text-ink-900">{stats.totalPages}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <input
            type="text"
            placeholder="Search books or authors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-ink-800 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-shadow"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-ink-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-ink-700 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          >
            <option value="all">All Books</option>
            <option value="reading">Currently Reading</option>
            <option value="completed">Completed</option>
            <option value="recent">Recently Read</option>
          </select>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="text-center py-16 px-6 bg-cream-50 rounded-2xl border border-cream-300">
          <div className="w-16 h-16 rounded-full bg-cream-200 flex items-center justify-center mx-auto mb-4">
            <div className="animate-pulse">
              <Clock size={32} className="text-ink-400" />
            </div>
          </div>
          <h3 className="font-reading text-xl font-semibold text-ink-900 mb-2">
            No reading history found
          </h3>
          <p className="text-ink-500 max-w-sm mx-auto mb-6">
            Start reading books to see your reading history here. Your progress will be automatically tracked.
          </p>
          <button
            onClick={() => navigate('/library')}
            className="inline-block px-6 py-3 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors"
          >
            Browse Library
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="bg-cream-50 border border-cream-300 rounded-xl p-4 hover:shadow-book transition-all duration-200 cursor-pointer"
              onClick={() => openReader(item.book.id)}
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <img
                    src={item.book?.cover_display_url || item.book?.cover_url || `https://via.placeholder.com/80x112?text=${encodeURIComponent(item.book?.title)}`}
                    alt={item.book?.title}
                    className="w-20 h-28 object-cover rounded-lg"
                  />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-ink-900 mb-1 hover:text-accent transition-colors">
                        {item.book?.title}
                      </h3>
                      <p className="text-sm text-ink-500">{item.book?.author_name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-ink-500 mb-1">{formatDate(item.last_read)}</div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-ink-400" />
                        <span className="text-xs text-ink-400">
                          {new Date(item.last_read).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          size={14}
                          className={
                            i <= Math.floor(item.book?.rating || 0)
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-cream-400'
                          }
                        />
                      ))}
                      <span className="text-xs text-ink-500 ml-1">({item.book?.rating || 0})</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-ink-500">
                      <span className="font-medium">{Math.round(item.reading_progress)}% complete</span>
                      <span className="text-ink-400">•</span>
                      <span>{item.book?.pages || 0} pages</span>
                    </div>
                  </div>
                  
                  <div className="w-full h-2 bg-cream-300 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-300"
                      style={{ width: `${item.reading_progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
