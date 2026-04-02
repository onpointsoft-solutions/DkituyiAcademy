import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Move,
  Sun,
  Moon,
  Search
} from 'lucide-react';

const PdfControls = ({ 
  currentPage, 
  totalPages, 
  scale,
  onPageChange,
  onScaleChange,
  onThemeToggle,
  theme = 'light',
  showSearch = false,
  onSearchToggle,
  isLoading = false
}) => {
  const [showPageInput, setShowPageInput] = useState(false);
  const [pageInputValue, setPageInputValue] = useState('');

  // Calculate zoom percentage
  const zoomPercentage = useMemo(() => Math.round(scale * 100), [scale]);

  // Handle page input
  const handlePageInput = useCallback((e) => {
    e.preventDefault();
    const page = parseInt(pageInputValue, 10);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
      setShowPageInput(false);
      setPageInputValue('');
    }
  }, [pageInputValue, totalPages, onPageChange]);

  // Handle page input change
  const handlePageInputChange = useCallback((e) => {
    setPageInputValue(e.target.value);
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    onScaleChange(Math.min(scale + 0.25, 3.0));
  }, [scale, onScaleChange]);

  const zoomOut = useCallback(() => {
    onScaleChange(Math.max(scale - 0.25, 0.5));
  }, [scale, onScaleChange]);

  const fitToWidth = useCallback(() => {
    onScaleChange(1.0);
  }, [onScaleChange]);

  const fitToPage = useCallback(() => {
    onScaleChange(1.2);
  }, [onScaleChange]);

  // Navigation controls
  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, onPageChange]);

  const goToFirstPage = useCallback(() => {
    onPageChange(1);
  }, [onPageChange]);

  const goToLastPage = useCallback(() => {
    onPageChange(totalPages);
  }, [scale, onScaleChange, onSearchToggle, onPageChange, totalPages, currentPage]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '+':
          case '=':
            e.preventDefault();
            onScaleChange(Math.min(scale + 0.25, 3.0));
            break;
          case '-':
          case '_':
            e.preventDefault();
            onScaleChange(Math.max(scale - 0.25, 0.5));
            break;
          case '0':
            e.preventDefault();
            onScaleChange(1.0);
            break;
          case 'f':
            e.preventDefault();
            onSearchToggle();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scale, onScaleChange, onSearchToggle, onPageChange, totalPages]);

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: theme === 'light' ? '#ffffff' : '#1a1008',
      borderTop: `1px solid ${theme === 'light' ? '#d4c4a8' : '#7a6a52'}`,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      zIndex: 1000,
      boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
    }}>
      
      {/* Left controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        
        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          style={{
            padding: '8px',
            background: 'none',
            border: '1px solid',
            borderColor: theme === 'light' ? '#d4c4a8' : '#7a6a52',
            borderRadius: '8px',
            cursor: 'pointer',
            color: theme === 'light' ? '#1a1008' : '#fdfaf4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Search toggle */}
        {showSearch && (
          <button
            onClick={onSearchToggle}
            style={{
              padding: '8px',
              background: 'none',
              border: '1px solid',
              borderColor: theme === 'light' ? '#d4c4a8' : '#7a6a52',
              borderRadius: '8px',
              cursor: 'pointer',
              color: theme === 'light' ? '#1a1008' : '#fdfaf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Toggle search"
          >
            <Search size={18} />
          </button>
        )}
      </div>

      {/* Page navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        
        {/* First page */}
        <button
          onClick={goToFirstPage}
          disabled={currentPage === 1 || isLoading}
          style={{
            padding: '8px',
            background: 'none',
            border: '1px solid',
            borderColor: theme === 'light' ? '#d4c4a8' : '#7a6a52',
            borderRadius: '8px',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            color: theme === 'light' ? '#1a1008' : '#fdfaf4',
            opacity: currentPage === 1 ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="First page"
        >
          <ChevronLeft size={16} />
          <ChevronLeft size={16} style={{ marginLeft: '-8px' }} />
        </button>

        {/* Previous page */}
        <button
          onClick={goToPrevPage}
          disabled={currentPage === 1 || isLoading}
          style={{
            padding: '8px',
            background: 'none',
            border: '1px solid',
            borderColor: theme === 'light' ? '#d4c4a8' : '#7a6a52',
            borderRadius: '8px',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            color: theme === 'light' ? '#1a1008' : '#fdfaf4',
            opacity: currentPage === 1 ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Previous page"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Page info/input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {showPageInput ? (
            <form onSubmit={handlePageInput} style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="number"
                value={pageInputValue}
                onChange={handlePageInputChange}
                placeholder={currentPage.toString()}
                min={1}
                max={totalPages}
                style={{
                  width: '60px',
                  padding: '6px 8px',
                  border: `1px solid ${theme === 'light' ? '#d4c4a8' : '#7a6a52'}`,
                  borderRadius: '6px',
                  background: theme === 'light' ? '#ffffff' : '#1a1008',
                  color: theme === 'light' ? '#1a1008' : '#fdfaf4',
                  fontSize: '14px',
                  textAlign: 'center',
                }}
                autoFocus
              />
              <button
                type="submit"
                style={{
                  padding: '6px 12px',
                  background: '#22c55e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  marginLeft: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Go
              </button>
            </form>
          ) : (
            <button
              onClick={() => {
                setShowPageInput(true);
                setPageInputValue(currentPage.toString());
              }}
              style={{
                padding: '8px 12px',
                background: 'none',
                border: '1px solid',
                borderColor: theme === 'light' ? '#d4c4a8' : '#7a6a52',
                borderRadius: '8px',
                cursor: 'pointer',
                color: theme === 'light' ? '#1a1008' : '#fdfaf4',
                fontSize: '14px',
                minWidth: '100px',
              }}
            >
              {currentPage} / {totalPages}
            </button>
          )}
        </div>

        {/* Next page */}
        <button
          onClick={goToNextPage}
          disabled={currentPage === totalPages || isLoading}
          style={{
            padding: '8px',
            background: 'none',
            border: '1px solid',
            borderColor: theme === 'light' ? '#d4c4a8' : '#7a6a52',
            borderRadius: '8px',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            color: theme === 'light' ? '#1a1008' : '#fdfaf4',
            opacity: currentPage === totalPages ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Next page"
        >
          <ChevronRight size={18} />
        </button>

        {/* Last page */}
        <button
          onClick={goToLastPage}
          disabled={currentPage === totalPages || isLoading}
          style={{
            padding: '8px',
            background: 'none',
            border: '1px solid',
            borderColor: theme === 'light' ? '#d4c4a8' : '#7a6a52',
            borderRadius: '8px',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            color: theme === 'light' ? '#1a1008' : '#fdfaf4',
            opacity: currentPage === totalPages ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Last page"
        >
          <ChevronRight size={16} />
          <ChevronRight size={16} style={{ marginLeft: '-8px' }} />
        </button>
      </div>

      {/* Right controls - Zoom */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        
        {/* Zoom out */}
        <button
          onClick={zoomOut}
          disabled={scale <= 0.5}
          style={{
            padding: '8px',
            background: 'none',
            border: '1px solid',
            borderColor: theme === 'light' ? '#d4c4a8' : '#7a6a52',
            borderRadius: '8px',
            cursor: scale <= 0.5 ? 'not-allowed' : 'pointer',
            color: theme === 'light' ? '#1a1008' : '#fdfaf4',
            opacity: scale <= 0.5 ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Zoom out"
        >
          <ZoomOut size={18} />
        </button>

        {/* Zoom percentage */}
        <div style={{
          padding: '6px 12px',
          background: theme === 'light' ? '#f8f9fa' : '#2d3748',
          border: `1px solid ${theme === 'light' ? '#d4c4a8' : '#7a6a52'}`,
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          color: theme === 'light' ? '#1a1008' : '#fdfaf4',
          minWidth: '60px',
          textAlign: 'center',
        }}>
          {zoomPercentage}%
        </div>

        {/* Zoom in */}
        <button
          onClick={zoomIn}
          disabled={scale >= 3.0}
          style={{
            padding: '8px',
            background: 'none',
            border: '1px solid',
            borderColor: theme === 'light' ? '#d4c4a8' : '#7a6a52',
            borderRadius: '8px',
            cursor: scale >= 3.0 ? 'not-allowed' : 'pointer',
            color: theme === 'light' ? '#1a1008' : '#fdfaf4',
            opacity: scale >= 3.0 ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Zoom in"
        >
          <ZoomIn size={18} />
        </button>

        {/* Fit to width */}
        <button
          onClick={fitToWidth}
          style={{
            padding: '8px',
            background: 'none',
            border: '1px solid',
            borderColor: theme === 'light' ? '#d4c4a8' : '#7a6a52',
            borderRadius: '8px',
            cursor: 'pointer',
            color: theme === 'light' ? '#1a1008' : '#fdfaf4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Fit to width"
        >
          <Maximize2 size={18} />
        </button>

        {/* Fit to page */}
        <button
          onClick={fitToPage}
          style={{
            padding: '8px',
            background: 'none',
            border: '1px solid',
            borderColor: theme === 'light' ? '#d4c4a8' : '#7a6a52',
            borderRadius: '8px',
            cursor: 'pointer',
            color: theme === 'light' ? '#1a1008' : '#fdfaf4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Fit to page"
        >
          <Move size={18} />
        </button>
      </div>
    </div>
  );
};

export default PdfControls;
