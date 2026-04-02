import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Bookmark, 
  Highlighter, 
  StickyNote, 
  ArrowLeft, 
  ArrowRight, 
  Settings,
  Camera,
  AlertTriangle,
  CheckCircle,
  X,
  Save,
  Trash2,
  Edit3,
  Palette
} from 'lucide-react';
import api from '../api/axiosClient';

export default function EnhancedReader() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const readerRef = useRef(null);
  const contentRef = useRef(null);
  
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [bookContent, setBookContent] = useState('');
  
  // Annotation states
  const [bookmarks, setBookmarks] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [notes, setNotes] = useState([]);
  const [showAnnotations, setShowAnnotations] = useState(false);
  
  // UI states
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState(null);
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showHighlightDialog, setShowHighlightDialog] = useState(false);
  
  // Screenshot protection
  const [sessionId, setSessionId] = useState(null);
  const [screenshotWarning, setScreenshotWarning] = useState(null);
  const [isScreenshotBlocked, setIsScreenshotBlocked] = useState(false);
  
  // Form states
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteColor, setNoteColor] = useState('#ffffff');
  const [highlightColor, setHighlightColor] = useState('#ffff00');
  const [highlightNote, setHighlightNote] = useState('');

  useEffect(() => {
    loadBook();
    startReadingSession();
    
    // Prevent screenshots
    preventScreenshots();
    
    return () => {
      endReadingSession();
    };
  }, [bookId]);

  useEffect(() => {
    if (book) {
      loadAnnotations(currentPage);
    }
  }, [currentPage, book]);

  const preventScreenshots = () => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      reportScreenshotAttempt();
    };
    
    const handleKeyDown = (e) => {
      if ((e.key === 'PrintScreen') || 
          (e.ctrlKey && e.shiftKey && e.key === 'S') ||
          (e.metaKey && e.shiftKey && e.key === '4')) {
        e.preventDefault();
        reportScreenshotAttempt();
      }
    };
    
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  };

  const reportScreenshotAttempt = async () => {
    if (!sessionId || isScreenshotBlocked) return;
    
    try {
      const response = await api.post('/api/reader/features/report_screenshot_attempt/', {
        session_id: sessionId,
        book_id: bookId
      });
      
      const { message, severity, is_blocked } = response.data;
      setScreenshotWarning({ message, severity });
      setIsScreenshotBlocked(is_blocked);
      
      if (is_blocked) {
        setTimeout(() => navigate('/library'), 3000);
      }
    } catch (error) {
      console.error('Failed to report screenshot attempt:', error);
    }
  };

  const startReadingSession = async () => {
    try {
      const response = await api.post('/api/reader/features/start_reading_session/', {
        book_id: bookId,
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          timestamp: new Date().toISOString()
        }
      });
      
      setSessionId(response.data.session_id);
      setIsScreenshotBlocked(response.data.screenshot_protection.is_blocked);
    } catch (error) {
      console.error('Failed to start reading session:', error);
    }
  };

  const endReadingSession = async () => {
    if (!sessionId) return;
    
    try {
      await api.post('/api/reader/features/end_reading_session/', {
        session_id: sessionId,
        pages_read: currentPage
      });
    } catch (error) {
      console.error('Failed to end reading session:', error);
    }
  };

  const loadBook = async () => {
    try {
      console.log('🔍 DEBUG: Loading book for reading...');
      
      // Get book details
      const bookResponse = await api.get(`/api/books/${bookId}/`);
      console.log('🔍 DEBUG: Book response:', bookResponse.data);
      
      if (!bookResponse.data || bookResponse.data.error) {
        console.error('Invalid book response:', bookResponse.data);
        setLoading(false);
        return;
      }
      
      const bookData = bookResponse.data;
      
      // Get reading progress
      const progressResponse = await api.get(`/api/library/user/reading-progress/?book_id=${bookId}`);
      console.log('🔍 DEBUG: Progress response:', progressResponse.data);
      
      setBook(bookData);
      setTotalPages(bookData.total_pages || 0);
      setBookContent(bookData.content || 'Book content loading...');
      setLoading(false);
    } catch (error) {
      console.error('Failed to load book:', error);
      setLoading(false);
    }
  };

  const loadAnnotations = async (page) => {
    if (!book) return;
    
    try {
      const response = await api.get(`/api/reader/features/get_annotations/?book_id=${bookId}&page_number=${page}`);
      setBookmarks(response.data.bookmarks || []);
      setHighlights(response.data.highlights || []);
      setNotes(response.data.notes || []);
    } catch (error) {
      console.error('Failed to load annotations:', error);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection.toString().trim()) {
      setSelectedText(selection.toString());
      setSelectionRange(selection.getRangeAt(0));
      setIsSelecting(true);
    } else {
      setIsSelecting(false);
      setSelectedText('');
      setSelectionRange(null);
    }
  };

  const addBookmark = async () => {
    try {
      const response = await api.post('/api/reader/features/add_bookmark/', {
        book_id: bookId,
        page_number: currentPage,
        position: { x: 0, y: 0 },
        title: bookmarkTitle,
        note: bookmarkNote
      });
      
      setBookmarks([...bookmarks, response.data.bookmark]);
      setShowBookmarkDialog(false);
      setBookmarkTitle('');
      setBookmarkNote('');
    } catch (error) {
      console.error('Failed to add bookmark:', error);
    }
  };

  const addHighlight = async () => {
    if (!selectedText) return;
    
    try {
      const response = await api.post('/api/reader/features/add_highlight/', {
        book_id: bookId,
        page_number: currentPage,
        start_position: { x: 0, y: 0 },
        end_position: { x: 100, y: 100 },
        selected_text: selectedText,
        color: highlightColor,
        note: highlightNote
      });
      
      setHighlights([...highlights, response.data.highlight]);
      setShowHighlightDialog(false);
      setHighlightNote('');
      setIsSelecting(false);
      setSelectedText('');
      window.getSelection().removeAllRanges();
    } catch (error) {
      console.error('Failed to add highlight:', error);
    }
  };

  const addNote = async () => {
    try {
      const response = await api.post('/api/reader/features/add_note/', {
        book_id: bookId,
        page_number: currentPage,
        position: { x: 50, y: 50 },
        content: noteContent,
        color: noteColor,
        is_private: true
      });
      
      setNotes([...notes, response.data.note]);
      setShowNoteDialog(false);
      setNoteContent('');
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const deleteBookmark = async (bookmarkId) => {
    try {
      await api.delete('/api/reader/features/delete_bookmark/', {
        data: { bookmark_id: bookmarkId }
      });
      setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
    }
  };

  const deleteHighlight = async (highlightId) => {
    try {
      await api.delete('/api/reader/features/delete_highlight/', {
        data: { highlight_id: highlightId }
      });
      setHighlights(highlights.filter(h => h.id !== highlightId));
    } catch (error) {
      console.error('Failed to delete highlight:', error);
    }
  };

  const deleteNote = async (noteId) => {
    try {
      await api.delete('/api/reader/features/delete_note/', {
        data: { note_id: noteId }
      });
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-900">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-cream-50">Loading book...</p>
        </div>
      </div>
    );
  }

  if (isScreenshotBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-900 mb-2">Access Restricted</h2>
          <p className="text-red-700 mb-6">
            {screenshotWarning?.message || 'Your reading access has been temporarily restricted.'}
          </p>
          <button
            onClick={() => navigate('/library')}
            className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-900 text-cream-50" ref={readerRef}>
      {/* Header */}
      <header className="bg-ink-800 border-b border-ink-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-ink-700 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-bold text-lg">{book?.title}</h1>
              <p className="text-sm text-ink-400">Page {currentPage} of {totalPages}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={`p-2 rounded-lg transition-colors ${
                showAnnotations ? 'bg-accent text-ink-900' : 'hover:bg-ink-700'
              }`}
            >
              <StickyNote size={20} />
            </button>
            <button className="p-2 hover:bg-ink-700 rounded-lg transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-screen pt-16">
        {/* Main Reading Area */}
        <main className="flex-1 overflow-auto p-8">
          <div 
            className="max-w-4xl mx-auto bg-cream-50 text-ink-900 rounded-lg shadow-xl p-8"
            onMouseUp={handleTextSelection}
            onSelect={handleTextSelection}
            ref={contentRef}
          >
            {/* Render highlights */}
            {highlights.map((highlight) => (
              <div
                key={highlight.id}
                className="inline-block"
                style={{ backgroundColor: highlight.color }}
              >
                {highlight.selected_text}
              </div>
            ))}
            
            {/* Book content */}
            <div className="prose prose-lg max-w-none">
              <p>{bookContent}</p>
            </div>
            
            {/* Render notes */}
            {notes.map((note) => (
              <div
                key={note.id}
                className="absolute bg-accent text-ink-900 p-2 rounded-lg shadow-lg max-w-xs"
                style={{
                  left: `${note.position.x}px`,
                  top: `${note.position.y}px`,
                  backgroundColor: note.color
                }}
              >
                <p className="text-sm">{note.content}</p>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="mt-2 text-xs hover:text-red-600"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          
          {/* Page Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-3 bg-ink-800 rounded-lg hover:bg-ink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={currentPage}
                onChange={(e) => goToPage(parseInt(e.target.value))}
                className="w-16 px-2 py-1 bg-ink-800 text-center rounded border border-ink-700"
                min={1}
                max={totalPages}
              />
              <span>/ {totalPages}</span>
            </div>
            
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-3 bg-ink-800 rounded-lg hover:bg-ink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight size={20} />
            </button>
          </div>
        </main>

        {/* Annotations Sidebar */}
        {showAnnotations && (
          <aside className="w-80 bg-ink-800 border-l border-ink-700 p-4 overflow-auto">
            <h2 className="font-bold text-lg mb-4">Annotations</h2>
            
            {/* Bookmarks */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Bookmark size={16} />
                Bookmarks
              </h3>
              {bookmarks.length === 0 ? (
                <p className="text-ink-400 text-sm">No bookmarks</p>
              ) : (
                <div className="space-y-2">
                  {bookmarks.map((bookmark) => (
                    <div key={bookmark.id} className="bg-ink-700 p-3 rounded-lg">
                      <p className="font-medium">{bookmark.title}</p>
                      {bookmark.note && <p className="text-sm text-ink-400 mt-1">{bookmark.note}</p>}
                      <button
                        onClick={() => deleteBookmark(bookmark.id)}
                        className="mt-2 text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowBookmarkDialog(true)}
                className="mt-2 w-full p-2 bg-accent text-ink-900 rounded-lg hover:bg-accent-hover transition-colors"
              >
                Add Bookmark
              </button>
            </div>
            
            {/* Highlights */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Highlighter size={16} />
                Highlights
              </h3>
              {highlights.length === 0 ? (
                <p className="text-ink-400 text-sm">No highlights</p>
              ) : (
                <div className="space-y-2">
                  {highlights.map((highlight) => (
                    <div key={highlight.id} className="bg-ink-700 p-3 rounded-lg">
                      <p className="text-sm" style={{ backgroundColor: highlight.color }}>
                        {highlight.selected_text}
                      </p>
                      {highlight.note && <p className="text-sm text-ink-400 mt-1">{highlight.note}</p>}
                      <button
                        onClick={() => deleteHighlight(highlight.id)}
                        className="mt-2 text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Notes */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <StickyNote size={16} />
                Notes
              </h3>
              {notes.length === 0 ? (
                <p className="text-ink-400 text-sm">No notes</p>
              ) : (
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div key={note.id} className="bg-ink-700 p-3 rounded-lg">
                      <p className="text-sm">{note.content}</p>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="mt-2 text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowNoteDialog(true)}
                className="mt-2 w-full p-2 bg-accent text-ink-900 rounded-lg hover:bg-accent-hover transition-colors"
              >
                Add Note
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Text Selection Toolbar */}
      {isSelecting && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-ink-800 border border-ink-700 rounded-lg shadow-xl p-2 flex gap-2">
          <button
            onClick={() => setShowHighlightDialog(true)}
            className="p-2 hover:bg-ink-700 rounded transition-colors"
            title="Highlight"
          >
            <Highlighter size={16} />
          </button>
          <button
            onClick={() => setShowNoteDialog(true)}
            className="p-2 hover:bg-ink-700 rounded transition-colors"
            title="Add Note"
          >
            <StickyNote size={16} />
          </button>
          <button
            onClick={() => {
              setIsSelecting(false);
              setSelectedText('');
              window.getSelection().removeAllRanges();
            }}
            className="p-2 hover:bg-ink-700 rounded transition-colors"
            title="Cancel"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Bookmark Dialog */}
      {showBookmarkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-ink-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="font-bold text-lg mb-4">Add Bookmark</h3>
            <input
              type="text"
              placeholder="Bookmark title"
              value={bookmarkTitle}
              onChange={(e) => setBookmarkTitle(e.target.value)}
              className="w-full p-2 bg-ink-700 border border-ink-600 rounded mb-3"
            />
            <textarea
              placeholder="Note (optional)"
              value={bookmarkNote}
              onChange={(e) => setBookmarkNote(e.target.value)}
              className="w-full p-2 bg-ink-700 border border-ink-600 rounded mb-4 h-24"
            />
            <div className="flex gap-3">
              <button
                onClick={addBookmark}
                className="flex-1 p-2 bg-accent text-ink-900 rounded hover:bg-accent-hover transition-colors"
              >
                <Save size={16} className="inline mr-2" />
                Save
              </button>
              <button
                onClick={() => {
                  setShowBookmarkDialog(false);
                  setBookmarkTitle('');
                  setBookmarkNote('');
                }}
                className="flex-1 p-2 bg-ink-700 rounded hover:bg-ink-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Highlight Dialog */}
      {showHighlightDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-ink-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="font-bold text-lg mb-4">Highlight Text</h3>
            <p className="mb-4 text-ink-300 italic">"{selectedText}"</p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="flex gap-2">
                {['#ffff00', '#00ff00', '#ff00ff', '#00ffff', '#ffa500'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setHighlightColor(color)}
                    className={`w-8 h-8 rounded border-2 ${
                      highlightColor === color ? 'border-accent' : 'border-ink-600'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <textarea
              placeholder="Note (optional)"
              value={highlightNote}
              onChange={(e) => setHighlightNote(e.target.value)}
              className="w-full p-2 bg-ink-700 border border-ink-600 rounded mb-4 h-24"
            />
            <div className="flex gap-3">
              <button
                onClick={addHighlight}
                className="flex-1 p-2 bg-accent text-ink-900 rounded hover:bg-accent-hover transition-colors"
              >
                <Save size={16} className="inline mr-2" />
                Highlight
              </button>
              <button
                onClick={() => {
                  setShowHighlightDialog(false);
                  setHighlightNote('');
                }}
                className="flex-1 p-2 bg-ink-700 rounded hover:bg-ink-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Dialog */}
      {showNoteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-ink-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="font-bold text-lg mb-4">Add Note</h3>
            <textarea
              placeholder="Note content"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="w-full p-2 bg-ink-700 border border-ink-600 rounded mb-4 h-32"
              autoFocus
            />
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="flex gap-2">
                {['#ffffff', '#ffffe0', '#e6f3ff', '#ffe6e6', '#e6ffe6'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setNoteColor(color)}
                    className={`w-8 h-8 rounded border-2 ${
                      noteColor === color ? 'border-accent' : 'border-ink-600'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={addNote}
                className="flex-1 p-2 bg-accent text-ink-900 rounded hover:bg-accent-hover transition-colors"
              >
                <Save size={16} className="inline mr-2" />
                Save
              </button>
              <button
                onClick={() => {
                  setShowNoteDialog(false);
                  setNoteContent('');
                }}
                className="flex-1 p-2 bg-ink-700 rounded hover:bg-ink-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Warning */}
      {screenshotWarning && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg max-w-sm z-50 ${
          screenshotWarning.severity === 'blocked' ? 'bg-red-600' :
          screenshotWarning.severity === 'final_warning' ? 'bg-orange-600' :
          'bg-yellow-600'
        }`}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="flex-shrink-0" />
            <div>
              <p className="font-medium">Screenshot Detected</p>
              <p className="text-sm mt-1">{screenshotWarning.message}</p>
            </div>
            <button
              onClick={() => setScreenshotWarning(null)}
              className="ml-auto"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
