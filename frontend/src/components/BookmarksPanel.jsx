import React, { useState, useCallback } from 'react';
import { api } from '../api';

const BookmarksPanel = ({ 
  bookId, 
  bookmarks = [], 
  onAddBookmark, 
  onDeleteBookmark,
  isVisible,
  onClose,
  currentPage,
  onPageChange
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddBookmark = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const { data } = await api.post('/api/reader/features/bookmarks/', {
        book_id: bookId,
        page_number: currentPage,
        title: `Page ${currentPage}`,
      });

      onAddBookmark({
        id: data.id,
        page_number: currentPage,
        title: `Page ${currentPage}`,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error adding bookmark:', err);
      alert('Failed to add bookmark. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [bookId, currentPage, onAddBookmark]);

  const handleDeleteBookmark = useCallback(async (bookmarkId) => {
    if (!window.confirm('Are you sure you want to delete this bookmark?')) return;

    try {
      await api.delete(`/api/reader/features/bookmarks/${bookmarkId}/`);
      onDeleteBookmark(bookmarkId);
    } catch (err) {
      console.error('Error deleting bookmark:', err);
      alert('Failed to delete bookmark. Please try again.');
    }
  }, [onDeleteBookmark]);

  const handleBookmarkClick = useCallback((pageNumber) => {
    onPageChange(pageNumber);
    onClose();
  }, [onPageChange, onClose]);

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      right: '0',
      top: '0',
      width: '300px',
      height: '100vh',
      backgroundColor: '#ffffff',
      boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
          Bookmarks
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            color: '#6b7280',
          }}
        >
          ×
        </button>
      </div>

      {/* Add Bookmark Button */}
      <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
        <button
          onClick={handleAddBookmark}
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: isSubmitting ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Adding...' : `Bookmark Page ${currentPage}`}
        </button>
      </div>

      {/* Bookmarks List */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '16px' 
      }}>
        {bookmarks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '14px',
            marginTop: '40px',
          }}>
            No bookmarks yet. Add your first bookmark above!
          </div>
        ) : (
          bookmarks.map(bookmark => (
            <div
              key={bookmark.id}
              style={{
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => handleBookmarkClick(bookmark.page_number)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#dcfce7';
                e.currentTarget.style.transform = 'translateX(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f0fdf4';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px',
              }}>
                <span style={{
                  fontWeight: '600',
                  color: '#166534',
                }}>
                  {bookmark.title}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteBookmark(bookmark.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '2px',
                  }}
                  onMouseEnter={(e) => e.stopPropagation()}
                >
                  ×
                </button>
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
              }}>
                {new Date(bookmark.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BookmarksPanel;
