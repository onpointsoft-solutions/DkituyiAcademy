import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axiosClient";
import { useAuthStore } from "../auth/AuthContext";

// ─── PDF.js ──────────────────────────────────────────────────────────────────
const PDFJS_VERSION = "3.11.174";
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const WORKER_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

// ─── Design Tokens ───────────────────────────────────────────────────────────
const T = {
  // Sidebar / chrome — always dark
  chromeBg:     "#0d0d0d",
  chromeDeep:   "#080808",
  chromeMid:    "#141414",
  chromeBorder: "rgba(255,255,255,0.08)",
  chromeText:   "rgba(255,255,255,0.92)",
  chromeMuted:  "rgba(255,255,255,0.38)",
  chromeDim:    "rgba(255,255,255,0.18)",

  // Accent
  green:        "#22c55e",
  greenDim:     "rgba(34,197,94,0.15)",
  greenBorder:  "rgba(34,197,94,0.3)",
  greenDeep:    "#16a34a",
  greenLight:   "#4ade80",

  // Alerts / states
  rose:         "#f43f5e",
  blue:         "#3b82f6",
  amber:        "#f59e0b",

  // PDF viewer background — changes with theme
  viewerDark:   "#1a1a1a",
  viewerLight:  "#e8e4dc",
};

const HL_COLORS = {
  yellow: "rgba(255,218,60,0.42)",
  green:  "rgba(80,200,110,0.38)",
  blue:   "rgba(80,150,240,0.38)",
  pink:   "rgba(240,80,140,0.36)",
};
const HL_SWATCHES = {
  yellow: "#ffd93c",
  green:  "#50c86e",
  blue:   "#5096f0",
  pink:   "#f0508c",
};

// ─── Icons ───────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
);
const ICONS = {
  menu:      "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
  prev:      "M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z",
  next:      "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
  zoomIn:    "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  zoomOut:   "M19 13H5v-2h14v2z",
  highlight: "M17.75 7L14 3.25l-10 10 1.06 3.69L8.5 20h2l1.5-1.5-1.5-1.5 1-1 1.5 1.5 5.25-5.25L17.75 7z",
  note:      "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z",
  bookmark:  "M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z",
  search:    "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  cursor:    "M13.64 21.97C13.14 22.21 12.54 22 12.31 21.5L10.13 16.76L7.62 19.78C7.45 19.95 7.24 20 7 20C6.45 20 6 19.55 6 19V3C6 2.45 6.45 2 7 2C7.24 2 7.47 2.09 7.64 2.23L7.65 2.22L19.14 11.86C19.57 12.22 19.62 12.85 19.27 13.27C19.12 13.45 18.91 13.57 18.7 13.61L15.31 14.34L17.51 19.07C17.74 19.57 17.56 20.17 17.06 20.4L13.64 21.97Z",
  sun:       "M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z",
  moon:      "M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44.06-.9.1-1.36.1z",
  lock:      "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z",
  unlock:    "M12 1C8.676 1 6 3.676 6 7v1H4v15h16V8h-8V7c0-2.21 1.79-4 4-4s4 1.79 4 4h2c0-3.314-2.686-6-6-6zm0 11c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z",
  x:         "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  refresh:   "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.76L13 11h7V4l-2.35 2.35z",
  check:     "M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z",
};

// ─── Toolbar Button — always dark chrome style ────────────────────────────────
function TbBtn({ active, onClick, title, children, compact = false }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        height: compact ? 28 : 30,
        minWidth: compact ? 28 : 30,
        padding: compact ? "0 6px" : "0 10px",
        background: active
          ? `linear-gradient(135deg, ${T.greenDeep}, ${T.green})`
          : hov ? "rgba(255,255,255,0.07)" : "transparent",
        border: `1px solid ${active ? T.greenBorder : hov ? "rgba(255,255,255,0.12)" : "transparent"}`,
        borderRadius: 6,
        color: active ? "#fff" : hov ? T.chromeText : T.chromeMuted,
        cursor: "pointer",
        display: "flex", alignItems: "center", gap: 5,
        fontSize: 11, fontFamily: "'Georgia', serif",
        letterSpacing: "0.02em",
        transition: "all 0.12s ease",
        outline: "none", flexShrink: 0,
        boxShadow: active ? "0 1px 8px rgba(34,197,94,0.35)" : "none",
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 20, background: T.chromeBorder, margin: "0 3px", flexShrink: 0 }} />;
}

// ─── Swatch ───────────────────────────────────────────────────────────────────
function Swatch({ name, hex, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={() => onClick(name)} title={name}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: 16, height: 16, borderRadius: "50%", background: hex,
        cursor: "pointer",
        border: active ? "2.5px solid #fff" : "2.5px solid transparent",
        boxShadow: active ? `0 0 0 1.5px ${hex}` : hov ? "0 0 0 1px rgba(255,255,255,0.25)" : "none",
        transform: active ? "scale(1.35)" : hov ? "scale(1.18)" : "scale(1)",
        transition: "all 0.13s ease", flexShrink: 0,
      }}
    />
  );
}

// ─── usePdfJs hook ────────────────────────────────────────────────────────────
function usePdfJs() {
  const [ready, setReady] = useState(!!window.pdfjsLib);
  useEffect(() => {
    if (window.pdfjsLib) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = PDFJS_CDN;
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_CDN; setReady(true); };
    document.head.appendChild(s);
  }, []);
  return ready;
}

