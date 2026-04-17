import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DKituyiNavFooter from '../components/NavFooter';
import api from '../api/axiosClient';
import { CheckCircle, Star, Wallet, Gift, Sparkles, BookOpen } from 'lucide-react';

// ─── constants ────────────────────────────────────────────────────────────────

const TEAL        = '#00c9a7';
const TEAL_HOVER  = '#00b595';
const DARK        = '#1a1a1a';

// Pricing constants (from settings.py)
const CHAPTER_PRICE = 25;
const SECTION_PRICE = 49;
const BOOK_PRICE_MIN = 99;
const BOOK_PRICE_MAX = 149;
const BOOK_PRICE_DEFAULT = 129;
const SUBSCRIPTION_WEEKLY = 99;
const SUBSCRIPTION_MONTHLY = 299;
const SUBSCRIPTION_PREMIUM = 499;

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
  const [imageError, setImageError] = useState(false);
  
  // Try multiple possible cover image fields
  const coverUrl = book.cover_url || book.cover_display_url || book.cover || book.image || book.thumbnail;
  const fallbackSrc = `https://placehold.co/400x600/e8e2d9/1a1a1a?text=${encodeURIComponent((book.title || 'Book').substring(0, 15))}`;
  const imageSrc = imageError ? fallbackSrc : (coverUrl || fallbackSrc);

  const handleImageError = () => {
    setImageError(true);
  };

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
      {/* Banner-style Cover */}
      <div style={{ height: 300, background: '#f0ece4', overflow: 'hidden', position: 'relative' }}>
        <img
          src={imageSrc}
          alt={book.title || 'Book cover'}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', 
            display: 'block' 
          }}
          onError={handleImageError}
          onLoad={() => setImageError(false)}
        />
        {/* Overlay gradient */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '120px',
          background: 'linear-gradient(to top, transparent, rgba(0,0,0,0.7), rgba(0,0,0,0.9))',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: '1rem',
          gap: '0.5rem',
        }}>
          <span style={{
            background: 'rgba(255,255,255,0.9)',
            color: '#000',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: '11px',
            fontWeight: '600',
            fontFamily: "'Jost', sans-serif",
            backdropFilter: 'blur(4px)',
          }}>
            {book.is_free ? 'FREE' : `KES ${book.price ?? '0.00'}`}
          </span>
        </div>
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
          {book.author_name || book.author || 'Unknown Author'}
          {book.pages ? ` · ${book.pages} pages` : ''}
        </p>

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

// ─── Pricing Card Component ───────────────────────────────────────────────────

