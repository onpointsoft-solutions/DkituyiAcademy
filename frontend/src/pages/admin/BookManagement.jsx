import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Plus, FileText } from 'lucide-react';
import api from '../../api/axiosClient';

export default function BookManagement() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/books/');
      setBooks(response.data.results || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch books:', err);
      setError('Failed to load books. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    try {
      await api.delete(`/api/admin/books/${bookId}/`);
      setBooks(books.filter(b => b.id !== bookId));
    } catch (err) {
      console.error('Failed to delete book:', err);
      alert('Failed to delete book');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchBooks}
            className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-xl">
            <BookOpen size={24} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Book Management</h2>
            <p className="text-sm text-stone-500">{books.length} total books</p>
          </div>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
        >
          <Plus size={20} />
          Add Book
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 mb-6">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search books by title or author..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </div>

      {/* Books Table */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-stone-700">Book</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-stone-700">Source</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-stone-700">Added</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-stone-700">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredBooks.map((book) => (
                <tr key={book.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-14 bg-stone-200 rounded flex items-center justify-center text-stone-400">
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-stone-900">{book.title}</p>
                        <p className="text-sm text-stone-500">{book.author}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      book.content_source === 'pdf' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {book.content_source === 'pdf' ? 'PDF Upload' : 'Manual'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-600">
                    {formatDate(book.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    {book.has_pdf ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                        <FileText size={14} /> Yes
                      </span>
                    ) : (
                      <span className="text-stone-400 text-sm">No PDF</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredBooks.length === 0 && (
          <div className="text-center py-12 text-stone-500">
            <BookOpen size={48} className="mx-auto mb-3 text-stone-300" />
            <p>No books found matching your search.</p>
          </div>
        )}
      </div>

      {/* Upload Modal Placeholder */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-stone-900 mb-4">Add New Book</h3>
            <p className="text-stone-500 mb-6">
              Book upload functionality would open the BookUpload component here.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  alert('This would open the book upload form');
                }}
                className="flex-1 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
