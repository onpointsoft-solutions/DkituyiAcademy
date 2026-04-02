import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, BookOpen, Search, ZoomIn, ZoomOut,
  Highlighter, StickyNote, Camera, X, Bookmark, Menu, Moon, Sun, ArrowLeft
} from 'lucide-react';
import api from '../api/axiosClient';
import { useAuthStore } from '../auth/AuthContext';

// ─── Theme tokens ────────────────────────────────────────────────────────────
const LIGHT = {
  bg:         '#ede4d3',
  page:       '#fdfaf4',
  surface:    '#ffffff',
  text:       '#1a1008',
  body:       '#231508',
  muted:      '#7a6a52',
  faint:      '#b8a890',
  border:     '#d4c4a8',
  accent:     '#22c55e',
  accentMid:  '#16a34a',
  accentSoft: '#86efac',
  accentBg:   '#dcfce7',
  shadow:     'rgba(60,30,0,0.18)',
  pageShadow: 'rgba(80,40,0,0.08)',
  overlay:    'rgba(20,10,4,0.65)',
  headerBg:   'rgba(237,228,211,0.97)',
  navBg:      'rgba(237,228,211,0.97)',
};

const DARK = {
  bg:         '#0c0905',
  page:       '#161008',
  surface:    '#1c1408',
  text:       '#f0e4cc',
  body:       '#e8d8b8',
  muted:      '#8a7a5a',
  faint:      '#5a4a32',
  border:     '#2e2218',
  accent:     '#4ade80',
  accentMid:  '#22c55e',
  accentSoft: '#86efac',
  accentBg:   '#14532d',
  shadow:     'rgba(0,0,0,0.6)',
  pageShadow: 'rgba(0,0,0,0.45)',
  overlay:    'rgba(0,0,0,0.82)',
  headerBg:   'rgba(12,9,5,0.97)',
  navBg:      'rgba(12,9,5,0.97)',
};

// ─── Chapter parser ──────────────────────────────────────────────────────────
function parseChapters(html) {
  if (!html) return [];
  try {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    let els = Array.from(tmp.querySelectorAll('[data-chapter]'));
    if (!els.length) els = Array.from(tmp.querySelectorAll('.chapter'));
    if (els.length) {
      return els.map((el, idx) => {
        const num = parseInt(el.getAttribute('data-chapter') ?? idx + 1, 10) || idx + 1;
        const titleEl = el.querySelector('h1,h2,h3,.chapter-title');
        const title = titleEl?.textContent?.trim() || `Chapter ${num}`;
        const pageEls = Array.from(el.querySelectorAll('[data-page]'));
        const pages = pageEls.map(p => parseInt(p.getAttribute('data-page'), 10)).filter(n => n > 0).sort((a, b) => a - b);
        return { id: idx + 1, number: num, title, startPage: pages[0] ?? null, endPage: pages[pages.length - 1] ?? null, pages };
      });
    }
    return Array.from(tmp.querySelectorAll('h1,h2')).map((h, idx) => ({
      id: idx + 1, number: idx + 1,
      title: h.textContent?.trim() || `Chapter ${idx + 1}`,
      startPage: null, endPage: null, pages: [],
    }));
  } catch { return []; }
}

function chapterForPage(page, chapters) {
  if (!chapters.length || page == null) return null;
  return chapters.find(ch => ch.pages.includes(page))
    ?? chapters.find(ch => ch.startPage != null && page >= ch.startPage && (ch.endPage == null || page <= ch.endPage))
    ?? null;
}

// ─── Swipe gesture hook ──────────────────────────────────────────────────────
function useSwipe(onLeft, onRight, threshold = 52) {
  const sx = useRef(null);
  const sy = useRef(null);
  const onTouchStart = useCallback(e => {
    sx.current = e.touches[0].clientX;
    sy.current = e.touches[0].clientY;
  }, []);
  const onTouchEnd = useCallback(e => {
    if (sx.current == null) return;
    const dx = e.changedTouches[0].clientX - sx.current;
    const dy = Math.abs(e.changedTouches[0].clientY - (sy.current ?? 0));
    sx.current = null;
    sy.current = null;
    if (dy > 70 || Math.abs(dx) < threshold) return;
    dx < 0 ? onLeft() : onRight();
  }, [onLeft, onRight, threshold]);
  return { onTouchStart, onTouchEnd };
}

// ─── Page turn hook ──────────────────────────────────────────────────────────
function usePageTurn() {
  const [state, setState] = useState({ turning: false, dir: 'next' });
  const turn = useCallback((dir, fn) => {
    setState({ turning: true, dir });
    setTimeout(() => { fn(); setState({ turning: false, dir }); }, 340);
  }, []);
  return { ...state, turn };
}

