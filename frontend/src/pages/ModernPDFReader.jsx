import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axiosClient";
import { useAuthStore } from "../auth/AuthContext";

// ─── PDF.js ──────────────────────────────────────────────────────────────────
const PDFJS_VERSION = "3.11.174";
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const WORKER_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

// ─── Design Tokens ───────────────────────────────────────────────────────────
const TOKENS = {
  inkBlack:    "#0a0a0a",
  parchment:   "#f5f5f5",
  parchmentMid:"#e0e0e0",
  parchmentDim:"#c0c0c0",
  amber:       "#22c55e",
  amberDim:    "rgba(34,197,94,0.18)",
  rust:        "#16a34a",
  rustLight:   "#4ade80",
  rosewood:    "#e6508c",
  cobalt:      "#5096f0",
  inkBrown:    "#171717",
  warmGray:    "#737373",
  dimText:     "rgba(255,255,255,0.5)",
  subtleText:  "rgba(255,255,255,0.8)",
  bodyText:    "#ffffff",
  surfaceDark: "#0a0a0a",
  surfaceMid:  "#171717",
  surfaceDeep: "#000000",
  surfaceCard: "rgba(34,197,94,0.08)",
  border:      "rgba(34,197,94,0.3)",
  borderLight: "rgba(34,197,94,0.15)",
};

const HL_COLORS = {
  yellow: "rgba(255,218,60,0.4)",
  green:  "rgba(80,200,110,0.38)",
  blue:   "rgba(80,150,240,0.38)",
  pink:   "rgba(230,80,140,0.35)",
};
const HL_SWATCHES = {
  yellow: "#ffd93c",
  green:  "#50c86e",
  blue:   "#5096f0",
  pink:   "#e6508c",
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
  x:         "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  refresh:   "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.76L13 11h7V4l-2.35 2.35z",
};

// ─── Toolbar Button ───────────────────────────────────────────────────────────
function TbBtn({ active, onClick, title, children, compact = false }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: compact ? 30 : 32,
        minWidth: compact ? 30 : 32,
        padding: compact ? "0 5px" : "0 9px",
        background: active
          ? "linear-gradient(135deg, #8b3a1e, #a3451f)"
          : hovered ? "rgba(255,255,255,0.07)" : "transparent",
        border: `1px solid ${active ? TOKENS.rustLight : hovered ? TOKENS.borderLight : "transparent"}`,
        borderRadius: 6,
        color: active ? "#fff" : hovered ? TOKENS.bodyText : TOKENS.subtleText,
        cursor: "pointer",
        display: "flex", alignItems: "center", gap: 5,
        fontSize: 11, fontFamily: "'Georgia', serif",
        letterSpacing: "0.02em",
        transition: "all 0.15s ease",
        outline: "none", flexShrink: 0,
        boxShadow: active ? "0 2px 8px rgba(139,58,30,0.4)" : "none",
      }}
    >
      {children}
    </button>
  );
}

// ─── Swatch ───────────────────────────────────────────────────────────────────
function Swatch({ name, hex, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onClick(name)}
      title={name}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 18, height: 18, borderRadius: "50%", background: hex,
        cursor: "pointer",
        border: active ? "2px solid #fff" : "2px solid transparent",
        boxShadow: active ? `0 0 0 1px ${hex}` : hovered ? "0 0 0 1px rgba(255,255,255,0.3)" : "none",
        transform: active ? "scale(1.3)" : hovered ? "scale(1.15)" : "scale(1)",
        transition: "all 0.15s ease", flexShrink: 0,
      }}
    />
  );
}

// ─── usePdfJs hook ────────────────────────────────────────────────────────────
function usePdfJs() {
  const [ready, setReady] = useState(!!window.pdfjsLib);
  useEffect(() => {
    if (window.pdfjsLib) { setReady(true); return; }
    const script = document.createElement("script");
    script.src = PDFJS_CDN;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_CDN;
      setReady(true);
    };
    document.head.appendChild(script);
  }, []);
  return ready;
}

