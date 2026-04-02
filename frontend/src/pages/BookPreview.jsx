import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, Star, ArrowLeft, UserPlus, Lock, Eye, ChevronRight } from 'lucide-react';
import axios from 'axios';

// ─── Design tokens ──────────────────────────────────────────────────────────────
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
};

const fadeIn = (delay = 0) => ({
  opacity: 0,
  animation: 'fadeUp 0.55s ease forwards',
  animationDelay: `${delay}ms`,
});

// ─── Responsive hook ────────────────────────────────────────────────────────────
function useBreakpoint() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return {
    isMobile:  width < 600,
    isTablet:  width >= 600 && width < 900,
    isDesktop: width >= 900,
    width,
  };
}

// ─── Shared style factories ─────────────────────────────────────────────────────
const mkPrimaryBtn = (fullWidth = false) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: '12px 24px',
  background: T.gold, color: T.white,
  border: 'none', borderRadius: 8, cursor: 'pointer',
  fontSize: 14, fontFamily: 'system-ui, sans-serif', fontWeight: 600,
  letterSpacing: '0.01em', transition: 'opacity 0.2s',
  width: fullWidth ? '100%' : 'auto',
  boxSizing: 'border-box',
});

const mkGhostBtn = (fullWidth = false) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: '12px 24px',
  background: 'transparent', color: 'rgba(255,255,255,0.65)',
  border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, cursor: 'pointer',
  fontSize: 14, fontFamily: 'system-ui, sans-serif', transition: 'opacity 0.2s',
  width: fullWidth ? '100%' : 'auto',
  boxSizing: 'border-box',
});

const sideCard = {
  background: T.white,
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  padding: '20px 22px',
  boxShadow: '0 1px 8px rgba(28,23,20,0.05)',
};

const sideLabel = {
  margin: '0 0 12px',
  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
  color: T.inkLight, fontFamily: 'system-ui, sans-serif', fontWeight: 700,
};

