// BookReader.jsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PdfViewer from './PdfViewer';
import PdfControls from './PdfControls';
import NotesPanel from './NotesPanel';
import BookmarksPanel from './BookmarksPanel';
import { api } from '../api';

const BookReader = () => {
  const { bookId } = useParams();

  const [book, setBook] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [theme, setTheme] = useState("light");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [readingProgress, setReadingProgress] = useState(null);

  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [unlockedPages, setUnlockedPages] = useState(new Set());
  const [userBalance, setUserBalance] = useState(0);
  const [pageCost, setPageCost] = useState(10);
  const [unlockingPage, setUnlockingPage] = useState(null);
  
  // Notes and Bookmarks state
  const [notes, setNotes] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [showNotes, setShowNotes] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);

  const containerRef = useRef(null);
  const pdfUrlRef = useRef(null);

  /* --------------------------------------------------
     Load Book
  --------------------------------------------------*/
  useEffect(() => {
    if (!bookId) return;

    let cancelled = false;
    let objectUrl = null;

    const loadBook = async () => {
      try {
        setLoading(true);
        setError(null);

        /* BOOK METADATA */
        const { data: bookData } = await api.get(`/api/books/${bookId}/`);
        if (cancelled) return;

        setBook(bookData);

        /* USER PROFILE */
        try {
          const profileResponse = await api.get('/api/auth/profile/');
          if (profileResponse.data) {
            setUserProfile(profileResponse.data);
          }
        } catch (profileError) {
          console.error('Failed to load user profile:', profileError);
        }

        /* READING PROGRESS */
        try {
          const progressResponse = await api.get(`/api/books/${bookId}/progress/`);
          if (progressResponse.data) {
            setReadingProgress(progressResponse.data);
          }
        } catch (progressError) {
          console.error('Failed to load reading progress:', progressError);
        }

        /* PDF FILE */
        const pdfResponse = await api.get(`/api/books/${bookId}/pdf/`, {
          responseType: "blob",
        });

        if (cancelled) return;

        objectUrl = URL.createObjectURL(
          new Blob([pdfResponse.data], { type: "application/pdf" })
        );

        pdfUrlRef.current = objectUrl;
        setPdfUrl(objectUrl);

        /* WALLET + UNLOCKED PAGES */
        const [walletRes, unlockedRes] = await Promise.allSettled([
          api.get("/api/payments/wallet/"),
          api.get(`/api/reader/features/unlocked_pages/${bookId}/`),
        ]);

        if (cancelled) return;

        if (walletRes.status === "fulfilled") {
          setUserBalance(walletRes.value.data.balance ?? 0);
        }

        const pages =
          unlockedRes.status === "fulfilled"
            ? unlockedRes.value.data.unlocked_pages ?? []
            : [];

        setUnlockedPages(new Set([1, ...pages]));

        /* CALCULATE PER-PAGE COST FROM BOOK PRICE */
        if (bookData && bookData.price && bookData.pages) {
          // Use API per_page_cost if available, otherwise calculate locally
          if (bookData.per_page_cost !== undefined && bookData.per_page_cost !== null) {
            setPageCost(Math.max(1, bookData.per_page_cost));
          } else {
            const perPageCost = Math.round((bookData.price / bookData.pages) * 100) / 100; // Convert to cents
            setPageCost(Math.max(1, perPageCost)); // Minimum 1 coin per page
          }
        }
      } catch (err) {
        if (cancelled) return;

        console.error(err);
        setError(err.response?.data?.error ?? "Failed to load book");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadBook();

    return () => {
      cancelled = true;

      if (objectUrl) URL.revokeObjectURL(objectUrl);
      pdfUrlRef.current = null;
    };
  }, [bookId]);

  /* --------------------------------------------------
     Restore saved preferences
  --------------------------------------------------*/
  useEffect(() => {
    const savedScale = localStorage.getItem(`book_${bookId}_scale`);
    const savedTheme = localStorage.getItem(`book_${bookId}_theme`);

    if (savedScale) setScale(parseFloat(savedScale));
    if (savedTheme) setTheme(savedTheme);
  }, [bookId]);

  /* --------------------------------------------------
     Load Notes and Bookmarks
  --------------------------------------------------*/
  useEffect(() => {
    if (!bookId) return;

    const loadNotes = async () => {
      try {
        const { data } = await api.get(`/api/reader/features/notes/${bookId}/`);
        setNotes(data);
      } catch (err) {
        console.error('Error loading notes:', err);
      }
    };

    const loadBookmarks = async () => {
      try {
        const { data } = await api.get(`/api/reader/features/bookmarks/${bookId}/`);
        setBookmarks(data);
      } catch (err) {
        console.error('Error loading bookmarks:', err);
      }
    };

    loadNotes();
    loadBookmarks();
  }, [bookId]);

  /* --------------------------------------------------
     Unlock Page
  --------------------------------------------------*/
  const unlockPage = useCallback(
    async (pageNumber) => {
      if (unlockingPage) return;

      if (unlockedPages.has(pageNumber)) return;

      if (userBalance < pageCost) {
        alert("Insufficient balance.");
        return;
      }

      try {
        setUnlockingPage(pageNumber);

        const { data } = await api.post("/api/reader/features/unlock_page/", {
          book_id: bookId,
          page_number: pageNumber,
        });

        setUnlockedPages((prev) => new Set([...prev, pageNumber]));
        setUserBalance(data.remaining_balance);
      } catch (err) {
        console.error(err);
        alert("Failed to unlock page");
      } finally {
        setUnlockingPage(null);
      }
    },
    [bookId, unlockingPage, unlockedPages, userBalance, pageCost]
  );

  /* --------------------------------------------------
     Notes and Bookmarks Handlers
  --------------------------------------------------*/
  const handleAddNote = useCallback((note) => {
    setNotes(prev => [...prev, note]);
  }, []);

  const handleDeleteNote = useCallback((noteId) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
  }, []);

  const handleAddBookmark = useCallback((bookmark) => {
    setBookmarks(prev => [...prev, bookmark]);
  }, []);

  const handleDeleteBookmark = useCallback((bookmarkId) => {
    setBookmarks(prev => prev.filter(bookmark => bookmark.id !== bookmarkId));
  }, []);

  /* --------------------------------------------------
     Update Progress
  --------------------------------------------------*/
  const updateProgress = async (page) => {
    if (!book) return;
    
    try {
      const progressPercentage = Math.round((page / book.total_pages) * 100);
      
      await api.post(`/api/books/${bookId}/progress/`, {
        page,
        progress_percentage: progressPercentage,
        timestamp: new Date().toISOString(),
      });
      
      // Update local progress state
      setReadingProgress(prev => ({
        ...prev,
        current_page: page,
        progress_percentage: progressPercentage,
        last_read: new Date().toISOString(),
      }));
      
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  /* --------------------------------------------------
     Page Change
  --------------------------------------------------*/
  const handlePageChange = useCallback(
    (page) => {
      updateProgress(page);
      setCurrentPage(page);
    },
    [bookId, book]
  );

  /* --------------------------------------------------
     Scale Change
  --------------------------------------------------*/
  const handleScaleChange = useCallback(
    (newScale) => {
      setScale(newScale);
      localStorage.setItem(`book_${bookId}_scale`, newScale);
    },
    [bookId]
  );

  /* --------------------------------------------------
     Theme Toggle
  --------------------------------------------------*/
  const handleThemeToggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem(`book_${bookId}_theme`, next);
      return next;
    });
  }, [bookId]);

  /* --------------------------------------------------
     Search
  --------------------------------------------------*/
  const handleSearch = useCallback((term) => {
    setSearchTerm(term);

    if (!term.trim()) return;

    const iframe = containerRef.current?.querySelector("iframe");
    iframe?.contentWindow?.find?.(term);
  }, []);

  /* --------------------------------------------------
     Keyboard Shortcuts
  --------------------------------------------------*/
  useEffect(() => {
    const onKey = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;

      switch (e.key) {
        case "+":
        case "=":
          e.preventDefault();
          setScale((s) => Math.min(s + 0.25, 3));
          break;

        case "-":
          e.preventDefault();
          setScale((s) => Math.max(s - 0.25, 0.5));
          break;

        case "0":
          e.preventDefault();
          setScale(1);
          break;

        case "f":
          e.preventDefault();
          setShowSearch((p) => !p);
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* --------------------------------------------------
     UI
  --------------------------------------------------*/
  const bg = theme === "light" ? "#fdfaf4" : "#1a1008";
  const fg = theme === "light" ? "#1a1008" : "#fdfaf4";

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: bg,
          color: fg,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid currentColor",
            borderTop: "3px solid transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  if (error)
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h3>Error loading book</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );

  if (!pdfUrl) return <div>No PDF available</div>;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-cream-100 dark:bg-ink-900 pb-20 transition-colors duration-300"
      style={{
        minHeight: "100vh",
        backgroundColor: theme === "light" ? "#e8dcc8" : "#1a1008",
        paddingBottom: 80,
      }}
    >
      {showSearch && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[1001] bg-white dark:bg-ink-800 border border-cream-300 dark:border-ink-700 rounded-xl p-3 shadow-lg flex gap-2 items-center max-w-[90vw] w-[400px]" style={{ 
          position:'fixed', 
          top:20, 
          left:'50%', 
          transform:'translateX(-50%)',
          zIndex:1001, 
          background: theme === 'light' ? '#fff' : '#2d3748',
          border:`1px solid ${theme === 'light' ? '#d4c4a8' : '#7a6a52'}`,
          borderRadius:8, 
          padding:12, 
          boxShadow:'0 4px 12px rgba(0,0,0,.15)',
          display:'flex', 
          gap:8, 
          alignItems:'center'
        }}>
          <input 
            type="text" 
            value={searchTerm} 
            autoFocus
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search in book..."
            className="flex-1 px-3 py-2 border border-cream-300 dark:border-ink-700 rounded-lg bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            style={{ 
              padding:'8px 12px',
              border:`1px solid ${theme === 'light' ? '#d4c4a8' : '#7a6a52'}`,
              borderRadius:6, 
              background: theme === 'light' ? '#fff' : '#1a1008',
              color: theme === 'light' ? '#1a1008' : '#e8dcc8', 
              fontSize:14, 
              width:300, 
              outline:'none' 
            }} 
          />
          <button 
            onClick={() => setShowSearch(false)}
            className="p-2 text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200 transition-colors"
            style={{ 
              padding:8, 
              background:'none', 
              border:'none', 
              cursor:'pointer', 
              color: theme === 'light' ? '#1a1008' : '#e8dcc8' 
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Notes Panel */}
      <NotesPanel
        bookId={bookId}
        currentPage={currentPage}
        notes={notes}
        onAddNote={handleAddNote}
        onUpdateNote={() => {}} // Not implemented yet
        onDeleteNote={handleDeleteNote}
        isVisible={showNotes}
        onClose={() => setShowNotes(false)}
      />

      {/* Bookmarks Panel */}
      <BookmarksPanel
        bookId={bookId}
        bookmarks={bookmarks}
        onAddBookmark={handleAddBookmark}
        onDeleteBookmark={handleDeleteBookmark}
        isVisible={showBookmarks}
        onClose={() => setShowBookmarks(false)}
        onPageChange={handlePageChange}
        currentPage={currentPage}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <PdfViewer
          pdfUrl={pdfUrl}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          scale={scale}
          onScaleChange={handleScaleChange}
          theme={theme}
          unlockedPages={unlockedPages}
          unlockingPage={unlockingPage}
          userBalance={userBalance}
          pageCost={pageCost}
          onUnlockPage={unlockPage}
        />
      </div>

      <PdfControls
        currentPage={currentPage}
        totalPages={book?.total_pages ?? 0}
        scale={scale}
        onPageChange={handlePageChange}
        onScaleChange={handleScaleChange}
        onThemeToggle={handleThemeToggle}
        theme={theme}
        showSearch={showSearch}
        onSearchToggle={() => setShowSearch((p) => !p)}
        isLoading={loading}
      />

      {/* Floating Action Buttons - Responsive */}
      <div className="fixed top-4 right-4 z-[1000] flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          onClick={() => setShowNotes(!showNotes)}
          className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-sm sm:text-base font-medium transition-all transform hover:scale-105 ${
            showNotes 
              ? 'bg-accent text-white shadow-lg' 
              : 'bg-ink-600 text-white hover:bg-ink-700'
          }`}
          style={{
            padding: '10px 15px',
            backgroundColor: showNotes ? '#3b82f6' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          <span className="hidden sm:inline">📝 Notes</span>
          <span className="sm:hidden">📝</span>
        </button>
        <button
          onClick={() => setShowBookmarks(!showBookmarks)}
          className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-sm sm:text-base font-medium transition-all transform hover:scale-105 ${
            showBookmarks 
              ? 'bg-green-600 text-white shadow-lg' 
              : 'bg-ink-600 text-white hover:bg-ink-700'
          }`}
          style={{
            padding: '10px 15px',
            backgroundColor: showBookmarks ? '#10b981' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          <span className="hidden sm:inline">🔖 Bookmarks</span>
          <span className="sm:hidden">🔖</span>
        </button>
      </div>
    </div>
  );
};

export default BookReader;