// ─── PageCanvas ───────────────────────────────────────────────────────────────
function PageCanvas({
  pdf, pageNum, scale, highlights, mode, hlColor,
  onHighlight, onNote, onBookmark, onRemoveHighlight, isMobile, isLocked,
  showUnlockCTA, perPageCost, walletBalance, onUnlockPage, pdfTheme,
  isCompleted, onMarkCompleted, isPageUnlocked,
  chapters, unlockedChapters, onUnlockChapter, currentPage, setCurrentPage,
  setPageInput, setProgress, totalPages, pageRefs, toast
}) {
  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragRect, setDragRect] = useState(null);
  const renderTaskRef = useRef(null);
  const canAfford = walletBalance >= perPageCost;
  const isLight = pdfTheme === "light"; // theme only for the PDF canvas area

  const getChapterForPage = (pn) => {
    if (!chapters?.length) return null;
    return chapters.find(c => c.page_range?.start <= pn && c.page_range?.end >= pn);
  };

  useEffect(() => {
    if (!pdf || !canvasRef.current || isLocked) return;
    let cancelled = false;
    async function render() {
      if (renderTaskRef.current) { try { renderTaskRef.current.cancel(); } catch {} }
      const page = await pdf.getPage(pageNum);
      let sc = scale;
      if (sc === "fit") {
        const vp0 = page.getViewport({ scale: 1 });
        const viewerW = (wrapRef.current?.parentElement?.clientWidth ?? 360) - (isMobile ? 24 : 48);
        sc = Math.min(viewerW / vp0.width, isMobile ? 2.0 : 3.0);
      } else if (isMobile) {
        const vp0 = page.getViewport({ scale: 1 });
        const maxW = window.innerWidth - 24;
        sc = Math.min(sc, (maxW / vp0.width) * 1.5);
      }
      const vp = page.getViewport({ scale: sc });
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = vp.width; canvas.height = vp.height;
      setDims({ w: vp.width, h: vp.height });
      const task = page.render({ canvasContext: canvas.getContext("2d"), viewport: vp });
      renderTaskRef.current = task;
      try { await task.promise; } catch {}
    }
    render();
    return () => { cancelled = true; };
  }, [pdf, pageNum, scale, isLocked, isMobile]);

  const getRelPos = (e, el) => {
    const r = el.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - r.left) / r.width, y: (cy - r.top) / r.height };
  };

  const handleStart = (e) => {
    if (mode === "select" || mode === "bookmark" || isLocked) return;
    if (e.touches && e.touches.length > 1) return;
    e.preventDefault();
    const pos = getRelPos(e, e.currentTarget);
    if (mode === "remove") { onRemoveHighlight(pageNum, { x: pos.x - 0.01, y: pos.y - 0.01, w: 0.02, h: 0.02 }); return; }
    setDragStart(pos); setDragging(true); setDragRect(null);
  };
  const handleMove = (e) => {
    if (!dragging || !dragStart) return;
    const pos = getRelPos(e, e.currentTarget);
    setDragRect({ x: Math.min(dragStart.x, pos.x), y: Math.min(dragStart.y, pos.y), w: Math.abs(pos.x - dragStart.x), h: Math.abs(pos.y - dragStart.y) });
  };
  const handleEnd = (e) => {
    if (!dragging || !dragStart) return;
    setDragging(false);
    const cx = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const cy = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const r = e.currentTarget.getBoundingClientRect();
    const pos = { x: (cx - r.left) / r.width, y: (cy - r.top) / r.height };
    const rect = { x: Math.min(dragStart.x, pos.x), y: Math.min(dragStart.y, pos.y), w: Math.abs(pos.x - dragStart.x), h: Math.abs(pos.y - dragStart.y) };
    setDragRect(null); setDragStart(null);
    if (rect.w < 0.01 || rect.h < 0.005) return;
    if (mode === "highlight") onHighlight(pageNum, rect, hlColor);
    if (mode === "note") onNote(pageNum, rect, cx, cy, hlColor);
    if (mode === "remove") onRemoveHighlight(pageNum, rect);
  };

  const pageHls = highlights.filter(h => h.page === pageNum);

  // ── LOCKED PAGE ───────────────────────────────────────────────────────────
  if (isLocked) {
    const chapter = getChapterForPage(pageNum);
    const isChapterUnlocked = chapter && unlockedChapters.has(chapter.chapter_number);
    const canAffordChapter = walletBalance >= 30;

    return (
      <div ref={wrapRef} style={{
        position: "relative", flexShrink: 0,
        borderRadius: 8, overflow: "hidden",
        width: "100%", maxWidth: isMobile ? "100%" : 680,
        minHeight: isMobile ? 160 : 180,
        background: "linear-gradient(135deg, #111 0%, #0d0d0d 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}>
        {/* Subtle grid texture */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.03,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }} />

        <div style={{
          position: "relative",
          display: "flex", alignItems: "center",
          gap: isMobile ? 12 : 20,
          padding: isMobile ? "18px 16px" : "24px 28px",
          height: "100%", minHeight: "inherit",
        }}>
          {/* Lock icon */}
          <div style={{
            width: isMobile ? 36 : 44, height: isMobile ? 36 : 44, borderRadius: "50%",
            background: T.greenDim, border: `1px solid ${T.greenBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Icon d={ICONS.lock} size={isMobile ? 16 : 20} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, color: T.chromeMuted, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 3 }}>
              Page {pageNum} · Locked
            </div>
            <div style={{ fontSize: isMobile ? 12 : 14, color: "rgba(255,255,255,0.6)", fontFamily: "'Georgia', serif", fontStyle: "italic", marginBottom: 10 }}>
              Unlock to continue reading
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => onUnlockPage(pageNum)} style={{
                padding: isMobile ? "5px 12px" : "6px 14px",
                background: canAfford ? `linear-gradient(135deg, ${T.greenDeep}, ${T.green})` : "rgba(255,255,255,0.05)",
                border: `1px solid ${canAfford ? T.greenBorder : "rgba(255,255,255,0.08)"}`,
                borderRadius: 6, color: canAfford ? "#fff" : T.chromeMuted,
                fontSize: isMobile ? 10 : 11, fontFamily: "'Georgia', serif",
                letterSpacing: "0.03em", cursor: canAfford ? "pointer" : "not-allowed",
                transition: "all 0.15s ease", display: "flex", alignItems: "center", gap: 5,
              }}>
                <Icon d={ICONS.unlock} size={11} />
                <span>{perPageCost} coins</span>
              </button>

              {chapter && !chapter.is_free && !isChapterUnlocked && (
                <button onClick={() => {
                  if (!canAffordChapter) { toast("Insufficient balance (30 coins)"); return; }
                  onUnlockChapter(chapter.chapter_number).then(success => {
                    if (success) {
                      setCurrentPage(pageNum); setPageInput(String(pageNum));
                      setProgress(((pageNum - 1) / Math.max(1, totalPages - 1)) * 100);
                      const el = pageRefs.current[pageNum];
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  });
                }} style={{
                  padding: isMobile ? "5px 12px" : "6px 14px",
                  background: canAffordChapter ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${canAffordChapter ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 6, color: canAffordChapter ? "#93c5fd" : T.chromeMuted,
                  fontSize: isMobile ? 10 : 11, fontFamily: "'Georgia', serif",
                  cursor: canAffordChapter ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <Icon d={ICONS.bookmark} size={11} />
                  <span>Chapter · 30 coins</span>
                </button>
              )}
            </div>
          </div>

          {/* Coin balance pill */}
          {!isMobile && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
              padding: "8px 12px",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 8, flexShrink: 0,
            }}>
              <span style={{ color: T.green, fontSize: 14 }}>◆</span>
              <span style={{ fontFamily: "monospace", fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{walletBalance}</span>
              <span style={{ fontSize: 8, color: T.chromeMuted, letterSpacing: "0.1em" }}>COINS</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── UNLOCKED PAGE ─────────────────────────────────────────────────────────
  return (
    <div ref={wrapRef} style={{
      position: "relative", flexShrink: 0, borderRadius: 2,
      overflow: "hidden",
      boxShadow: isLight
        ? "0 8px 40px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)"
        : "0 8px 48px rgba(0,0,0,0.7), 0 2px 10px rgba(0,0,0,0.4)",
      maxWidth: "100%",
      width: dims.w ? Math.min(dims.w, isMobile ? window.innerWidth - 24 : 9999) : "auto",
      height: dims.h || "auto",
    }}>
      <div style={{ position: "relative", overflow: "hidden" }}>
        <canvas ref={canvasRef} style={{
          display: "block", maxWidth: "100%",
          // Light theme only inverts the PDF canvas — chrome stays dark
          filter: isLight ? "invert(1) hue-rotate(180deg)" : "none",
          background: isLight ? "#fff" : "#000",
        }} />

        {pageHls.map(hl => (
          <div key={hl.id} title={hl.note || ""} style={{
            position: "absolute",
            background: HL_COLORS[hl.color] || HL_COLORS.yellow,
            mixBlendMode: "multiply", borderRadius: 2, cursor: "pointer",
            left: `${hl.x * 100}%`, top: `${hl.y * 100}%`,
            width: `${hl.w * 100}%`, height: `${hl.h * 100}%`,
            // Highlights also invert in light mode to look right on inverted canvas
            filter: isLight ? "invert(1) hue-rotate(180deg)" : "none",
          }} />
        ))}

        {isCompleted && isPageUnlocked && (
          <div onClick={onMarkCompleted} style={{
            position: "absolute", top: 10, right: 10,
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            color: "#fff", padding: "5px 11px", borderRadius: 20,
            fontSize: 10, fontFamily: "monospace", fontWeight: 600,
            letterSpacing: "0.05em", textTransform: "uppercase",
            boxShadow: "0 2px 10px rgba(34,197,94,0.45)",
            display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
            filter: isLight ? "invert(1) hue-rotate(180deg)" : "none",
          }}>
            <Icon d={ICONS.check} size={10} /><span>Done</span>
          </div>
        )}

        {dragging && dragRect && (
          <div style={{
            position: "absolute",
            left: `${dragRect.x * 100}%`, top: `${dragRect.y * 100}%`,
            width: `${dragRect.w * 100}%`, height: `${dragRect.h * 100}%`,
            border: `1.5px dashed ${T.green}`, background: "rgba(34,197,94,0.06)",
            pointerEvents: "none", zIndex: 5, borderRadius: 2,
          }} />
        )}
      </div>

      <div style={{
        position: "absolute", inset: 0,
        cursor: mode === "select" ? "default" : mode === "highlight" ? "crosshair" : mode === "note" ? "cell" : "pointer",
        userSelect: "none",
        touchAction: mode === "select" || mode === "bookmark" ? "auto" : "none",
      }}
        onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd}
        onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
        onClick={() => mode === "bookmark" && onBookmark(pageNum)}
      />

      {/* Unlock CTA */}
      {showUnlockCTA && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(180deg, transparent 0%, rgba(8,8,8,0.97) 45%, #080808 100%)",
          padding: isMobile ? "52px 18px 28px" : "80px 48px 44px",
          textAlign: "center", zIndex: 10,
          filter: isLight ? "invert(1) hue-rotate(180deg)" : "none",
        }}>
          <div style={{ zIndex: 1 }}>
            <div style={{
              width: isMobile ? 40 : 52, height: isMobile ? 40 : 52, borderRadius: "50%",
              background: T.greenDim, border: `1.5px solid ${T.greenBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px",
            }}>
              <Icon d={ICONS.lock} size={isMobile ? 18 : 24} />
            </div>
            <div style={{ fontSize: isMobile ? 15 : 18, color: "#fff", fontFamily: "'Georgia', serif", fontStyle: "italic", marginBottom: 6 }}>
              Continue Reading
            </div>
            <div style={{ fontSize: isMobile ? 11 : 13, color: "rgba(255,255,255,0.55)", marginBottom: 16, lineHeight: 1.6 }}>
              Unlock the next page to keep reading
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 10px", background: "rgba(255,255,255,0.05)",
              border: `1px solid ${T.greenBorder}`, borderRadius: 14,
              fontSize: 11, color: T.chromeMuted, marginBottom: 12, fontFamily: "monospace",
            }}>
              <span style={{ color: T.green, fontSize: 12 }}>◆</span>{walletBalance} coins
            </div>
            <button onClick={() => onUnlockPage(pageNum + 1)} style={{
              display: "block", width: "100%",
              padding: isMobile ? "10px 14px" : "12px 20px",
              background: canAfford ? `linear-gradient(135deg, ${T.greenDeep} 0%, ${T.green} 100%)` : "rgba(255,255,255,0.06)",
              border: `1px solid ${canAfford ? T.greenLight : "rgba(255,255,255,0.08)"}`,
              borderRadius: 6, color: canAfford ? "#fff" : T.chromeMuted,
              fontSize: isMobile ? 12 : 13, fontFamily: "'Georgia', serif",
              cursor: canAfford ? "pointer" : "not-allowed", transition: "all 0.2s ease",
            }}>
              {canAfford ? `Unlock Page ${pageNum + 1} — ${perPageCost} coins` : `Need ${perPageCost - walletBalance} more coins`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ThumbnailStrip ───────────────────────────────────────────────────────────
function ThumbnailStrip({ pdf, totalPages, currentPage, onGoTo }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
        <ThumbnailItem key={n} pdf={pdf} pageNum={n} active={n === currentPage} onGoTo={onGoTo} />
      ))}
    </div>
  );
}

function ThumbnailItem({ pdf, pageNum, active, onGoTo }) {
  const ref = useRef(null);
  const [rendered, setRendered] = useState(false);
  const [hov, setHov] = useState(false);

  useEffect(() => {
    if (!pdf || rendered) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        obs.disconnect();
        pdf.getPage(pageNum).then(page => {
          const vp = page.getViewport({ scale: 0.18 });
          const c = ref.current;
          if (!c) return;
          c.width = vp.width; c.height = vp.height;
          page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise
            .then(() => setRendered(true)).catch(() => {});
        });
      }
    }, { rootMargin: "120px" });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [pdf, pageNum, rendered]);

  return (
    <div onClick={() => onGoTo(pageNum)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        cursor: "pointer", borderRadius: 4, overflow: "hidden",
        border: `1.5px solid ${active ? T.green : hov ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)"}`,
        background: "#1a1a1a",
        boxShadow: active ? `0 0 0 1px ${T.greenBorder}, 0 2px 12px rgba(34,197,94,0.2)` : hov ? "0 2px 8px rgba(0,0,0,0.2)" : "none",
        transition: "all 0.14s ease",
        transform: hov && !active ? "translateX(1px)" : "none",
      }}>
      <canvas ref={ref} style={{ width: "100%", display: "block" }} />
      <div style={{
        textAlign: "center", fontSize: 8, padding: "3px 0",
        color: active ? T.green : T.chromeMuted,
        fontFamily: "monospace", letterSpacing: "0.08em",
        background: active ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.03)",
        transition: "all 0.14s",
      }}>
        {pageNum}
      </div>
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: "center", padding: "28px 14px", color: T.chromeMuted }}>
      <div style={{ fontSize: 24, marginBottom: 10, opacity: 0.4 }}>{icon}</div>
      <div style={{ fontSize: 11, fontStyle: "italic", lineHeight: 1.8, whiteSpace: "pre-line", opacity: 0.75 }}>{text}</div>
    </div>
  );
}