// ─── Main component ─────────────────────────────────────────────────────────────
export default function BookPreview() {
  const { bookId } = useParams();
  const navigate   = useNavigate();
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  const [book, setBook]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [scrolled, setScrolled]   = useState(false);
  
  // Public axios for preview mode
  const publicAxios = axios.create({ 
    headers: { "Content-Type": "application/json" } 
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    publicAxios.get(`/api/books/${bookId}/`)
      .then(r => { setBook(r.data); setLoading(false); })
      .catch(err => {
        setError(err.response?.data?.error || 'Failed to load book preview');
        setLoading(false);
      });
  }, [bookId]);

  const handleSignUp = () =>
    navigate('/login', { state: { redirectTo: `/reader/${bookId}`, bookTitle: book?.title } });

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.parchment, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GlobalStyles />
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: `2px solid ${T.border}`, borderTopColor: T.gold, borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: T.inkLight, fontFamily: 'Georgia, serif', fontSize: 15, letterSpacing: '0.02em' }}>Loading preview…</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !book) {
    return (
      <div style={{ minHeight: '100vh', background: T.parchment, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <GlobalStyles />
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: T.parchment2, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Lock size={24} style={{ color: T.inkLight }} />
          </div>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: T.ink, marginBottom: 10 }}>Preview Unavailable</h2>
          <p style={{ color: T.inkLight, fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>{error}</p>
          <button onClick={() => navigate(-1)} style={mkPrimaryBtn()}>
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const previewPercent = book.preview_percentage
    ?? Math.round(((book.preview_pages ?? 0) / (book.total_pages || 1)) * 100);

  const px = isMobile ? 16 : isTablet ? 24 : 32; // horizontal padding

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: T.parchment, fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <GlobalStyles />

      {/* ══ STICKY HEADER ══════════════════════════════════════════════════════ */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: scrolled ? 'rgba(247,243,236,0.97)' : T.parchment,
        borderBottom: `1px solid ${scrolled ? T.border : 'transparent'}`,
        backdropFilter: 'blur(8px)',
        transition: 'background 0.3s, border-color 0.3s',
      }}>
        <div style={{
          maxWidth: 1060, margin: '0 auto',
          padding: `0 ${px}px`,
          height: isMobile ? 52 : 58,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.inkMid, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'system-ui, sans-serif', padding: '6px 0' }}
          >
            <ArrowLeft size={16} />
            {!isMobile && 'Back'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.goldBg, border: `1px solid ${T.goldLight}`, borderRadius: 20, padding: '5px 12px' }}>
            <Eye size={12} style={{ color: T.gold }} />
            <span style={{ fontSize: 11, color: T.gold, fontFamily: 'system-ui, sans-serif', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Preview</span>
          </div>
        </div>
      </header>

      {/* ══ HERO BAND ══════════════════════════════════════════════════════════ */}
      <div style={{ background: T.ink, color: T.white, padding: isMobile ? '32px 16px 28px' : '52px 32px 48px', ...fadeIn(0) }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>

          {/* Cover + info: stacked on mobile, row on tablet+ */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 20 : 36,
            alignItems: isMobile ? 'flex-start' : 'flex-end',
          }}>

            {/* Cover image */}
            <div style={{
              width: isMobile ? 96 : 130,
              flexShrink: 0,
              boxShadow: '6px 10px 28px rgba(0,0,0,0.5)',
              borderRadius: 4, overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
              alignSelf: isMobile ? 'center' : 'flex-end',
              ...fadeIn(80),
            }}>
              <img
                src={book.cover_display_url || book.cover_url || `https://via.placeholder.com/260x360/2c2416/c8a96e?text=${encodeURIComponent(book.title)}`}
                alt={book.title}
                style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }}
              />
            </div>

            {/* Text info */}
            <div style={{ flex: 1, textAlign: isMobile ? 'center' : 'left', ...fadeIn(150) }}>
              {book.genre && (
                <span style={{ display: 'inline-block', fontSize: 10, color: T.goldLight, fontFamily: 'system-ui, sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
                  {book.genre}
                </span>
              )}

              <h1 style={{ margin: '0 0 8px', fontSize: isMobile ? 22 : 'clamp(24px, 4vw, 36px)', fontWeight: 700, lineHeight: 1.2, color: T.white, letterSpacing: '-0.01em' }}>
                {book.title}
              </h1>
              <p style={{ margin: '0 0 14px', fontSize: isMobile ? 14 : 16, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                {book.author}
              </p>

              {/* Stars */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 18, justifyContent: isMobile ? 'center' : 'flex-start' }}>
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={13} style={{ color: T.goldLight, fill: T.goldLight }} />
                ))}
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginLeft: 5, fontFamily: 'system-ui, sans-serif' }}>5.0</span>
              </div>

              {/* Stats — 3-up grid on mobile, row on tablet+ */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(3, auto)',
                gap: isMobile ? 0 : 28,
                justifyContent: isMobile ? 'stretch' : 'flex-start',
                textAlign: isMobile ? 'center' : 'left',
              }}>
                {[
                  { label: 'Total', value: book.total_pages, suffix: 'pages' },
                  { label: 'Preview', value: book.preview_pages, suffix: 'pages' },
                  { label: 'Unlocked', value: `${previewPercent}%`, suffix: '' },
                ].map(s => (
                  <div key={s.label} style={{ padding: isMobile ? '10px 0' : 0 }}>
                    <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'system-ui, sans-serif', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{s.label}</p>
                    <p style={{ margin: '3px 0 0', fontSize: isMobile ? 16 : 18, color: T.white, fontWeight: 700 }}>{s.value}</p>
                    {s.suffix && <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'system-ui, sans-serif' }}>{s.suffix}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ BODY ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        maxWidth: 1060, margin: '0 auto',
        padding: `32px ${px}px 80px`,
        display: 'grid',
        // Single column on mobile/tablet, two columns on desktop
        gridTemplateColumns: isDesktop ? '1fr 300px' : '1fr',
        gap: isDesktop ? 40 : 28,
        alignItems: 'start',
      }}>

        {/* ── Main: preview text ── */}
        <div style={fadeIn(200)}>

          {/* Section label row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <BookOpen size={15} style={{ color: T.gold }} />
            <span style={{ fontSize: 11, color: T.inkLight, fontFamily: 'system-ui, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Reading preview</span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>

          {/* Text card */}
          <div style={{
            background: T.white, borderRadius: 10,
            border: `1px solid ${T.border}`,
            overflow: 'hidden',
            boxShadow: '0 2px 16px rgba(28,23,20,0.06)',
          }}>
            {/* Gold accent stripe */}
            <div style={{ height: 3, background: `linear-gradient(90deg, ${T.gold}, ${T.goldLight})` }} />

            <div style={{ padding: isMobile ? '24px 20px' : '36px 40px' }}>
              <div style={{
                fontFamily: 'Georgia, serif',
                fontSize: isMobile ? 15 : 16,
                lineHeight: isMobile ? 1.85 : 1.95,
                color: T.inkMid,
                whiteSpace: 'pre-wrap',
                letterSpacing: '0.01em',
              }}>
                {/* Drop cap — only on non-mobile so it doesn't break flow */}
                {!isMobile && (
                  <span style={{ float: 'left', fontSize: 64, lineHeight: 0.78, marginRight: 8, marginTop: 8, fontWeight: 700, color: T.ink }}>
                    {book.preview_text?.[0] ?? ''}
                  </span>
                )}
                {isMobile ? book.preview_text : book.preview_text?.slice(1)}
              </div>

              {/* Fade-out overlay */}
              <div style={{ height: 80, marginTop: -80, background: 'linear-gradient(to bottom, transparent, white)', position: 'relative', zIndex: 2 }} />
            </div>

            {(book.preview_text?.length ?? 0) >= 5000 && (
              <p style={{ margin: 0, padding: `0 ${isMobile ? 20 : 40}px 16px`, fontSize: 12, color: T.inkLight, fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
                Preview truncated to 5,000 characters
              </p>
            )}
          </div>

          {/* On non-desktop: show sidebar cards inline here */}
          {!isDesktop && (
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16, ...fadeIn(260) }}>
              <SidebarCards book={book} previewPercent={previewPercent} onSignUp={handleSignUp} />
            </div>
          )}

          {/* ── CTA banner ── */}
          <div style={{
            marginTop: 28,
            padding: isMobile ? '28px 20px' : '32px 36px',
            background: T.ink, borderRadius: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            gap: 16,
            ...fadeIn(320),
          }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(184,134,60,0.18)', border: '1px solid rgba(184,134,60,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserPlus size={20} style={{ color: T.goldLight }} />
            </div>

            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: isMobile ? 17 : 20, color: T.white, fontWeight: 700 }}>Continue reading the full book</h3>
              <p style={{ margin: 0, fontSize: isMobile ? 13 : 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, maxWidth: 380 }}>
                Create a free account to unlock this book and everything in our library.
              </p>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 12,
              width: isMobile ? '100%' : 'auto',
            }}>
              <button onClick={handleSignUp} style={mkPrimaryBtn(isMobile)}>
                <UserPlus size={15} />
                Sign up — it's free
              </button>
              <button onClick={() => navigate(-1)} style={mkGhostBtn(isMobile)}>
                Browse more books
              </button>
            </div>
          </div>
        </div>

        {/* ── Sidebar — desktop only ── */}
        {isDesktop && (
          <aside style={{ position: 'sticky', top: 74, ...fadeIn(260) }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <SidebarCards book={book} previewPercent={previewPercent} onSignUp={handleSignUp} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar cards — reused on both mobile (inline) and desktop (sticky) ────────
function SidebarCards({ book, previewPercent, onSignUp }) {
  return (
    <>
      {/* About */}
      {book.description && (
        <div style={sideCard}>
          <p style={sideLabel}>About this book</p>
          <p style={{ margin: 0, fontSize: 14, color: T.inkMid, lineHeight: 1.75 }}>{book.description}</p>
        </div>
      )}

      {/* Progress */}
      <div style={sideCard}>
        <p style={sideLabel}>Preview progress</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{ fontSize: 12, color: T.inkLight, fontFamily: 'system-ui, sans-serif' }}>Pages unlocked</span>
          <span style={{ fontSize: 12, color: T.gold, fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}>{previewPercent}%</span>
        </div>
        <div style={{ height: 5, background: T.parchment2, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${previewPercent}%`, background: `linear-gradient(90deg, ${T.gold}, ${T.goldLight})`, borderRadius: 3, transition: 'width 0.8s ease' }} />
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: T.inkLight, fontFamily: 'system-ui, sans-serif' }}>
          {book.preview_pages} of {book.total_pages} pages
        </p>
      </div>

      {/* Sign-up */}
      <div style={{ ...sideCard, background: T.goldBg, border: `1px solid ${T.goldLight}` }}>
        <p style={{ ...sideLabel, color: T.gold }}>Unlock full access</p>
        <p style={{ fontSize: 13, color: T.inkMid, lineHeight: 1.7, marginBottom: 16 }}>
          Join thousands of readers. Free to start.
        </p>
        <button onClick={onSignUp} style={mkPrimaryBtn(true)}>
          Sign up free <ChevronRight size={14} />
        </button>
      </div>
    </>
  );
}

// ─── Global keyframes ────────────────────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(14px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      button:hover { opacity: 0.86; }
      * { box-sizing: border-box; }
    `}</style>
  );
}