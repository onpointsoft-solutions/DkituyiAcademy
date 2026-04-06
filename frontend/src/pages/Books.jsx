import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BookOpen, Star, Clock, SlidersHorizontal, Search, Eye, Library, X, Check } from 'lucide-react';
import api from '../api/axiosClient';
import { useNavigate } from 'react-router-dom';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  parchment:  '#f7f3ec',
  parchment2: '#ede8df',
  ink:        '#1c1714',
  inkMid:     '#4a3f35',
  inkLight:   '#8a7a6a',
  gold:       '#b8863c',
  goldLight:  '#e8c98a',
  goldBg:     '#fdf6e8',
  white:      '#ffffff',
  border:     '#ddd5c8',
  success:    '#3a7d52',
  successBg:  '#edf6f1',
};

const FILTERS = [
  { label: 'Catalog',    value: 'all' },
  { label: 'Reading',    value: 'reading' },
  { label: 'Completed',  value: 'completed' },
  { label: 'Unread',     value: 'unread' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function progressColor(p) {
  if (p === 100) return T.success;
  if (p > 0)     return T.gold;
  return T.border;
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function Stars({ rating = 0 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={11}
          style={{ color: i <= Math.floor(rating) ? T.gold : T.border,
                   fill:  i <= Math.floor(rating) ? T.gold : 'none' }} />
      ))}
      {rating > 0 && (
        <span style={{ fontSize: 10, color: T.inkLight, marginLeft: 3, fontFamily: 'system-ui' }}>
          {Number(rating).toFixed(1)}
        </span>
      )}
    </div>
  );
}