function Spinner({ size = 28, color = T.green }) {
  return (
    <div style={{
      width: size, height: size,
      border: "2px solid rgba(255,255,255,0.06)",
      borderTopColor: color, borderRadius: "50%",
      animation: "pdfrSpin 0.7s linear infinite", flexShrink: 0,
    }} />
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PDFReader() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const pdfJsReady = usePdfJs();
  const { token } = useAuthStore();

  const isPreviewMode = useCallback(() => {
    if (typeof window === "undefined") return false;
    const p = new URLSearchParams(window.location.search);
    return p.get("preview") === "true" || p.get("mode") === "preview";
  }, []);

  // pdfTheme only controls the PDF canvas — sidebar/chrome is always dark
  const [pdfTheme, setPdfTheme] = useState(() => {
    try { return localStorage.getItem("dkituyiacademy-pdf-theme") || "dark"; } catch { return "dark"; }
  });
  const togglePdfTheme = useCallback(() => {
    const next = pdfTheme === "dark" ? "light" : "dark";
    setPdfTheme(next);
    try { localStorage.setItem("dkituyiacademy-pdf-theme", next); } catch {}
  }, [pdfTheme]);

  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [lastTap, setLastTap] = useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [sidebarTouchStart, setSidebarTouchStart] = useState(null);

  useEffect(() => {
    const handle = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768); setIsTablet(w >= 768 && w < 1024);
      setSidebarOpen(w >= 768);
    };
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  useEffect(() => () => { if (longPressTimer) clearTimeout(longPressTimer); }, [longPressTimer]);

  const [book, setBook] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [unlockedPages, setUnlockedPages] = useState(new Set());
  const [chapters, setChapters] = useState([]);
  const [unlockedChapters, setUnlockedChapters] = useState(new Set());
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [pendingPage, setPendingPage] = useState(null);
  const [perPageCost, setPerPageCost] = useState(0);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [bulkUnlockCount, setBulkUnlockCount] = useState(1);
  const [showBulkUnlock, setShowBulkUnlock] = useState(false);
  const [pdf, setPdf] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [mode, setMode] = useState("select");
  const [hlColor, setHlColor] = useState("yellow");
  const [highlights, setHighlights] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("thumbs");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pageInput, setPageInput] = useState("1");
  const [progress, setProgress] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchPages, setSearchPages] = useState([]);
  const [completedPages, setCompletedPages] = useState(new Set());
  const [searchIdx, setSearchIdx] = useState(0);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [annotPopup, setAnnotPopup] = useState(null);
  const [annotText, setAnnotText] = useState("");

  const viewerRef = useRef(null);
  const pageRefs  = useRef({});
  const toastTimer = useRef(null);

  const toast = useCallback((msg) => {
    setToastMsg(msg); setToastVisible(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2400);
  }, []);

  useEffect(() => { try { localStorage.setItem(`lmn_bm_${bookId}`, JSON.stringify(bookmarks)); } catch {} }, [bookmarks, bookId]);
  useEffect(() => { try { localStorage.setItem(`lmn_notes_${bookId}`, JSON.stringify(notes)); } catch {} }, [notes, bookId]);
  useEffect(() => { try { localStorage.setItem(`lmn_hl_${bookId}`, JSON.stringify(highlights)); } catch {} }, [highlights, bookId]);

  const markPageCompleted = async (pageNum) => {
    try {
      const res = await api.post('/api/reader/features/mark_completed/', { book_id: bookId, page_number: pageNum });
      if (res.data.message) {
        setCompletedPages(prev => new Set([...prev, pageNum]));
        toast(`Page ${pageNum} marked as completed!`);
        setProgress(((pageNum) / Math.max(1, totalPages - 1)) * 100);
      }
    } catch { toast('Failed to mark page as completed'); }
  };

  const loadUnlockedPages = useCallback(async () => {
    if (isPreviewMode()) { setUnlockedPages(new Set()); return true; }
    try {
      console.log(`DEBUG: Loading unlocked pages for book ${bookId}`);
      const r = await api.get(`/api/reader/features/unlocked_pages/${bookId}/`);
      console.log(`DEBUG: Unlocked pages API response:`, r.data);
      setUnlockedPages(new Set(r.data.unlocked_pages || []));
      if (r.data.chapter_unlocked) setUnlockedChapters(new Set(r.data.chapter_unlocked));
      return true;
    } catch (error) {
      console.error(`DEBUG: Failed to load unlocked pages:`, error);
      console.log(`DEBUG: Error details:`, error.response?.data);
      
      // Fallback: Try to get at least page-based unlocks directly
      try {
        console.log(`DEBUG: Trying fallback approach...`);
        // For now, set empty to show all pages as locked except free preview
        // This ensures the unlock logic works correctly
        setUnlockedPages(new Set());
        return false;
      } catch (fallbackError) {
        console.error(`DEBUG: Fallback also failed:`, fallbackError);
        setUnlockedPages(new Set());
        return false;
      }
    }
  }, [isPreviewMode, bookId]);

  const loadChapters = useCallback(async () => {
    if (isPreviewMode()) { setChapters([]); return; }
    try {
      const r = await api.get(`/api/reader/books/${bookId}/chapters/`);
      console.log(`DEBUG: Chapters API response:`, r.data);
      console.log(`DEBUG: Chapters array:`, r.data.chapters);
      if (r.data.chapters && r.data.chapters.length > 0) {
        console.log(`DEBUG: First chapter structure:`, r.data.chapters[0]);
        console.log(`DEBUG: First chapter page_range:`, r.data.chapters[0].page_range);
      }
      setChapters(r.data.chapters || []);
      const unlocked = new Set();
      r.data.chapters.forEach(c => { 
        if (c.is_unlocked) unlocked.add(c.chapter_number); 
      });
      setUnlockedChapters(unlocked);
      console.log(`DEBUG: Loaded ${r.data.chapters?.length || 0} chapters, unlocked: ${Array.from(unlocked)}`);
    } catch { toast('Failed to load chapters'); }
  }, [isPreviewMode, bookId]);

  const getChapterForPage = (pn) => {
    if (!chapters.length) {
      console.log(`DEBUG: getChapterForPage(${pn}) - no chapters loaded`);
      return null;
    }
    const chapter = chapters.find(c => c.page_range?.start <= pn && c.page_range?.end >= pn);
    console.log(`DEBUG: getChapterForPage(${pn}) - found chapter:`, chapter?.chapter_number, chapter?.title);
    return chapter;
  };

  const getChapterUnlockOptions = () => {
    const chapter = getChapterForPage(pendingPage);
    if (!chapter || unlockedChapters.has(chapter.chapter_number) || chapter.is_free) return [];
    return [chapter];
  };

  // UnlockModal — always dark regardless of pdfTheme
  const UnlockModal = () => {
    const freePages = Math.max(1, Math.ceil((totalPages * 0.2) || 1));
    const isFreePage = pendingPage <= freePages;
    const canAffordPage = walletBalance >= perPageCost;
    const canAffordChapter = walletBalance >= 30;
    const chapterOptions = getChapterUnlockOptions();
    const currentChapter = getChapterForPage(pendingPage);

    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}>
        <div style={{
          background: "#111", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16, padding: isMobile ? 24 : 40,
          width: "100%", maxWidth: 480,
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: T.greenDim, border: `1px solid ${T.greenBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
          }}>
            <Icon d={ICONS.lock} size={24} />
          </div>
          <h2 style={{ textAlign: "center", margin: "0 0 10px", fontSize: isMobile ? 20 : 22, fontFamily: "'Georgia', serif", fontStyle: "italic", color: "#fff" }}>
            {isPreviewMode() && !isFreePage ? "Preview Complete" : isFreePage ? "Free Preview" : "Unlock Content"}
          </h2>
          <p style={{ textAlign: "center", margin: "0 0 24px", fontSize: 13, color: T.chromeMuted, lineHeight: 1.75 }}>
            {isPreviewMode() && !isFreePage
              ? `You've reached the end of your free preview (${freePages} pages). Sign up to continue.`
              : isFreePage
                ? `Page ${pendingPage} is part of your free preview (first ${freePages} pages).`
                : currentChapter
                  ? `Page ${pendingPage} · Chapter ${currentChapter.chapter_number}: "${currentChapter.title}"`
                  : `Unlock page ${pendingPage} for ${perPageCost} coins. Balance: ${walletBalance} coins.`}
          </p>

          {chapterOptions.length > 0 && !isFreePage && (
            <div style={{ marginBottom: 16, padding: 16, background: "rgba(34,197,94,0.06)", border: `1px solid ${T.greenBorder}`, borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: T.green, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 8 }}>Unlock Entire Chapter</div>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: T.chromeMuted, lineHeight: 1.6 }}>
                All {chapterOptions[0].pages_count} pages in this chapter · 30 coins
              </p>
              <button onClick={async () => {
                const success = await unlockChapter(chapterOptions[0].chapter_number);
                if (success) {
                  setShowUnlockPrompt(false); setPendingPage(null);
                  setCurrentPage(pendingPage); setPageInput(String(pendingPage));
                  setProgress(((pendingPage - 1) / Math.max(1, totalPages - 1)) * 100);
                  const el = pageRefs.current[pendingPage];
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }} disabled={unlockLoading || !canAffordChapter} style={{
                width: "100%", padding: "9px 0",
                background: unlockLoading ? `${T.greenDeep}99` : canAffordChapter ? `linear-gradient(135deg, ${T.greenDeep}, ${T.green})` : "rgba(255,255,255,0.06)",
                border: `1px solid ${canAffordChapter ? T.greenBorder : "rgba(255,255,255,0.08)"}`,
                borderRadius: 8, fontSize: 13, cursor: unlockLoading || !canAffordChapter ? "not-allowed" : "pointer",
                color: canAffordChapter ? "#fff" : T.chromeMuted, fontFamily: "'Georgia', serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                {unlockLoading && <Spinner size={13} color="#fff" />}
                {unlockLoading ? "Unlocking…" : `Unlock Chapter ${chapterOptions[0].chapter_number}`}
              </button>
            </div>
          )}

          {!isFreePage && (
            <div style={{ marginBottom: 20, padding: 16, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: "#93c5fd", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 8 }}>Single Page</div>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: T.chromeMuted, lineHeight: 1.6 }}>
                Unlock just this page · {perPageCost} coins
              </p>
              <button onClick={handleModalUnlock} disabled={unlockLoading || !canAffordPage} style={{
                width: "100%", padding: "9px 0",
                background: unlockLoading ? "rgba(59,130,246,0.5)" : canAffordPage ? "linear-gradient(135deg, #2563eb, #3b82f6)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${canAffordPage ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 8, fontSize: 13, cursor: unlockLoading || !canAffordPage ? "not-allowed" : "pointer",
                color: canAffordPage ? "#fff" : T.chromeMuted, fontFamily: "'Georgia', serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                {unlockLoading && <Spinner size={13} color="#fff" />}
                {unlockLoading ? "Unlocking…" : `Unlock Page ${pendingPage}`}
              </button>
              {!canAffordPage && (
                <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: T.rose }}>
                  Insufficient balance
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={() => { setShowUnlockPrompt(false); setPendingPage(null); }} style={{
              padding: "10px 20px", background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
              fontSize: 13, cursor: "pointer", color: T.chromeMuted, fontFamily: "'Georgia', serif",
            }}>Cancel</button>
            {isPreviewMode() && !isFreePage && (
              <button onClick={() => { window.location.href = `/login?redirect=/reader/${bookId}`; }} style={{
                padding: "10px 20px", background: `linear-gradient(135deg, ${T.greenDeep}, ${T.green})`,
                border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "'Georgia', serif",
              }}>Sign In to Continue</button>
            )}
            {isFreePage && (
              <button onClick={() => {
                setShowUnlockPrompt(false);
                setCurrentPage(pendingPage); setPageInput(String(pendingPage));
                setProgress(((pendingPage - 1) / Math.max(1, totalPages - 1)) * 100);
                const el = pageRefs.current[pendingPage];
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                setPendingPage(null);
              }} style={{
                padding: "10px 20px", background: `linear-gradient(135deg, ${T.greenDeep}, ${T.green})`,
                border: `1px solid ${T.greenBorder}`, borderRadius: 8, fontSize: 13, cursor: "pointer", color: "#fff", fontFamily: "'Georgia', serif",
              }}>Read Free Page</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const unlockChapter = async (chapterNumber) => {
    try {
      setUnlockLoading(true);
      const res = await api.post('/api/reader/chapters/unlock/', { book_id: bookId, chapter_number: chapterNumber });
      if (res.data.message) {
        setUnlockedChapters(prev => new Set([...prev, chapterNumber]));
        setWalletBalance(res.data.remaining_balance);
        setTimeout(async () => {
          try {
            const r = await api.get(`/api/reader/features/unlocked_pages/${bookId}/`);
            setUnlockedPages(new Set(r.data.unlocked_pages || []));
          } catch {}
        }, 500);
        toast(`Chapter ${chapterNumber} unlocked!`);
        return true;
      }
    } catch (error) {
      toast(error.response?.data?.error || 'Failed to unlock chapter');
      return false;
    } finally { setUnlockLoading(false); }
  };

  useEffect(() => {
    if (!loading && book && unlockedPages.size === 0) {
      const t = setTimeout(() => loadUnlockedPages(), 1000);
      return () => clearTimeout(t);
    }
  }, [loading, book, unlockedPages.size, loadUnlockedPages]);

  useEffect(() => {
    if (!loading && book && chapters.length === 0) {
      const t = setTimeout(() => loadChapters(), 1200);
      return () => clearTimeout(t);
    }
  }, [loading, book, chapters.length, loadChapters]);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      if (!mounted) return;
      try {
        if (isPreviewMode()) {
          const r = await api.get(`/api/books/${bookId}/`);
          if (!mounted) return;
          setBook(r.data); setWalletBalance(0); setPerPageCost(r.data.per_page_cost || 1); setUnlockedPages(new Set());
        } else {
          const [bookRes, walletRes] = await Promise.all([api.get(`/api/books/${bookId}/`), api.get("/api/payments/wallet/")]);
          if (!mounted) return;
          setBook(bookRes.data); setWalletBalance(walletRes.data.balance); setPerPageCost(bookRes.data.per_page_cost || 1);
          await loadUnlockedPages();
        }
        setLoading(false);
      } catch { if (mounted) { setLoadError(true); setLoading(false); } }
    }
    if (bookId && (token || isPreviewMode()) && !book) fetchData();
    return () => { mounted = false; };
  }, [bookId, token, book, isPreviewMode]);

  const isPageUnlocked = useCallback((n) => {
    if (!totalPages) {
      console.log(`DEBUG: isPageUnlocked(${n}) - no totalPages, returning false`);
      return false;
    }
    const freePages = Math.max(1, Math.ceil(totalPages * 0.2));
    const hasInUnlockedPages = unlockedPages.has(n);
    const isUnlocked = n <= freePages || hasInUnlockedPages;
    console.log(`DEBUG: isPageUnlocked(${n}) - totalPages: ${totalPages}, freePages: ${freePages}, unlockedPages.has(${n}): ${hasInUnlockedPages}, n <= freePages: ${n <= freePages}, isUnlocked: ${isUnlocked}`);
    return isUnlocked;
  }, [totalPages, unlockedPages]);

  const getLastUnlockedPage = useCallback(() => {
    if (!totalPages) return 1;
    const freePages = Math.max(1, Math.ceil(totalPages * 0.2));
    let last = freePages;
    for (let n = freePages + 1; n <= totalPages; n++) {
      if (unlockedPages.has(n)) last = n; else break;
    }
    return Math.min(last, totalPages);
  }, [totalPages, unlockedPages]);

  const shouldShowUnlockCTA = useCallback((n) => {
    const last = getLastUnlockedPage();
    const shouldShow = n === last && last < totalPages;
    console.log(`DEBUG: shouldShowUnlockCTA(${n}) - last: ${last}, totalPages: ${totalPages}, shouldShow: ${shouldShow}`);
    return shouldShow;
  }, [getLastUnlockedPage, totalPages]);

  const loadPDF = useCallback(async (source) => {
    if (!window.pdfjsLib) return;
    setLoading(true); setLoadError(false);
    try {
      let docInit;
      if (source instanceof ArrayBuffer) { docInit = { data: source }; }
      else {
        const res = await api.get(source, { responseType: "arraybuffer" });
        docInit = { data: res.data };
      }
      const doc = await window.pdfjsLib.getDocument(docInit).promise;
      setPdf(doc); setTotalPages(doc.numPages);
      setCurrentPage(1); setPageInput("1"); setProgress(0);
      setLoading(false);
    } catch { setLoading(false); setLoadError(true); }
  }, []);

  useEffect(() => {
    if (pdfJsReady && book?.id && !pdf) loadPDF(`/api/books/${book.id}/pdf/`);
  }, [pdfJsReady, book, pdf, loadPDF]);

  const handleViewerScroll = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer || !totalPages) return;
    const scrollTop = viewer.scrollTop;
    let closest = 1, minDist = Infinity;
    for (let i = 1; i <= totalPages; i++) {
      const el = pageRefs.current[i];
      if (!el) continue;
      const dist = Math.abs(el.offsetTop - scrollTop - 80);
      if (dist < minDist) { minDist = dist; closest = i; }
    }
    if (closest !== currentPage) {
      setCurrentPage(closest); setPageInput(String(closest));
      setProgress(((closest - 1) / Math.max(1, totalPages - 1)) * 100);
    }
  }, [currentPage, totalPages]);

  const goToPage = useCallback((n) => {
    n = Math.max(1, Math.min(n, totalPages));
    if (!isPageUnlocked(n)) { setPendingPage(n); setShowUnlockPrompt(true); return; }
    setCurrentPage(n); setPageInput(String(n));
    setProgress(((n - 1) / Math.max(1, totalPages - 1)) * 100);
    const el = pageRefs.current[n];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [totalPages, isPageUnlocked]);

  const unlockPage = useCallback(async (pageNum) => {
    if (isPageUnlocked(pageNum)) { toast("Page already unlocked"); return; }
    const previousPage = pageNum - 1;
    if (previousPage >= 1 && !completedPages.has(previousPage)) {
      const shouldCompleteFirst = window.confirm(
        `Have you completed page ${previousPage}?\n\nClick OK to mark it complete and unlock page ${pageNum}, or Cancel to just unlock.`
      );
      if (shouldCompleteFirst) {
        try {
          const res = await api.post('/api/reader/features/mark_completed/', { book_id: bookId, page_number: previousPage });
          if (res.data.message) {
            setCompletedPages(prev => new Set([...prev, previousPage]));
            toast(`Page ${previousPage} marked as completed!`);
            setProgress(((previousPage) / Math.max(1, totalPages - 1)) * 100);
          }
        } catch { toast('Failed to mark page, proceeding with unlock'); }
      }
    }
    setUnlockLoading(true);
    try {
      const res = await api.post(`/api/reader/features/unlock_page/`, { book_id: bookId, page_number: pageNum });
      if (res.data.message) {
        setUnlockedPages(prev => new Set([...prev, pageNum]));
        setWalletBalance(res.data.remaining_balance);
        toast(`Page ${pageNum} unlocked!`);
        setTimeout(async () => {
          try {
            const r = await api.get(`/api/reader/features/unlocked_pages/${bookId}/`);
            setUnlockedPages(new Set(r.data.unlocked_pages || []));
          } catch {}
        }, 500);
        setCurrentPage(pageNum);
        setTimeout(() => {
          const el = pageRefs.current[pageNum];
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      }
    } catch (error) {
      if (error.response?.data?.requires_completion) {
        toast(`You must complete page ${error.response.data.previous_page} first!`);
        goToPage(error.response.data.previous_page);
      } else { toast(error.response?.data?.error || "Failed to unlock page"); }
    } finally { setUnlockLoading(false); }
  }, [unlockLoading, walletBalance, perPageCost, bookId, toast, isPageUnlocked, completedPages, goToPage, totalPages]);

  const handleInlineUnlock = useCallback(async (pageNum) => { await unlockPage(pageNum); }, [unlockPage]);

  const handleModalUnlock = useCallback(async () => {
    if (!pendingPage || unlockLoading) return;
    if (isPageUnlocked(pendingPage)) { toast("Page already unlocked"); setShowUnlockPrompt(false); setPendingPage(null); return; }
    setUnlockLoading(true);
    try {
      const res = await api.post(`/api/reader/features/unlock_page/`, { book_id: bookId, page_number: pendingPage });
      if (res.data.message) {
        setUnlockedPages(prev => new Set([...prev, pendingPage]));
        setWalletBalance(res.data.remaining_balance);
        setShowUnlockPrompt(false);
        const pg = pendingPage; setPendingPage(null);
        toast("Page unlocked ✓");
        setRenderKey(prev => prev + 1);
        setTimeout(() => goToPage(pg), 300);
        setTimeout(async () => {
          try {
            const r = await api.get(`/api/reader/features/unlocked_pages/${bookId}/`);
            setUnlockedPages(new Set(r.data.unlocked_pages || []));
          } catch {}
        }, 500);
      }
    } catch { toast("Failed to unlock. Try again."); }
    finally { setUnlockLoading(false); }
  }, [pendingPage, unlockLoading, bookId, toast, isPageUnlocked, goToPage]);

  const handleBulkUnlock = useCallback(async () => {
    if (unlockLoading || bulkUnlockCount < 1) return;
    if (!completedPages.has(currentPage)) {
      const ok = window.confirm(`Mark page ${currentPage} complete before bulk unlock? OK to mark + unlock, Cancel to just unlock.`);
      if (ok) {
        try {
          const res = await api.post('/api/reader/features/mark_completed/', { book_id: bookId, page_number: currentPage });
          if (res.data.message) {
            setCompletedPages(prev => new Set([...prev, currentPage]));
            toast(`Page ${currentPage} marked as completed!`);
          }
        } catch { toast('Failed to mark page, proceeding with bulk unlock'); }
      }
    }
    const totalCost = perPageCost * bulkUnlockCount;
    if (walletBalance < totalCost) { toast(`Need ${totalCost - walletBalance} more coins`); return; }
    setUnlockLoading(true);
    try {
      const pagesToUnlock = [];
      let page = currentPage;
      while (pagesToUnlock.length < bulkUnlockCount && page <= totalPages) {
        if (!isPageUnlocked(page)) pagesToUnlock.push(page);
        page++;
      }
      if (!pagesToUnlock.length) { toast("No more pages to unlock"); return; }
      const results = await Promise.all(pagesToUnlock.map(pn => api.post(`/api/reader/features/unlock_page/`, { book_id: bookId, page_number: pn })));
      let unlockedCount = 0, newBalance = walletBalance;
      results.forEach(res => { if (res.data.message) { unlockedCount++; newBalance = res.data.remaining_balance; } });
      if (unlockedCount > 0) {
        setUnlockedPages(prev => new Set([...prev, ...pagesToUnlock.slice(0, unlockedCount)]));
        setWalletBalance(newBalance);
        toast(`Unlocked ${unlockedCount} page${unlockedCount > 1 ? 's' : ''} ✓`);
        setRenderKey(prev => prev + 1);
        setShowBulkUnlock(false); setBulkUnlockCount(1);
        setTimeout(async () => {
          try {
            const r = await api.get(`/api/reader/features/unlocked_pages/${bookId}/`);
            setUnlockedPages(new Set(r.data.unlocked_pages || []));
          } catch {}
        }, 500);
      }
    } catch { toast("Failed to unlock pages. Try again."); }
    finally { setUnlockLoading(false); }
  }, [bulkUnlockCount, unlockLoading, perPageCost, walletBalance, currentPage, totalPages, bookId, toast, isPageUnlocked, completedPages]);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goToPage(currentPage + 1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goToPage(currentPage - 1);
      if (e.key === "h") { setMode("highlight"); toast("Drag to highlight"); }
      if (e.key === "n") { setMode("note"); toast("Drag to annotate"); }
      if (e.key === "s") setMode("select");
      if (e.key === "b") { setMode("bookmark"); toast("Click a page to bookmark"); }
      if ((e.ctrlKey || e.metaKey) && e.key === "f") { e.preventDefault(); setSearchOpen(true); }
      if (e.key === "Escape") { setSearchOpen(false); if (isMobile) setSidebarOpen(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentPage, goToPage, toast, isMobile]);

  const handleHighlight = useCallback((pageNum, rect, color) => {
    setHighlights(prev => [...prev, { id: Date.now() + Math.random(), page: pageNum, ...rect, color, note: "", createdAt: new Date().toISOString() }]);
    toast("Highlighted ✓");
  }, [toast]);

  const handleRemoveHighlight = useCallback((pageNum, rect) => {
    setHighlights(prev => {
      const updated = prev.filter(hl => {
        if (hl.page !== pageNum) return true;
        const tol = 0.01;
        return !(Math.abs(hl.x - rect.x) < tol && Math.abs(hl.y - rect.y) < tol && Math.abs(hl.w - rect.w) < tol && Math.abs(hl.h - rect.h) < tol);
      });
      const removed = prev.length - updated.length;
      toast(removed > 0 ? `Removed ${removed} highlight${removed > 1 ? 's' : ''} ✓` : "No highlights found here");
      return updated;
    });
  }, [toast]);

  const handleNote = useCallback((pageNum, rect, cx, cy, color) => {
    setAnnotPopup({ x: Math.min(cx, window.innerWidth - 280), y: Math.min(cy + 12, window.innerHeight - 200), pageNum, rect, color });
    setAnnotText("");
  }, []);

  const handleBookmark = useCallback((pageNum) => {
    setBookmarks(prev => {
      const exists = prev.find(b => b.page === pageNum);
      if (exists) { toast("Bookmark removed"); return prev.filter(b => b.page !== pageNum); }
      toast(`Page ${pageNum} bookmarked ✓`);
      return [...prev, { id: Date.now(), page: pageNum, title: `Page ${pageNum}`, createdAt: new Date().toISOString() }];
    });
  }, [toast]);

  const handleTouchStart = useCallback((e) => {
    if (!isMobile) return;
    setTouchEnd(null);
    const currentTime = Date.now();
    if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null); }
    if (lastTap && currentTime - lastTap.time < 300) {
      setScale(s => s === 1.0 ? 1.5 : 1.0);
      toast(scale === 1.0 ? "Zoomed in" : "Zoomed out");
      setLastTap(null); return;
    }
    const timer = setTimeout(() => { setIsLongPressing(true); }, 500);
    setLongPressTimer(timer);
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY, time: currentTime });
    setLastTap({ time: currentTime, x: e.touches[0].clientX, y: e.touches[0].clientY });
  }, [isMobile, lastTap, scale, toast, longPressTimer]);

  const handleTouchMove = useCallback((e) => {
    if (!isMobile || !touchStart) return;
    if (lastTap && Math.abs(e.touches[0].clientX - lastTap.x) > 10 && Math.abs(e.touches[0].clientY - lastTap.y) > 10) setLastTap(null);
    if (longPressTimer) {
      const dx = Math.abs(e.touches[0].clientX - touchStart.x), dy = Math.abs(e.touches[0].clientY - touchStart.y);
      if (dx > 15 || dy > 15) { clearTimeout(longPressTimer); setLongPressTimer(null); }
    }
    setTouchEnd({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  }, [isMobile, touchStart, lastTap, longPressTimer]);

  const handleTouchEnd = useCallback((e) => {
    if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null); }
    if (isLongPressing) { setIsLongPressing(false); setTouchStart(null); setTouchEnd(null); setTimeout(() => setLastTap(null), 300); return; }
    if (!isMobile || !touchStart || !touchEnd) return;
    const dx = touchEnd.x - touchStart.x, dy = touchEnd.y - touchStart.y;
    const dt = Date.now() - touchStart.time;
    if (Math.abs(dx) > 50 && dt < 300 && Math.abs(dy) < Math.abs(dx)) {
      if (dx > 0 && currentPage > 1) { goToPage(currentPage - 1); toast("← Prev"); }
      else if (dx < 0 && currentPage < totalPages) { goToPage(currentPage + 1); toast("Next →"); }
    }
    setTouchStart(null); setTouchEnd(null); setTimeout(() => setLastTap(null), 300);
  }, [isMobile, touchStart, touchEnd, currentPage, totalPages, goToPage, toast, longPressTimer, isLongPressing]);

  const handleSidebarTouchStart = useCallback((e) => {
    if (!isMobile || !sidebarOpen) return;
    setSidebarTouchStart({ x: e.touches[0].clientX, time: Date.now() });
  }, [isMobile, sidebarOpen]);

  const handleSidebarTouchEnd = useCallback((e) => {
    if (!isMobile || !sidebarOpen || !sidebarTouchStart) return;
    const dx = e.changedTouches[0].clientX - sidebarTouchStart.x;
    const dt = Date.now() - sidebarTouchStart.time;
    if (dx > 80 && dt < 300) { setSidebarOpen(false); }
    setSidebarTouchStart(null);
  }, [isMobile, sidebarOpen, sidebarTouchStart]);

  const saveAnnot = () => {
    if (!annotText.trim()) { toast("Enter a note first"); return; }
    const { pageNum, rect, color } = annotPopup;
    setNotes(prev => [...prev, { id: Date.now(), page: pageNum, text: annotText.trim(), rect, color, createdAt: new Date().toISOString() }]);
    if (rect) setHighlights(prev => [...prev, { id: Date.now() + 1, page: pageNum, ...rect, color, note: annotText.trim() }]);
    setAnnotPopup(null); toast("Note saved ✓");
    setActiveTab("notes"); if (!sidebarOpen) setSidebarOpen(true);
  };

  const handleSearch = useCallback(async (text) => {
    setSearchText(text);
    if (!text.trim() || !pdf) { setSearchPages([]); return; }
    const matches = [];
    for (let i = 1; i <= totalPages; i++) {
      if (!isPageUnlocked(i)) continue;
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      if (content.items.map(t => t.str).join(" ").toLowerCase().includes(text.toLowerCase())) matches.push(i);
    }
    setSearchPages(matches); setSearchIdx(0);
    if (matches.length) goToPage(matches[0]); else toast("No matches found");
  }, [pdf, totalPages, goToPage, toast, isPageUnlocked]);

  const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const zoomIn  = () => { const i = ZOOM_LEVELS.indexOf(scale); if (i < ZOOM_LEVELS.length - 1) setScale(ZOOM_LEVELS[i + 1]); };
  const zoomOut = () => { const i = ZOOM_LEVELS.indexOf(scale); if (i > 0) setScale(ZOOM_LEVELS[i - 1]); };

  const toolModes = [
    { id: "select",    icon: ICONS.cursor,    label: "Select",    tip: "S" },
    { id: "highlight", icon: ICONS.highlight, label: "Highlight", tip: "H" },
    { id: "note",      icon: ICONS.note,      label: "Note",      tip: "N" },
    { id: "bookmark",  icon: ICONS.bookmark,  label: "Bookmark",  tip: "B" },
    { id: "remove",    icon: ICONS.x,         label: "Remove",    tip: "Remove highlights" },
  ];

  // Bulk Unlock Modal — always dark
  if (showBulkUnlock) {
    const totalCost = perPageCost * bulkUnlockCount;
    const canAfford = walletBalance >= totalCost;
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}>
        <div style={{
          background: "#111", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16, padding: isMobile ? 24 : 40, width: "100%", maxWidth: 420,
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: T.greenDim, border: `1px solid ${T.greenBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
          }}>
            <Icon d={ICONS.unlock} size={22} />
          </div>
          <h2 style={{ textAlign: "center", margin: "0 0 10px", fontSize: 20, fontFamily: "'Georgia', serif", fontStyle: "italic", color: "#fff" }}>
            Bulk Unlock
          </h2>
          <p style={{ textAlign: "center", margin: "0 0 24px", fontSize: 13, color: T.chromeMuted, lineHeight: 1.75 }}>
            Unlock {bulkUnlockCount} page{bulkUnlockCount > 1 ? 's' : ''} · {totalCost} coins. Balance: {walletBalance} coins.
          </p>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 11, color: T.chromeMuted, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "monospace" }}>
              Pages to unlock
            </label>
            <input type="number" min="1" max={Math.min(20, totalPages - currentPage + 1)} value={bulkUnlockCount}
              onChange={e => setBulkUnlockCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              style={{
                width: "100%", padding: "10px 12px",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7,
                fontSize: 14, background: "rgba(255,255,255,0.04)",
                color: "#fff", outline: "none", fontFamily: "monospace",
              }}
            />
          </div>
          {!canAfford && (
            <div style={{ textAlign: "center", marginBottom: 16, fontSize: 12, color: T.rose, padding: "8px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 6 }}>
              Need {totalCost - walletBalance} more coins
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={() => { setShowBulkUnlock(false); setBulkUnlockCount(1); }} style={{ padding: "10px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, cursor: "pointer", color: T.chromeMuted, fontFamily: "'Georgia', serif" }}>
              Cancel
            </button>
            {canAfford && (
              <button onClick={handleBulkUnlock} disabled={unlockLoading} style={{
                padding: "10px 20px", background: unlockLoading ? `${T.greenDeep}99` : `linear-gradient(135deg, ${T.greenDeep}, ${T.green})`,
                border: `1px solid ${T.greenBorder}`, borderRadius: 8, fontSize: 13, cursor: unlockLoading ? "not-allowed" : "pointer", color: "#fff",
                fontFamily: "'Georgia', serif", display: "flex", alignItems: "center", gap: 8,
              }}>
                {unlockLoading && <Spinner size={13} color="#fff" />}
                {unlockLoading ? "Unlocking…" : `Unlock ${bulkUnlockCount} page${bulkUnlockCount > 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN RENDER ───────────────────────────────────────────────────────────
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100dvh", width: "100%", maxWidth: "100vw",
      overflow: "hidden", fontFamily: "'Georgia', serif",
      // Chrome is ALWAYS dark — only PDF viewport changes with pdfTheme
      background: T.chromeDeep, color: T.chromeText,
    }}>

      {/* Progress bar */}
      <div style={{ height: 2, background: "rgba(255,255,255,0.04)", flexShrink: 0, position: "relative" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%", width: `${progress}%`,
          background: `linear-gradient(90deg, ${T.greenDeep}, ${T.green})`,
          transition: "width 0.35s ease", boxShadow: `0 0 6px ${T.green}`,
        }} />
      </div>

      {/* ── Toolbar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: isMobile ? 1 : 2,
        padding: isMobile ? "0 8px" : "0 12px",
        height: isMobile ? 44 : 48, flexShrink: 0,
        background: T.chromeDeep,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.03)",
        overflowX: "auto", overflowY: "hidden",
      }}>
        {/* Back */}
        <TbBtn onClick={() => navigate("/dashboard")} title="Dashboard" compact={isMobile}>
          <Icon d={ICONS.prev} size={14} />
          {!isMobile && <span>Back</span>}
        </TbBtn>

        {!isMobile && (
          <>
            <Divider />
            <span style={{ fontStyle: "italic", fontSize: 15, color: T.green, letterSpacing: "0.05em", userSelect: "none", flexShrink: 0 }}>
              Dkituyiacademy
            </span>
            <Divider />
            {isPreviewMode() && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 9px", background: T.greenDim, border: `1px solid ${T.greenBorder}`, borderRadius: 14, fontSize: 10, color: T.green, fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Preview
              </div>
            )}
          </>
        )}

        {/* Sidebar toggle */}
        <TbBtn active={sidebarOpen} onClick={() => setSidebarOpen(o => !o)} title="Panels" compact={isMobile}>
          <Icon d={ICONS.menu} size={14} />
          {!isMobile && <span>Panels</span>}
        </TbBtn>

        {/* Refresh */}
        <TbBtn onClick={async () => {
          try {
            const r = await api.get(`/api/reader/features/unlocked_pages/${bookId}/`);
            setUnlockedPages(new Set(r.data.unlocked_pages || []));
            setRenderKey(prev => prev + 1); toast("Refreshed");
          } catch { toast("Failed to refresh"); }
        }} title="Refresh" compact={isMobile}>
          <Icon d={ICONS.refresh} size={14} />
        </TbBtn>

        {/* Unlock chapter — desktop and mobile */}
        <TbBtn onClick={() => {
            console.log(`DEBUG: Chapter unlock button clicked - currentPage: ${currentPage}, chapters.length: ${chapters.length}`);
            const ch = getChapterForPage(currentPage);
            console.log(`DEBUG: Found chapter for unlock:`, ch);
            if (!ch) { 
              console.log(`DEBUG: No chapter found for page ${currentPage}`);
              toast("No chapter for this page"); 
              return; 
            }
            if (ch.is_free || unlockedChapters.has(ch.chapter_number)) { 
              console.log(`DEBUG: Chapter ${ch.chapter_number} already unlocked (free: ${ch.is_free}, unlocked: ${unlockedChapters.has(ch.chapter_number)})`);
              toast(`Chapter ${ch.chapter_number} is already unlocked`); 
              return; 
            }
            if (walletBalance < 30) { 
              console.log(`DEBUG: Insufficient balance - wallet: ${walletBalance}, needed: 30`);
              toast("Insufficient balance (30 coins)"); 
              return; 
            }
            console.log(`DEBUG: Proceeding to unlock chapter ${ch.chapter_number}`);
            unlockChapter(ch.chapter_number).then(ok => ok && toast(`Chapter ${ch.chapter_number} unlocked!`));
          }} title="Unlock Current Chapter" compact={isMobile}>
            <Icon d={ICONS.lock} size={14} />
            {!isMobile && <span>Chapter</span>}
          </TbBtn>

        <Divider />

        {/* Page nav */}
        <TbBtn onClick={() => goToPage(currentPage - 1)} title="Previous" compact={isMobile}><Icon d={ICONS.prev} size={14} /></TbBtn>
        <input
          value={pageInput}
          onChange={e => setPageInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { const n = parseInt(pageInput); if (!isNaN(n) && n >= 1 && n <= totalPages) goToPage(n); } }}
          onFocus={e => e.target.select()}
          style={{
            width: isMobile ? 42 : 50, height: isMobile ? 28 : 30,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 5, color: T.chromeText, textAlign: "center",
            fontSize: isMobile ? 11 : 12, fontFamily: "monospace", padding: "0 4px", outline: "none",
          }}
          placeholder="1"
        />
        {!isMobile && (
          <span style={{ color: T.chromeMuted, fontSize: 11, fontFamily: "monospace", minWidth: 20 }}>
            / {totalPages || "—"}
          </span>
        )}
        <TbBtn onClick={() => goToPage(currentPage + 1)} title="Next" compact={isMobile}><Icon d={ICONS.next} size={14} /></TbBtn>

        <Divider />

        {/* Zoom */}
        <TbBtn onClick={zoomOut} title="Zoom out" compact={isMobile}><Icon d={ICONS.zoomOut} size={14} /></TbBtn>
        {!isMobile && (
          <select value={scale}
            onChange={e => setScale(e.target.value === "fit" ? "fit" : parseFloat(e.target.value))}
            style={{ height: 26, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: T.chromeText, fontSize: 11, padding: "0 4px", cursor: "pointer", outline: "none" }}>
            {ZOOM_LEVELS.map(z => <option key={z} value={z}>{Math.round(z * 100)}%</option>)}
            <option value="fit">Fit</option>
          </select>
        )}
        <TbBtn onClick={zoomIn} title="Zoom in" compact={isMobile}><Icon d={ICONS.zoomIn} size={14} /></TbBtn>

        {/* Bulk unlock */}
        {perPageCost > 0 && (
          <>
            <Divider />
            <TbBtn onClick={() => setShowBulkUnlock(true)} title="Bulk unlock" compact={isMobile}>
              <Icon d={ICONS.unlock} size={14} />
              {!isMobile && <span>Bulk</span>}
            </TbBtn>
          </>
        )}

        {/* Desktop tools */}
        {!isMobile && (
          <>
            <Divider />
            {toolModes.map(({ id, icon, label, tip }) => (
              <TbBtn key={id} active={mode === id} onClick={() => { setMode(id); if (id !== "select") toast(tip); }} title={tip}>
                <Icon d={icon} size={13} /><span>{label}</span>
              </TbBtn>
            ))}
            <Divider />
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {Object.entries(HL_SWATCHES).map(([name, hex]) => (
                <Swatch key={name} name={name} hex={hex} active={hlColor === name} onClick={setHlColor} />
              ))}
            </div>
          </>
        )}

        <Divider />
        <TbBtn active={searchOpen} onClick={() => setSearchOpen(o => !o)} title="Search (Ctrl+F)" compact={isMobile}>
          <Icon d={ICONS.search} size={14} />
        </TbBtn>

        {/* PDF theme toggle — sun/moon only affects the canvas */}
        <TbBtn onClick={togglePdfTheme} title={`PDF: ${pdfTheme === "dark" ? "switch to light" : "switch to dark"}`} compact={isMobile}>
          <Icon d={pdfTheme === "dark" ? ICONS.sun : ICONS.moon} size={14} />
        </TbBtn>

        <div style={{ flex: 1, minWidth: 0 }} />

        {/* Mode pill — desktop */}
        {!isMobile && (
          <div style={{
            fontSize: 9, padding: "2px 8px", borderRadius: 10,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
            color: { select: T.blue, highlight: T.amber, note: T.green, bookmark: "#e879f9", remove: T.rose }[mode] || T.chromeText,
            fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0,
          }}>
            {mode}
          </div>
        )}

        {!isMobile && walletBalance > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4, padding: "3px 9px",
            background: T.greenDim, border: `1px solid ${T.greenBorder}`,
            borderRadius: 20, fontSize: 11, color: T.green, fontFamily: "monospace", marginLeft: 4, flexShrink: 0,
          }}>
            <span style={{ fontSize: 11 }}>◆</span>{walletBalance}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative", minHeight: 0 }}>

        {/* ── Sidebar — always dark ── */}
        <div
          onTouchStart={handleSidebarTouchStart}
          onTouchEnd={handleSidebarTouchEnd}
          style={{
            width: sidebarOpen ? (isMobile ? "78%" : isTablet ? 270 : 240) : 0,
            maxWidth: isMobile ? 290 : "none",
            flexShrink: 0, overflow: "hidden",
            transition: "width 0.2s ease",
            background: T.chromeMid,
            borderRight: isMobile ? "none" : "1px solid rgba(255,255,255,0.06)",
            display: "flex", flexDirection: "column",
            position: isMobile ? "absolute" : "relative",
            top: 0, left: 0, height: "100%", zIndex: 100,
            boxShadow: isMobile && sidebarOpen ? "4px 0 28px rgba(0,0,0,0.5)" : "none",
          }}>

          {isMobile && sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} style={{
              position: "absolute", top: 10, right: 10, width: 26, height: 26,
              borderRadius: "50%", background: "rgba(255,255,255,0.07)", border: "none",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: T.chromeMuted, zIndex: 2,
            }}>
              <Icon d={ICONS.x} size={12} />
            </button>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, background: T.chromeMid }}>
            {["thumbs", "bookmarks", "notes", "highlights"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                flex: 1, padding: "9px 2px",
                background: "transparent", border: "none",
                borderBottom: `2px solid ${activeTab === tab ? T.green : "transparent"}`,
                color: activeTab === tab ? T.green : T.chromeMuted,
                fontSize: isMobile ? 8 : 9, cursor: "pointer",
                fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.07em",
                transition: "all 0.14s", outline: "none",
              }}>
                {tab === "thumbs" ? "Pages" : tab === "highlights" ? "Marks" : tab[0].toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 7px", color: T.chromeText }}>
            {activeTab === "thumbs" && pdf && (
              <ThumbnailStrip pdf={pdf} totalPages={totalPages} currentPage={currentPage} onGoTo={(n) => { goToPage(n); if (isMobile) setSidebarOpen(false); }} />
            )}
            {activeTab === "bookmarks" && (
              bookmarks.length === 0 ? <EmptyState icon="◆" text={"No bookmarks yet.\nUse Bookmark mode and\nclick any page."} /> : (
                [...bookmarks].sort((a, b) => a.page - b.page).map(bm => (
                  <div key={bm.id} onClick={() => { goToPage(bm.page); if (isMobile) setSidebarOpen(false); }}
                    style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 9px", borderRadius: 6, cursor: "pointer", marginBottom: 3, transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ color: T.green, fontSize: 11, marginTop: 1 }}>◆</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 8, color: T.chromeMuted, fontFamily: "monospace", letterSpacing: "0.08em" }}>PAGE {bm.page}</div>
                      <div style={{ fontSize: 11, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bm.title}</div>
                    </div>
                    <span onClick={e => { e.stopPropagation(); setBookmarks(prev => prev.filter(b => b.id !== bm.id)); toast("Removed"); }} style={{ fontSize: 10, color: T.chromeDim, cursor: "pointer", padding: "0 2px", flexShrink: 0 }}>✕</span>
                  </div>
                ))
              )
            )}
            {activeTab === "notes" && (
              notes.length === 0 ? <EmptyState icon="✎" text={"No notes yet.\nUse Note mode and\ndrag a region."} /> : (
                [...notes].sort((a, b) => a.page - b.page).map(n => (
                  <div key={n.id} onClick={() => goToPage(n.page)} style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                    borderLeft: `2.5px solid ${T.green}`,
                    borderRadius: 6, padding: "9px 10px", marginBottom: 7, cursor: "pointer", position: "relative",
                  }}>
                    <div style={{ fontSize: 8, color: T.chromeMuted, fontFamily: "monospace", marginBottom: 3, letterSpacing: "0.05em" }}>P.{n.page} · {new Date(n.createdAt).toLocaleDateString()}</div>
                    <div style={{ fontSize: 11, lineHeight: 1.65, wordBreak: "break-word", color: "rgba(255,255,255,0.75)" }}>{n.text}</div>
                    <span onClick={e => { e.stopPropagation(); setNotes(prev => prev.filter(x => x.id !== n.id)); toast("Removed"); }} style={{ position: "absolute", top: 7, right: 8, fontSize: 10, color: T.chromeDim, cursor: "pointer" }}>✕</span>
                  </div>
                ))
              )
            )}
            {activeTab === "highlights" && (
              highlights.length === 0 ? <EmptyState icon="◐" text={"No highlights yet.\nUse Highlight mode\nand drag."} /> : (
                [...highlights].sort((a, b) => a.page - b.page).map(hl => (
                  <div key={hl.id} onClick={() => goToPage(hl.page)} style={{
                    padding: "8px 10px", borderRadius: 6, marginBottom: 6, cursor: "pointer",
                    background: HL_COLORS[hl.color] || HL_COLORS.yellow, position: "relative", fontSize: 11,
                  }}>
                    <div style={{ fontSize: 8, fontFamily: "monospace", marginBottom: 2, opacity: 0.6, letterSpacing: "0.06em", color: "#111" }}>PAGE {hl.page}</div>
                    <div style={{ fontStyle: hl.note ? "normal" : "italic", opacity: hl.note ? 1 : 0.55, color: "#111" }}>{hl.note || "Highlighted region"}</div>
                    <span onClick={e => { e.stopPropagation(); setHighlights(prev => prev.filter(h => h.id !== hl.id)); toast("Removed"); }} style={{ position: "absolute", top: 6, right: 8, fontSize: 10, cursor: "pointer", opacity: 0.45, color: "#111" }}>✕</span>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* Mobile sidebar backdrop */}
        {isMobile && sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={{ position: "absolute", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.45)" }} />
        )}

        {/* ── PDF Viewer — bg changes with pdfTheme ── */}
        <div
          ref={viewerRef}
          onScroll={handleViewerScroll}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            flex: 1, overflowY: "auto", overflowX: "hidden",
            // This is the only area where pdfTheme affects background
            background: pdfTheme === "light" ? T.viewerLight : T.viewerDark,
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: isMobile ? "12px 0 80px" : "24px 24px 80px",
            gap: isMobile ? 8 : 12,
            minWidth: 0, position: "relative",
            transition: "background 0.25s ease",
          }}
        >
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 16, padding: "80px 20px" }}>
              <div style={{ fontStyle: "italic", fontSize: 20, color: T.green, letterSpacing: "0.06em" }}>Dkituyiacademy</div>
              <Spinner size={32} />
              <div style={{ fontSize: 12, color: T.chromeMuted, fontFamily: "monospace", letterSpacing: "0.04em" }}>
                {!book ? "Loading book…" : !pdf ? "Loading PDF…" : "Preparing reader…"}
              </div>
            </div>
          )}

          {loadError && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 12, padding: "80px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 32, opacity: 0.25 }}>⚠</div>
              <div style={{ fontSize: 15, color: T.rose }}>Could not load document</div>
              <div style={{ fontSize: 12, color: T.chromeMuted, maxWidth: 280, lineHeight: 1.75 }}>Please check your connection and try again.</div>
            </div>
          )}

          {!loading && !loadError && pdf && Array.from({ length: totalPages }, (_, i) => i + 1).map(n => {
            const locked  = !isPageUnlocked(n);
            const showCTA = shouldShowUnlockCTA(n);
            console.log(`DEBUG: Page ${n} - locked: ${locked}, showCTA: ${showCTA}, unlockedPages.size: ${unlockedPages.size}`);
            return (
              <div key={`${n}-${renderKey}`} ref={el => { if (el) pageRefs.current[n] = el; }}
                style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                <PageCanvas
                  pdf={pdf} pageNum={n} scale={scale}
                  highlights={highlights} mode={mode} hlColor={hlColor}
                  onHighlight={handleHighlight} onNote={handleNote}
                  onBookmark={handleBookmark} onRemoveHighlight={handleRemoveHighlight}
                  isMobile={isMobile} isLocked={locked} showUnlockCTA={showCTA}
                  perPageCost={perPageCost} walletBalance={walletBalance}
                  onUnlockPage={handleInlineUnlock}
                  pdfTheme={pdfTheme}  // ← only this prop, not global isLight
                  isCompleted={completedPages.has(n)}
                  onMarkCompleted={() => markPageCompleted(n)}
                  isPageUnlocked={isPageUnlocked}
                  chapters={chapters} unlockedChapters={unlockedChapters}
                  onUnlockChapter={unlockChapter}
                  currentPage={currentPage} setCurrentPage={setCurrentPage}
                  setPageInput={setPageInput} setProgress={setProgress}
                  totalPages={totalPages} pageRefs={pageRefs} toast={toast}
                />
              </div>
            );
          })}

          {/* Preview End CTA */}
          {isPreviewMode() && totalPages > 0 && !loading && (
            <div style={{ padding: "44px 24px", textAlign: "center", width: "100%", maxWidth: 480, background: "#111", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", marginTop: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.greenDim, border: `1.5px solid ${T.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <Icon d={ICONS.lock} size={24} />
              </div>
              <h2 style={{ fontSize: isMobile ? 20 : 24, color: "#fff", fontFamily: "'Georgia', serif", fontStyle: "italic", marginBottom: 10 }}>Preview Complete</h2>
              <p style={{ fontSize: isMobile ? 13 : 15, color: T.chromeMuted, lineHeight: 1.75, marginBottom: 24 }}>
                You've reached the end of your free preview ({Math.max(1, Math.ceil(totalPages * 0.2))} pages).{" "}
                {token ? "Add to your library to read the full book." : "Sign in to continue reading."}
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexDirection: isMobile ? "column" : "row" }}>
                {token ? (
                  <button onClick={async () => {
                    try {
                      await api.post("/api/library/user/library/", { book_id: bookId });
                      toast("Added to library! Redirecting…");
                      setTimeout(() => navigate(`/reader/${bookId}`), 1500);
                    } catch (err) { toast(err.response?.data?.error || "Failed to add to library"); }
                  }} style={{ padding: "11px 24px", background: `linear-gradient(135deg, ${T.greenDeep}, ${T.green})`, border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer", color: "#fff", fontFamily: "'Georgia', serif" }}>
                    Add to Library
                  </button>
                ) : (
                  <button onClick={() => { window.location.href = `/login?redirect=/reader/${bookId}`; }} style={{ padding: "11px 24px", background: `linear-gradient(135deg, ${T.greenDeep}, ${T.green})`, border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer", color: "#fff", fontFamily: "'Georgia', serif" }}>
                    Sign In to Continue
                  </button>
                )}
                <button onClick={() => navigate("/books")} style={{ padding: "11px 24px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 14, cursor: "pointer", color: T.chromeMuted, fontFamily: "'Georgia', serif" }}>
                  Browse Books
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Floating annotation toolbar ── */}
      <div style={{
        position: "fixed", right: isMobile ? 14 : 18, top: "50%", transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: isMobile ? 7 : 10,
        zIndex: 1000, pointerEvents: "none",
      }}>
        {toolModes.map(({ id, icon, tip }) => (
          <button key={id} onClick={() => { setMode(id); if (id !== "select") toast(tip); }} title={tip} style={{
            width: isMobile ? 38 : 44, height: isMobile ? 38 : 44, borderRadius: "50%",
            background: mode === id
              ? `linear-gradient(135deg, ${T.greenDeep}, ${T.green})`
              : "rgba(20,20,20,0.96)",
            border: `1.5px solid ${mode === id ? T.greenBorder : "rgba(255,255,255,0.1)"}`,
            color: mode === id ? "#fff" : T.chromeMuted,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: mode === id ? `0 3px 14px rgba(34,197,94,0.35)` : "0 3px 10px rgba(0,0,0,0.4)",
            transition: "all 0.18s ease", pointerEvents: "auto",
          }}
            onMouseEnter={e => { if (mode !== id) e.currentTarget.style.transform = "scale(1.1)"; }}
            onMouseLeave={e => { if (mode !== id) e.currentTarget.style.transform = "scale(1)"; }}>
            <Icon d={icon} size={isMobile ? 16 : 18} />
          </button>
        ))}

        {isMobile && perPageCost > 0 && (
          <button onClick={() => setShowBulkUnlock(true)} style={{
            width: 38, height: 38, borderRadius: "50%",
            background: `linear-gradient(135deg, ${T.greenDeep}, ${T.green})`,
            border: `1.5px solid ${T.greenBorder}`, color: "#fff",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 3px 14px rgba(34,197,94,0.35)", marginTop: 7, pointerEvents: "auto",
          }}>
            <Icon d={ICONS.unlock} size={16} />
          </button>
        )}

        {mode === "highlight" && (
          <div style={{
            display: "flex", flexDirection: "column", gap: isMobile ? 5 : 6,
            padding: isMobile ? 6 : 8,
            background: "rgba(18,18,18,0.97)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, boxShadow: "0 4px 14px rgba(0,0,0,0.4)", pointerEvents: "auto",
          }}>
            {Object.entries(HL_SWATCHES).map(([name, hex]) => (
              <button key={name} onClick={() => setHlColor(name)} title={name} style={{
                width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, borderRadius: "50%",
                background: hex, border: hlColor === name ? "2.5px solid #fff" : "2.5px solid transparent",
                boxShadow: hlColor === name ? `0 0 0 1.5px ${hex}` : "none",
                cursor: "pointer",
                transform: hlColor === name ? "scale(1.25)" : "scale(1)",
                transition: "all 0.13s ease",
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Annotation popup */}
      {annotPopup && (
        <div style={{
          position: "fixed",
          left: isMobile ? 16 : annotPopup.x,
          top: isMobile ? "auto" : annotPopup.y,
          bottom: isMobile ? 0 : "auto",
          right: isMobile ? 16 : "auto",
          background: "#111", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: isMobile ? "12px 12px 0 0" : 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          padding: 14, width: isMobile ? "auto" : 244, zIndex: 600,
        }}>
          <div style={{ fontSize: 9, color: T.chromeMuted, marginBottom: 9, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "monospace" }}>
            Note · Page {annotPopup.pageNum}
          </div>
          <textarea autoFocus value={annotText} onChange={e => setAnnotText(e.target.value)}
            placeholder="Type your note…" onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) saveAnnot(); }}
            style={{
              width: "100%", minHeight: 76,
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 5, padding: 8,
              fontFamily: "'Georgia', serif", fontSize: 12,
              color: T.chromeText, background: "rgba(255,255,255,0.04)",
              resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.65,
            }}
          />
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={() => setAnnotPopup(null)} style={{ padding: "5px 11px", borderRadius: 5, fontSize: 11, cursor: "pointer", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: T.chromeMuted, fontFamily: "'Georgia', serif" }}>Cancel</button>
            <button onClick={saveAnnot} style={{ padding: "5px 11px", borderRadius: 5, fontSize: 11, cursor: "pointer", background: `linear-gradient(135deg, ${T.greenDeep}, ${T.green})`, border: `1px solid ${T.greenBorder}`, color: "#fff", fontFamily: "'Georgia', serif" }}>Save</button>
          </div>
        </div>
      )}

      {/* Search panel */}
      {searchOpen && (
        <div style={{
          position: "fixed", top: isMobile ? 50 : 58, right: 14,
          background: "#111", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          padding: 14, width: isMobile ? Math.min(window.innerWidth - 28, 296) : 280, zIndex: 400,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 9, color: T.chromeMuted, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>Search</span>
            <button onClick={() => setSearchOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.chromeMuted, padding: 2, display: "flex" }}><Icon d={ICONS.x} size={13} /></button>
          </div>
          <input autoFocus value={searchText} onChange={e => handleSearch(e.target.value)}
            placeholder="Search in document…"
            style={{
              width: "100%", height: 32, border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 5, padding: "0 10px", fontFamily: "'Georgia', serif", fontSize: 12,
              color: T.chromeText, background: "rgba(255,255,255,0.04)", marginBottom: 8, boxSizing: "border-box", outline: "none",
            }}
          />
          {searchPages.length > 0 && (
            <div style={{ fontSize: 10, color: T.green, marginBottom: 8, fontFamily: "monospace" }}>
              {searchPages.length} match{searchPages.length > 1 ? "es" : ""} · {searchIdx + 1}/{searchPages.length}
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            {["↑ Prev", "↓ Next"].map((label, i) => (
              <button key={label} onClick={() => {
                if (!searchPages.length) return;
                const idx = ((searchIdx + (i === 0 ? -1 : 1)) + searchPages.length) % searchPages.length;
                setSearchIdx(idx); goToPage(searchPages[idx]);
              }} style={{ flex: 1, padding: "5px 0", borderRadius: 5, fontSize: 11, cursor: "pointer", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: T.chromeMuted, fontFamily: "'Georgia', serif" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile complete FAB */}
      {isMobile && !isPreviewMode() && (
        <button onClick={() => markPageCompleted(currentPage)} style={{
          position: "fixed", bottom: 18, left: 18,
          width: 52, height: 52, borderRadius: "50%",
          background: completedPages.has(currentPage)
            ? "linear-gradient(135deg, #10b981, #059669)"
            : "rgba(20,20,20,0.95)",
          border: `1.5px solid ${completedPages.has(currentPage) ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.1)"}`,
          boxShadow: completedPages.has(currentPage) ? "0 3px 14px rgba(16,185,129,0.35)" : "0 3px 10px rgba(0,0,0,0.4)",
          cursor: "pointer", zIndex: 600,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.22s ease",
        }}>
          <Icon d={completedPages.has(currentPage) ? ICONS.check : ICONS.bookmark} size={20} />
        </button>
      )}

      {/* Toast */}
      <div style={{
        position: "fixed", bottom: isMobile ? 86 : 22, left: "50%", transform: "translateX(-50%)",
        background: "rgba(10,10,10,0.96)", color: T.chromeText,
        padding: "6px 16px", borderRadius: 20, fontSize: 11, zIndex: 700,
        opacity: toastVisible ? 1 : 0, transition: "opacity 0.22s ease",
        pointerEvents: "none", border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 4px 18px rgba(0,0,0,0.5)",
        fontFamily: "monospace", letterSpacing: "0.04em", whiteSpace: "nowrap",
      }}>
        {toastMsg}
      </div>

      {showUnlockPrompt && pendingPage && <UnlockModal />}

      <style>{`
        @keyframes pdfrSpin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        select option { background: #111; color: #fff; }
        * { box-sizing: border-box; }
        body { overflow: hidden; }
      `}</style>
    </div>
  );
}