function PricingCard({ icon: Icon, title, price, period, features, popular, link }) {
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: popular
          ? 'linear-gradient(135deg, #e6fff9 0%, #fff 100%)'
          : 'linear-gradient(135deg, #fef9e6 0%, #fff 100%)',
        borderRadius: 16,
        padding: '2rem',
        border: popular ? `2px solid ${TEAL}` : '2px solid #e0d5c0',
        boxShadow: hov ? '0 12px 40px rgba(0,0,0,0.12)' : '0 4px 20px rgba(0,0,0,0.05)',
        transform: hov ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'all 0.3s ease',
        position: 'relative',
      }}
    >
      {popular && (
        <div style={{
          position: 'absolute',
          top: -12,
          left: '50%',
          transform: 'translateX(-50%)',
          background: TEAL,
          color: '#fff',
          padding: '6px 16px',
          borderRadius: 20,
          fontSize: '0.75rem',
          fontWeight: 600,
          fontFamily: "'Jost', sans-serif",
        }}>
          Most Popular
        </div>
      )}

      <div style={{
        width: 56,
        height: 56,
        borderRadius: 12,
        background: popular ? 'rgba(0,201,167,0.1)' : 'rgba(201,150,12,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.25rem',
      }}>
        <Icon size={28} color={popular ? TEAL : '#c9960c'} />
      </div>

      <h3 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: '1.25rem',
        color: DARK,
        marginBottom: '0.5rem',
      }}>
        {title}
      </h3>

      <div style={{ marginBottom: '0.25rem' }}>
        <span style={{
          fontSize: '2.5rem',
          fontWeight: 700,
          color: popular ? TEAL : '#c9960c',
          fontFamily: "'Jost', sans-serif",
        }}>
          {price}
        </span>
      </div>

      <p style={{
        fontSize: '0.875rem',
        color: '#666',
        marginBottom: '1.5rem',
        fontFamily: "'Jost', sans-serif",
      }}>
        {period}
      </p>

      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        marginBottom: '1.5rem',
      }}>
        {features.map((feature, idx) => (
          <li key={idx} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem',
            fontSize: '0.9rem',
            color: '#444',
            fontFamily: "'Jost', sans-serif",
          }}>
            <CheckCircle size={16} color="#22c55e" />
            {feature}
          </li>
        ))}
      </ul>

      <Link
        to={link}
        style={{
          display: 'block',
          textAlign: 'center',
          padding: '12px 24px',
          background: popular ? TEAL : 'transparent',
          color: popular ? '#fff' : TEAL,
          border: `2px solid ${TEAL}`,
          borderRadius: 8,
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '0.9rem',
          fontFamily: "'Jost', sans-serif",
          transition: 'all 0.2s',
        }}
      >
        Get Started
      </Link>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate();
  const [books,   setBooks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => { injectSpinKeyframe(); }, []);

  const fetchProfile = useCallback(async () => {
    try {
      setProfileLoading(true);
      const response = await api.get('/api/auth/status/');
      setProfile(response.data);
      console.log('Profile data:', response.data);
    } catch (err) {
      console.log('Not authenticated or profile fetch failed:', err);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First test if server is responding
      console.log('Testing server ping...');
      const pingResponse = await api.get('/api/books/ping/', { timeout: 3000 });
      console.log('Server ping successful:', pingResponse.data);
      
      // Now fetch books with optimized endpoint
      console.log('Fetching books...');
      const response = await api.get('/api/books/test/', { timeout: 5000 });
      
      // Handle different response formats
      let booksArray = [];
      if (Array.isArray(response.data)) {
        booksArray = response.data;
      } else if (response.data?.error) {
        throw new Error(response.data.error);
      } else if (response.data?.results) {
        booksArray = response.data.results;
      }
      
      console.log(`Books fetched: ${booksArray.length}`, booksArray.slice(0, 3).map(b => ({ 
        id: b.id, 
        title: b.title, 
        cover: b.cover_url || b.cover_display_url,
        author: b.author_name || b.author,
        pages: b.pages,
        price: b.price,
        is_free: b.is_free
      })));
      
      setBooks(booksArray);
    } catch (err) {
      console.error('Home: failed to fetch books', err);
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. Server may be slow to respond. Please try again.');
      } else {
        setError('Failed to load books. Please try again later.');
      }
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);
  useEffect(() => { fetchProfile(); }, [fetchProfile]);

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
        minHeight: 480,
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2b2b2b 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle pattern overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2300c9a7'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div style={{ textAlign: 'center', color: '#fff', zIndex: 1, padding: '60px 20px', maxWidth: 800 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0,201,167,0.15)',
            padding: '8px 16px',
            borderRadius: 50,
            marginBottom: 24,
          }}>
            <Gift size={16} color={TEAL} />
            <span style={{ color: TEAL, fontSize: '0.85rem', fontWeight: 600, fontFamily: "'Jost', sans-serif" }}>
              Affordable Reading for Everyone
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
            fontWeight: 700, marginBottom: '1rem', letterSpacing: '-0.5px', lineHeight: 1.15,
          }}>
            Read Great Books,<br />
            <span style={{ color: TEAL }}>Pay as Little as 20 KES</span>
          </h1>
          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.2rem)', opacity: 0.85,
            maxWidth: 560, margin: '0 auto 2rem', lineHeight: 1.7,
            fontFamily: "'Jost', sans-serif",
          }}>
            Access premium books, academic texts, and bestsellers at pocket-friendly prices.
            No subscriptions required.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <TealLink to="/books" large>Browse Books</TealLink>
            <Link to="/register" style={{
              display: 'inline-block',
              padding: '14px 36px',
              background: 'transparent',
              color: '#fff',
              border: '2px solid #fff',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '16px',
              fontFamily: "'Jost', sans-serif",
            }}>
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* ── USER PROFILE SECTION ── */}
      {profile && profile.authenticated && (
        <section style={{ padding: '48px 20px', background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2rem',
              padding: '1.5rem',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${TEAL} 0%, #00b595 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '2rem',
                fontWeight: 'bold',
                fontFamily: "'Jost', sans-serif"
              }}>
                {profile.username ? profile.username.charAt(0).toUpperCase() : 'U'}
              </div>
              
              <div style={{ flex: 1 }}>
                <h2 style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: '1.5rem',
                  color: DARK,
                  marginBottom: '0.5rem',
                  fontWeight: 600
                }}>
                  Welcome back, {profile.username || 'User'}!
                </h2>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.9rem', color: '#666' }}>
                  <span style={{ fontFamily: "'Jost', sans-serif" }}>
                    📧 {profile.user_email || 'No email'}
                  </span>
                  {profile.iat && (
                    <span style={{ fontFamily: "'Jost', sans-serif" }}>
                      📅 Member since {new Date(profile.iat * 1000).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  )}
                  {profile.is_staff && (
                    <span style={{
                      background: TEAL,
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      fontFamily: "'Jost', sans-serif"
                    }}>
                      👑 Admin
                    </span>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <TealLink to="/dashboard">Dashboard</TealLink>
                <TealLink to="/library">My Library</TealLink>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── PRICING SECTION ── */}
      <section style={{ padding: '80px 20px', background: '#faf9f6' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
              color: DARK, marginBottom: '0.75rem',
            }}>
              Choose Your Reading Plan
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#666', maxWidth: 500, margin: '0 auto', fontFamily: "'Jost', sans-serif" }}>
              No expensive subscriptions. Pay only for what you read.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
            maxWidth: 1000,
            margin: '0 auto',
          }}>
            <PricingCard
              icon={BookOpen}
              title="Single Book"
              price={`${BOOK_PRICE_DEFAULT} KES`}
              period="per book access"
              features={['24-hour access', 'Full book content', 'Highlight & bookmark', 'Mobile friendly']}
              popular={false}
              link="/books"
            />
            <PricingCard
              icon={Star}
              title="Weekly Pass"
              price={`${SUBSCRIPTION_WEEKLY} KES`}
              period="7 days unlimited"
              features={['Unlimited books', 'Full library access', 'Save favorites', 'Offline reading', 'Priority support']}
              popular={true}
              link="/wallet"
            />
            <PricingCard
              icon={Wallet}
              title="Monthly Pass"
              price={`${SUBSCRIPTION_MONTHLY} KES`}
              period="30 days unlimited"
              features={['Everything in Weekly', 'New releases first', 'Reading statistics', 'Personalized recommendations']}
              popular={false}
              link="/wallet"
            />
          </div>
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
          <>
            {/* Debug info - remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ 
                background: '#f0f0f0', 
                padding: '10px', 
                marginBottom: '20px', 
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                <strong>Debug Info:</strong> Found {books.length} books from test endpoint
                <br />
                Sample book data: {JSON.stringify(books[0] || {}, null, 2).substring(0, 300)}...
              </div>
            )}
            
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
          </>
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