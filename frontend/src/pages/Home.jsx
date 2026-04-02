import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DKituyiNavFooter from '../components/NavFooter';
import api from '../api/axiosClient';

// ─── constants ────────────────────────────────────────────────────────────────

const TEAL        = '#00c9a7';
const TEAL_HOVER  = '#00b595';
const DARK        = '#1a1a1a';

// Spin keyframe injected once into <head>
function injectSpinKeyframe() {
  if (document.getElementById('dk-spin')) return;
  const style = document.createElement('style');
  style.id = 'dk-spin';
  style.textContent = '@keyframes dk-spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}

// ─── sub-components ───────────────────────────────────────────────────────────

function TealButton({ onClick, children, outline = false, style: extra = {} }) {
  const [hov, setHov] = useState(false);
  const base = {
    padding: '10px 16px',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.9rem',
    transition: 'all 0.2s',
    fontFamily: "'Jost', sans-serif",
    border: outline ? `2px solid ${TEAL}` : 'none',
    background: outline
      ? (hov ? TEAL        : 'transparent')
      : (hov ? TEAL_HOVER  : TEAL),
    color: outline
      ? (hov ? '#fff'      : TEAL)
      : '#fff',
    ...extra,
  };
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={base}
    >
      {children}
    </button>
  );
}

function TealLink({ to, children, large = false }) {
  const [hov, setHov] = useState(false);
  return (
    <Link
      to={to}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-block',
        padding: large ? '14px 36px' : '12px 32px',
        background: hov ? TEAL_HOVER : TEAL,
        color: '#fff',
        textDecoration: 'none',
        borderRadius: 8,
        fontWeight: 600,
        fontSize: large ? '16px' : '15px',
        transition: 'all 0.2s',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: '0 4px 15px rgba(0,201,167,0.3)',
        fontFamily: "'Jost', sans-serif",
      }}
    >
      {children}
    </Link>
  );
}

function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: '3rem' }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid #e8e2d9',
        borderTop: `3px solid ${TEAL}`,
        borderRadius: '50%',
        animation: 'dk-spin 0.8s linear infinite',
        margin: '0 auto',
      }} />
      <p style={{ marginTop: '1rem', color: '#888', fontFamily: "'Jost', sans-serif" }}>Loading books…</p>
    </div>
  );
}

function EmptyState({ icon, title, message, actions }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem' }}>
      <div style={{
        width: 80, height: 80, margin: '0 auto 2rem',
        borderRadius: '50%', background: '#f0ece4',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2rem',
      }}>{icon}</div>
      <h3 style={{ color: DARK, marginBottom: '0.75rem', fontSize: '1.5rem', fontFamily: "'Playfair Display', serif" }}>
        {title}
      </h3>
      <p style={{ color: '#777', maxWidth: 400, margin: '0 auto 2rem', lineHeight: 1.6, fontFamily: "'Jost', sans-serif" }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {actions}
      </div>
    </div>
  );
}