// ─── Book card — mobile-first ─────────────────────────────────────────────────
function BookCard({ book, onPreview, onAdd }) {
  const [adding, setAdding] = useState(false);
  const p = book.reading_progress || 0;

  const handleAdd = async () => {
    setAdding(true);
    await onAdd(book.id);
    setAdding(false);
  };

  return (
    <article className="book-card">
      {/* Cover */}
      <div className="book-cover-wrap" onClick={() => onPreview(book.id)}>
        <img
          src={book.cover_display_url || book.cover_url || `https://via.placeholder.com/240x320/2c2416/c8a96e?text=${encodeURIComponent(book.title)}`}
          alt={book.title}
          className="book-cover-img"
          loading="lazy"
        />
        {/* Status badge */}
        {p === 100 && (
          <span className="badge badge-done">✓ Done</span>
        )}
        {p > 0 && p < 100 && (
          <span className="badge badge-progress">{Math.round(p)}%</span>
        )}
        {/* Preview tap hint */}
        <div className="cover-hint">
          <Eye size={14} style={{ marginRight: 5 }} /> Preview
        </div>
      </div>

      {/* Text area */}
      <div className="book-info">
        {book.genre && (
          <span className="genre-chip">{book.genre}</span>
        )}
        <h3 className="book-title">{book.title}</h3>
        <p className="book-author">{book.author_name}</p>
        <Stars rating={book.rating} />

        {book.last_read && (
          <div className="last-read">
            <Clock size={10} style={{ marginRight: 4, flexShrink: 0 }} />
            {new Date(book.last_read).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        )}

        {/* Progress bar */}
        {p > 0 && (
          <div className="progress-wrap">
            <div className="progress-bar" style={{ width: `${p}%`, background: progressColor(p) }} />
          </div>
        )}

        {/* Actions */}
        <div className="book-actions">
          <button className="btn-ghost" onClick={() => onPreview(book.id)}>
            <Eye size={13} /> Preview
          </button>
          <button className="btn-gold" onClick={handleAdd} disabled={adding}>
            <Library size={13} /> {adding ? '…' : 'Add'}
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Bottom-sheet filter drawer (mobile) ──────────────────────────────────────
function FilterSheet({ open, onClose, filter, onFilter }) {
  const ref = useRef(null);

  // Close on backdrop tap
  const onBackdrop = (e) => { if (e.target === ref.current) onClose(); };

  return (
    <div
      ref={ref}
      className={`sheet-backdrop ${open ? 'sheet-open' : ''}`}
      onClick={onBackdrop}
      aria-hidden={!open}
    >
      <div className={`sheet ${open ? 'sheet-visible' : ''}`} role="dialog" aria-label="Filter books">
        {/* Handle */}
        <div className="sheet-handle" />

        <div className="sheet-header">
          <span className="sheet-title">Filter books</span>
          <button className="sheet-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="sheet-options">
          {FILTERS.map(f => (
            <button
              key={f.value}
              className={`sheet-option ${filter === f.value ? 'sheet-option-active' : ''}`}
              onClick={() => { onFilter(f.value); onClose(); }}
            >
              <span>{f.label}</span>
              {filter === f.value && <Check size={16} style={{ color: T.gold }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-ok'}`}>
      {toast.msg}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="empty">
      <div className="empty-icon"><BookOpen size={28} style={{ color: T.inkLight, opacity: 0.5 }} /></div>
      <h3 className="empty-title">{hasFilters ? 'No matches' : 'No books yet'}</h3>
      <p className="empty-body">
        {hasFilters ? 'Try clearing your search or filter.' : 'Check back soon — books are on the way.'}
      </p>
      {hasFilters && (
        <button className="btn-gold-inline" onClick={onClear}>
          <X size={13} /> Clear filters
        </button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BooksPage() {
  const navigate = useNavigate();

  const [books, setBooks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter]         = useState('all');
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [toast, setToast]           = useState(null);
  const searchRef = useRef(null);

  // Lock body scroll when sheet is open
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sheetOpen]);

  useEffect(() => {
    api.get('/api/books/')
      .then(r => { setBooks(r.data.results || []); setLoading(false); })
      .catch(() => { setBooks([]); setLoading(false); });
  }, []);

  const showToast = useCallback((msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const addToLibrary = useCallback(async (bookId) => {
    try {
      const res = await api.post('/api/library/user/library/', { book_id: bookId });
      showToast(res.data.message || 'Added to your library');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add book', 'error');
    }
  }, [showToast]);

  const filteredBooks = books.filter(book => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q
      || book.title?.toLowerCase().includes(q)
      || book.author_name?.toLowerCase().includes(q);
    const p = book.reading_progress || 0;
    const matchFilter =
      filter === 'all'
      || (filter === 'completed' && p === 100)
      || (filter === 'reading'   && p > 0 && p < 100)
      || (filter === 'unread'    && p === 0);
    return matchSearch && matchFilter;
  });

  const hasFilters  = !!searchTerm || filter !== 'all';
  const activeLabel = FILTERS.find(f => f.value === filter)?.label ?? 'All Books';

  if (loading) {
    return (
      <div className="loading-screen">
        <Styles />
        <div className="spinner" />
        <p className="loading-text">Loading books…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <Styles />
      <Toast toast={toast} />

      {/* ── Header ── */}
      <header className="page-header">
        <div className="header-top">
          <div>
            <p className="header-label">Collection</p>
            <h1 className="header-title">All Books</h1>
          </div>
          <div className="header-count">
            <span className="count-num">{books.length}</span>
            <span className="count-label">books</span>
          </div>
        </div>

        {/* Search — full width, large touch target */}
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input
            ref={searchRef}
            type="search"
            className="search-input"
            placeholder="Search title or author…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoComplete="off"
          />
          {searchTerm && (
            <button className="search-clear" onClick={() => { setSearchTerm(''); searchRef.current?.focus(); }} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>
      </header>

      {/* ── Sticky toolbar ── */}
      <div className="toolbar">
        {/* Active filter pill / open sheet on mobile */}
        <button className="filter-btn" onClick={() => setSheetOpen(true)}>
          <SlidersHorizontal size={14} />
          <span>{activeLabel}</span>
          {filter !== 'all' && <span className="filter-dot" />}
        </button>

        {/* Horizontal pills — visible on tablet+ via CSS */}
        <div className="filter-pills">
          {FILTERS.map(f => (
            <button
              key={f.value}
              className={`pill ${filter === f.value ? 'pill-active' : ''}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="result-count">
          {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'}
        </span>
      </div>

      {/* ── Grid ── */}
      <main className="grid-area">
        {filteredBooks.length === 0 ? (
          <EmptyState hasFilters={hasFilters} onClear={() => { setSearchTerm(''); setFilter('all'); }} />
        ) : (
          <div className="book-grid">
            {filteredBooks.map((book, i) => (
              <div key={book.id} className="card-fade" style={{ animationDelay: `${Math.min(i, 16) * 35}ms` }}>
                <BookCard
                  book={book}
                  onPreview={() => navigate(`/reader/${book.id}?mode=preview`)}
                  onAdd={addToLibrary}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Mobile filter bottom sheet ── */}
      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filter={filter}
        onFilter={setFilter}
      />
    </div>
  );
}

// ─── All styles — mobile first ─────────────────────────────────────────────────
function Styles() {
  return (
    <style>{`
      /* ── Reset & globals ── */
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      button { cursor: pointer; }

      /* ── Page shell ── */
      .page {
        min-height: 100vh;
        background: ${T.parchment};
        font-family: Georgia, "Times New Roman", serif;
        -webkit-font-smoothing: antialiased;
      }

      /* ── Loading ── */
      .loading-screen {
        min-height: 100vh;
        background: ${T.parchment};
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
      }
      .spinner {
        width: 36px; height: 36px;
        border: 2px solid ${T.border};
        border-top-color: ${T.gold};
        border-radius: 50%;
        animation: spin 0.85s linear infinite;
      }
      .loading-text {
        color: ${T.inkLight};
        font-size: 15px;
        font-family: Georgia, serif;
      }

      /* ── Header (dark ink band) ── */
      .page-header {
        background: ${T.ink};
        padding: 24px 16px 20px;
      }
      .header-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 18px;
      }
      .header-label {
        font-size: 10px;
        color: rgba(255,255,255,0.35);
        font-family: system-ui, sans-serif;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .header-title {
        font-size: 26px;
        font-weight: 700;
        color: ${T.white};
        letter-spacing: -0.01em;
        line-height: 1.1;
      }
      .header-count {
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 10px;
        padding: 10px 14px;
        text-align: center;
        flex-shrink: 0;
      }
      .count-num {
        display: block;
        font-size: 22px;
        font-weight: 700;
        color: ${T.goldLight};
        line-height: 1;
      }
      .count-label {
        display: block;
        font-size: 9px;
        color: rgba(255,255,255,0.3);
        font-family: system-ui;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-top: 2px;
      }

      /* ── Search ── */
      .search-wrap {
        position: relative;
      }
      .search-icon {
        position: absolute;
        left: 13px;
        top: 50%;
        transform: translateY(-50%);
        color: rgba(255,255,255,0.4);
        pointer-events: none;
        flex-shrink: 0;
      }
      .search-input {
        width: 100%;
        padding: 13px 44px 13px 40px;  /* 13px top/bottom = 44px+ touch height */
        background: rgba(255,255,255,0.09);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 10px;
        color: ${T.white};
        font-size: 15px;
        font-family: Georgia, serif;
        outline: none;
        -webkit-appearance: none;
        transition: border-color 0.2s;
      }
      .search-input::placeholder { color: rgba(255,255,255,0.35); }
      .search-input:focus { border-color: rgba(232,201,138,0.5); }
      /* hide native search clear button */
      .search-input::-webkit-search-cancel-button { display: none; }
      .search-clear {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: rgba(255,255,255,0.4);
        display: flex;
        align-items: center;
        padding: 6px;  /* bigger tap zone */
      }

      /* ── Sticky toolbar ── */
      .toolbar {
        position: sticky;
        top: 0;
        z-index: 30;
        background: ${T.white};
        border-bottom: 1px solid ${T.border};
        padding: 0 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        height: 48px;
      }

      /* Mobile: show the sheet-trigger button, hide pill row */
      .filter-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 12px;
        height: 32px;
        border: 1px solid ${T.border};
        border-radius: 20px;
        background: transparent;
        color: ${T.inkMid};
        font-size: 13px;
        font-family: system-ui;
        white-space: nowrap;
        position: relative;
        flex-shrink: 0;
      }
      .filter-dot {
        width: 6px; height: 6px;
        background: ${T.gold};
        border-radius: 50%;
      }
      .filter-pills { display: none; } /* hidden on mobile */

      .result-count {
        margin-left: auto;
        font-size: 12px;
        color: ${T.inkLight};
        font-family: system-ui;
        white-space: nowrap;
        flex-shrink: 0;
      }

      /* ── Book grid — 2 columns mobile-first ── */
      .grid-area {
        padding: 16px 12px 80px; /* bottom padding for safe area */
      }
      .book-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .card-fade {
        opacity: 0;
        animation: fadeUp 0.4s ease forwards;
      }

      /* ── Book card ── */
      .book-card {
        background: ${T.white};
        border: 1px solid ${T.border};
        border-radius: 12px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition: box-shadow 0.2s, border-color 0.2s;
        -webkit-tap-highlight-color: transparent;
      }
      .book-cover-wrap {
        position: relative;
        aspect-ratio: 3 / 4;
        overflow: hidden;
        background: ${T.parchment2};
        cursor: pointer;
        flex-shrink: 0;
      }
      .book-cover-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: transform 0.3s ease;
      }
      .book-card:hover .book-cover-img { transform: scale(1.04); }
      .badge {
        position: absolute;
        top: 8px; right: 8px;
        font-size: 9px;
        font-family: system-ui;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        padding: 3px 7px;
        border-radius: 20px;
      }
      .badge-done     { background: ${T.successBg}; color: ${T.success}; }
      .badge-progress { background: ${T.goldBg};    color: ${T.gold}; }
      /* Tap hint — bottom of cover, subtle */
      .cover-hint {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        background: linear-gradient(to top, rgba(28,23,20,0.7) 0%, transparent 100%);
        color: rgba(255,255,255,0.8);
        font-size: 11px;
        font-family: system-ui;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px 8px 10px;
        opacity: 0;
        transition: opacity 0.2s;
        pointer-events: none;
      }
      .book-card:hover .cover-hint { opacity: 1; }

      /* Card info body */
      .book-info {
        padding: 10px 11px 12px;
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: 3px;
      }
      .genre-chip {
        font-size: 9px;
        color: ${T.gold};
        font-family: system-ui;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-weight: 700;
      }
      .book-title {
        font-size: 13px;
        font-weight: 700;
        color: ${T.ink};
        line-height: 1.3;
        font-family: Georgia, serif;
        /* 2-line clamp */
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .book-author {
        font-size: 11px;
        color: ${T.inkLight};
        font-family: system-ui;
        margin-bottom: 3px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .last-read {
        display: flex;
        align-items: center;
        font-size: 10px;
        color: ${T.inkLight};
        font-family: system-ui;
        margin-top: 4px;
      }
      .progress-wrap {
        height: 3px;
        background: ${T.parchment2};
        border-radius: 2px;
        overflow: hidden;
        margin-top: 8px;
      }
      .progress-bar {
        height: 100%;
        border-radius: 2px;
        transition: width 0.6s ease;
      }

      /* Action buttons — stacked on tiny screens, side-by-side */
      .book-actions {
        display: flex;
        gap: 6px;
        margin-top: 10px;
      }
      .btn-ghost, .btn-gold {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        min-height: 36px; /* 36px minimum tap target on card */
        border-radius: 8px;
        font-size: 11px;
        font-family: system-ui;
        font-weight: 600;
        border: none;
        transition: opacity 0.15s;
      }
      .btn-ghost {
        background: ${T.parchment};
        color: ${T.inkMid};
        border: 1px solid ${T.border};
      }
      .btn-gold {
        background: ${T.gold};
        color: ${T.white};
      }
      .btn-gold:disabled { opacity: 0.6; cursor: default; }
      .btn-gold-inline {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 11px 22px;
        background: ${T.gold};
        color: ${T.white};
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-family: system-ui;
        font-weight: 600;
        min-height: 44px;
      }

      /* ── Empty state ── */
      .empty {
        text-align: center;
        padding: 56px 24px;
        background: ${T.white};
        border-radius: 14px;
        border: 1px solid ${T.border};
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      .empty-icon {
        width: 60px; height: 60px;
        background: ${T.parchment2};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .empty-title { font-size: 18px; color: ${T.ink}; font-family: Georgia, serif; }
      .empty-body  { font-size: 14px; color: ${T.inkLight}; font-family: system-ui; line-height: 1.6; max-width: 280px; }

      /* ── Toast ── */
      .toast {
        position: fixed;
        bottom: 24px;       /* bottom on mobile, easier to see */
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 20px;
        border-radius: 10px;
        font-size: 14px;
        font-family: system-ui;
        font-weight: 500;
        z-index: 200;
        white-space: nowrap;
        box-shadow: 0 8px 24px rgba(0,0,0,0.22);
        animation: slideUp 0.3s ease;
        max-width: calc(100vw - 32px);
        white-space: normal;
        text-align: center;
      }
      .toast-ok    { background: ${T.ink}; color: ${T.goldLight}; }
      .toast-error { background: #7f1d1d; color: #fecaca; }

      /* ── Bottom sheet ── */
      .sheet-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0);
        z-index: 100;
        pointer-events: none;
        transition: background 0.3s;
      }
      .sheet-backdrop.sheet-open {
        background: rgba(28,23,20,0.5);
        pointer-events: all;
      }
      .sheet {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        background: ${T.white};
        border-radius: 20px 20px 0 0;
        padding: 0 0 32px;
        transform: translateY(100%);
        transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
      }
      .sheet.sheet-visible { transform: translateY(0); }
      .sheet-handle {
        width: 36px; height: 4px;
        background: ${T.border};
        border-radius: 2px;
        margin: 12px auto 0;
      }
      .sheet-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px 12px;
        border-bottom: 1px solid ${T.border};
      }
      .sheet-title {
        font-size: 15px;
        font-weight: 700;
        color: ${T.ink};
        font-family: Georgia, serif;
      }
      .sheet-close {
        background: none;
        border: none;
        color: ${T.inkLight};
        display: flex;
        align-items: center;
        padding: 6px;
      }
      .sheet-options { padding: 8px 0; }
      .sheet-option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 0 20px;
        min-height: 52px; /* generous touch target */
        background: none;
        border: none;
        font-size: 16px;
        font-family: Georgia, serif;
        color: ${T.inkMid};
        text-align: left;
        transition: background 0.15s;
      }
      .sheet-option:active { background: ${T.parchment}; }
      .sheet-option-active { color: ${T.gold}; font-weight: 700; }

      /* ── Keyframes ── */
      @keyframes spin    { to { transform: rotate(360deg); } }
      @keyframes fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      @keyframes slideUp { from { opacity:0; transform:translateX(-50%) translateY(10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }

      /* ══════════════════════════════════════════
         TABLET  ≥ 600px
      ══════════════════════════════════════════ */
      @media (min-width: 600px) {
        .page-header        { padding: 32px 24px 24px; }
        .header-title       { font-size: 30px; }
        .grid-area          { padding: 20px 20px 60px; }
        .book-grid          { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .book-title         { font-size: 14px; }
        .book-info          { padding: 12px 14px 14px; }
        .btn-ghost, .btn-gold { font-size: 12px; min-height: 38px; }
        .toolbar            { padding: 0 20px; }

        /* On tablet, show pill row, hide the sheet button */
        .filter-btn         { display: none; }
        .filter-pills       {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          flex: 1;
        }
        .filter-pills::-webkit-scrollbar { display: none; }
        .pill {
          padding: 0 13px;
          height: 30px;
          border-radius: 20px;
          border: 1px solid ${T.border};
          background: transparent;
          color: ${T.inkMid};
          font-size: 13px;
          font-family: system-ui;
          white-space: nowrap;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .pill-active {
          background: ${T.goldBg};
          border-color: ${T.goldLight};
          color: ${T.gold};
          font-weight: 600;
        }

        /* Toast moves to top on larger screens */
        .toast { bottom: auto; top: 20px; }
      }

      /* ══════════════════════════════════════════
         DESKTOP  ≥ 900px
      ══════════════════════════════════════════ */
      @media (min-width: 900px) {
        .page-header        { padding: 40px 40px 32px; }
        .header-title       { font-size: 36px; }
        .grid-area          { padding: 28px 32px 80px; max-width: 1140px; margin: 0 auto; }
        .book-grid          { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 22px; }
        .toolbar            { padding: 0 32px; max-width: 1140px; margin: 0 auto; width: 100%; }
        .book-title         { font-size: 15px; }
        .book-info          { padding: 14px 16px 16px; }
        .btn-ghost, .btn-gold { font-size: 13px; min-height: 40px; }

        /* Hover lift on desktop only */
        .book-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(28,23,20,0.12);
          border-color: ${T.goldLight};
        }
      }

      /* ══════════════════════════════════════════
         EXTRA LARGE  ≥ 1280px
      ══════════════════════════════════════════ */
      @media (min-width: 1280px) {
        .book-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
        .grid-area { max-width: 1380px; }
        .toolbar   { max-width: 1380px; }
      }

      /* ── Safe area for phones with home indicator ── */
      @supports (padding-bottom: env(safe-area-inset-bottom)) {
        .grid-area { padding-bottom: calc(80px + env(safe-area-inset-bottom)); }
        .sheet     { padding-bottom: calc(32px + env(safe-area-inset-bottom)); }
        .toast     { bottom: calc(24px + env(safe-area-inset-bottom)); }
      }
    `}</style>
  );
}