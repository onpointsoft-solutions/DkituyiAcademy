import React, { useState, useCallback } from 'react';
import { api } from '../api';

const NotesPanel = ({ 
  bookId, 
  currentPage, 
  notes = [], 
  onAddNote, 
  onUpdateNote, 
  onDeleteNote,
  isVisible,
  onClose 
}) => {
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsSubmitting(true);
    try {
      const { data } = await api.post('/api/reader/features/notes/', {
        book_id: bookId,
        page_number: currentPage,
        content: newNote.trim(),
      });

      onAddNote({
        id: data.id,
        content: newNote.trim(),
        page_number: currentPage,
        created_at: new Date().toISOString(),
      });

      setNewNote('');
    } catch (err) {
      console.error('Error adding note:', err);
      alert('Failed to add note. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [bookId, currentPage, newNote, onAddNote]);

  const handleDeleteNote = useCallback(async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      await api.delete(`/api/reader/features/notes/${noteId}/`);
      onDeleteNote(noteId);
    } catch (err) {
      console.error('Error deleting note:', err);
      alert('Failed to delete note. Please try again.');
    }
  }, [onDeleteNote]);

  const currentNotes = notes.filter(note => note.page_number === currentPage);

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      right: '0',
      top: '0',
      width: '350px',
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
          Notes - Page {currentPage}
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

      {/* Add Note Form */}
      <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note for this page..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
              disabled={isSubmitting}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !newNote.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: isSubmitting ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Adding...' : 'Add Note'}
          </button>
        </form>
      </div>

      {/* Notes List */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '16px' 
      }}>
        {currentNotes.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '14px',
            marginTop: '40px',
          }}>
            No notes for this page yet. Add your first note above!
          </div>
        ) : (
          currentNotes.map(note => (
            <div
              key={note.id}
              style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            >
              <div style={{
                marginBottom: '8px',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.5',
              }}>
                {note.content}
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                color: '#6b7280',
              }}>
                <span>
                  {new Date(note.created_at).toLocaleString()}
                </span>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '4px',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotesPanel;