function BookCard({ book, onPreview, onRead }) {
  const [hov, setHov] = useState(false);
  const fallbackSrc = `https://placehold.co/150x200/e8e2d9/1a1a1a?text=${encodeURIComponent((book.title || 'Book').substring(0, 12))}`;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: hov ? '0 8px 30px rgba(0,0,0,0.13)' : '0 4px 20px rgba(0,0,0,0.07)',
        transform: hov ? 'translateY(-5px)' : 'translateY(0)',
        transition: 'transform 0.25s, box-shadow 0.25s',
      }}
    >
      {/* Cover */}
      <div style={{ height: 200, background: '#f0ece4', overflow: 'hidden' }}>
        <img
          src={book.cover_display_url || book.cover_url || fallbackSrc}
          alt={book.title || 'Book cover'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={(e) => { e.currentTarget.src = fallbackSrc; }}
        />
      </div>

      {/* Info */}
      <div style={{ padding: '1.5rem' }}>
        <h3 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '1.15rem', color: DARK,
          marginBottom: '0.4rem', lineHeight: 1.3,
        }}>
          {book.title || 'Untitled Book'}
        </h3>
        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1rem', fontFamily: "'Jost', sans-serif" }}>
          {book.author_name || 'Unknown Author'}
          {book.pages ? ` · ${book.pages} pages` : ''}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
          <span style={{ color: TEAL, fontWeight: 700, fontSize: '1.05rem', fontFamily: "'Jost', sans-serif" }}>
            {book.is_free ? 'FREE' : `KES ${book.price ?? '0.00'}`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <TealButton outline onClick={() => onPreview(book.id)} style={{ flex: 1 }}>
            Preview 20%
          </TealButton>
          <TealButton onClick={() => onRead(book.id)} style={{ flex: 1 }}>
            Read Full
          </TealButton>
        </div>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate();
  const [books,   setBooks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => { injectSpinKeyframe(); }, []);

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/books/test/');
      const data = response.data;
      const booksArray = Array.isArray(data) ? data : (data?.results ?? []);
      setBooks(booksArray);
    } catch (err) {
      console.error('Home: failed to fetch books', err);
      setError('Failed to load books. Please try again later.');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const handlePreview = useCallback((bookId) => {
    navigate(`/reader/${bookId}?preview=true`);
  }, [navigate]);

  const handleRead = useCallback((bookId) => {
    navigate(`/login?redirect=/reader/${bookId}`);
  }, [navigate]);

  return (
    <DKituyiNavFooter>

      {/* ── HERO ── */}
      <section style={{
        minHeight: 420,
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2b2b2b 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle pattern overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2300c9a7'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div style={{ textAlign: 'center', color: '#fff', zIndex: 1, padding: '60px 20px' }}>
          <p style={{
            fontSize: 11, letterSpacing: '2.5px', textTransform: 'uppercase',
            color: TEAL, fontFamily: "'Jost', sans-serif", fontWeight: 600, marginBottom: 16,
          }}>Books &amp; Courses</p>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 700, marginBottom: '1.1rem', letterSpacing: '-0.5px', lineHeight: 1.15,
          }}>
            Discover Amazing Stories
          </h1>
          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.2rem)', opacity: 0.82,
            maxWidth: 560, margin: '0 auto 2.2rem', lineHeight: 1.7,
            fontFamily: "'Jost', sans-serif",
          }}>
            Explore our collection of books and start reading instantly.
            Preview 20% of any book — no login required.
          </p>
          <TealLink to="/login">Sign In to Read More</TealLink>
        </div>
      </section>

      {/* ── BOOKS SECTION ── */}
      <section style={{ padding: '64px 20px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
            color: DARK, marginBottom: '0.75rem', letterSpacing: '-0.5px',
          }}>
            Featured Books
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#777', maxWidth: 540, margin: '0 auto', fontFamily: "'Jost', sans-serif" }}>
            Start reading any book instantly — no login required for the first 20%
          </p>
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <EmptyState
            icon="⚠️"
            title="Unable to Load Books"
            message={error}
            actions={[
              <TealButton key="retry" onClick={fetchBooks}>Try Again</TealButton>,
              <Link key="login" to="/login" style={{
                padding: '10px 20px', border: `2px solid ${TEAL}`,
                borderRadius: 6, color: TEAL, textDecoration: 'none',
                fontWeight: 600, fontFamily: "'Jost', sans-serif",
              }}>Sign In</Link>,
            ]}
          />
        ) : books.length === 0 ? (
          <EmptyState
            icon="📚"
            title="No Books Available"
            message="There are no books available at the moment. Please check back later."
            actions={[
              <TealButton key="refresh" onClick={fetchBooks}>Refresh</TealButton>,
            ]}
          />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
            gap: '2rem',
          }}>
            {books.map(book => (
              <BookCard
                key={book.id}
                book={book}
                onPreview={handlePreview}
                onRead={handleRead}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── CALL TO ACTION ── */}
      <section style={{
        background: DARK, padding: '72px 20px',
        textAlign: 'center', color: '#fff',
      }}>
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
          marginBottom: '1rem', letterSpacing: '-0.5px',
        }}>
          Ready to dive deeper?
        </h2>
        <p style={{
          fontSize: '1.1rem', opacity: 0.82,
          maxWidth: 560, margin: '0 auto 2.2rem', lineHeight: 1.7,
          fontFamily: "'Jost', sans-serif",
        }}>
          Sign in to access your personal library, track reading progress, and unlock full books.
        </p>
        <TealLink to="/login" large>Get Started Now</TealLink>
      </section>

    </DKituyiNavFooter>
  );
}