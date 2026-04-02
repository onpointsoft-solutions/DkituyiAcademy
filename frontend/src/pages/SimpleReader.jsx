import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BookOpen, Download, Share2, Settings } from 'lucide-react';
import api from '../api/axiosClient';

export default function SimpleReader() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const readerRef = useRef(null);
  
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [bookContent, setBookContent] = useState('');
  const [error, setError] = useState(null);

  // Load book data
  const loadBook = async () => {
    try {
      console.log('Loading simple reader book...');
      
      // Get book details
      const bookResponse = await api.get(`/api/books/${bookId}/`);
      console.log('Book response:', bookResponse.data);
      
      if (!bookResponse.data || bookResponse.data.error) {
        console.error('Invalid book response:', bookResponse.data);
        setError('Failed to load book');
        setLoading(false);
        return;
      }
      
      const bookData = bookResponse.data;
      
      // Get reading progress
      const progressResponse = await api.get(`/api/library/user/reading-progress/?book_id=${bookId}`);
      console.log('Progress response:', progressResponse.data);
      
      setBook(bookData);
      setTotalPages(bookData.total_pages || 0);
      setCurrentPage(progressResponse.data?.current_page || 1);
      setBookContent(bookData.content || 'Book content loading...');
      setLoading(false);
    } catch (error) {
      console.error('Failed to load book:', error);
      setError('Failed to load book. Please try again.');
      setLoading(false);
    }
  };

  // Update reading progress
  const updateProgress = async (page) => {
    try {
      await api.post('/api/library/user/reading-progress/', {
        book_id: bookId,
        current_page: page,
        total_pages: totalPages
      });
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  // Page navigation
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      updateProgress(page);
    }
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowRight') nextPage();
      if (e.key === 'ArrowLeft') prevPage();
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, totalPages]);

  useEffect(() => {
    loadBook();
  }, [bookId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading book...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/library')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/library')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{book?.title}</h1>
                <p className="text-sm text-gray-500">{book?.author}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-600 hover:text-gray-900 transition-colors">
                <Download className="h-5 w-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-900 transition-colors">
                <Share2 className="h-5 w-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-900 transition-colors">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg">
          {/* Reading Progress Bar */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Reading Progress</span>
              <span className="text-sm font-medium text-gray-900">
                Page {currentPage} of {totalPages}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentPage / totalPages) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Book Content */}
          <div ref={readerRef} className="p-8 min-h-[600px]">
            <div className="prose max-w-none">
              <div className="text-gray-800 leading-relaxed">
                {bookContent ? (
                  <div dangerouslySetInnerHTML={{ __html: bookContent }} />
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Book content is loading...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Page Navigation */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={prevPage}
                disabled={currentPage <= 1}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Page</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => goToPage(parseInt(e.target.value))}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">of {totalPages}</span>
              </div>
              
              <button
                onClick={nextPage}
                disabled={currentPage >= totalPages}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>© 2024 BookReader. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