// ─── Icon button helper ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
function IconBtn({ onClick, active, children, title, style = {} }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? 'rgba(34,197,94,0.15)' : 'none',
        border: 'none',
        cursor: 'pointer',
        color: active ? '#22c55e' : 'inherit',
        padding: '7px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.15s, color 0.15s',
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function PDFReader() {
  const { bookId } = useParams();
  const navigate   = useNavigate();
  // eslint-disable-next-line no-unused-vars
  const { user, token, isAuthenticated, checkAuth } = useAuthStore();

  const pageRef    = useRef(null);
  const mainRef    = useRef(null);

  // Core state
  const [book, setBook]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [bookContent, setBookContent] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages]   = useState(0);

  // UI
  const [zoomLevel, setZoomLevel]         = useState(100);
  const [darkMode, setDarkMode]           = useState(false);
  const [showSearch, setShowSearch]       = useState(false);
  const [showSidebar, setShowSidebar]     = useState(false);
  const [searchTerm, setSearchTerm]       = useState('');
  const [isMobile, setIsMobile]           = useState(window.innerWidth < 768);
  const [showTools, setShowTools]         = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Chapters
  const [chapters, setChapters]                 = useState([]);
  const [currentChapter, setCurrentChapter]     = useState(null);
  const [finishedChapters, setFinishedChapters] = useState(new Set());

  // Annotations
  const [highlights, setHighlights]         = useState([]);
  const [notes, setNotes]                   = useState([]);
  const [bookmarks, setBookmarks]           = useState([]);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [selectedText, setSelectedText]     = useState('');
  const [showNoteModal, setShowNoteModal]   = useState(false);
  const [noteText, setNoteText]             = useState('');

  // Session / payment
  const [readingSession, setReadingSession]           = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [totalSpent, setTotalSpent]                   = useState(0);
  const [lastChargedPage, setLastChargedPage]         = useState(null);
  const [walletBalance, setWalletBalance]             = useState(1000);
  const [insufficientFunds, setInsufficientFunds]     = useState(false);
  const [showUnlockPrompt, setShowUnlockPrompt]       = useState(false);
  const [pendingPage, setPendingPage]                 = useState(null);
  const [perPageCost, setPerPageCost]                 = useState(0);

  // Screenshot
  const [screenshotWarnings, setScreenshotWarnings]       = useState(0);
  const [showScreenshotWarning, setShowScreenshotWarning] = useState(false);

  // Page turn
  const { turning, dir: turnDir, turn } = usePageTurn();
  const theme = darkMode ? DARK : LIGHT;

  // Stable refs
  const chaptersRef = useRef([]);
  const totalRef    = useRef(0);
  const currentRef  = useRef(1);
  const sessionRef  = useRef(null);
  const bookRef     = useRef(null);

  useEffect(() => { chaptersRef.current = chapters; },     [chapters]);
  useEffect(() => { totalRef.current    = totalPages; },   [totalPages]);
  useEffect(() => { currentRef.current  = currentPage; },  [currentPage]);
  useEffect(() => { sessionRef.current  = readingSession; });
  useEffect(() => { bookRef.current     = book; },         [book]);

  // ── Auth debug ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) checkAuth();
  }, [isAuthenticated, checkAuth]);

  // ── Mobile detection ─────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Auto-hide header on scroll ───────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastScrollY.current + 10) setHeaderVisible(false);
      if (y < lastScrollY.current - 6 || y < 44) setHeaderVisible(true);
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── API helpers ──────────────────────────────────────────────────────────
  const updateProgress = useCallback(async (page, total) => {
    try { await api.post('/api/reader/pdf/update_progress/', { book_id: bookId, current_page: page, total_pages: total }); } catch {}
  }, [bookId]);

  const loadUnlockedPages = useCallback(async () => {
    try {
      const res = await api.get(`/api/reader/features/unlocked_pages/${bookId}/`);
      if (res.data?.unlocked_pages) {
        const set = new Set(res.data.unlocked_pages);
        const free = Math.max(1, Math.floor((totalRef.current || 1) * 0.2));
        for (let i = 1; i <= free; i++) set.add(i);
        return set;
      }
      return new Set([1]);
    } catch { return new Set([1]); }
  }, [bookId]);

  const chargeForPage = useCallback(async (pageNumber) => {
    const b = bookRef.current;
    if (!b || b.is_free || b.price <= 0 || totalRef.current <= 0) return;
    if (lastChargedPage === pageNumber) return;
    const cost = b.per_page_cost || (b.price / totalRef.current);
    setPerPageCost(cost);
    setPendingPage(pageNumber);
    setShowUnlockPrompt(true);
  }, [lastChargedPage]);

  const cancelPageUnlock = useCallback(() => {
    setShowUnlockPrompt(false);
    setPendingPage(null);
  }, []);

  // ── Page loader ──────────────────────────────────────────────────────────
  const loadPage = useCallback(async (page) => {
    if (page < 1 || (totalRef.current > 0 && page > totalRef.current)) return;
    const isUnlocked = window.unlockedPages?.has(page);
    if (!isUnlocked) { chargeForPage(page); return; }
    try {
      const res = await api.get(`/api/reader/pdf/${bookId}/read_page/?page=${page}`);
      if (!res.data || res.data.error) return;
      const prev = currentRef.current;
      setBookContent(res.data.content ?? '');
      if (!totalRef.current) { totalRef.current = res.data.total_pages; setTotalPages(res.data.total_pages); }
      setCurrentPage(page);
      currentRef.current = page;
      if (page > prev) updateProgress(page, totalRef.current);
      // Scroll to top of reading pane
      mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error(`Failed to load page ${page}:`, err);
      setBookContent('<p style="text-align:center;opacity:0.5;">Failed to load page content.</p>');
    }
  }, [bookId, updateProgress, chargeForPage]);

  const confirmPageUnlock = useCallback(async () => {
    if (!pendingPage || !bookRef.current) return;
    try {
      const b = bookRef.current;
      const cost = b.per_page_cost || (b.price / totalRef.current);
      const res = await api.post('/api/reader/features/charge_for_page/', {
        book_id: bookId, page_number: pendingPage, amount: cost,
        total_book_price: b.price, total_pages: totalRef.current, per_page_cost: cost,
      });
      if (res.data.success) {
        setTotalSpent(s => s + cost);
        setLastChargedPage(pendingPage);
        if (res.data.wallet) setWalletBalance(res.data.wallet.new_balance);
        // Add to unlocked set
        if (window.unlockedPages) window.unlockedPages.add(pendingPage);
        await loadPage(pendingPage);
        setShowUnlockPrompt(false);
        setPendingPage(null);
      } else if (res.data.error === 'Insufficient wallet balance') {
        setInsufficientFunds(true);
        setShowUnlockPrompt(false);
      }
    } catch (err) { console.error('Failed to charge for page:', err); }
  }, [pendingPage, bookId, loadPage]);

  // ── Navigation ───────────────────────────────────────────────────────────
  const goToPage = useCallback((page) => {
    const p = parseInt(page, 10);
    if (isNaN(p) || p < 1 || (totalRef.current > 0 && p > totalRef.current)) return;
    const isUnlocked = window.unlockedPages?.has(p);
    if (!isUnlocked) { chargeForPage(p); return; }
    turn(p > currentRef.current ? 'next' : 'prev', () => loadPage(p));
  }, [loadPage, turn, chargeForPage]);

  const nextPage = useCallback(() => goToPage(currentRef.current + 1), [goToPage]);
  const prevPage = useCallback(() => goToPage(currentRef.current - 1), [goToPage]);
  const zoomIn   = useCallback(() => setZoomLevel(z => Math.min(z + 10, 200)), []);
  const zoomOut  = useCallback(() => setZoomLevel(z => Math.max(z - 10, 70)), []);

  const swipe = useSwipe(nextPage, prevPage);

  // ── Chapters ─────────────────────────────────────────────────────────────
  const goToChapter = useCallback((idx) => {
    const chs = chaptersRef.current;
    if (idx < 0 || idx >= chs.length) return;
    const ch = chs[idx];
    setCurrentChapter(ch);
    const target = ch.startPage ?? ch.pages?.[0];
    if (target != null) goToPage(target);
  }, [goToPage]);

  const markChapterFinished = useCallback(async (num) => {
    try {
      await api.post('/api/reader/features/mark_chapter_finished/', {
        book_id: bookId, chapter_number: num,
        current_page: currentRef.current, total_pages: totalRef.current,
      });
      setFinishedChapters(prev => new Set([...prev, num]));
    } catch {}
  }, [bookId]);

  const currentIdx = useMemo(() => chapters.findIndex(ch => ch.id === currentChapter?.id), [chapters, currentChapter]);
  const hasPrevCh  = currentIdx > 0;
  const hasNextCh  = currentIdx >= 0 && currentIdx < chapters.length - 1;

  const goToNextChapter = useCallback(() => {
    if (!hasNextCh || !currentChapter) return;
    markChapterFinished(currentChapter.number);
    goToChapter(currentIdx + 1);
  }, [hasNextCh, currentChapter, currentIdx, markChapterFinished, goToChapter]);

  // ── Annotations ──────────────────────────────────────────────────────────
  const loadAnnotations = useCallback(async (page) => {
    try {
      const [hl, nt, bm] = await Promise.all([
        api.get('/api/reader/features/get_highlights/', { params: { book_id: bookId, page } }),
        api.get('/api/reader/features/get_notes/',      { params: { book_id: bookId, page } }),
        api.get('/api/reader/features/get_bookmarks/',  { params: { book_id: bookId } }),
      ]);
      setHighlights(hl.data.highlights ?? []);
      setNotes(nt.data.notes ?? []);
      setBookmarks(bm.data.bookmarks ?? []);
    } catch {}
  }, [bookId]);

  const handleTextSelection = useCallback(() => {
    const txt = window.getSelection()?.toString().trim();
    if (txt) { setSelectedText(txt); setShowTools(true); }
  }, []);

  const addHighlight = useCallback(async () => {
    if (!selectedText) return;
    try {
      const res = await api.post('/api/reader/features/add_highlight/', {
        book_id: bookId, page_number: currentRef.current,
        content: selectedText, color: theme.accentBg,
        start_position: 0, end_position: selectedText.length,
      });
      setHighlights(prev => [...prev, res.data.highlight]);
      setIsHighlighting(false); setSelectedText('');
      window.getSelection()?.removeAllRanges();
    } catch {}
  }, [selectedText, bookId, theme.accentBg]);

  const addNote = useCallback(async () => {
    if (!noteText.trim()) return;
    try {
      const selection = window.getSelection();
      let positionX = 0, positionY = 0;
      if (selection?.rangeCount) {
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        const pageRect = pageRef.current?.getBoundingClientRect();
        if (pageRect) { positionX = rect.left - pageRect.left; positionY = rect.top - pageRect.top; }
      }
      const res = await api.post('/api/reader/features/add_note/', {
        book_id: bookId, page_number: currentRef.current,
        content: noteText, position: Math.round(positionX), position_y: Math.round(positionY),
        selected_text: selectedText,
      });
      setNotes(prev => [...prev, res.data.note]);
      setShowNoteModal(false); setNoteText(''); setSelectedText('');
      window.getSelection()?.removeAllRanges();
    } catch (err) { console.error('Error adding note:', err); }
  }, [noteText, bookId, selectedText]);

  const addBookmark = useCallback(async () => {
    try {
      const res = await api.post('/api/reader/features/add_bookmark/', {
        book_id: bookId, page_number: currentRef.current, title: `Page ${currentRef.current}`,
      });
      setBookmarks(prev => [...prev, res.data.bookmark]);
    } catch {}
  }, [bookId]);

  // ── Screenshot ───────────────────────────────────────────────────────────
  const handleScreenshotAttempt = useCallback(() => {
    setScreenshotWarnings(w => {
      api.post('/api/reader/features/report_screenshot_attempt/', { book_id: bookId, page_number: currentRef.current, warning_count: w + 1 }).catch(() => {});
      return w + 1;
    });
    setShowScreenshotWarning(true);
    setTimeout(() => setShowScreenshotWarning(false), 3500);
  }, [bookId]);

  // ── Session ───────────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    try {
      const res = await api.post('/api/reader/features/start_reading_session/', { book_id: bookId, start_page: 1 });
      setReadingSession(res.data.session_id);
      sessionRef.current = res.data.session_id;
    } catch {}
  }, [bookId]);

  const endSession = useCallback(async () => {
    const sid = sessionRef.current;
    if (!sid) return;
    try { await api.post('/api/reader/features/end_reading_session/', { session_id: sid }); } catch {}
  }, []);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const res = await api.get(`/api/reader/pdf/${bookId}/read_pdf/`, { timeout: 60000 });
        if (!mounted) return;
        if (!res.data || res.data.error) { setError('Failed to load book'); setLoading(false); return; }
        const data = res.data;
        const total   = data.total_pages ?? 0;
        const startPg = data.current_page ?? 1;
        const content = data.content ?? '';

        setBook(data); bookRef.current = data;
        setTotalPages(total); totalRef.current = total;
        setCurrentPage(startPg); currentRef.current = startPg;
        setBookContent(content);

        if (content) {
          const parsed = parseChapters(content);
          setChapters(parsed); chaptersRef.current = parsed;
          setCurrentChapter(chapterForPage(startPg, parsed) ?? parsed[0] ?? null);
        }
        loadUnlockedPages().then(pages => { window.unlockedPages = pages; });
        setLoading(false);
        loadAnnotations(startPg);
      } catch (err) {
        if (!mounted) return;
        setError(err.code === 'ECONNABORTED' ? 'Book loading timed out.' : 'Failed to load book.');
        setLoading(false);
      }
    }
    init(); startSession();
    return () => { mounted = false; endSession(); };
  }, [bookId, startSession, endSession, loadAnnotations, loadUnlockedPages]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = e => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowRight') nextPage();
      if (e.key === 'ArrowLeft')  prevPage();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [nextPage, prevPage, zoomIn, zoomOut]);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p') || (e.metaKey && e.key === 'p')) {
        e.preventDefault(); handleScreenshotAttempt();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleScreenshotAttempt]);

  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100dvh', background: LIGHT.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
      <style>{`
        @keyframes bookSpine { 0%,100%{transform:rotateY(0)} 50%{transform:rotateY(-30deg)} }
        @keyframes pageRuffle { 0%,100%{transform:skewY(0) scaleX(1)} 50%{transform:skewY(-4deg) scaleX(0.9)} }
      `}</style>
      <div style={{ position: 'relative', width: 70, height: 84, perspective: 260 }}>
        <div style={{ position: 'absolute', inset: 0, background: '#8b4513', borderRadius: '3px 7px 7px 3px', animation: 'bookSpine 1.7s ease-in-out infinite', transformOrigin: 'left center', boxShadow: '4px 6px 16px rgba(60,20,0,0.35)' }}/>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ position: 'absolute', left: 6, top: 4+i, bottom: 4+i, right: 4, background: `hsl(42,${45+i*10}%,${90-i*4}%)`, borderRadius: '0 4px 4px 0', animation: `pageRuffle 1.7s ease-in-out ${i*0.09}s infinite`, transformOrigin: 'left center' }}/>
        ))}
      </div>
      <p style={{ color: LIGHT.muted, fontFamily: 'Georgia, serif', fontSize: 15, letterSpacing: '0.06em', margin: 0 }}>Opening your book…</p>
    </div>
  );

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ minHeight: '100dvh', background: LIGHT.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16, textAlign: 'center' }}>
      <BookOpen size={48} style={{ color: LIGHT.muted, opacity: 0.32 }}/>
      <h2 style={{ fontFamily: 'Georgia, serif', color: LIGHT.text, margin: 0, fontSize: 22 }}>Couldn't open book</h2>
      <p style={{ color: LIGHT.muted, margin: 0, maxWidth: 320, lineHeight: 1.65 }}>{error}</p>
      <button onClick={() => navigate('/library')} style={{ background: LIGHT.accent, color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: 15 }}>
        Back to Library
      </button>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      data-theme={darkMode ? 'dark' : 'light'}
      style={{ minHeight: '100dvh', background: theme.bg, color: theme.text, fontFamily: 'Georgia,"Times New Roman",serif', transition: 'background 0.4s,color 0.4s', overflowX: 'hidden' }}
    >

      {/* ── GLOBAL CSS ── */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

        @keyframes turnNext {
          0%  { transform: perspective(1200px) rotateY(0deg); opacity: 1; }
          45% { transform: perspective(1200px) rotateY(-16deg) translateX(-1.5%); opacity: 0.78; }
          100%{ transform: perspective(1200px) rotateY(0deg); opacity: 1; }
        }
        @keyframes turnPrev {
          0%  { transform: perspective(1200px) rotateY(0deg); opacity: 1; }
          45% { transform: perspective(1200px) rotateY(16deg) translateX(1.5%); opacity: 0.78; }
          100%{ transform: perspective(1200px) rotateY(0deg); opacity: 1; }
        }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tocSlide    { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes toolPop     { from { opacity: 0; transform: scale(0.86) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes toastDown   { from { opacity: 0; transform: translateX(-50%) translateY(-12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes noteAppear  { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }

        .pt-next { animation: turnNext 0.34s cubic-bezier(0.4,0,0.2,1) forwards; }
        .pt-prev { animation: turnPrev 0.34s cubic-bezier(0.4,0,0.2,1) forwards; }
        .anim-appear { animation: fadeSlideUp 0.28s ease both; }
        .toc-slide  { animation: tocSlide 0.26s cubic-bezier(0.4,0,0.2,1) both; }
        .tool-pop   { animation: toolPop  0.2s  cubic-bezier(0.34,1.56,0.64,1) both; }

        /* ── Book Typography ── */
        .book-body { font-family: Georgia,"Times New Roman",serif; }
        .book-body h1, .book-body h2, .book-body h3, .book-body h4 {
          font-family: Georgia, serif; line-height: 1.22; margin: 1.8em 0 0.6em;
          font-weight: 700; letter-spacing: -0.01em;
        }
        .book-body h1 { font-size: clamp(1.3em, 4vw, 1.8em); }
        .book-body h2 { font-size: clamp(1.1em, 3vw, 1.4em); }
        .book-body h3 { font-size: 1.08em; }
        .book-body h4 { font-size: 1em; font-style: italic; font-weight: 500; }
        .book-body p  { margin: 0 0 1.3em; text-align: justify; hyphens: auto; -webkit-hyphens: auto; line-height: 1.88; }
        .book-body ul, .book-body ol { margin: 0 0 1.4em; padding-left: 1.6em; }
        .book-body li { margin-bottom: 0.45em; line-height: 1.72; }
        .book-body blockquote {
          border-left: 3px solid var(--ba, #22c55e); margin: 1.8em 0;
          padding: 0.7em 1.4em; font-style: italic; opacity: 0.9;
          border-radius: 0 6px 6px 0; background: var(--bq, #dcfce7);
        }
        .book-body a   { color: var(--ba, #22c55e); }
        .book-body img { max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 1.5em auto; }
        .book-body hr  { border: none; border-top: 1px solid var(--bb, #d4c4a8); margin: 2.2em auto; width: 44%; opacity: 0.5; }
        .book-body table { width: 100%; border-collapse: collapse; margin-bottom: 1.4em; font-size: 0.93em; }
        .book-body th   { border-bottom: 2px solid var(--bb, #d4c4a8); padding: 9px 10px; text-align: left; font-weight: 600; }
        .book-body td   { border-bottom: 1px solid var(--bb, #d4c4a8); padding: 8px 10px; }

        /* Drop cap — only on chapter pages */
        .book-body .pdf-page.page-type-chapter .pdf-paragraph:first-of-type::first-letter,
        .book-body .page-content > p:first-of-type::first-letter {
          font-size: 3.4em; font-weight: 700; float: left;
          line-height: 0.74; margin: 0.1em 0.09em 0 0;
          font-family: Georgia, serif; color: var(--ba, #22c55e);
        }

        /* PDF page blocks */
        .book-body .pdf-page {
          margin-bottom: 3em; padding: 2em;
          border: 1px solid var(--bb, #d4c4a8); border-radius: 8px;
          background: linear-gradient(to bottom, #fff, #fafafa);
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          position: relative;
        }
        @media (max-width: 600px) {
          .book-body .pdf-page { padding: 1.2em 1em; margin-bottom: 1.8em; }
        }
        .book-body .pdf-page:last-child { margin-bottom: 0; }
        .book-body .pdf-page-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 1.4em; padding-bottom: 0.7em;
          border-bottom: 1px solid var(--bb, #d4c4a8);
          font-size: 0.73em; color: var(--bm, #7a6a52); font-family: system-ui, sans-serif;
        }
        .book-body .page-number  { font-weight: 600; opacity: 0.65; }
        .book-body .page-title   { font-weight: 700; color: var(--ba, #22c55e); max-width: 50%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .book-body .page-type-badge {
          background: var(--accentBg, #dcfce7); color: var(--accent, #22c55e);
          padding: 2px 7px; border-radius: 12px; font-size: 0.68em;
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .book-body .pdf-page-content {
          font-family: Georgia, "Times New Roman", serif; line-height: 1.82;
          color: var(--body, #231508); text-align: justify; hyphens: auto; -webkit-hyphens: auto;
        }
        .book-body .pdf-heading {
          font-family: Georgia, serif; font-weight: 700; font-size: 1.08em;
          color: var(--ba, #22c55e); margin: 1.3em 0 0.7em; line-height: 1.3;
          border-left: 3px solid var(--accent, #22c55e); padding-left: 0.55em;
        }
        .book-body .pdf-paragraph {
          margin: 0 0 1.15em; line-height: 1.82; text-align: justify;
          word-wrap: break-word; overflow-wrap: break-word; orphans: 3; widows: 3;
        }
        .book-body .page-type-preliminary { background: linear-gradient(to bottom,#f8fdf8,#f0f9f0); border-color: #a7f3d0; }
        .book-body .page-type-chapter     { background: linear-gradient(to bottom,#f0fdf4,#dcfce7); border-color: #86efac; }
        .book-body .page-type-empty       { background: linear-gradient(to bottom,#f9fafb,#f3f4f6); border-color: #e5e7eb; opacity: 0.6; text-align: center; font-style: italic; }
        .book-body .page-type-error       { background: linear-gradient(to bottom,#fef2f2,#fee2e2); border-color: #fca5a5; }

        [data-theme="dark"] .book-body .pdf-page {
          background: linear-gradient(to bottom,#1c1408,#161008);
          border-color: #2e2218; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }
        [data-theme="dark"] .book-body .pdf-page-content { color: #e8d8b8; }
        [data-theme="dark"] .book-body .pdf-heading { color: #4ade80; }
        [data-theme="dark"] .book-body .pdf-paragraph:first-of-type::first-letter { color: #4ade80; }

        .book-body ::selection       { background: rgba(34,197,94,0.22); color: inherit; }
        .book-body ::-moz-selection  { background: rgba(34,197,94,0.22); color: inherit; }

        /* Scrollbars */
        ::-webkit-scrollbar       { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(34,197,94,0.22); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(34,197,94,0.42); }
        ::-webkit-scrollbar-track { background: transparent; }

        /* Safe-area bottom padding for nav */
        .reader-nav { padding-bottom: max(12px, env(safe-area-inset-bottom)); }

        /* Input spinners */
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { opacity: 1; }

        /* Hover states */
        .toc-btn:hover { opacity: 1 !important; }
        .icon-btn:hover { background: rgba(120,100,70,0.1) !important; }
        [data-theme="dark"] .icon-btn:hover { background: rgba(255,255,255,0.08) !important; }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: theme.headerBg, backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        borderBottom: `1px solid ${theme.border}`,
        transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 12px', height: 52, display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* Back */}
          <button
            onClick={() => navigate('/library')}
            className="icon-btn"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.muted, padding: '7px 8px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, transition: 'background 0.15s' }}
          >
            <ArrowLeft size={17}/>
            {!isMobile && <span style={{ fontSize: 13, fontFamily: 'system-ui', fontWeight: 500 }}>Library</span>}
          </button>

          {/* Title area */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.25 }}>
              {book?.title}
            </div>
            <div style={{ fontSize: 11, color: theme.muted, fontFamily: 'system-ui', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', overflow: 'hidden', lineHeight: 1.2 }}>
              {book?.author && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 80 : 160 }}>{book.author}</span>}
              {currentChapter && (
                <>
                  <span style={{ opacity: 0.35, flexShrink: 0 }}>·</span>
                  <span style={{ color: theme.accentMid, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentChapter.title}</span>
                </>
              )}
            </div>
          </div>

          {/* Wallet badge */}
          {book && !book.is_free && book.price > 0 && (
            <span style={{ background: theme.accentBg, color: theme.accentMid, padding: '3px 9px', borderRadius: 20, fontSize: 12, fontFamily: 'system-ui', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
              ${walletBalance.toFixed(2)}
            </span>
          )}

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
            {!isMobile && (
              <>
                <button onClick={zoomOut} className="icon-btn" title="Zoom out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.muted, padding: 7, borderRadius: 7, display: 'flex', transition: 'background 0.15s' }}><ZoomOut size={15}/></button>
                <span style={{ fontSize: 11, color: theme.muted, fontFamily: 'monospace', minWidth: 32, textAlign: 'center' }}>{zoomLevel}%</span>
                <button onClick={zoomIn}  className="icon-btn" title="Zoom in"  style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.muted, padding: 7, borderRadius: 7, display: 'flex', transition: 'background 0.15s' }}><ZoomIn size={15}/></button>
              </>
            )}
            <button onClick={() => setShowSearch(s => !s)} className="icon-btn" title="Search" style={{ background: showSearch ? theme.accentBg : 'none', border: 'none', cursor: 'pointer', color: showSearch ? theme.accent : theme.muted, padding: 7, borderRadius: 8, display: 'flex', transition: 'background 0.15s' }}><Search size={16}/></button>
            <button onClick={() => setDarkMode(d => !d)} className="icon-btn" title={darkMode ? 'Light mode' : 'Dark mode'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.muted, padding: 7, borderRadius: 8, display: 'flex', transition: 'background 0.15s' }}>
              {darkMode ? <Sun size={16}/> : <Moon size={16}/>}
            </button>
            {chapters.length > 0 && (
              <button onClick={() => setShowSidebar(s => !s)} className="icon-btn" title="Table of contents" style={{ background: showSidebar ? theme.accentBg : 'none', border: 'none', cursor: 'pointer', color: showSidebar ? theme.accent : theme.muted, padding: 7, borderRadius: 8, display: 'flex', transition: 'background 0.15s' }}>
                <Menu size={16}/>
              </button>
            )}
          </div>
        </div>

        {/* Reading progress bar */}
        <div style={{ height: 2, background: theme.border }}>
          <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg,${theme.accent},${theme.accentSoft})`, transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)', borderRadius: '0 2px 2px 0' }}/>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div style={{ borderTop: `1px solid ${theme.border}`, padding: '10px 12px', background: theme.surface, animation: 'fadeSlideUp 0.18s ease' }}>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!searchTerm.trim()) return;
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                const lower = searchTerm.toLowerCase();
                let node;
                while ((node = walker.nextNode())) {
                  if (node.textContent.toLowerCase().includes(lower)) {
                    node.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' }); break;
                  }
                }
              }}
              style={{ display: 'flex', gap: 8, maxWidth: 520, margin: '0 auto' }}
            >
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: theme.muted, pointerEvents: 'none' }}/>
                <input
                  type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search in this book…" autoFocus
                  style={{ width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 8, paddingBottom: 8, border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.bg, color: theme.text, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
                />
              </div>
              <button type="submit" style={{ background: theme.accent, color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>Find</button>
              <button type="button" onClick={() => { setShowSearch(false); setSearchTerm(''); }} style={{ background: 'none', border: `1px solid ${theme.border}`, padding: '8px 9px', borderRadius: 8, cursor: 'pointer', color: theme.muted, display: 'flex', alignItems: 'center' }}>
                <X size={14}/>
              </button>
            </form>
          </div>
        )}
      </header>

      {/* ── BODY ── */}
      <div style={{ paddingTop: 56, paddingBottom: isMobile ? 80 : 88, display: 'flex', maxWidth: 820, margin: '0 auto' }}>

        {/* TOC Sidebar */}
        {showSidebar && chapters.length > 0 && (
          <>
            {/* Backdrop on mobile */}
            <div
              onClick={() => setShowSidebar(false)}
              style={{ position: 'fixed', inset: 0, background: theme.overlay, zIndex: 44, display: isMobile ? 'block' : 'none', animation: 'fadeSlideUp 0.18s ease' }}
            />
            <aside className={isMobile ? 'toc-slide' : ''} style={{
              position: isMobile ? 'fixed' : 'sticky',
              top: isMobile ? 0 : 56,
              left: 0,
              width: isMobile ? 290 : 230,
              height: isMobile ? '100dvh' : 'calc(100dvh - 56px)',
              overflowY: 'auto', overflowX: 'hidden',
              background: theme.surface,
              borderRight: `1px solid ${theme.border}`,
              zIndex: isMobile ? 46 : 10,
              flexShrink: 0,
              paddingTop: isMobile ? 56 : 8,
              WebkitOverflowScrolling: 'touch',
            }}>
              {/* Mobile header */}
              {isMobile && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: 290, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: `1px solid ${theme.border}`, background: theme.surface, zIndex: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>Contents</span>
                  <button onClick={() => setShowSidebar(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.muted, padding: 4, display: 'flex' }}><X size={18}/></button>
                </div>
              )}
              {!isMobile && (
                <p style={{ margin: '6px 16px 8px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.13em', color: theme.muted, fontFamily: 'system-ui', fontWeight: 700 }}>Contents</p>
              )}
              {chapters.map((ch, idx) => {
                const isActive = currentChapter?.id === ch.id;
                const isDone   = finishedChapters.has(ch.number);
                const label    = ch.startPage != null
                  ? (ch.startPage === ch.endPage ? `p. ${ch.startPage}` : `pp. ${ch.startPage}–${ch.endPage}`)
                  : '';
                return (
                  <button
                    key={ch.id}
                    className="toc-btn"
                    onClick={() => { goToChapter(idx); if (isMobile) setShowSidebar(false); }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      width: '100%', textAlign: 'left',
                      padding: '11px 16px', border: 'none', cursor: 'pointer',
                      fontFamily: 'Georgia, serif', fontSize: 13,
                      background: isActive ? theme.accentBg : 'transparent',
                      color: isActive ? theme.accent : theme.text,
                      borderLeft: `3px solid ${isActive ? theme.accent : 'transparent'}`,
                      transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                      opacity: 0.88,
                    }}
                  >
                    <span style={{
                      flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                      background: isDone ? '#d1fae5' : isActive ? theme.accent : theme.border,
                      color: isDone ? '#065f46' : isActive ? '#fff' : theme.muted,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontFamily: 'system-ui', fontWeight: 700, marginTop: 1,
                    }}>
                      {isDone ? '✓' : ch.number}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.title}</span>
                      {label && <span style={{ display: 'block', fontSize: 11, color: theme.muted, fontFamily: 'system-ui', marginTop: 2 }}>{label}</span>}
                    </span>
                  </button>
                );
              })}
            </aside>
          </>
        )}

        {/* ── Reading pane ── */}
        <main ref={mainRef} style={{ flex: 1, minWidth: 0 }} {...swipe}>
          <div style={{ position: 'relative' }}>

            {/* Mobile edge tap zones */}
            {isMobile && <>
              <div onClick={prevPage} style={{ position: 'fixed', left: 0, top: '15%', bottom: '15%', width: '16%', zIndex: 5, cursor: 'pointer' }} aria-label="Previous page"/>
              <div onClick={nextPage} style={{ position: 'fixed', right: 0, top: '15%', bottom: '15%', width: '16%', zIndex: 5, cursor: 'pointer' }} aria-label="Next page"/>
            </>}

            {/* Spine shadow */}
            <div style={{ position: 'absolute', top: 16, left: isMobile ? 4 : 20, bottom: 0, width: 12, background: `linear-gradient(to right, ${theme.shadow}, transparent)`, borderRadius: '4px 0 0 0', zIndex: 0, pointerEvents: 'none' }}/>

            {/* Paper page */}
            <div
              ref={pageRef}
              className={turning ? (turnDir === 'next' ? 'pt-next' : 'pt-prev') : 'anim-appear'}
              onMouseUp={handleTextSelection}
              onTouchEnd={e => { handleTextSelection(e); }}
              style={{
                '--ba': theme.accent,
                '--bm': theme.muted,
                '--bb': theme.border,
                '--bq': theme.accentBg,
                '--body': theme.body,
                '--accent': theme.accent,
                '--accentBg': theme.accentBg,
                '--surface': theme.surface,
                '--page': theme.page,
                '--border': theme.border,
                position: 'relative', zIndex: 1,
                background: theme.page,
                margin: isMobile ? '12px 8px 10px 13px' : '20px 20px 18px 28px',
                borderRadius: isMobile ? '5px 10px 10px 5px' : '4px 12px 12px 4px',
                padding: isMobile ? '28px 18px 44px 20px' : '52px 64px 60px 68px',
                minHeight: isMobile ? 'calc(100dvh - 154px)' : '70vh',
                boxShadow: [
                  `inset -1px 0 4px ${theme.pageShadow}`,
                  `2px 3px 12px ${theme.shadow}`,
                  `6px 8px 32px ${theme.pageShadow}`,
                  `10px 16px 48px ${theme.shadow}`,
                ].join(', '),
                fontSize: `${zoomLevel}%`,
                lineHeight: 1.9,
                color: theme.body,
                userSelect: isHighlighting ? 'text' : 'auto',
                transformOrigin: 'left center',
                willChange: 'transform',
                backgroundImage: darkMode
                  ? 'radial-gradient(ellipse at 10% 10%, rgba(255,200,100,0.025) 0%, transparent 60%)'
                  : 'radial-gradient(ellipse at 8% 8%, rgba(255,248,225,0.7) 0%, transparent 52%), radial-gradient(ellipse at 94% 92%, rgba(235,218,188,0.28) 0%, transparent 50%)',
              }}
            >
              {/* Running head */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isMobile ? 18 : 24, paddingBottom: 10, borderBottom: `1px solid ${theme.border}`, fontSize: isMobile ? 9 : 10, color: theme.faint, fontFamily: 'system-ui', letterSpacing: '0.11em', textTransform: 'uppercase', userSelect: 'none', gap: 8 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '46%' }}>{book?.author}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '46%', textAlign: 'right' }}>{book?.title}</span>
              </div>

              {/* Content */}
              <div className="book-body" style={{ position: 'relative' }}>
                {bookContent ? (
                  <>
                    <div dangerouslySetInnerHTML={{ __html: bookContent }}/>

                    {/* Note overlays */}
                    {notes.filter(n => n.page_number === currentPage).map(note => (
                      <div
                        key={note.id}
                        style={{
                          position: 'absolute',
                          left: `clamp(8px, ${Math.max(8, (note.position || 0) - 50)}px, calc(100% - 200px))`,
                          top: `${Math.max(60, (note.position_y || 0) - 30)}px`,
                          background: theme.accentBg,
                          border: `1.5px solid ${theme.accent}`,
                          borderRadius: 8,
                          padding: '7px 11px',
                          maxWidth: isMobile ? 180 : 220,
                          fontSize: 12,
                          color: theme.text,
                          cursor: 'pointer',
                          zIndex: 10,
                          boxShadow: `0 2px 10px ${theme.shadow}`,
                          animation: 'noteAppear 0.28s ease-out',
                          transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        title={`${note.selected_text ? `"${note.selected_text}"\n\n` : ''}${note.content}`}
                        onClick={() => alert(`Note${note.selected_text ? ` on "${note.selected_text}"` : ''}:\n\n${note.content}`)}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <StickyNote size={13} style={{ color: theme.accent, flexShrink: 0, marginTop: 1 }}/>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {note.selected_text && (
                              <div style={{ fontSize: 10, color: theme.muted, fontStyle: 'italic', marginBottom: 2, lineHeight: 1.3 }}>
                                "{note.selected_text.length > 24 ? note.selected_text.slice(0, 24) + '…' : note.selected_text}"
                              </div>
                            )}
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                              {note.content.length > 26 ? note.content.slice(0, 26) + '…' : note.content}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '80px 0', color: theme.muted }}>
                    <BookOpen size={36} style={{ marginBottom: 12, opacity: 0.22 }}/>
                    <p style={{ margin: 0, fontSize: 15 }}>Loading content…</p>
                  </div>
                )}
              </div>

              {/* Page number (folio) */}
              <div style={{ marginTop: isMobile ? 36 : 48, paddingTop: 12, borderTop: `1px solid ${theme.border}`, textAlign: 'center', fontSize: 13, color: theme.faint, fontFamily: 'Georgia, serif', fontStyle: 'italic', userSelect: 'none' }}>
                {currentPage}
              </div>

              {/* Right-edge gloss */}
              <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 3, background: `linear-gradient(to left, ${theme.border}, transparent)`, borderRadius: '0 12px 12px 0', pointerEvents: 'none' }}/>
            </div>

            {/* Chapter navigation */}
            {chapters.length > 0 && (
              <div style={{ padding: isMobile ? '10px 12px 4px' : '12px 18px 4px', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <button
                  onClick={() => hasPrevCh && goToChapter(currentIdx - 1)}
                  disabled={!hasPrevCh}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: isMobile ? '8px 12px' : '9px 16px', border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.surface, color: hasPrevCh ? theme.text : theme.muted, cursor: hasPrevCh ? 'pointer' : 'default', fontSize: isMobile ? 12 : 13, fontFamily: 'Georgia, serif', opacity: hasPrevCh ? 1 : 0.3, transition: 'opacity 0.2s' }}
                >
                  <ChevronLeft size={14}/>{isMobile ? 'Prev' : 'Previous chapter'}
                </button>
                <button
                  onClick={goToNextChapter}
                  disabled={!hasNextCh}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: isMobile ? '8px 12px' : '9px 16px', border: 'none', borderRadius: 8, background: hasNextCh ? theme.accent : theme.border, color: hasNextCh ? '#fff' : theme.muted, cursor: hasNextCh ? 'pointer' : 'default', fontSize: isMobile ? 12 : 13, fontFamily: 'Georgia, serif', opacity: hasNextCh ? 1 : 0.3, transition: 'opacity 0.2s, background 0.2s' }}
                >
                  {isMobile ? 'Next ch.' : (finishedChapters.has(currentChapter?.number) ? 'Next chapter' : 'Finish & continue')}<ChevronRight size={14}/>
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── BOTTOM NAV ── */}
      <nav className="reader-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: theme.navBg, backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        borderTop: `1px solid ${theme.border}`,
        padding: isMobile ? '8px 8px 10px' : '10px 12px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: isMobile ? 6 : 12,
      }}>
        {/* Left side - Previous page */}
        <button
          onClick={prevPage} disabled={currentPage <= 1}
          style={{ 
            display: 'flex', alignItems: 'center', gap: isMobile ? 2 : 4, 
            padding: isMobile ? '6px 8px' : '8px 12px', 
            border: `1px solid ${theme.border}`, borderRadius: 6, 
            background: theme.surface, color: theme.text, 
            cursor: currentPage <= 1 ? 'default' : 'pointer', 
            fontSize: isMobile ? 12 : 14, fontFamily: 'Georgia, serif', 
            opacity: currentPage <= 1 ? 0.26 : 1, transition: 'opacity 0.2s', 
            flexShrink: 0, minWidth: isMobile ? 'auto' : 80
          }}
        >
          <ChevronLeft size={isMobile ? 14 : 16}/>
          {!isMobile && 'Prev'}
        </button>

        {/* Center - Page controls */}
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: isMobile ? 3 : 8, 
          flex: 1, justifyContent: 'center', 
          overflow: 'hidden'  // Prevent overflow
        }}>
          {/* Mobile zoom controls */}
          {isMobile && (
            <>
              <button onClick={zoomOut} style={{ 
                background: 'none', border: `1px solid ${theme.border}`, 
                cursor: 'pointer', color: theme.muted, 
                padding: '3px 5px', borderRadius: 3, 
                display: 'flex', flexShrink: 0,
                minWidth: 28  // Ensure minimum touch target
              }}><ZoomOut size={11}/></button>
              <span style={{ 
                fontSize: 8, color: theme.muted, fontFamily: 'monospace', 
                minWidth: 20, textAlign: 'center', flexShrink: 0 
              }}>{zoomLevel}%</span>
              <button onClick={zoomIn} style={{ 
                background: 'none', border: `1px solid ${theme.border}`, 
                cursor: 'pointer', color: theme.muted, 
                padding: '3px 5px', borderRadius: 3, 
                display: 'flex', flexShrink: 0,
                minWidth: 28  // Ensure minimum touch target
              }}><ZoomIn size={11}/></button>
            </>
          )}

          {/* Page input */}
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: isMobile ? 2 : 6, 
            flexShrink: 0 
          }}>
            <input
              type="number" min={1} max={totalPages} value={currentPage}
              onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v >= 1 && v <= totalPages) goToPage(v); }}
              style={{ 
                width: isMobile ? 32 : 46, textAlign: 'center', 
                border: `1px solid ${theme.border}`, borderRadius: 4, 
                padding: isMobile ? '2px 0' : '5px 0', 
                background: theme.bg, color: theme.text, 
                fontSize: isMobile ? 10 : 13, fontFamily: 'Georgia, serif', 
                outline: 'none' 
              }}
            />
            <span style={{ 
              fontSize: isMobile ? 9 : 12, color: theme.muted, 
              fontFamily: 'system-ui', whiteSpace: 'nowrap' 
            }}>/ {totalPages}</span>
          </div>

          {/* Desktop progress pill */}
          {!isMobile && (
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: 6, 
              padding: '4px 10px', border: `1px solid ${theme.border}`, 
              borderRadius: 16, background: theme.surface, 
              fontSize: 10, color: theme.muted, fontFamily: 'system-ui' 
            }}>
              <div style={{ 
                width: 48, height: 2, background: theme.border, 
                borderRadius: 1, overflow: 'hidden' 
              }}>
                <div style={{ 
                  height: '100%', width: `${progress}%`, 
                  background: `linear-gradient(90deg,${theme.accent},${theme.accentSoft})`, 
                  transition: 'width 0.5s ease' 
                }}/>
              </div>
              <span>{Math.round(progress)}%</span>
            </div>
          )}
        </div>

        {/* Right side - Next page */}
        <button
          onClick={nextPage} disabled={currentPage >= totalPages}
          style={{ 
            display: 'flex', alignItems: 'center', gap: isMobile ? 2 : 4, 
            padding: isMobile ? '6px 8px' : '8px 12px', 
            border: `1px solid ${theme.border}`, borderRadius: 6, 
            background: theme.surface, color: theme.text, 
            cursor: currentPage >= totalPages ? 'default' : 'pointer', 
            fontSize: isMobile ? 12 : 14, fontFamily: 'Georgia, serif', 
            opacity: currentPage >= totalPages ? 0.26 : 1, transition: 'opacity 0.2s', 
            flexShrink: 0, minWidth: isMobile ? 'auto' : 80
          }}
        >
          {!isMobile && 'Next'}<ChevronRight size={isMobile ? 14 : 16}/>
        </button>
      </nav>

      {/* ── ANNOTATION FAB ── */}
      <div style={{ position: 'fixed', right: isMobile ? 12 : 16, bottom: isMobile ? 90 : 100, zIndex: 42, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
        {showTools && (
          <div className="tool-pop" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            {[
              {
                icon: <Highlighter size={14}/>,
                label: isHighlighting ? (selectedText ? 'Apply' : 'Select text…') : 'Highlight',
                action: () => { if (isHighlighting && selectedText) addHighlight(); else setIsHighlighting(h => !h); },
                active: isHighlighting,
              },
              {
                icon: <StickyNote size={14}/>,
                label: 'Add note',
                action: () => { setShowNoteModal(true); setNoteText(''); },
                disabled: !selectedText,
              },
              {
                icon: <Bookmark size={14}/>,
                label: 'Bookmark',
                action: addBookmark,
              },
            ].map(({ icon, label, action, active, disabled }) => (
              <button
                key={label} onClick={action} disabled={disabled}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 22, background: active ? theme.accent : theme.surface, color: active ? '#fff' : theme.body, border: `1px solid ${active ? theme.accent : theme.border}`, cursor: disabled ? 'default' : 'pointer', fontSize: 12, fontFamily: 'system-ui', fontWeight: 600, opacity: disabled ? 0.34 : 1, boxShadow: `0 3px 12px ${theme.shadow}`, whiteSpace: 'nowrap', transition: 'background 0.15s, color 0.15s' }}
              >
                {icon} {label}
              </button>
            ))}
            {/* Stats pill */}
            <div style={{ display: 'flex', gap: 10, padding: '6px 12px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, fontSize: 11, color: theme.muted, fontFamily: 'system-ui', boxShadow: `0 2px 8px ${theme.shadow}` }}>
              <span>✏️ {highlights.length}</span>
              <span>📝 {notes.length}</span>
              <span>🔖 {bookmarks.length}</span>
            </div>
          </div>
        )}
        <button
          onClick={() => setShowTools(t => !t)}
          style={{ width: 50, height: 50, borderRadius: '50%', border: 'none', background: showTools ? theme.text : theme.accent, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 18px ${theme.shadow}`, transition: 'background 0.22s, transform 0.22s', transform: showTools ? 'rotate(45deg)' : 'rotate(0deg)' }}
        >
          {showTools ? <X size={20}/> : <Highlighter size={19}/>}
        </button>
      </div>

      {/* ── NOTE MODAL ── */}
      {showNoteModal && (
        <div style={{ position: 'fixed', inset: 0, background: theme.overlay, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 60, padding: isMobile ? 0 : 16 }}>
          <div style={{ background: theme.surface, borderRadius: isMobile ? '18px 18px 0 0' : 14, padding: isMobile ? '20px 18px' : '24px 26px', width: '100%', maxWidth: isMobile ? '100%' : 460, animation: 'fadeSlideUp 0.24s cubic-bezier(0.4,0,0.2,1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: theme.text }}>Add note</h3>
              <button onClick={() => setShowNoteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.muted, padding: 4, display: 'flex' }}><X size={18}/></button>
            </div>
            {selectedText && (
              <div style={{ background: theme.accentBg, borderLeft: `3px solid ${theme.accent}`, borderRadius: '0 7px 7px 0', padding: '9px 13px', marginBottom: 12, fontSize: 13, color: theme.muted, fontStyle: 'italic', lineHeight: 1.6 }}>
                "{selectedText.length > 120 ? selectedText.slice(0, 120) + '…' : selectedText}"
              </div>
            )}
            <textarea
              value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Write your note here…" rows={isMobile ? 4 : 5} autoFocus
              style={{ width: '100%', padding: '10px 13px', border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.bg, color: theme.text, fontSize: 14, fontFamily: 'Georgia, serif', lineHeight: 1.72, resize: 'vertical', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
              <button onClick={() => setShowNoteModal(false)} style={{ padding: '9px 18px', border: `1px solid ${theme.border}`, borderRadius: 8, background: 'transparent', color: theme.text, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={addNote} style={{ padding: '9px 18px', border: 'none', borderRadius: 8, background: theme.accent, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── INSUFFICIENT FUNDS MODAL ── */}
      {insufficientFunds && (
        <div style={{ position: 'fixed', inset: 0, background: theme.overlay, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 62, padding: isMobile ? 0 : 16 }}>
          <div style={{ background: theme.surface, borderRadius: isMobile ? '18px 18px 0 0' : 14, padding: isMobile ? '20px 18px' : '24px 26px', width: '100%', maxWidth: isMobile ? '100%' : 440, animation: 'fadeSlideUp 0.24s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: theme.text }}>Insufficient Balance</h3>
              <button onClick={() => setInsufficientFunds(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.muted, padding: 4, display: 'flex' }}><X size={18}/></button>
            </div>
            <p style={{ color: theme.muted, lineHeight: 1.65, marginBottom: 14, fontSize: 14, margin: '0 0 14px' }}>You don't have enough funds to continue reading.</p>
            <div style={{ background: theme.accentBg, border: `1px solid ${theme.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontFamily: 'system-ui', fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: theme.muted }}>Wallet balance</span>
                <span style={{ fontWeight: 700, color: '#dc2626' }}>${walletBalance.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: theme.muted }}>Cost per page</span>
                <span style={{ fontWeight: 600, color: theme.text }}>${totalPages > 0 ? (book.price / totalPages).toFixed(4) : '0.00'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setInsufficientFunds(false)} style={{ flex: 1, padding: '10px', border: `1px solid ${theme.border}`, borderRadius: 9, background: 'transparent', color: theme.text, cursor: 'pointer', fontSize: 14 }}>Close</button>
              <button onClick={() => { navigate('/account/wallet'); setInsufficientFunds(false); }} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 9, background: theme.accent, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>Add Funds</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PAGE UNLOCK PROMPT ── */}
      {showUnlockPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: theme.overlay, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 62, padding: isMobile ? 0 : 16 }}>
          <div style={{ background: theme.surface, borderRadius: isMobile ? '18px 18px 0 0' : 14, padding: isMobile ? '20px 18px' : '24px 26px', width: '100%', maxWidth: isMobile ? '100%' : 440, animation: 'fadeSlideUp 0.24s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: isMobile ? 15 : 16, color: theme.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>🔓</span> Unlock Page {pendingPage}
              </h3>
              <button onClick={cancelPageUnlock} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.muted, padding: 4, display: 'flex' }}><X size={isMobile ? 16 : 18}/></button>
            </div>
            <p style={{ color: theme.muted, lineHeight: 1.65, marginBottom: 14, fontSize: 13, margin: '0 0 14px' }}>
              This page requires payment to unlock. Would you like to continue reading?
            </p>
            <div style={{ background: theme.accentBg, border: `1px solid ${theme.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontFamily: 'system-ui', fontSize: 13 }}>
              {[
                { label: 'Current balance', value: `$${walletBalance.toFixed(2)}`, color: theme.text },
                { label: 'Page cost',        value: `$${perPageCost.toFixed(4)}`,   color: theme.accent },
                { label: 'Balance after',    value: `$${(walletBalance - perPageCost).toFixed(2)}`, color: walletBalance >= perPageCost ? theme.text : '#dc2626', border: true },
              ].map(({ label, value, color, border }, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingTop: border ? 8 : 0, marginTop: border ? 6 : 0, borderTop: border ? `1px solid ${theme.border}` : 'none', marginBottom: border ? 0 : 5 }}>
                  <span style={{ color: theme.muted, fontSize: isMobile ? 12 : 13 }}>{label}</span>
                  <span style={{ fontWeight: 700, color, fontSize: isMobile ? 12 : 13 }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={cancelPageUnlock} style={{ flex: 1, padding: '10px', border: `1px solid ${theme.border}`, borderRadius: 9, background: 'transparent', color: theme.text, cursor: 'pointer', fontSize: isMobile ? 13 : 14 }}>Cancel</button>
              <button
                onClick={confirmPageUnlock}
                disabled={walletBalance < perPageCost}
                style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 9, background: walletBalance >= perPageCost ? theme.accent : theme.border, color: walletBalance >= perPageCost ? '#fff' : theme.muted, cursor: walletBalance >= perPageCost ? 'pointer' : 'default', fontSize: isMobile ? 13 : 14, fontWeight: 700, opacity: walletBalance >= perPageCost ? 1 : 0.5 }}
              >
                {walletBalance >= perPageCost ? `Unlock · $${perPageCost.toFixed(4)}` : 'Insufficient Funds'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCREENSHOT TOAST ── */}
      {showScreenshotWarning && (
        <div style={{ position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)', background: '#7f1d1d', color: '#fecaca', padding: '11px 16px', borderRadius: 10, zIndex: 70, maxWidth: 330, width: 'calc(100% - 24px)', display: 'flex', alignItems: 'flex-start', gap: 10, animation: 'toastDown 0.26s ease', boxShadow: '0 8px 28px rgba(0,0,0,0.35)' }}>
          <Camera size={15} style={{ flexShrink: 0, marginTop: 2 }}/>
          <div>
            <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 13 }}>Screenshot detected</p>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.82 }}>
              This content is protected.{screenshotWarnings >= 3 && ' Repeated attempts may restrict access.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}