// ─── PageCanvas ───────────────────────────────────────────────────────────────
// isLocked      → full lock screen (no PDF)
// showUnlockCTA → last unlocked page: render PDF + fade CTA at bottom
function PageCanvas({
  pdf, pageNum, scale, highlights, mode, hlColor,
  onHighlight, onNote, onBookmark, onRemoveHighlight, isMobile, isLocked,
  showUnlockCTA, perPageCost, walletBalance, onUnlockPage, isLight,
  isCompleted, onMarkCompleted, isPageUnlocked,
}) {
  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragRect, setDragRect] = useState(null);
  const renderTaskRef = useRef(null);
  const canAfford = walletBalance >= perPageCost;

  // Render PDF
  useEffect(() => {
    if (!pdf || !canvasRef.current || isLocked) return;
    let cancelled = false;
    async function render() {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
      }
      const page = await pdf.getPage(pageNum);
      let sc = scale;
      if (sc === "fit") {
        const vp0 = page.getViewport({ scale: 1 });
        const viewerW = (wrapRef.current?.parentElement?.clientWidth ?? 360) - (isMobile ? 24 : 48);
        sc = Math.min(viewerW / vp0.width, isMobile ? 2.0 : 3.0);
      } else if (isMobile) {
        // On mobile, auto-constrain scale so page never exceeds screen width
        const vp0 = page.getViewport({ scale: 1 });
        const maxW = window.innerWidth - 24;
        const fitScale = maxW / vp0.width;
        sc = Math.min(sc, fitScale * 1.5);
      }
      const vp = page.getViewport({ scale: sc });
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = vp.width;
      canvas.height = vp.height;
      setDims({ w: vp.width, h: vp.height });
      const ctx = canvas.getContext("2d");
      const task = page.render({ canvasContext: ctx, viewport: vp });
      renderTaskRef.current = task;
      try { await task.promise; } catch {}
    }
    render();
    return () => { cancelled = true; };
  }, [pdf, pageNum, scale, isLocked, isMobile]);

  const getRelPos = (e, el) => {
    const r = el.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height };
  };

  const handleStart = (e) => {
    if (mode === "select" || mode === "bookmark" || isLocked) return;
    if (e.touches && e.touches.length > 1) return; // allow pinch-zoom
    e.preventDefault();
    const pos = getRelPos(e, e.currentTarget);
    
    // For remove mode, handle single clicks/taps immediately
    if (mode === "remove") {
      const rect = { x: pos.x - 0.01, y: pos.y - 0.01, w: 0.02, h: 0.02 };
      onRemoveHighlight(pageNum, rect);
      return;
    }
    
    setDragStart(pos); setDragging(true); setDragRect(null);
  };
  const handleMove = (e) => {
    if (!dragging || !dragStart) return;
    const pos = getRelPos(e, e.currentTarget);
    setDragRect({
      x: Math.min(dragStart.x, pos.x), y: Math.min(dragStart.y, pos.y),
      w: Math.abs(pos.x - dragStart.x), h: Math.abs(pos.y - dragStart.y),
    });
  };
  const handleEnd = (e) => {
    if (!dragging || !dragStart) return;
    setDragging(false);
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const pos = { x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height };
    const rect = {
      x: Math.min(dragStart.x, pos.x), y: Math.min(dragStart.y, pos.y),
      w: Math.abs(pos.x - dragStart.x), h: Math.abs(pos.y - dragStart.y),
    };
    setDragRect(null); setDragStart(null);
    if (rect.w < 0.01 || rect.h < 0.005) return;
    if (mode === "highlight") onHighlight(pageNum, rect, hlColor);
    if (mode === "note") onNote(pageNum, rect, clientX, clientY, hlColor);
    if (mode === "remove") onRemoveHighlight(pageNum, rect);
  };

  const pageHls = highlights.filter(h => h.page === pageNum);

  // ── LOCKED PAGE: minimal compact placeholder — not a full rendered page ────
  if (isLocked) {
    return (
      <div
        ref={wrapRef}
        style={{
          position: "relative",
          flexShrink: 0,
          borderRadius: 6,
          overflow: "hidden",
          boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
          width: "100%",
          maxWidth: isMobile ? "100%" : 680,
          // Compact height — just enough to show the lock UI, not a full page
          minHeight: isMobile ? 200 : 240,
          background: isLight
            ? "linear-gradient(160deg, #f0ece4 0%, #e8e0d0 100%)"
            : "linear-gradient(160deg, #111 0%, #0a0a0a 100%)",
          border: `1px solid ${isLight ? "#ddd" : "rgba(34,197,94,0.12)"}`,
        }}
      >
        {/* Subtle diagonal stripe */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.03,
          backgroundImage: `repeating-linear-gradient(45deg, ${TOKENS.amber} 0px, ${TOKENS.amber} 1px, transparent 1px, transparent 32px)`,
        }} />

        <div style={{
          position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "row",
          gap: isMobile ? 12 : 20,
          padding: isMobile ? "20px 16px" : "28px 32px",
          height: "100%",
          minHeight: "inherit",
        }}>
          {/* Lock badge */}
          <div style={{
            width: isMobile ? 40 : 48,
            height: isMobile ? 40 : 48,
            borderRadius: "50%",
            background: "rgba(34,197,94,0.08)",
            border: `1px solid ${TOKENS.borderLight}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Icon d={ICONS.lock} size={isMobile ? 18 : 22} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: isMobile ? 10 : 11,
              color: isLight ? TOKENS.warmGray : "rgba(255,255,255,0.35)",
              letterSpacing: "0.12em", textTransform: "uppercase",
              fontFamily: "monospace", marginBottom: 4,
            }}>
              Page {pageNum} · Locked
            </div>
            <div style={{
              fontSize: isMobile ? 13 : 15,
              color: isLight ? TOKENS.inkBrown : "rgba(255,255,255,0.7)",
              fontFamily: "'Georgia', serif", fontStyle: "italic",
              marginBottom: 10,
            }}>
              Unlock to continue reading
            </div>
            <button
              onClick={() => onUnlockPage(pageNum)}
              style={{
                padding: isMobile ? "7px 14px" : "8px 18px",
                background: canAfford
                  ? "linear-gradient(135deg, #16a34a, #22c55e)"
                  : "rgba(255,255,255,0.06)",
                border: `1px solid ${canAfford ? TOKENS.rustLight : TOKENS.borderLight}`,
                borderRadius: 6,
                color: canAfford ? "#fff" : TOKENS.dimText,
                fontSize: isMobile ? 11 : 12,
                fontFamily: "'Georgia', serif",
                letterSpacing: "0.03em",
                cursor: canAfford ? "pointer" : "not-allowed",
                transition: "all 0.2s ease",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <span style={{ fontSize: isMobile ? 11 : 12, color: TOKENS.amber }}>◆</span>
              {canAfford ? `Unlock — ${perPageCost} coins` : `Need ${perPageCost} coins`}
            </button>
          </div>

          {/* Balance pill */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            padding: "8px 12px",
            background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${isLight ? "#ddd" : TOKENS.borderLight}`,
            borderRadius: 8, flexShrink: 0,
            display: isMobile ? "none" : "flex",
          }}>
            <span style={{ color: TOKENS.amber, fontSize: 16 }}>◆</span>
            <span style={{ fontFamily: "monospace", fontSize: 13, color: isLight ? TOKENS.inkBrown : "rgba(255,255,255,0.6)" }}>
              {walletBalance}
            </span>
            <span style={{ fontSize: 9, color: TOKENS.warmGray, letterSpacing: "0.08em" }}>coins</span>
          </div>
        </div>
      </div>
    );
  }

  // ── UNLOCKED PAGE ─────────────────────────────────────────────────────────
  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        flexShrink: 0,
        borderRadius: 3,
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.3)",
        background: isLight ? "#000" : "#fff",
        // Let width be determined by canvas content, but never exceed viewport
        maxWidth: "100%",
        width: dims.w ? Math.min(dims.w, isMobile ? window.innerWidth - 24 : 9999) : "auto",
        height: dims.h || "auto",
        transition: "box-shadow 0.2s ease",
      }}
    >
      <div style={{ position: "relative", overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            maxWidth: "100%",
            filter: isLight ? "none" : "invert(1) hue-rotate(180deg)",
          }}
        />

        {/* Highlights */}
        {pageHls.map(hl => (
          <div
            key={hl.id}
            title={hl.note || ""}
            style={{
              position: "absolute",
              background: HL_COLORS[hl.color] || HL_COLORS.yellow,
              mixBlendMode: isLight ? "multiply" : "screen",
              borderRadius: 2, cursor: "pointer",
              left: `${hl.x * 100}%`, top: `${hl.y * 100}%`,
              width: `${hl.w * 100}%`, height: `${hl.h * 100}%`,
              transition: "opacity 0.15s",
              filter: isLight ? "none" : "invert(1) hue-rotate(180deg)",
            }}
          />
        ))}

        {/* Completed page indicator */}
        {isCompleted && isPageUnlocked && (
          <div style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            color: "#fff",
            padding: "6px 12px",
            borderRadius: 20,
            fontSize: 11,
            fontFamily: "'Jost', sans-serif",
            fontWeight: 600,
            boxShadow: "0 2px 8px rgba(34,197,94,0.4)",
            display: "flex",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
            transition: "all 0.2s ease",
            filter: isLight ? "none" : "invert(1) hue-rotate(180deg)",
          }} onClick={onMarkCompleted}>
            <span>✓</span>
            <span>Completed</span>
          </div>
        )}

        {/* Drag preview */}
        {dragging && dragRect && (
          <div style={{
            position: "absolute",
            left: `${dragRect.x * 100}%`, top: `${dragRect.y * 100}%`,
            width: `${dragRect.w * 100}%`, height: `${dragRect.h * 100}%`,
            border: `1.5px dashed ${TOKENS.rust}`,
            background: "rgba(34,197,94,0.07)",
            pointerEvents: "none", zIndex: 5, borderRadius: 2,
          }} />
        )}
      </div>

      {/* Interaction overlay — supports both mouse and touch */}
      <div
        style={{
          position: "absolute", inset: 0,
          cursor: mode === "select" ? "default"
            : mode === "highlight" ? "crosshair"
            : mode === "note" ? "cell"
            : "pointer",
          userSelect: "none",
          touchAction: mode === "select" || mode === "bookmark" ? "auto" : "none",
        }}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onClick={() => mode === "bookmark" && onBookmark(pageNum)}
      />

      {/* Unlock CTA — gradient fade at bottom of last free page */}
      {showUnlockCTA && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(180deg, transparent 0%, rgba(10,10,10,0.95) 40%, #0a0a0a 100%)",
          padding: isMobile ? "48px 16px 24px" : "80px 40px 40px",
          textAlign: "center", pointerEvents: "none", zIndex: 10,
        }}>
          <div style={{ position: "relative", zIndex: 1, pointerEvents: "auto" }}>
            <div style={{
              width: isMobile ? 44 : 56, height: isMobile ? 44 : 56,
              borderRadius: "50%",
              background: "rgba(34,197,94,0.1)",
              border: `1.5px solid ${TOKENS.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 12px",
            }}>
              <Icon d={ICONS.lock} size={isMobile ? 20 : 26} />
            </div>

            <div style={{ fontSize: isMobile ? 15 : 18, color: TOKENS.bodyText, fontFamily: "'Georgia', serif", fontStyle: "italic", marginBottom: 6 }}>
              Continue Reading
            </div>
            <div style={{ fontSize: isMobile ? 11 : 13, color: TOKENS.subtleText, marginBottom: 16, lineHeight: 1.6 }}>
              Unlock the next page to keep reading
            </div>

            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 10px",
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${TOKENS.border}`,
              borderRadius: 14, fontSize: 11, color: TOKENS.warmGray, marginBottom: 12, fontFamily: "monospace",
            }}>
              <span style={{ color: TOKENS.amber, fontSize: 12 }}>◆</span>
              {walletBalance} coins
            </div>

            <button
              onClick={() => onUnlockPage(pageNum + 1)}
              style={{
                display: "block", width: "100%",
                padding: isMobile ? "10px 14px" : "12px 20px",
                background: canAfford
                  ? "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)"
                  : "rgba(255,255,255,0.06)",
                border: `1px solid ${canAfford ? TOKENS.rustLight : TOKENS.borderLight}`,
                borderRadius: 6,
                color: canAfford ? "#fff" : TOKENS.dimText,
                fontSize: isMobile ? 12 : 13,
                fontFamily: "'Georgia', serif",
                cursor: canAfford ? "pointer" : "not-allowed",
                transition: "all 0.2s ease",
              }}
            >
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
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
        <ThumbnailItem key={n} pdf={pdf} pageNum={n} active={n === currentPage} onGoTo={onGoTo} />
      ))}
    </div>
  );
}

function ThumbnailItem({ pdf, pageNum, active, onGoTo }) {
  const ref = useRef(null);
  const [rendered, setRendered] = useState(false);
  const [hovered, setHovered] = useState(false);

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
    <div
      onClick={() => onGoTo(pageNum)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer", borderRadius: 4, overflow: "hidden",
        border: `2px solid ${active ? TOKENS.rust : hovered ? TOKENS.parchmentDim : "transparent"}`,
        background: "#fff",
        boxShadow: active ? "0 2px 12px rgba(22,163,74,0.35)" : hovered ? "0 2px 8px rgba(0,0,0,0.15)" : "0 1px 4px rgba(0,0,0,0.1)",
        transition: "all 0.15s ease",
        transform: hovered && !active ? "translateX(2px)" : "none",
      }}
    >
      <canvas ref={ref} style={{ width: "100%", display: "block" }} />
      <div style={{
        textAlign: "center", fontSize: 9, padding: "3px 0",
        color: active ? TOKENS.rust : TOKENS.warmGray,
        fontFamily: "monospace", letterSpacing: "0.06em",
        background: active ? TOKENS.parchmentMid : TOKENS.parchment,
        transition: "all 0.15s",
      }}>
        {pageNum}
      </div>
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 16px", color: TOKENS.warmGray }}>
      <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.5 }}>{icon}</div>
      <div style={{ fontSize: 12, fontStyle: "italic", lineHeight: 1.7, opacity: 0.8 }}>{text}</div>
    </div>
  );
}

