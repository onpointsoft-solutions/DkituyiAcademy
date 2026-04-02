import React, { useState, useEffect } from 'react';
import { BookOpen, Star, Clock, Filter, Search, Book, Library, Plus } from 'lucide-react';
import api from '../api/axiosClient';
import { useNavigate } from 'react-router-dom';

export default function LibraryPage() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [userLibrary, setUserLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAllBooks, setShowAllBooks] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        console.log('🔍 DEBUG: Loading library data...');
        
        // Check if user is admin
        try {
          const authResponse = await api.get('/api/auth/status/');
          console.log('🔍 DEBUG: Auth status:', authResponse.data);
          setIsAdmin(authResponse.data.is_staff || false);
        } catch (authErr) {
          console.log('🔍 DEBUG: Could not check admin status:', authErr);
          setIsAdmin(false);
        }
        
        // Load both user library and all available books
        const [userLibraryResponse, allBooksResponse] = await Promise.all([
          api.get('/api/library/user/library/'),  // Use correct library endpoint
          api.get('/api/books/')  // This should work now with public access
        ]);
        
        console.log('🔍 DEBUG: User library response:', userLibraryResponse.data);
        console.log('🔍 DEBUG: All books response:', allBooksResponse.data);
        
        const userBooks = userLibraryResponse.data.results || [];
        const allBooks = allBooksResponse.data.results || [];
        
        setUserLibrary(userBooks);
        
        // Default to showing all books
        setBooks(allBooks);
        setShowAllBooks(true);
        
        console.log(`🔍 DEBUG: Loaded ${userBooks.length} user books and ${allBooks.length} total books`);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch library:', err);
        
        // Try fallback to just all books if user library fails
        try {
          console.log('🔍 DEBUG: Trying fallback to all books...');
          const allBooksResponse = await api.get('/api/books/');
          const allBooks = allBooksResponse.data.results || [];
          setBooks(allBooks);
          setShowAllBooks(true);
          console.log('🔍 DEBUG: Fallback loaded', allBooks.length, 'books');
        } catch (fallbackErr) {
          console.error('Failed to fetch all books:', fallbackErr);
          setBooks([]);
        }
        
        setLoading(false);
      }
    };
    load();

    // Add real-time refresh
    const interval = setInterval(load, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Add visibility change listener to refresh when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Reload data when tab becomes active
        const load = async () => {
          try {
            const [userLibraryResponse, allBooksResponse] = await Promise.all([
              api.get('/api/library/user/library/'),  // Use correct library endpoint
              api.get('/api/books/')
            ]);
            
            const userBooks = userLibraryResponse.data.results || [];
            const allBooks = allBooksResponse.data.results || [];
            
            setUserLibrary(userBooks);
            if (!showAllBooks && userBooks.length > 0) {
              setBooks(userBooks);
            } else if (showAllBooks) {
              setBooks(allBooks);
            }
          } catch (err) {
            console.error('Failed to refresh library:', err);
          }
        };
        load();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [showAllBooks]);

  // Listen for reading progress updates from Reader component
  useEffect(() => {
    const handleReadingProgressUpdate = (event) => {
      console.log('🔍 DEBUG: Library received reading progress update:', event.detail);
      // Refresh library data when reading progress is updated
      const refreshLibrary = async () => {
        try {
          const [userLibraryResponse, allBooksResponse] = await Promise.all([
            api.get('/api/library/user/library/'),  // Use correct library endpoint
            api.get('/api/books/')
          ]);
          
          const userBooks = userLibraryResponse.data.results || [];
          const allBooks = allBooksResponse.data.results || [];
          
          setUserLibrary(userBooks);
          if (!showAllBooks && userBooks.length > 0) {
            setBooks(userBooks);
          } else if (showAllBooks) {
            setBooks(allBooks);
          }
        } catch (err) {
          console.error('Failed to refresh library on progress update:', err);
        }
      };
      refreshLibrary();
    };

    window.addEventListener('readingProgressUpdated', handleReadingProgressUpdate);
    return () => window.removeEventListener('readingProgressUpdated', handleReadingProgressUpdate);
  }, [showAllBooks]);

  const addToLibrary = async (bookId) => {
    try {
      console.log(`🔍 DEBUG: Adding book ${bookId} to library`);
      const response = await api.post('/api/library/user/library/', { book_id: bookId });  // Use correct library endpoint
      
      // Show success message from backend
      const message = response.data.message || 'Book added to library successfully';
      console.log(`🔍 DEBUG: ${message}`);
      
      // You could add a toast notification here
      alert(message); // Simple alert for now, could be replaced with a toast component
      
      // Refresh user library
      const userLibraryResponse = await api.get('/api/library/user/library/');
      setUserLibrary(userLibraryResponse.data.results || []);
      
      // If currently showing user library, update the displayed books
      if (!showAllBooks) {
        setBooks(userLibraryResponse.data.results || []);
      }
      
      console.log('🔍 DEBUG: Book added to library successfully');
    } catch (error) {
      console.error('Failed to add book to library:', error);
      const errorMessage = error.response?.data?.error || 'Failed to add book to library';
      alert(errorMessage); // Simple error alert
    }
  };

  const removeFromLibrary = async (bookId) => {
    try {
      console.log(`🔍 DEBUG: Removing book ${bookId} from library`);
      await api.delete(`/api/library/user/library/${bookId}/`);
      
      // Refresh user library
      const userLibraryResponse = await api.get('/api/library/user/library/');
      setUserLibrary(userLibraryResponse.data.results || []);
      
      // If currently showing user library, update the displayed books
      if (!showAllBooks) {
        setBooks(userLibraryResponse.data.results || []);
      }
      
      console.log('🔍 DEBUG: Book removed from library successfully');
    } catch (error) {
      console.error('Failed to remove book from library:', error);
    }
  };

  const isInUserLibrary = (bookId) => {
    return userLibrary.some(book => book.book_id === bookId || book.id === bookId);
  };

  const toggleLibraryView = () => {
    const newShowAllBooks = !showAllBooks;
    setShowAllBooks(newShowAllBooks);
    
    if (newShowAllBooks) {
      // Load all books
      api.get('/api/books/').then(response => {
        setBooks(response.data.results || []);
        console.log('🔍 DEBUG: Switched to all books view');
      }).catch(err => {
        console.error('Failed to load all books:', err);
      });
    } else {
      // Show user library
      setBooks(userLibrary);
      console.log('🔍 DEBUG: Switched to user library view');
    }
  };

  const updateProgress = async (bookId, progress) => {
    try {
      await api.post('/api/library/user/reading-progress/', {
        book_id: bookId,
        progress: progress
      });
      // Refresh library
      const response = await api.get('/api/library/user/library/');
      setBooks(response.data.results || []);
    } catch (error) {
      console.error('Failed to update reading progress:', error);
    }
  };

  const filteredBooks = books.filter((book) => {
    const matchSearch =
      book.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'completed' && book.reading_progress === 100) ||
      (filter === 'reading' && book.reading_progress > 0 && book.reading_progress < 100) ||
      (filter === 'unread' && book.reading_progress === 0);
    return matchSearch && matchFilter;
  });

  const openReader = (bookId) => navigate(`/reader/${bookId}`);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-ink-500 font-reading">Loading your library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-reading text-3xl font-bold text-ink-900">Digital Library</h1>
          <div className="animate-pulse">
            <Library size={32} className="text-accent" />
          </div>
        </div>
        <p className="text-ink-500 mb-6">Discover amazing stories and great literature</p>
        
        {/* Library Toggle */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={toggleLibraryView}
            className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-xl hover:bg-accent/20 transition-colors"
          >
            <Library size={20} />
            {showAllBooks ? 'My Library' : 'All Books'}
            <span className="bg-accent/20 px-2 py-1 rounded-lg text-sm">
              {showAllBooks ? userLibrary.length : books.length}
            </span>
          </button>
          
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors"
              title="Go to Admin Panel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Admin Panel
            </button>
          )}
          
          {userLibrary.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-ink-600">
              <Plus size={16} />
              <span>{userLibrary.length} books in your library</span>
            </div>
          )}
        </div>
      </div>

      {/* Continue Reading Section */}
      {userLibrary.filter(b => b.reading_progress > 0 && b.reading_progress < 100).length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-accent" />
            Continue Reading
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {userLibrary
              .filter(b => b.reading_progress > 0 && b.reading_progress < 100)
              .slice(0, 4)
              .map((book) => (
                <article
                  key={`continue-${book.id}`}
                  className="group bg-gradient-to-br from-cream-50 to-amber-50 rounded-xl border border-accent/20 overflow-hidden shadow-book hover:shadow-book-hover transition-all duration-200"
                >
                  <div className="relative aspect-[3/4] bg-cream-200 overflow-hidden">
                    <img
                      src={book.cover_display_url || book.cover_url || `https://via.placeholder.com/200x280?text=${encodeURIComponent(book.title)}`}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3 bg-accent text-white text-xs font-medium px-2.5 py-1 rounded-full">
                      {Math.round(book.reading_progress)}%
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-ink-900 line-clamp-2 mb-1">{book.title}</h3>
                    <p className="text-sm text-ink-500 mb-3">{book.author_name}</p>
                    
                    <div className="w-full h-2 bg-cream-300 rounded-full mb-3 overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-300"
                        style={{ width: `${book.reading_progress}%` }}
                      />
                    </div>
                    
                    <button
                      onClick={() => openReader(book.id)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-white rounded-xl font-medium hover:bg-accent-hover transition-colors"
                    >
                      <BookOpen size={18} strokeWidth={2} />
                      Continue Reading
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </div>
      )}

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
            <option value="unread">Unread</option>
          </select>
        </div>
      </div>

      {filteredBooks.length === 0 ? (
        <div className="text-center py-16 px-6 bg-cream-50 rounded-2xl border border-cream-300">
          <div className="w-16 h-16 rounded-full bg-cream-200 flex items-center justify-center mx-auto mb-4">
            <div className="animate-pulse">
              <BookOpen size={32} className="text-ink-400" />
            </div>
          </div>
          <h3 className="font-reading text-xl font-semibold text-ink-900 mb-2">
            {searchTerm || filter !== 'all' ? 'No matching books found' : 'No books available'}
          </h3>
          <p className="text-ink-500 max-w-sm mx-auto mb-6">
            {searchTerm || filter !== 'all'
              ? 'Try adjusting your search or filters to find books.'
              : 'No books are currently available in the library.'}
          </p>
          
          {showAllBooks && (
            <div className="flex items-center justify-center gap-3 mb-6">
              <Book size={20} className="text-accent" />
              <span className="text-sm text-ink-600">Literature Collection</span>
            </div>
          )}
          
          {searchTerm || filter !== 'all' ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilter('all');
              }}
              className="inline-block px-6 py-3 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors"
            >
              Clear Filters
            </button>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="inline-block px-6 py-3 bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors"
            >
              Refresh Library
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <article
              key={book.id}
              className="group bg-cream-50 rounded-xl border border-cream-300 overflow-hidden shadow-book hover:shadow-book-hover transition-all duration-200"
            >
              <div className="relative aspect-[3/4] bg-cream-200 overflow-hidden">
                <img
                  src={book.cover_display_url || book.cover_url || `https://via.placeholder.com/200x280?text=${encodeURIComponent(book.title)}`}
                  alt={book.title}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
                {book.reading_progress > 0 && (
                  <div className="absolute top-3 right-3 bg-ink-900/80 text-cream-50 text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur">
                    {Math.round(book.reading_progress)}%
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-ink-900 line-clamp-2 mb-1 group-hover:text-accent transition-colors">
                  {book.title}
                </h3>
                <p className="text-sm text-ink-500 mb-2">{book.author_name}</p>
                
                {/* Content Source and Pricing */}
                <div className="flex items-center gap-2 mb-3">
                  {book.content_source && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      book.content_source === 'manual' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {book.content_source === 'manual' ? 'Manual' : 'PDF'}
                    </span>
                  )}
                  {book.price > 0 && !book.is_free && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                      ${book.price}
                    </span>
                  )}
                  {book.is_free && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                      FREE
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mb-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={14}
                      className={
                        i <= Math.floor(book.rating || 0)
                          ? 'text-warm-amber fill-warm-amber'
                          : 'text-cream-400'
                      }
                    />
                  ))}
                  <span className="text-xs text-ink-500 ml-1">({book.rating || 0})</span>
                </div>

                {book.last_read && (
                  <div className="flex items-center text-xs text-ink-500 mb-3">
                    <Clock size={12} className="mr-1.5 flex-shrink-0" />
                    Last read: {new Date(book.last_read).toLocaleDateString()}
                  </div>
                )}

                <div className="w-full h-1.5 bg-cream-300 rounded-full mb-4 overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${book.reading_progress || 0}%` }}
                  />
                </div>

                <div className="flex gap-2">
                  {showAllBooks && !isInUserLibrary(book.id) ? (
                    <button
                      onClick={() => addToLibrary(book.id)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-white rounded-xl font-medium hover:bg-accent-hover transition-colors"
                    >
                      <Plus size={18} strokeWidth={2} />
                      Add to Library
                    </button>
                  ) : (
                    <button
                      onClick={() => openReader(book.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-accent text-white rounded-xl font-medium hover:bg-accent-hover transition-colors"
                    >
                      <BookOpen size={18} strokeWidth={2} />
                      {book.reading_progress > 0 ? 'Continue Reading' : 'Start Reading'}
                    </button>
                  )}
                  
                  {showAllBooks && isInUserLibrary(book.id) && (
                    <button
                      onClick={() => removeFromLibrary(book.id)}
                      className="px-3 py-2.5 bg-cream-200 text-ink-600 rounded-xl font-medium hover:bg-cream-300 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
