import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, BookOpen, X, Bookmark, BookmarkCheck, Lock, Unlock, RotateCw, Home } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import api from '../api/axiosClient';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function Reader() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [hasAccess, setHasAccess] = useState(true);
  const [accessCheck, setAccessCheck] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [controlsTimer, setControlsTimer] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pageTransition, setPageTransition] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState('forward');

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                           window.innerWidth < 768;
      setIsMobile(isMobileDevice);
      
      // Set initial scale based on device
      if (isMobileDevice) {
        setScale(0.8); // Smaller default scale for mobile
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        console.log(`🔍 DEBUG: Fetching book data for book ID: ${bookId}`);
        const response = await api.get(`/api/books/${bookId}/`);
        console.log('🔍 DEBUG: Book data received:', response.data);
        setBook(response.data);
        
        // Check if user has reading progress for this book
        try {
          console.log(`🔍 DEBUG: Checking reading progress for book ${bookId}`);
          const progressResponse = await api.get(`/api/library/user/reading-progress/?book_id=${bookId}`);
          console.log('🔍 DEBUG: Progress response:', progressResponse.data);
          
          // Handle both single progress object and array/list response
          const progressData = progressResponse.data.results ? 
            progressResponse.data.results[0] : progressResponse.data;
            
          if (progressData && progressData.progress !== undefined) {
            setReadingProgress(progressData.progress);
            // Only set page number after numPages is available
            if (numPages > 0) {
              const targetPage = Math.ceil((progressData.progress / 100) * numPages);
              setPageNumber(Math.max(1, Math.min(targetPage, numPages)));
            }
            console.log(`🔍 DEBUG: Set reading progress to ${progressData.progress}%`);
          }
        } catch (progressErr) {
          console.log('🔍 DEBUG: No reading progress found for this book:', progressErr.response?.data || progressErr.message);
          // Set default values when no progress exists
          setReadingProgress(0);
          setPageNumber(1);
        }
        
        // Check if book is bookmarked
        try {
          console.log(`🔍 DEBUG: Checking library status for book ${bookId}`);
          const libraryResponse = await api.get('/api/library/user/library/');
          const userBooks = libraryResponse.data.results || [];
          const isBookInLibrary = userBooks.some(b => 
            (b.book_id === parseInt(bookId) || b.id === parseInt(bookId)) ||
            (b.book && b.book.id === parseInt(bookId))
          );
          setIsBookmarked(isBookInLibrary);
          console.log(`🔍 DEBUG: Book is in library: ${isBookInLibrary}`);
        } catch (libraryErr) {
          console.log('🔍 DEBUG: Could not check library status:', libraryErr.response?.data || libraryErr.message);
        }
        
        // Check content access
        try {
          console.log(`🔍 DEBUG: Checking content access for book ${bookId}`);
          const accessResponse = await api.get(`/api/payments/content/check_access/?book_id=${bookId}&content_type=book&content_identifier=full_book`);
          console.log('🔍 DEBUG: Access response:', accessResponse.data);
          
          setHasAccess(accessResponse.data.has_access);
          setAccessCheck(true);
          
          if (!accessResponse.data.has_access) {
            setShowPaywall(true);
            console.log('🔍 DEBUG: Book requires payment to access');
          }
        } catch (accessErr) {
          console.log('🔍 DEBUG: Could not check content access:', accessErr.response?.data || accessErr.message);
          setAccessCheck(true);
          // Assume access if check fails (fallback)
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch book:', err);
        console.error('Error details:', err.response?.data || err.message);
        setError('Could not load this book. Please check your connection and try again.');
        setLoading(false);
      }
    };

    if (bookId) fetchBook();
  }, [bookId, numPages]);

  const onDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);

  const changePage = useCallback((direction) => {
    if (!numPages) return;
    
    const newPageNumber = direction === 'forward' 
      ? Math.min(pageNumber + 1, numPages)
      : Math.max(pageNumber - 1, 1);
    
    if (newPageNumber !== pageNumber) {
      // Set transition direction and start animation
      setTransitionDirection(direction);
      setPageTransition(true);
      
      // Change page after animation starts
      setTimeout(() => {
        setPageNumber(newPageNumber);
        
        // End animation after page change
        setTimeout(() => {
          setPageTransition(false);
        }, 400);
      }, 100);
    }
  }, [pageNumber, numPages]);

  const updateReadingProgress = useCallback(async (newPage) => {
    if (!numPages || !bookId) return;
    
    const progress = Math.round((newPage / numPages) * 100);
    setReadingProgress(progress);
    
    console.log(`🔍 DEBUG: Updating reading progress for book ${bookId} to page ${newPage} (${progress}%)`);
    try {
      await api.post('/api/library/user/reading-progress/', {
        book_id: parseInt(bookId),
        current_page: newPage,
        total_pages: numPages,
        progress: progress,
      });
      console.log('🔍 DEBUG: Reading progress updated successfully');
      // Trigger a custom event to notify other components of progress update
      window.dispatchEvent(new CustomEvent('readingProgressUpdated', { 
        detail: { bookId: parseInt(bookId), page: newPage, progress } 
      }));
    } catch (error) {
      console.error('Failed to update reading progress:', error);
    }
  }, [numPages, bookId]);

  useEffect(() => {
    updateReadingProgress(pageNumber);
  }, [pageNumber, updateReadingProgress]);

  const previousPage = () => changePage('backward');
  const nextPage = () => changePage('forward');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        changePage('backward');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        changePage('forward');
      } else if (e.key === 'Escape') {
        setFocusMode(false);
        setShowControls(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changePage]);

  const zoomIn = () => setScale((s) => Math.min(s + (isMobile ? 0.1 : 0.2), 3.0));
  const zoomOut = () => setScale((s) => Math.max(s - (isMobile ? 0.1 : 0.2), 0.5));
  const resetZoom = () => setScale(isMobile ? 0.8 : 1.0);
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  const hideControlsWithTimer = () => {
    if (controlsTimer) {
      clearTimeout(controlsTimer);
    }
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);
    setControlsTimer(timer);
  };

  const toggleFocusMode = () => {
    setFocusMode((f) => !f);
    setShowControls((s) => !s);
  };

  const toggleBookmark = async () => {
    try {
      console.log(`🔍 DEBUG: Toggling bookmark for book ${bookId}, current state: ${isBookmarked}`);
      if (isBookmarked) {
        // Remove from library
        await api.delete(`/api/library/user/library/${bookId}/`);
        setIsBookmarked(false);
        console.log('🔍 DEBUG: Book removed from library successfully');
        // Trigger event to update other components
        window.dispatchEvent(new CustomEvent('libraryUpdated', { 
          detail: { bookId: parseInt(bookId), action: 'removed' } 
        }));
      } else {
        // Add to library
        const response = await api.post('/api/library/user/library/', { book_id: parseInt(bookId) });
        console.log('🔍 DEBUG: Book added to library response:', response.data);
        setIsBookmarked(true);
        console.log('🔍 DEBUG: Book added to library successfully');
        // Trigger event to update other components
        window.dispatchEvent(new CustomEvent('libraryUpdated', { 
          detail: { bookId: parseInt(bookId), action: 'added' } 
        }));
      }
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
      console.error('Error details:', err.response?.data || err.message);
      // Revert state on error
      setIsBookmarked(!isBookmarked);
      // Could add user notification here
    }
  };

  const handleUnlockBook = async () => {
    try {
      console.log(`🔍 DEBUG: Unlocking book ${bookId}`);
      const response = await api.post('/api/payments/content/unlock_book/', {
        book_id: parseInt(bookId)
      });
      
      if (response.data.unlocked) {
        setHasAccess(true);
        setShowPaywall(false);
        console.log('🔍 DEBUG: Book unlocked successfully');
        // Trigger event to update other components
        window.dispatchEvent(new CustomEvent('contentUnlocked', { 
          detail: { bookId: parseInt(bookId), contentType: 'book' } 
        }));
      }
    } catch (err) {
      console.error('Failed to unlock book:', err);
      console.error('Error details:', err.response?.data || err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-200 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 font-reading text-ink-600">Loading book...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-ink-700 font-reading mb-6">{error}</p>
          <button
            onClick={() => navigate('/library')}
            className="px-5 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors font-medium"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  // Show paywall if user doesn't have access
  if (!accessCheck) {
    return (
      <div className="min-h-screen bg-cream-200 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 font-reading text-ink-600">Checking access...</p>
        </div>
      </div>
    );
  }

  if (showPaywall) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={32} className="text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-ink-900 mb-2">Unlock This Book</h2>
            <p className="text-ink-600 mb-6">This content requires payment to access. Unlock the full book and enjoy unlimited reading.</p>
            
            <div className="bg-cream-50 rounded-lg p-4 mb-6">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-ink-900">KES 129</div>
                <p className="text-sm text-ink-500">Full book unlock</p>
              </div>
              
              <div className="space-y-2 text-left text-sm text-ink-600">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Full access to all chapters</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Read on any device</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Supports author</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/wallet')}
                className="flex-1 px-4 py-2 bg-warm-amber text-white rounded-lg hover:bg-warm-amber/90 transition-colors"
              >
                Add Credits
              </button>
              <button
                onClick={handleUnlockBook}
                className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
              >
                Unlock Now
              </button>
              <button
                onClick={() => navigate('/library')}
                className="flex-1 px-4 py-2 border border-cream-300 text-ink-700 rounded-lg hover:bg-cream-50 transition-colors"
              >
                Back to Library
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progressPct = numPages ? Math.round((pageNumber / numPages) * 100) : 0;

  return (
    <div className="h-screen flex flex-col bg-cream-200">
      {/* Reader Header — hidden in focus mode */}
      {!focusMode && (
        <header className={`bg-cream-50/95 backdrop-blur-sm border-b border-cream-300 shadow-book px-4 py-3 flex-shrink-0 ${isMobile ? 'py-2' : ''}`}>
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => navigate('/library')}
                className={`p-2 rounded-lg text-ink-600 hover:bg-cream-300 transition-colors ${isMobile ? 'p-1.5' : ''}`}
                aria-label="Back to library"
              >
                <ChevronLeft size={isMobile ? 20 : 22} />
              </button>
              <div className={`${isMobile ? 'max-w-[150px]' : ''}`}>
                <h1 className={`text-ink-900 font-sans ${isMobile ? 'text-sm font-medium truncate' : 'text-lg font-semibold'}`}>{book?.title}</h1>
                <p className={`text-ink-500 ${isMobile ? 'text-xs truncate' : 'text-sm'}`}>{book?.author}</p>
              </div>
            </div>

            <div className={`flex items-center gap-1 ${isMobile ? 'gap-1' : 'gap-1'}`}>
              <button
                onClick={toggleBookmark}
                className={`p-2 rounded-lg transition-colors ${
                  isBookmarked 
                    ? 'text-accent bg-accent/10 hover:bg-accent/20' 
                    : 'text-ink-600 hover:bg-cream-300'
                } ${isMobile ? 'p-1.5' : ''}`}
                title={isBookmarked ? 'Remove from library' : 'Add to library'}
              >
                {isBookmarked ? <BookmarkCheck size={isMobile ? 18 : 20} /> : <Bookmark size={isMobile ? 18 : 20} />}
              </button>
              
              {!isMobile && (
                <div className="px-3 py-1 bg-cream-100 rounded-lg">
                  <span className="text-sm font-medium text-ink-700">
                    {readingProgress}% • Page {pageNumber}/{numPages}
                  </span>
                </div>
              )}
              
              {!isMobile && (
                <>
                  <button
                    onClick={zoomOut}
                    className="p-2 rounded-lg text-ink-600 hover:bg-cream-300 transition-colors"
                    title="Zoom out"
                  >
                    <ZoomOut size={20} />
                  </button>
                  <button
                    onClick={resetZoom}
                    className="p-2 rounded-lg text-ink-600 hover:bg-cream-300 transition-colors"
                    title="Reset zoom"
                  >
                    <Maximize2 size={20} />
                  </button>
                  <button
                    onClick={zoomIn}
                    className="p-2 rounded-lg text-ink-600 hover:bg-cream-300 transition-colors"
                    title="Zoom in"
                  >
                    <ZoomIn size={20} />
                  </button>
                </>
              )}
              
              <button
                onClick={toggleFocusMode}
                className={`px-3 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent-hover transition-colors ${isMobile ? 'px-2 py-1.5 text-xs' : 'text-sm'}`}
              >
                {isMobile ? 'Focus' : 'Focus mode'}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* PDF area — cream background, book-like shadow */}
      <div className={`flex-1 overflow-auto flex items-center justify-center scroll-reading ${isMobile ? 'p-2' : 'p-6'}`}
           onMouseMove={() => showControls === false && setShowControls(true)}
           onTouchStart={() => {
             setShowControls(true);
             hideControlsWithTimer();
           }}>
        <div
          className={`bg-cream-50 rounded-sm relative max-w-full transition-all duration-500 ease-out ${
            pageTransition ? (
              transitionDirection === 'forward' 
                ? 'transform translate-x-[-100px] rotate-y-12 opacity-30 scale-95 shadow-2xl' 
                : 'transform translate-x-[100px] rotate-y-12 opacity-30 scale-95 shadow-2xl'
            ) : 'transform translate-x-0 rotate-y-0 opacity-100 scale-100 shadow-page'
          }`}
          style={{ 
            width: isMobile ? '100%' : 'auto',
            maxWidth: isMobile ? '100%' : 'none',
            transformStyle: 'preserve-3d',
            perspective: '1000px',
            boxShadow: pageTransition ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        >
          {!book?.file_url ? (
            <div className={`text-center p-12 text-ink-600 font-reading ${isMobile ? 'min-w-[300px] p-6' : 'min-w-[400px]'}`}>
              <BookOpen size={isMobile ? 36 : 48} className="mx-auto mb-4 text-ink-400" />
              <h3 className={`font-semibold mb-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>No PDF Available</h3>
              <p className="text-ink-500">This book doesn't have a PDF file uploaded yet.</p>
              <p className="text-sm text-ink-400 mt-2">Please contact an administrator to add the PDF file.</p>
            </div>
          ) : (
            <Document
              file={book?.file_url}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className={`flex items-center justify-center p-12 ${isMobile ? 'min-w-[300px] min-h-[400px]' : 'min-w-[400px] min-h-[500px]'}`}>
                  <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              }
              error={
                <div className={`text-center p-12 text-ink-600 font-reading ${isMobile ? 'min-w-[300px]' : 'min-w-[400px]'}`}>
                  Failed to load PDF
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                className="border-0"
                renderTextLayer={false}
                renderAnnotationLayer={false}
                width={isMobile ? Math.min(window.innerWidth - 40, 800) : undefined}
              />
            </Document>
          )}
        </div>
      </div>

      {/* Focus mode: minimal floating controls */}
      {focusMode && showControls && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-ink-900/90 backdrop-blur rounded-full shadow-book text-white ${isMobile ? 'px-3 py-2 gap-2' : ''}`}>
          <button
            onClick={previousPage}
            disabled={pageNumber <= 1}
            className={`rounded-full hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${isMobile ? 'p-1.5' : 'p-2'}`}
            aria-label="Previous page"
          >
            <ChevronLeft size={isMobile ? 20 : 22} />
          </button>
          <span className={`font-reading text-center ${isMobile ? 'text-xs min-w-[5rem]' : 'text-sm min-w-[7rem]'}`}>
            {pageNumber} / {numPages}
          </span>
          <button
            onClick={nextPage}
            disabled={pageNumber >= numPages}
            className={`rounded-full hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${isMobile ? 'p-1.5' : 'p-2'}`}
            aria-label="Next page"
          >
            <ChevronRight size={isMobile ? 20 : 22} />
          </button>
          
          {isMobile && (
            <>
              <button
                onClick={zoomOut}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Zoom out"
              >
                <ZoomOut size={18} />
              </button>
              <button
                onClick={zoomIn}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Zoom in"
              >
                <ZoomIn size={18} />
              </button>
            </>
          )}
          
          <button
            onClick={() => { setFocusMode(false); setShowControls(true); }}
            className={`rounded-full hover:bg-white/10 transition-colors ${isMobile ? 'p-1.5 ml-1' : 'p-2 ml-2'}`}
            aria-label="Exit focus mode"
          >
            <X size={isMobile ? 18 : 20} />
          </button>
        </div>
      )}

      {/* Mobile floating controls (when not in focus mode) */}
      {isMobile && !focusMode && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          <button
            onClick={zoomOut}
            className="p-3 bg-ink-900/80 backdrop-blur rounded-full text-white shadow-lg hover:bg-ink-900/90 transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={zoomIn}
            className="p-3 bg-ink-900/80 backdrop-blur rounded-full text-white shadow-lg hover:bg-ink-900/90 transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={resetZoom}
            className="p-3 bg-ink-900/80 backdrop-blur rounded-full text-white shadow-lg hover:bg-ink-900/90 transition-colors"
            aria-label="Reset zoom"
          >
            <Maximize2 size={18} />
          </button>
          {isMobile && (
            <div className="text-center">
              <span className="text-xs text-ink-600 font-medium bg-cream-100 px-2 py-1 rounded-full">
                {Math.round(progressPct)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Page navigation bar — hidden in focus mode */}
      {!focusMode && (
        <div className="bg-cream-50 border-t border-cream-300 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <button
              onClick={previousPage}
              disabled={pageNumber <= 1}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:bg-cream-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <ChevronLeft size={20} />
              Previous
            </button>

            <div className="flex items-center gap-4">
              <span className="text-sm text-ink-600 font-reading">
                Page {pageNumber} of {numPages}
              </span>
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-ink-500" />
                <div className="w-28 h-2 bg-cream-300 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-sm text-ink-500 tabular-nums">{progressPct}%</span>
              </div>
            </div>

            <button
              onClick={nextPage}
              disabled={pageNumber >= numPages}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:bg-cream-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Next
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