function Spinner({ size = 32, color = TOKENS.rust }) {
  return (
    <div style={{
      width: size, height: size,
      border: "2.5px solid rgba(255,255,255,0.08)",
      borderTopColor: color,
      borderRadius: "50%",
      animation: "pdfrSpin 0.75s linear infinite",
      flexShrink: 0,
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

  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("dkituyiacademy-theme") || "dark"; } catch { return "dark"; }
  });
  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem("dkituyiacademy-theme", next); } catch {}
  }, [theme]);

  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  
  // Mobile gesture state
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [lastTap, setLastTap] = useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [sidebarTouchStart, setSidebarTouchStart] = useState(null);

  useEffect(() => {
    const handle = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
      setSidebarOpen(w >= 768);
    };
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  // Cleanup mobile gesture timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  const [book, setBook] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [unlockedPages, setUnlockedPages] = useState(new Set());
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

  // Mark page as completed function
  const markPageCompleted = async (pageNum) => {
    try {
      const res = await api.post('/api/reader/features/mark_completed/', {
        book_id: bookId,
        page_number: pageNum
      });
      
      if (res.data.message) {
        setCompletedPages(prev => new Set([...prev, pageNum]));
        toast(`Page ${pageNum} marked as completed!`);
        
        // Update progress
        const progressPercent = ((pageNum) / Math.max(1, totalPages - 1)) * 100;
        setProgress(progressPercent);
      }
    } catch (error) {
      console.error('Failed to mark page as completed:', error);
      toast('Failed to mark page as completed');
    }
  };

  const loadUnlockedPages = async () => {
    if (isPreviewMode()) { setUnlockedPages(new Set()); return true; }
    try {
      const r = await api.get(`/api/reader/features/unlocked_pages/${bookId}/`);
      setUnlockedPages(new Set(r.data.unlocked_pages || []));
      return true;
    } catch { setUnlockedPages(new Set()); return false; }
  };

  useEffect(() => {
    if (!loading && book && unlockedPages.size === 0) {
      const t = setTimeout(() => loadUnlockedPages(), 1000);
      return () => clearTimeout(t);
    }
  }, [loading, book, unlockedPages.size]);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      if (!mounted) return;
      try {
        if (isPreviewMode()) {
          const r = await api.get(`/api/books/${bookId}/`);
          if (!mounted) return;
          setBook(r.data); setWalletBalance(0);
          setPerPageCost(r.data.per_page_cost || 1);
          setUnlockedPages(new Set());
        } else {
          const [bookRes, walletRes] = await Promise.all([
            api.get(`/api/books/${bookId}/`),
            api.get("/api/payments/wallet/"),
          ]);
          if (!mounted) return;
          setBook(bookRes.data); setWalletBalance(walletRes.data.balance);
          setPerPageCost(bookRes.data.per_page_cost || 1);
          await loadUnlockedPages();
        }
        setLoading(false);
      } catch (err) {
        if (mounted) { setLoadError(true); setLoading(false); }
      }
    }
    if (bookId && (token || isPreviewMode()) && !book) fetchData();
    return () => { mounted = false; };
  }, [bookId, token, book, isPreviewMode]);

  const isPageUnlocked = useCallback((n) => {
    if (!totalPages) return false;
    const freePages = Math.max(1, Math.ceil(totalPages * 0.2));
    return n <= freePages || unlockedPages.has(n);
  }, [totalPages, unlockedPages]);

  const getLastUnlockedPage = useCallback(() => {
    if (!totalPages) return 1;
    const freePages = Math.max(1, Math.ceil(totalPages * 0.2));
    let last = freePages;
    for (let n = freePages + 1; n <= totalPages; n++) {
      if (unlockedPages.has(n)) last = n;
      else break;
    }
    return Math.min(last, totalPages);
  }, [totalPages, unlockedPages]);

  const shouldShowUnlockCTA = useCallback((n) => {
    const last = getLastUnlockedPage();
    return n === last && last < totalPages;
  }, [getLastUnlockedPage, totalPages]);

  const loadPDF = useCallback(async (source) => {
    if (!window.pdfjsLib) return;
    setLoading(true); setLoadError(false);
    try {
      let docInit;
      if (source instanceof ArrayBuffer) {
        docInit = { data: source };
      } else {
        const res = await api.get(source, { responseType: "arraybuffer" });
        docInit = { data: res.data };
      }
      const doc = await window.pdfjsLib.getDocument(docInit).promise;
      setPdf(doc); setTotalPages(doc.numPages);
      setCurrentPage(1); setPageInput("1"); setProgress(0);
      setLoading(false);
    } catch (e) {
      setLoading(false); setLoadError(true);
    }
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
      setCurrentPage(closest);
      setPageInput(String(closest));
      setProgress(((closest - 1) / Math.max(1, totalPages - 1)) * 100);
    }
  }, [currentPage, totalPages]);

  const goToPage = useCallback((n) => {
    n = Math.max(1, Math.min(n, totalPages));
    if (!isPageUnlocked(n)) {
      setPendingPage(n); setShowUnlockPrompt(true);
      return;
    }
    setCurrentPage(n); setPageInput(String(n));
    setProgress(((n - 1) / Math.max(1, totalPages - 1)) * 100);
    const el = pageRefs.current[n];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [totalPages, isPageUnlocked]);

  const unlockPage = useCallback(async (pageNum) => {
    if (isPageUnlocked(pageNum)) { toast("Page already unlocked"); return; }
    
    // Check if previous page is completed (except for first page)
    const previousPage = pageNum - 1;
    if (previousPage >= 1 && !completedPages.has(previousPage)) {
      const shouldCompleteFirst = window.confirm(
        `Have you completed page ${previousPage}?\n\n` +
        `It's recommended to mark pages as complete before unlocking the next one.\n\n` +
        `Click "OK" to mark page ${previousPage} as complete and unlock page ${pageNum},\n` +
        `or "Cancel" to just unlock page ${pageNum}.`
      );
      
      if (shouldCompleteFirst) {
        // Mark previous page as complete first
        try {
          const res = await api.post('/api/reader/features/mark_completed/', {
            book_id: bookId,
            page_number: previousPage
          });
          
          if (res.data.message) {
            setCompletedPages(prev => new Set([...prev, previousPage]));
            toast(`Page ${previousPage} marked as completed!`);
            
            // Update progress
            const progressPercent = ((previousPage) / Math.max(1, totalPages - 1)) * 100;
            setProgress(progressPercent);
          }
        } catch (error) {
          console.error('Failed to mark page as completed:', error);
          toast('Failed to mark page as completed, but will proceed with unlock');
        }
      }
    }
    
    setUnlockLoading(true);
    try {
      const res = await api.post(`/api/reader/features/unlock_page/`, { book_id: bookId, page_number: pageNum });
      if (res.data.message) {
        setUnlockedPages(prev => new Set([...prev, pageNum]));
        setWalletBalance(res.data.remaining_balance);
        toast(`Page ${pageNum} unlocked!`);
        
        // Refresh unlocked pages from server
        setTimeout(async () => {
          try {
            const r = await api.get(`/api/reader/features/unlocked_pages/${bookId}/`);
            setUnlockedPages(new Set(r.data.unlocked_pages || []));
          } catch {}
        }, 500);
        
        // Focus on the newly unlocked page
        setCurrentPage(pageNum);
        
        // Scroll to the unlocked page after a short delay for rendering
        setTimeout(() => {
          const el = pageRefs.current[pageNum];
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      }
    } catch (error) {
      console.error('Unlock error:', error);
      if (error.response?.data?.requires_completion) {
        // Handle sequential reading requirement
        const { previous_page } = error.response.data;
        toast(`You must complete page ${previous_page} first!`);
        // Optionally navigate to the previous page
        goToPage(previous_page);
      } else {
        toast(error.response?.data?.error || "Failed to unlock page");
      }
    } finally {
      setUnlockLoading(false);
    }
  }, [unlockLoading, walletBalance, perPageCost, bookId, toast, isPageUnlocked]);

  const handleInlineUnlock = useCallback(async (pageNum) => {
    await unlockPage(pageNum);
  }, [unlockPage]);

  const handleModalUnlock = useCallback(async () => {
    if (!pendingPage || unlockLoading) return;
    if (isPageUnlocked(pendingPage)) {
      toast("Page already unlocked");
      setShowUnlockPrompt(false); setPendingPage(null); return;
    }
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
    } catch {
      toast("Failed to unlock. Try again.");
    } finally {
      setUnlockLoading(false);
    }
  }, [pendingPage, unlockLoading, bookId, toast, isPageUnlocked, goToPage]);

  const handleBulkUnlock = useCallback(async () => {
    if (unlockLoading || bulkUnlockCount < 1) return;
    
    // Check if current page is completed before bulk unlocking
    if (!completedPages.has(currentPage)) {
      const shouldCompleteFirst = window.confirm(
        `Have you completed page ${currentPage}?\n\n` +
        `It's recommended to mark pages as complete before unlocking more pages.\n\n` +
        `Click "OK" to mark page ${currentPage} as complete and proceed with bulk unlock,\n` +
        `or "Cancel" to just proceed with bulk unlock.`
      );
      
      if (shouldCompleteFirst) {
        // Mark current page as complete first
        try {
          const res = await api.post('/api/reader/features/mark_completed/', {
            book_id: bookId,
            page_number: currentPage
          });
          
          if (res.data.message) {
            setCompletedPages(prev => new Set([...prev, currentPage]));
            toast(`Page ${currentPage} marked as completed!`);
            
            // Update progress
            const progressPercent = ((currentPage) / Math.max(1, totalPages - 1)) * 100;
            setProgress(progressPercent);
          }
        } catch (error) {
          console.error('Failed to mark page as completed:', error);
          toast('Failed to mark page as completed, but will proceed with bulk unlock');
        }
      }
    }
    
    const totalCost = perPageCost * bulkUnlockCount;
    if (walletBalance < totalCost) { 
      toast(`Need ${totalCost - walletBalance} more coins`); 
      return; 
    }
    
    setUnlockLoading(true);
    try {
      // Find the next locked pages to unlock
      const pagesToUnlock = [];
      let page = currentPage;
      
      while (pagesToUnlock.length < bulkUnlockCount && page <= totalPages) {
        if (!isPageUnlocked(page)) {
          pagesToUnlock.push(page);
        }
        page++;
      }
      
      if (pagesToUnlock.length === 0) {
        toast("No more pages to unlock");
        return;
      }
      
      // Unlock pages in batch
      const unlockPromises = pagesToUnlock.map(pageNum => 
        api.post(`/api/reader/features/unlock_page/`, { book_id: bookId, page_number: pageNum })
      );
      
      const results = await Promise.all(unlockPromises);
      let unlockedCount = 0;
      let newBalance = walletBalance;
      
      results.forEach(res => {
        if (res.data.message) {
          unlockedCount++;
          newBalance = res.data.remaining_balance;
        }
      });
      
      if (unlockedCount > 0) {
        setUnlockedPages(prev => new Set([...prev, ...pagesToUnlock.slice(0, unlockedCount)]));
        setWalletBalance(newBalance);
        toast(`Unlocked ${unlockedCount} page${unlockedCount > 1 ? 's' : ''} ✓`);
        setRenderKey(prev => prev + 1);
        setShowBulkUnlock(false);
        setBulkUnlockCount(1);
        
        // Refresh unlocked pages from server
        setTimeout(async () => {
          try {
            const r = await api.get(`/api/reader/features/unlocked_pages/${bookId}/`);
            setUnlockedPages(new Set(r.data.unlocked_pages || []));
          } catch {}
        }, 500);
      }
    } catch {
      toast("Failed to unlock pages. Try again.");
    } finally {
      setUnlockLoading(false);
    }
  }, [bulkUnlockCount, unlockLoading, perPageCost, walletBalance, currentPage, totalPages, bookId, toast, isPageUnlocked]);

  // Keyboard
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
    // Find and remove highlights that overlap with the clicked/touched area
    setHighlights(prev => {
      const updated = prev.filter(hl => {
        if (hl.page !== pageNum) return true;
        // Check if rectangles overlap with some tolerance
        const tolerance = 0.01;
        return !(Math.abs(hl.x - rect.x) < tolerance && 
                 Math.abs(hl.y - rect.y) < tolerance &&
                 Math.abs(hl.w - rect.w) < tolerance &&
                 Math.abs(hl.h - rect.h) < tolerance);
      });
      const removed = prev.length - updated.length;
      if (removed > 0) {
        toast(`Removed ${removed} highlight${removed > 1 ? 's' : ''} ✓`);
      } else {
        toast("No highlights found in this area");
      }
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

  // Mobile gesture handlers
  const handleTouchStart = useCallback((e) => {
    if (!isMobile) return;
    setTouchEnd(null);
    const currentTime = Date.now();
    
    // Clear any existing long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // Check for double tap
    if (lastTap && currentTime - lastTap.time < 300) {
      // Double tap detected - toggle zoom
      if (scale === 1.0) {
        setScale(1.5);
        toast("Zoomed in");
      } else {
        setScale(1.0);
        toast("Zoomed out");
      }
      
      setLastTap(null); // Reset to avoid triple taps
      return;
    }
    
    // Start long press timer
    const timer = setTimeout(() => {
      setIsLongPressing(true);
      // Show context menu or quick actions
      toast("Long press - menu options");
      // You could trigger a context menu here
    }, 500);
    setLongPressTimer(timer);
    
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: currentTime
    });
    setLastTap({ time: currentTime, x: e.touches[0].clientX, y: e.touches[0].clientY });
  }, [isMobile, lastTap, scale, setScale, toast, longPressTimer]);

  const handleTouchMove = useCallback((e) => {
    if (!isMobile || !touchStart) return;
    
    // Cancel double tap if finger moves too much
    if (lastTap && Math.abs(e.touches[0].clientX - lastTap.x) > 10 && Math.abs(e.touches[0].clientY - lastTap.y) > 10) {
      setLastTap(null);
    }
    
    // Cancel long press if finger moves
    if (longPressTimer) {
      const moveThreshold = 15;
      const deltaX = Math.abs(e.touches[0].clientX - touchStart.x);
      const deltaY = Math.abs(e.touches[0].clientY - touchStart.y);
      
      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    }
    
    setTouchEnd({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  }, [isMobile, touchStart, lastTap, longPressTimer]);

  const handleTouchEnd = useCallback((e) => {
    // Clear long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // Reset long press state
    if (isLongPressing) {
      setIsLongPressing(false);
      setTouchStart(null);
      setTouchEnd(null);
      setTimeout(() => setLastTap(null), 300);
      return;
    }
    
    if (!isMobile || !touchStart || !touchEnd) return;
    
    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;
    
    // Minimum swipe distance and maximum time
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;
    
    if (Math.abs(deltaX) > minSwipeDistance && deltaTime < maxSwipeTime) {
      // Horizontal swipe detected
      if (Math.abs(deltaY) < Math.abs(deltaX)) {
        // Prevent vertical component from interfering
        if (deltaX > 0) {
          // Swipe right - previous page
          if (currentPage > 1) {
            goToPage(currentPage - 1);
            toast("Previous page");
          }
        } else {
          // Swipe left - next page
          if (currentPage < totalPages) {
            goToPage(currentPage + 1);
            toast("Next page");
          }
        }
      }
    }
    
    setTouchStart(null);
    setTouchEnd(null);
    
    // Reset last tap after a delay to allow for new double taps
    setTimeout(() => setLastTap(null), 300);
  }, [isMobile, touchStart, touchEnd, currentPage, totalPages, goToPage, toast, longPressTimer, isLongPressing]);

  // Sidebar swipe handlers
  const handleSidebarTouchStart = useCallback((e) => {
    if (!isMobile || !sidebarOpen) return;
    setSidebarTouchStart({
      x: e.touches[0].clientX,
      time: Date.now()
    });
  }, [isMobile, sidebarOpen]);

  const handleSidebarTouchMove = useCallback((e) => {
    if (!isMobile || !sidebarOpen || !sidebarTouchStart) return;
    // Optional: Add visual feedback during swipe
  }, [isMobile, sidebarOpen, sidebarTouchStart]);

  const handleSidebarTouchEnd = useCallback((e) => {
    if (!isMobile || !sidebarOpen || !sidebarTouchStart) return;
    
    const deltaX = e.changedTouches[0].clientX - sidebarTouchStart.x;
    const deltaTime = Date.now() - sidebarTouchStart.time;
    
    // Swipe right to dismiss (positive deltaX means swipe right)
    const minSwipeDistance = 80;
    const maxSwipeTime = 300;
    
    if (deltaX > minSwipeDistance && deltaTime < maxSwipeTime) {
      // Swiped right enough - close sidebar
      setSidebarOpen(false);
      toast("Sidebar closed");
    }
    
    setSidebarTouchStart(null);
  }, [isMobile, sidebarOpen, sidebarTouchStart, setSidebarOpen, toast]);

  const saveAnnot = () => {
    if (!annotText.trim()) { toast("Enter a note first"); return; }
    const { pageNum, rect, color } = annotPopup;
    setNotes(prev => [...prev, { id: Date.now(), page: pageNum, text: annotText.trim(), rect, color, createdAt: new Date().toISOString() }]);
    if (rect) setHighlights(prev => [...prev, { id: Date.now() + 1, page: pageNum, ...rect, color, note: annotText.trim() }]);
    setAnnotPopup(null);
    toast("Note saved ✓");
    setActiveTab("notes");
    if (!sidebarOpen) setSidebarOpen(true);
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

  const isLight      = theme === "light";
  const sidebarBg    = isLight ? "#f9f3e8" : "#111";
  const sidebarBdr   = isLight ? "#e0d0b0" : TOKENS.border;
  const sidebarText  = isLight ? TOKENS.inkBrown : TOKENS.bodyText;
  const sidebarMuted = isLight ? TOKENS.warmGray : "rgba(240,230,211,0.45)";

  const toolModes = [
    { id: "select",    icon: ICONS.cursor,    label: "Select",    tip: "S" },
    { id: "highlight", icon: ICONS.highlight, label: "Highlight", tip: "H" },
    { id: "note",      icon: ICONS.note,      label: "Note",      tip: "N" },
    { id: "bookmark",  icon: ICONS.bookmark,  label: "Bookmark",  tip: "B" },
    { id: "remove",    icon: ICONS.x,         label: "Remove",    tip: "Remove highlights" },
  ];

  // ── Unlock modal ─────────────────────────────────────────────────────────
  if (showUnlockPrompt && pendingPage) {
    const freePages = Math.max(1, Math.ceil((totalPages * 0.2) || 1));
    const isFreePage = pendingPage <= freePages;
    const canAfford  = walletBalance >= perPageCost;
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}>
        <div style={{
          background: isLight ? TOKENS.parchment : "#1a1208",
          border: `1px solid ${TOKENS.border}`,
          borderRadius: 14, padding: isMobile ? 24 : 40,
          width: "100%", maxWidth: 440,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: "50%",
            background: "rgba(34,197,94,0.1)", border: `1px solid ${TOKENS.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
          }}>
            <Icon d={ICONS.lock} size={26} />
          </div>
          <h2 style={{ textAlign: "center", margin: "0 0 12px", fontSize: isMobile ? 20 : 24, fontFamily: "'Georgia', serif", fontStyle: "italic", color: sidebarText }}>
            {isPreviewMode() && !isFreePage ? "Preview Complete" : isFreePage ? "Free Preview" : "Unlock Page"}
          </h2>
          <p style={{ textAlign: "center", margin: "0 0 24px", fontSize: 14, color: sidebarMuted, lineHeight: 1.7 }}>
            {isPreviewMode() && !isFreePage
              ? `You've reached the end of your free preview (${freePages} pages). Sign up to continue!`
              : isFreePage
                ? `Page ${pendingPage} is part of your free preview (first ${freePages} pages).`
                : `Unlock page ${pendingPage} for ${perPageCost} coins. You have ${walletBalance} coins.`}
          </p>
          {!isFreePage && !canAfford && (
            <div style={{ textAlign: "center", marginBottom: 16, fontSize: 13, color: TOKENS.rosewood, padding: "8px 14px", background: "rgba(230,80,140,0.08)", border: "1px solid rgba(230,80,140,0.2)", borderRadius: 6 }}>
              Insufficient balance — please top up your wallet.
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={() => { setShowUnlockPrompt(false); setPendingPage(null); }} style={{ padding: "11px 22px", background: "transparent", border: `1px solid ${sidebarBdr}`, borderRadius: 8, fontSize: 14, cursor: "pointer", color: sidebarMuted, fontFamily: "'Georgia', serif" }}>
              Cancel
            </button>
            {isPreviewMode() && !isFreePage ? (
              <button onClick={() => { window.location.href = `/login?redirect=/reader/${bookId}`; }} style={{ padding: "11px 22px", background: "linear-gradient(135deg, #16a34a, #22c55e)", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer", color: "#fff", fontFamily: "'Georgia', serif", fontWeight: 600 }}>
                Sign In to Continue
              </button>
            ) : isFreePage ? (
              <button onClick={() => {
                setShowUnlockPrompt(false);
                setCurrentPage(pendingPage); setPageInput(String(pendingPage));
                setProgress(((pendingPage - 1) / Math.max(1, totalPages - 1)) * 100);
                const el = pageRefs.current[pendingPage];
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                setPendingPage(null);
              }} style={{ padding: "11px 22px", background: "linear-gradient(135deg, #16a34a, #22c55e)", border: `1px solid ${TOKENS.rustLight}`, borderRadius: 8, fontSize: 14, cursor: "pointer", color: "#fff", fontFamily: "'Georgia', serif" }}>
                Read Free Page
              </button>
            ) : canAfford ? (
              <button onClick={handleModalUnlock} disabled={unlockLoading} style={{ padding: "11px 22px", background: unlockLoading ? "rgba(22,163,74,0.5)" : "linear-gradient(135deg, #16a34a, #22c55e)", border: `1px solid ${TOKENS.rustLight}`, borderRadius: 8, fontSize: 14, cursor: unlockLoading ? "not-allowed" : "pointer", color: "#fff", fontFamily: "'Georgia', serif", display: "flex", alignItems: "center", gap: 8 }}>
                {unlockLoading && <Spinner size={14} color="#fff" />}
                {unlockLoading ? "Unlocking…" : `Unlock — ${perPageCost} coins`}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // ── Bulk Unlock Modal ─────────────────────────────────────────────────────────
  if (showBulkUnlock) {
    const totalCost = perPageCost * bulkUnlockCount;
    const canAfford = walletBalance >= totalCost;
    const sidebarBg = isLight ? "#f9f3e8" : "#111";
    const sidebarBdr = isLight ? "#e0d0b0" : TOKENS.border;
    const sidebarMuted = isLight ? TOKENS.warmGray : "rgba(240,230,211,0.45)";
    
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}>
        <div style={{
          background: sidebarBg, border: `1px solid ${sidebarBdr}`, borderRadius: 12,
          padding: 28, maxWidth: 400, width: "100%", fontFamily: "'Georgia', serif",
        }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 20, color: isLight ? TOKENS.inkBrown : TOKENS.bodyText }}>
            Bulk Unlock Pages
          </h3>
          <p style={{ margin: "0 0 20px", fontSize: 15, lineHeight: 1.5, color: sidebarMuted }}>
            Unlock the next {bulkUnlockCount} page{bulkUnlockCount > 1 ? 's' : ''} starting from page {currentPage}.
            Total cost: {totalCost} coins. You have {walletBalance} coins.
          </p>
          
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, color: sidebarMuted }}>
              Number of pages to unlock:
            </label>
            <input
              type="number"
              min="1"
              max={Math.min(20, totalPages - currentPage + 1)}
              value={bulkUnlockCount}
              onChange={e => setBulkUnlockCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              style={{
                width: "100%", padding: "10px 12px", border: `1px solid ${sidebarBdr}`,
                borderRadius: 6, fontSize: 14, background: isLight ? "#fff" : "rgba(255,255,255,0.05)",
                color: isLight ? TOKENS.inkBrown : TOKENS.bodyText,
              }}
            />
          </div>
          
          {!canAfford && (
            <div style={{ textAlign: "center", marginBottom: 16, fontSize: 13, color: TOKENS.rosewood, padding: "8px 14px", background: "rgba(230,80,140,0.08)", border: "1px solid rgba(230,80,140,0.2)", borderRadius: 6 }}>
              Need {totalCost - walletBalance} more coins
            </div>
          )}
          
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={() => { setShowBulkUnlock(false); setBulkUnlockCount(1); }} style={{ padding: "11px 22px", background: "transparent", border: `1px solid ${sidebarBdr}`, borderRadius: 8, fontSize: 14, cursor: "pointer", color: sidebarMuted, fontFamily: "'Georgia', serif" }}>
              Cancel
            </button>
            {canAfford ? (
              <button onClick={handleBulkUnlock} disabled={unlockLoading} style={{ padding: "11px 22px", background: unlockLoading ? "rgba(22,163,74,0.5)" : "linear-gradient(135deg, #16a34a, #22c55e)", border: `1px solid ${TOKENS.rustLight}`, borderRadius: 8, fontSize: 14, cursor: unlockLoading ? "not-allowed" : "pointer", color: "#fff", fontFamily: "'Georgia', serif", display: "flex", alignItems: "center", gap: 8 }}>
                {unlockLoading && <Spinner size={14} color="#fff" />}
                {unlockLoading ? "Unlocking…" : `Unlock ${bulkUnlockCount} pages — ${totalCost} coins`}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN RENDER ───────────────────────────────────────────────────────────
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100dvh",          // dynamic viewport height — respects mobile browser chrome
      width: "100%",
      maxWidth: "100vw",
      overflow: "hidden",
      fontFamily: "'Georgia', serif",
      background: isLight ? TOKENS.parchment : TOKENS.surfaceMid,
      color: isLight ? TOKENS.inkBrown : TOKENS.bodyText,
    }}>
      {/* Reading progress bar */}
      <div style={{ height: 2, background: isLight ? "rgba(22,163,74,0.1)" : "rgba(255,255,255,0.05)", flexShrink: 0, position: "relative" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%", width: `${progress}%`,
          background: `linear-gradient(90deg, ${TOKENS.rust}, ${TOKENS.amber})`,
          transition: "width 0.35s ease", boxShadow: `0 0 8px ${TOKENS.amber}`,
        }} />
      </div>

      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center",
        gap: isMobile ? 2 : 3,
        padding: isMobile ? "0 8px" : "0 14px",
        height: isMobile ? 46 : 50, flexShrink: 0,
        background: isLight ? TOKENS.parchmentMid : TOKENS.surfaceDeep,
        borderBottom: `1px solid ${isLight ? TOKENS.parchmentDim : TOKENS.border}`,
        boxShadow: isLight ? "0 2px 20px rgba(0,0,0,0.1)" : "0 2px 20px rgba(0,0,0,0.4)",
        overflowX: "auto", overflowY: "hidden",
        // Prevent toolbar from shrinking on narrow screens
        minWidth: 0,
      }}>
        <TbBtn onClick={() => navigate("/dashboard")} title="Dashboard" compact={isMobile}>
          <Icon d={ICONS.prev} size={15} />
          {!isMobile && <span>Back</span>}
        </TbBtn>

        {!isMobile && (
          <>
            <div style={{ width: 1, height: 24, background: TOKENS.borderLight, margin: "0 6px" }} />
            <span style={{ fontStyle: "italic", fontSize: 17, color: TOKENS.amber, letterSpacing: "0.04em", userSelect: "none", flexShrink: 0 }}>
              Dkituyiacademy
            </span>
            <div style={{ width: 1, height: 24, background: TOKENS.borderLight, margin: "0 6px" }} />
            {isPreviewMode() && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(34,197,94,0.15)", border: `1px solid ${TOKENS.amber}`, borderRadius: 16, fontSize: 11, color: TOKENS.amber, fontFamily: "system-ui, sans-serif", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                <Icon d={ICONS.eye} size={10} />Preview
              </div>
            )}
          </>
        )}

        {/* Sidebar toggle */}
        <TbBtn active={sidebarOpen} onClick={() => setSidebarOpen(o => !o)} title="Pages & Annotations" compact={isMobile}>
          <Icon d={ICONS.menu} size={15} />
          {!isMobile && <span>Menu</span>}
        </TbBtn>

        {/* Refresh */}
        <TbBtn onClick={async () => {
          try {
            const r = await api.get(`/api/reader/features/unlocked_pages/${bookId}/`);
            setUnlockedPages(new Set(r.data.unlocked_pages || []));
            setRenderKey(prev => prev + 1);
            toast("Refreshed");
          } catch { toast("Failed to refresh"); }
        }} title="Refresh" compact={isMobile}>
          <Icon d={ICONS.refresh} size={15} />
          {!isMobile && <span>Refresh</span>}
        </TbBtn>

        {/* Page navigation */}
        <TbBtn onClick={() => goToPage(currentPage - 1)} title="Previous (Left Arrow)" compact={isMobile}>
          <Icon d={ICONS.prev} size={15} />
        </TbBtn>
        <input
          value={pageInput}
          onChange={e => setPageInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const n = parseInt(pageInput);
              if (!isNaN(n) && n >= 1 && n <= totalPages) goToPage(n);
            }
          }}
          onFocus={e => e.target.select()}
          style={{
            width: isMobile ? 45 : 55,
            height: isMobile ? 30 : 32,
            background: sidebarBg,
            border: `1px solid ${sidebarBdr}`,
            borderRadius: 4,
            color: sidebarText,
            textAlign: 'center',
            fontSize: isMobile ? 11 : 12,
            fontFamily: 'monospace',
            padding: '0 4px',
            outline: 'none',
          }}
          placeholder="1"
        />
        {!isMobile && (
          <span style={{
            color: sidebarMuted,
            fontSize: 11,
            fontFamily: 'monospace',
            minWidth: 20,
          }}>
            / {totalPages || "—"}
          </span>
        )}
        <TbBtn onClick={() => goToPage(currentPage + 1)} title="Next (Right Arrow)" compact={isMobile}>
          <Icon d={ICONS.next} size={15} />
        </TbBtn>

        {/* Zoom */}
        {!isMobile && <div style={{ width: 1, height: 24, background: TOKENS.borderLight, margin: "0 4px" }} />}
        <TbBtn onClick={zoomOut} title="Zoom out" compact={isMobile}><Icon d={ICONS.zoomOut} size={15} /></TbBtn>
        {!isMobile && (
          <select
            value={scale}
            onChange={e => setScale(e.target.value === "fit" ? "fit" : parseFloat(e.target.value))}
            style={{ height: 28, background: "rgba(255,255,255,0.07)", border: `1px solid ${TOKENS.borderLight}`, borderRadius: 5, color: "#fff", fontSize: 11, padding: "0 4px", cursor: "pointer", outline: "none" }}
          >
            {ZOOM_LEVELS.map(z => <option key={z} value={z}>{Math.round(z * 100)}%</option>)}
            <option value="fit">Fit</option>
          </select>
        )}
        <TbBtn onClick={zoomIn} title="Zoom in" compact={isMobile}><Icon d={ICONS.zoomIn} size={15} /></TbBtn>

        {/* Bulk unlock button */}
        {perPageCost > 0 && (
          <>
            <div style={{ width: 1, height: 24, background: TOKENS.borderLight, margin: "0 4px" }} />
            <TbBtn onClick={() => setShowBulkUnlock(true)} title="Bulk unlock pages" compact={isMobile}>
              <Icon d={ICONS.unlock} size={15} />
              {!isMobile && <span>Bulk</span>}
            </TbBtn>
          </>
        )}

        {/* Desktop tools */}
        {!isMobile && (
          <>
            <div style={{ width: 1, height: 24, background: TOKENS.borderLight, margin: "0 4px" }} />
            {toolModes.map(({ id, icon, label, tip }) => (
              <TbBtn key={id} active={mode === id} onClick={() => { setMode(id); if (id !== "select") toast(tip); }} title={tip}>
                <Icon d={icon} size={14} /><span>{label}</span>
              </TbBtn>
            ))}
            <div style={{ width: 1, height: 24, background: TOKENS.borderLight, margin: "0 4px" }} />
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {Object.entries(HL_SWATCHES).map(([name, hex]) => (
                <Swatch key={name} name={name} hex={hex} active={hlColor === name} onClick={setHlColor} />
              ))}
            </div>
          </>
        )}

        {!isMobile && <div style={{ width: 1, height: 24, background: TOKENS.borderLight, margin: "0 4px" }} />}

        <TbBtn active={searchOpen} onClick={() => setSearchOpen(o => !o)} title="Search (Ctrl+F)" compact={isMobile}>
          <Icon d={ICONS.search} size={14} />
        </TbBtn>
        <TbBtn onClick={toggleTheme} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} compact={isMobile}>
          <Icon d={theme === "dark" ? ICONS.sun : ICONS.moon} size={14} />
        </TbBtn>

        <div style={{ flex: 1, minWidth: 0 }} />

        {/* Mode badge — desktop only */}
        {!isMobile && (
          <div style={{
            fontSize: 9, padding: "3px 8px", borderRadius: 10,
            background: "rgba(255,255,255,0.06)", border: `1px solid ${TOKENS.borderLight}`,
            color: { select: TOKENS.cobalt, highlight: TOKENS.amber, note: TOKENS.rust, bookmark: TOKENS.rosewood }[mode] || "#fff",
            fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase", flexShrink: 0,
          }}>
            {mode}
          </div>
        )}

        {!isMobile && walletBalance > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 10px",
            background: TOKENS.amberDim, border: `1px solid ${TOKENS.border}`,
            borderRadius: 20, fontSize: 11, color: TOKENS.amber, fontFamily: "monospace", marginLeft: 4, flexShrink: 0,
          }}>
            <span style={{ fontSize: 12 }}>◆</span>{walletBalance}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative", minHeight: 0 }}>

        {/* Sidebar */}
        <div
          onTouchStart={handleSidebarTouchStart}
          onTouchMove={handleSidebarTouchMove}
          onTouchEnd={handleSidebarTouchEnd}
          style={{
            width: sidebarOpen ? (isMobile ? "80%" : isTablet ? 280 : 250) : 0,
            maxWidth: isMobile ? 300 : "none",
            flexShrink: 0, overflow: "hidden",
            transition: "width 0.22s ease",
            background: sidebarBg,
            borderRight: isMobile ? "none" : `1px solid ${sidebarBdr}`,
            display: "flex", flexDirection: "column",
            position: isMobile ? "absolute" : "relative",
            top: 0, left: 0, height: "100%",
            zIndex: 100,
            boxShadow: isMobile && sidebarOpen ? "4px 0 24px rgba(0,0,0,0.35)" : "none",
          }}>
          {/* Mobile close strip */}
          {isMobile && sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                position: "absolute", top: 12, right: 12,
                width: 28, height: 28, borderRadius: "50%",
                background: "rgba(0,0,0,0.1)", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: sidebarMuted, zIndex: 2,
              }}
            >
              <Icon d={ICONS.x} size={14} />
            </button>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${sidebarBdr}`, flexShrink: 0, background: sidebarBg }}>
            {["thumbs", "bookmarks", "notes", "highlights"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: "10px 2px",
                  background: "transparent", border: "none",
                  borderBottom: `2px solid ${activeTab === tab ? TOKENS.rust : "transparent"}`,
                  color: activeTab === tab ? TOKENS.rust : sidebarMuted,
                  fontSize: isMobile ? 8 : 10, cursor: "pointer",
                  fontFamily: "'Georgia', serif", textTransform: "uppercase", letterSpacing: "0.07em",
                  transition: "all 0.15s", outline: "none",
                  fontWeight: activeTab === tab ? "bold" : "normal",
                }}
              >
                {tab === "thumbs" ? "Pages" : tab === "highlights" ? "Marks" : tab[0].toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px", color: sidebarText }}>
            {activeTab === "thumbs" && pdf && (
              <ThumbnailStrip pdf={pdf} totalPages={totalPages} currentPage={currentPage} onGoTo={(n) => { goToPage(n); if (isMobile) setSidebarOpen(false); }} />
            )}
            {activeTab === "bookmarks" && (
              bookmarks.length === 0 ? <EmptyState icon="◆" text={"No bookmarks yet.\nUse Bookmark mode and click a page."} /> : (
                [...bookmarks].sort((a, b) => a.page - b.page).map(bm => (
                  <div key={bm.id} onClick={() => { goToPage(bm.page); if (isMobile) setSidebarOpen(false); }} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", borderRadius: 6, cursor: "pointer", marginBottom: 4 }} onMouseEnter={e => e.currentTarget.style.background = isLight ? TOKENS.parchmentMid : TOKENS.amberDim} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ color: TOKENS.amber, fontSize: 12, marginTop: 1 }}>◆</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: sidebarMuted, fontFamily: "monospace", letterSpacing: "0.06em" }}>PAGE {bm.page}</div>
                      <div style={{ fontSize: 12, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bm.title}</div>
                    </div>
                    <span onClick={e => { e.stopPropagation(); setBookmarks(prev => prev.filter(b => b.id !== bm.id)); toast("Removed"); }} style={{ fontSize: 11, color: sidebarMuted, cursor: "pointer", padding: "0 2px", flexShrink: 0 }}>✕</span>
                  </div>
                ))
              )
            )}
            {activeTab === "notes" && (
              notes.length === 0 ? <EmptyState icon="✎" text={"No notes yet.\nUse Note mode and drag a region."} /> : (
                [...notes].sort((a, b) => a.page - b.page).map(n => (
                  <div key={n.id} onClick={() => goToPage(n.page)} style={{ background: isLight ? "#fffdf5" : "rgba(255,255,255,0.04)", border: `1px solid ${isLight ? "rgba(34,197,94,0.2)" : TOKENS.border}`, borderLeft: `3px solid ${TOKENS.amber}`, borderRadius: 6, padding: "9px 10px", marginBottom: 8, cursor: "pointer", position: "relative" }}>
                    <div style={{ fontSize: 9, color: sidebarMuted, fontFamily: "monospace", marginBottom: 4, letterSpacing: "0.05em" }}>P.{n.page} · {new Date(n.createdAt).toLocaleDateString()}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6, wordBreak: "break-word" }}>{n.text}</div>
                    <span onClick={e => { e.stopPropagation(); setNotes(prev => prev.filter(x => x.id !== n.id)); toast("Removed"); }} style={{ position: "absolute", top: 7, right: 8, fontSize: 11, color: sidebarMuted, cursor: "pointer" }}>✕</span>
                  </div>
                ))
              )
            )}
            {activeTab === "highlights" && (
              highlights.length === 0 ? <EmptyState icon="◐" text={"No highlights yet.\nUse Highlight mode and drag."} /> : (
                [...highlights].sort((a, b) => a.page - b.page).map(hl => (
                  <div key={hl.id} onClick={() => goToPage(hl.page)} style={{ padding: "8px 10px", borderRadius: 6, marginBottom: 7, cursor: "pointer", background: HL_COLORS[hl.color] || HL_COLORS.yellow, position: "relative", fontSize: 12 }}>
                    <div style={{ fontSize: 9, fontFamily: "monospace", marginBottom: 3, opacity: 0.65, letterSpacing: "0.05em", color: TOKENS.inkBrown }}>PAGE {hl.page}</div>
                    <div style={{ fontStyle: hl.note ? "normal" : "italic", opacity: hl.note ? 1 : 0.55, color: TOKENS.inkBrown }}>{hl.note || "Highlighted region"}</div>
                    <span onClick={e => { e.stopPropagation(); setHighlights(prev => prev.filter(h => h.id !== hl.id)); toast("Removed"); }} style={{ position: "absolute", top: 7, right: 8, fontSize: 11, cursor: "pointer", opacity: 0.5, color: TOKENS.inkBrown }}>✕</span>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* Mobile sidebar backdrop */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: "absolute", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.4)" }}
          />
        )}

        {/* PDF Viewer */}
        <div
          ref={viewerRef}
          onScroll={handleViewerScroll}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",      // ← prevent horizontal overflow
            background: isLight ? TOKENS.parchment : TOKENS.surfaceMid,
            display: "flex", flexDirection: "column", alignItems: "center",
            // Enough bottom padding so FAB doesn't obscure last page
            padding: isMobile ? "0 0 80px" : "0 24px 80px",
            gap: 0,
            minWidth: 0,
            // Needed for position:absolute children not to overflow
            position: "relative",
          }}
        >
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 20, padding: "80px 20px" }}>
              <div style={{ fontStyle: "italic", fontSize: 22, color: TOKENS.amber, letterSpacing: "0.06em" }}>Dkituyiacademy</div>
              <Spinner size={36} />
              <div style={{ fontSize: 13, color: TOKENS.dimText, fontFamily: "monospace", letterSpacing: "0.04em" }}>
                {!book ? "Loading book…" : !pdf ? "Loading PDF…" : "Preparing reader…"}
              </div>
            </div>
          )}

          {loadError && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 14, padding: "80px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 36, opacity: 0.3 }}>⚠</div>
              <div style={{ fontSize: 16, color: TOKENS.rosewood }}>Could not load document</div>
              <div style={{ fontSize: 13, color: TOKENS.dimText, maxWidth: 300, lineHeight: 1.7 }}>Please try again.</div>
            </div>
          )}

          {/* Pages */}
          {!loading && !loadError && pdf && Array.from({ length: totalPages }, (_, i) => i + 1).map(n => {
            const locked  = !isPageUnlocked(n);
            const showCTA = shouldShowUnlockCTA(n);
            return (
              <div
                key={`${n}-${renderKey}`}
                ref={el => { if (el) pageRefs.current[n] = el; }}
                style={{
                  width: "100%",
                  display: "flex", justifyContent: "center",
                }}
              >
                <PageCanvas
                  pdf={pdf} pageNum={n} scale={scale}
                  highlights={highlights} mode={mode} hlColor={hlColor}
                  onHighlight={handleHighlight} onNote={handleNote} onBookmark={handleBookmark} onRemoveHighlight={handleRemoveHighlight}
                  isMobile={isMobile}
                  isLocked={locked}
                  showUnlockCTA={showCTA}
                  perPageCost={perPageCost} walletBalance={walletBalance}
                  onUnlockPage={handleInlineUnlock}
                  isLight={isLight}
                  isCompleted={completedPages.has(n)}
                  onMarkCompleted={() => markPageCompleted(n)}
                  isPageUnlocked={isPageUnlocked}
                />
              </div>
            );
          })}

          {/* Preview End CTA */}
          {isPreviewMode() && totalPages > 0 && !loading && (
            <div style={{ padding: "48px 24px", textAlign: "center", width: "100%", maxWidth: 520, background: isLight ? TOKENS.parchmentMid : TOKENS.surfaceDark, borderRadius: 16, border: `1px solid ${TOKENS.border}` }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(34,197,94,0.1)", border: `2px solid ${TOKENS.amber}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <Icon d={ICONS.lock} size={28} />
              </div>
              <h2 style={{ fontSize: isMobile ? 22 : 26, color: isLight ? TOKENS.inkBrown : TOKENS.bodyText, fontFamily: "'Georgia', serif", fontStyle: "italic", marginBottom: 12 }}>
                Preview Complete
              </h2>
              <p style={{ fontSize: isMobile ? 14 : 16, color: isLight ? TOKENS.warmGray : TOKENS.subtleText, lineHeight: 1.7, marginBottom: 28 }}>
                You've reached the end of your free preview ({Math.max(1, Math.ceil(totalPages * 0.2))} pages).{" "}
                {token ? "Add to your library to read the full book." : "Sign in to continue reading."}
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexDirection: isMobile ? "column" : "row" }}>
                {token ? (
                  <button onClick={async () => {
                    try {
                      await api.post("/api/library/user/library/", { book_id: bookId });
                      toast("Added to library! Redirecting…");
                      setTimeout(() => navigate(`/reader/${bookId}`), 1500);
                    } catch (err) { toast(err.response?.data?.error || "Failed to add to library"); }
                  }} style={{ padding: "12px 28px", background: "linear-gradient(135deg, #16a34a, #22c55e)", border: "none", borderRadius: 8, fontSize: 15, cursor: "pointer", color: "#fff", fontFamily: "'Georgia', serif", fontWeight: 600 }}>
                    Add to Library
                  </button>
                ) : (
                  <button onClick={() => { window.location.href = `/login?redirect=/reader/${bookId}`; }} style={{ padding: "12px 28px", background: "linear-gradient(135deg, #16a34a, #22c55e)", border: "none", borderRadius: 8, fontSize: 15, cursor: "pointer", color: "#fff", fontFamily: "'Georgia', serif", fontWeight: 600 }}>
                    Sign In to Continue
                  </button>
                )}
                <button onClick={() => navigate("/books")} style={{ padding: "12px 28px", background: "transparent", border: `1px solid ${TOKENS.border}`, borderRadius: 8, fontSize: 15, cursor: "pointer", color: isLight ? TOKENS.inkBrown : TOKENS.bodyText, fontFamily: "'Georgia', serif" }}>
                  Browse Books
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Floating annotation toolbar — always visible ─────────────────── */}
      <div style={{
        position: "fixed",
        right: isMobile ? 16 : 20,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? 8 : 12,
        zIndex: 1000,
        pointerEvents: "none",
      }}>
        {toolModes.map(({ id, icon, tip }) => (
          <button
            key={id}
            onClick={() => { setMode(id); if (id !== "select") toast(tip); }}
            title={tip}
            style={{
              width: isMobile ? 40 : 48,
              height: isMobile ? 40 : 48,
              borderRadius: "50%",
              background: mode === id
                ? `linear-gradient(135deg, ${TOKENS.rust}, ${TOKENS.amber})`
                : isLight ? "rgba(255,255,255,0.95)" : "rgba(30,20,15,0.95)",
              border: `2px solid ${mode === id ? TOKENS.rustLight : isLight ? TOKENS.parchmentDim : TOKENS.borderLight}`,
              color: mode === id ? "#fff" : isLight ? TOKENS.rust : TOKENS.amber,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: mode === id
                ? `0 4px 16px rgba(22,163,74,0.4)`
                : isLight ? "0 4px 12px rgba(0,0,0,0.15)" : "0 4px 12px rgba(0,0,0,0.3)",
              transition: "all 0.2s ease",
              pointerEvents: "auto",
            }}
            onMouseEnter={e => {
              if (mode !== id) {
                e.currentTarget.style.transform = "scale(1.1)";
              }
            }}
            onMouseLeave={e => {
              if (mode !== id) {
                e.currentTarget.style.transform = "scale(1)";
              }
            }}
          >
            <Icon d={icon} size={isMobile ? 18 : 20} />
          </button>
        ))}

        {/* Bulk unlock button for mobile */}
        {isMobile && perPageCost > 0 && (
          <button
            onClick={() => setShowBulkUnlock(true)}
            title="Bulk unlock pages"
            style={{
              width: isMobile ? 40 : 48,
              height: isMobile ? 40 : 48,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${TOKENS.rust}, ${TOKENS.amber})`,
              border: `2px solid ${TOKENS.rustLight}`,
              color: "#fff",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px rgba(22,163,74,0.4)",
              marginTop: isMobile ? 8 : 12,
              transition: "all 0.2s ease",
              pointerEvents: "auto",
            }}
          >
            <Icon d={ICONS.unlock} size={isMobile ? 18 : 20} />
          </button>
        )}

        {/* Color swatches — shown when highlight mode is active */}
        {mode === "highlight" && (
          <div style={{
            display: "flex", flexDirection: "column",
            gap: isMobile ? 5 : 6,
            padding: isMobile ? 6 : 8,
            background: isLight ? TOKENS.parchmentMid : TOKENS.surfaceDeep,
            border: `1px solid ${isLight ? TOKENS.parchmentDim : TOKENS.border}`,
            borderRadius: 12,
            boxShadow: isLight ? "0 4px 12px rgba(0,0,0,0.15)" : "0 4px 12px rgba(0,0,0,0.3)",
            pointerEvents: "auto",
          }}>
            {Object.entries(HL_SWATCHES).map(([name, hex]) => (
              <button
                key={name}
                onClick={() => setHlColor(name)}
                title={name}
                style={{
                  width: isMobile ? 26 : 30,
                  height: isMobile ? 26 : 30,
                  borderRadius: "50%",
                  background: hex,
                  border: hlColor === name ? "3px solid #fff" : "3px solid transparent",
                  boxShadow: hlColor === name ? `0 0 0 2px ${hex}` : "none",
                  cursor: "pointer",
                  transform: hlColor === name ? "scale(1.2)" : "scale(1)",
                  transition: "all 0.15s ease",
                }}
              />
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
          background: isLight ? TOKENS.parchment : "#1e1510",
          border: `1px solid ${isLight ? TOKENS.parchmentDim : TOKENS.border}`,
          borderRadius: isMobile ? "12px 12px 0 0" : 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
          padding: 14,
          width: isMobile ? "auto" : 248,
          zIndex: 600,
        }}>
          <div style={{ fontSize: 10, color: TOKENS.warmGray, marginBottom: 9, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "monospace" }}>
            Note — Page {annotPopup.pageNum}
          </div>
          <textarea
            autoFocus
            value={annotText}
            onChange={e => setAnnotText(e.target.value)}
            placeholder="Type your note…"
            onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) saveAnnot(); }}
            style={{
              width: "100%", minHeight: 80,
              border: `1px solid ${isLight ? TOKENS.parchmentDim : TOKENS.border}`,
              borderRadius: 5, padding: 8,
              fontFamily: "'Georgia', serif", fontSize: 13,
              color: isLight ? TOKENS.inkBrown : TOKENS.bodyText,
              background: isLight ? "#fffdf8" : "rgba(255,255,255,0.05)",
              resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.6,
            }}
          />
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={() => setAnnotPopup(null)} style={{ padding: "5px 12px", borderRadius: 5, fontSize: 12, cursor: "pointer", background: "transparent", border: `1px solid ${isLight ? TOKENS.parchmentDim : TOKENS.borderLight}`, color: TOKENS.warmGray, fontFamily: "'Georgia', serif" }}>Cancel</button>
            <button onClick={saveAnnot} style={{ padding: "5px 12px", borderRadius: 5, fontSize: 12, cursor: "pointer", background: "linear-gradient(135deg, #16a34a, #22c55e)", border: `1px solid ${TOKENS.rustLight}`, color: "#fff", fontFamily: "'Georgia', serif" }}>Save</button>
          </div>
        </div>
      )}

      {/* Search panel */}
      {searchOpen && (
        <div style={{
          position: "fixed",
          top: isMobile ? 52 : 60, right: 16,
          background: isLight ? TOKENS.parchment : "#1a1208",
          border: `1px solid ${sidebarBdr}`,
          borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
          padding: 14,
          width: isMobile ? Math.min(window.innerWidth - 32, 300) : 288,
          zIndex: 400,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: sidebarMuted, fontFamily: "monospace", letterSpacing: "0.06em", textTransform: "uppercase" }}>Search</span>
            <button onClick={() => setSearchOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: sidebarMuted, padding: 2, display: "flex" }}><Icon d={ICONS.x} size={14} /></button>
          </div>
          <input
            autoFocus value={searchText}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search in document…"
            style={{ width: "100%", height: 34, border: `1px solid ${sidebarBdr}`, borderRadius: 5, padding: "0 10px", fontFamily: "'Georgia', serif", fontSize: 13, color: isLight ? TOKENS.inkBrown : TOKENS.bodyText, background: isLight ? "#fffdf8" : "rgba(255,255,255,0.06)", marginBottom: 8, boxSizing: "border-box", outline: "none" }}
          />
          {searchPages.length > 0 && (
            <div style={{ fontSize: 11, color: TOKENS.rust, marginBottom: 8, fontFamily: "monospace" }}>
              {searchPages.length} page{searchPages.length > 1 ? "s" : ""} — {searchIdx + 1}/{searchPages.length}
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            {["↑ Prev", "↓ Next"].map((label, i) => (
              <button key={label} onClick={() => {
                if (!searchPages.length) return;
                const idx = ((searchIdx + (i === 0 ? -1 : 1)) + searchPages.length) % searchPages.length;
                setSearchIdx(idx); goToPage(searchPages[idx]);
              }} style={{ flex: 1, padding: "6px 0", borderRadius: 5, fontSize: 12, cursor: "pointer", background: "transparent", border: `1px solid ${sidebarBdr}`, color: sidebarMuted, fontFamily: "'Georgia', serif" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button for Complete */}
      {isMobile && !isPreviewMode() && (
        <button
          onClick={() => markPageCompleted(currentPage)}
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: completedPages.has(currentPage)
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'linear-gradient(135deg, #f59e0b, #d97706)',
            border: 'none',
            boxShadow: completedPages.has(currentPage)
              ? '0 4px 16px rgba(16, 185, 129, 0.4)'
              : '0 4px 16px rgba(245, 158, 11, 0.4)',
            cursor: 'pointer',
            zIndex: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            transform: completedPages.has(currentPage) ? 'scale(1.1)' : 'scale(1)',
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.2)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = completedPages.has(currentPage) ? 'scale(1.1)' : 'scale(1)';
          }}
        >
          <span style={{
            color: '#fff',
            fontSize: 24,
            fontWeight: 'bold',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}>
            {completedPages.has(currentPage) ? '!' : '?'}
          </span>
        </button>
      )}

      {/* Toast */}
      <div style={{
        position: "fixed",
        bottom: isMobile ? 90 : 24,  // above FAB on mobile
        left: "50%", transform: "translateX(-50%)",
        background: TOKENS.surfaceDeep, color: TOKENS.bodyText,
        padding: "7px 18px", borderRadius: 20, fontSize: 12, zIndex: 700,
        opacity: toastVisible ? 1 : 0, transition: "opacity 0.25s ease",
        pointerEvents: "none",
        border: `1px solid ${TOKENS.border}`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        fontFamily: "monospace", letterSpacing: "0.04em", whiteSpace: "nowrap",
      }}>
        {toastMsg}
      </div>

      <style>{`
        @keyframes pdfrSpin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(34,197,94,0.25); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(34,197,94,0.45); }
        select option { background: #111; color: #f0e6d3; }
        * { box-sizing: border-box; }
        body { overflow: hidden; }
      `}</style>
    </div>
  );
}