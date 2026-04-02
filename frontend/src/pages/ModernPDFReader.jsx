import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
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
  amber:       "#22c55e",       // Green accent
  amberDim:    "rgba(34,197,94,0.18)",
  rust:        "#16a34a",       // Darker green
  rustLight:   "#4ade80",       // Light green
  rosewood:    "#e6508c",
  cobalt:      "#5096f0",
  inkBrown:    "#171717",       // Near black
  warmGray:    "#737373",
  dimText:     "rgba(255,255,255,0.5)",
  subtleText:  "rgba(255,255,255,0.8)",
  bodyText:    "#ffffff",
  surfaceDark: "#0a0a0a",       // Pure black
  surfaceMid:  "#171717",       // Dark gray
  surfaceDeep: "#000000",       // Black
  surfaceCard: "rgba(34,197,94,0.08)", // Green tint
  border:      "rgba(34,197,94,0.3)",   // Green border
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
  eye:       "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
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
          : hovered
          ? "rgba(255,255,255,0.07)"
          : "transparent",
        border: `1px solid ${active ? TOKENS.rustLight : hovered ? TOKENS.borderLight : "transparent"}`,
        borderRadius: 6,
        color: active ? "#fff" : hovered ? TOKENS.bodyText : TOKENS.subtleText,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontFamily: "'Georgia', serif",
        letterSpacing: "0.02em",
        transition: "all 0.15s ease",
        outline: "none",
        flexShrink: 0,
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
        width: 16,
        height: 16,
        borderRadius: "50%",
        background: hex,
        cursor: "pointer",
        border: active ? "2px solid #fff" : "2px solid transparent",
        boxShadow: active ? `0 0 0 1px ${hex}` : hovered ? "0 0 0 1px rgba(255,255,255,0.3)" : "none",
        transform: active ? "scale(1.3)" : hovered ? "scale(1.15)" : "scale(1)",
        transition: "all 0.15s ease",
        flexShrink: 0,
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
// isLocked     → page is fully locked: show the full-screen lock overlay (no PDF rendered)
// showUnlockCTA→ page is the last unlocked page: render PDF + gradient CTA at the bottom
function PageCanvas({
  pdf, pageNum, scale, highlights, mode, hlColor,
  onHighlight, onNote, onBookmark, isMobile, isLocked,
  showUnlockCTA, perPageCost, walletBalance, onUnlockPage, isLight,
}) {
  const canvasRef = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragRect, setDragRect] = useState(null);
  const renderTaskRef = useRef(null);
  const canAfford = walletBalance >= perPageCost;

  // Render the PDF page onto the canvas (only when not locked)
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
        const viewerW = (canvasRef.current?.parentElement?.parentElement?.clientWidth ?? 648) - 48;
        sc = viewerW / vp0.width;
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
  }, [pdf, pageNum, scale, isLocked]);

  const getRelPos = (e, el) => {
    const r = el.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const handleMouseDown = (e) => {
    if (mode === "select" || mode === "bookmark" || isLocked) return;
    e.preventDefault();
    const pos = getRelPos(e, e.currentTarget);
    setDragStart(pos); setDragging(true); setDragRect(null);
  };
  const handleMouseMove = (e) => {
    if (!dragging || !dragStart) return;
    const pos = getRelPos(e, e.currentTarget);
    setDragRect({
      x: Math.min(dragStart.x, pos.x), y: Math.min(dragStart.y, pos.y),
      w: Math.abs(pos.x - dragStart.x), h: Math.abs(pos.y - dragStart.y),
    });
  };
  const handleMouseUp = (e) => {
    if (!dragging || !dragStart) return;
    setDragging(false);
    const pos = getRelPos(e, e.currentTarget);
    const rect = {
      x: Math.min(dragStart.x, pos.x), y: Math.min(dragStart.y, pos.y),
      w: Math.abs(pos.x - dragStart.x), h: Math.abs(pos.y - dragStart.y),
    };
    setDragRect(null); setDragStart(null);
    if (rect.w < 0.01 || rect.h < 0.005) return;
    if (mode === "highlight") onHighlight(pageNum, rect, hlColor);
    if (mode === "note") onNote(pageNum, rect, e.clientX, e.clientY, hlColor);
  };

  const pageHls = highlights.filter(h => h.page === pageNum);

  // ── LOCKED PAGE: full dark overlay, no canvas ─────────────────────────────
  if (isLocked) {
    return (
      <div style={{
        position: "relative",
        flexShrink: 0,
        borderRadius: 3,
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        width: isMobile ? "min(560px, 100%)" : "min(680px, 100%)",
        height: isMobile ? 480 : 600,
        maxWidth: "100%",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: isLight ? "linear-gradient(160deg, #e8d8c0 0%, #d5c4a6 100%)" : "linear-gradient(160deg, #1a1208 0%, #0e0b07 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: isMobile ? 20 : 40,
        }}>
          {/* Decorative background pattern */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.04,
            backgroundImage: `repeating-linear-gradient(45deg, ${TOKENS.amber} 0px, ${TOKENS.amber} 1px, transparent 1px, transparent 40px)`,
          }} />

          <div style={{
            position: "relative",
            textAlign: "center",
            maxWidth: isMobile ? 300 : 380,
            width: "100%",
          }}>
            {/* Lock icon ring */}
            <div style={{
              width: isMobile ? 64 : 80,
              height: isMobile ? 64 : 80,
              borderRadius: "50%",
              background: "rgba(201,150,12,0.12)",
              border: `1.5px solid ${TOKENS.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
              boxShadow: "0 0 32px rgba(201,150,12,0.15)",
            }}>
              <Icon d={ICONS.lock} size={isMobile ? 28 : 36} />
            </div>

            <div style={{
              fontSize: isMobile ? 13 : 14,
              color: isLight ? TOKENS.rust : TOKENS.amber,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              fontFamily: "'Georgia', serif",
              marginBottom: 8,
              opacity: 0.9,
            }}>
              Page {pageNum}
            </div>

            <div style={{
              fontSize: isMobile ? 20 : 26,
              color: isLight ? TOKENS.inkBrown : TOKENS.bodyText,
              fontFamily: "'Georgia', serif",
              fontStyle: "italic",
              marginBottom: 12,
              lineHeight: 1.3,
            }}>
              Continue Reading
            </div>

            <div style={{
              fontSize: isMobile ? 13 : 14,
              color: isLight ? TOKENS.warmGray : TOKENS.subtleText,
              marginBottom: 28,
              lineHeight: 1.7,
            }}>
              Unlock this page to keep reading.
            </div>

            {/* Balance badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 12px",
              background: isLight ? "rgba(139,58,30,0.08)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${isLight ? TOKENS.parchmentDim : TOKENS.border}`,
              borderRadius: 20,
              fontSize: 12,
              color: isLight ? TOKENS.warmGray : TOKENS.warmGray,
              marginBottom: 16,
              fontFamily: "monospace",
            }}>
              <span style={{ color: TOKENS.amber, fontSize: 14 }}>◆</span>
              {walletBalance} coins available
            </div>

            {/* Unlock button */}
            <button
              onClick={() => onUnlockPage(pageNum)}
              style={{
                display: "block",
                width: "100%",
                padding: isMobile ? "13px 20px" : "15px 24px",
                background: canAfford
                  ? "linear-gradient(135deg, #8b3a1e 0%, #a3451f 50%, #8b3a1e 100%)"
                  : "rgba(255,255,255,0.06)",
                backgroundSize: "200% 100%",
                border: `1px solid ${canAfford ? TOKENS.rustLight : TOKENS.borderLight}`,
                borderRadius: 8,
                color: canAfford ? "#fff" : TOKENS.dimText,
                fontSize: isMobile ? 14 : 15,
                fontFamily: "'Georgia', serif",
                letterSpacing: "0.03em",
                cursor: canAfford ? "pointer" : "not-allowed",
                transition: "all 0.2s ease",
                boxShadow: canAfford ? "0 4px 16px rgba(139,58,30,0.35)" : "none",
              }}
              onMouseEnter={e => {
                if (canAfford) {
                  e.currentTarget.style.backgroundPosition = "100% 0";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(139,58,30,0.45)";
                }
              }}
              onMouseLeave={e => {
                if (canAfford) {
                  e.currentTarget.style.backgroundPosition = "0% 0";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(139,58,30,0.35)";
                }
              }}
            >
              {canAfford ? `Unlock for ${perPageCost} coins` : `Need ${perPageCost} coins`}
            </button>
          </div>
        </div>

        {/* Page number tag */}
        <div style={{
          position: "absolute", bottom: -22, left: "50%", transform: "translateX(-50%)",
          fontSize: 10, color: TOKENS.dimText, fontFamily: "monospace",
          whiteSpace: "nowrap", letterSpacing: "0.08em",
        }}>
          — {pageNum} —
        </div>
      </div>
    );
  }

  // ── UNLOCKED PAGE: render canvas + optional CTA overlay ───────────────────
  return (
    <div
      style={{
        position: "relative",
        flexShrink: 0,
        borderRadius: 3,
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.3)",
        background: isLight ? "#000" : "#fff",
        width: dims.w || "auto",
        height: dims.h || "auto",
        maxWidth: "100%",
        transition: "box-shadow 0.2s ease",
      }}
    >
      {/* Rendered canvas */}
      <div style={{ position: "relative" }}>
        <canvas ref={canvasRef} style={{ 
          display: "block",
          filter: isLight ? "none" : "invert(1) hue-rotate(180deg)"
        }} />
        
        {/* Highlights - apply inverse filter in dark mode */}
        {pageHls.map(hl => (
          <div
            key={hl.id}
            title={hl.note || ""}
            style={{
              position: "absolute",
              background: HL_COLORS[hl.color] || HL_COLORS.yellow,
              mixBlendMode: isLight ? "multiply" : "screen",
              borderRadius: 2,
              cursor: "pointer",
              left: `${hl.x * 100}%`, top: `${hl.y * 100}%`,
              width: `${hl.w * 100}%`, height: `${hl.h * 100}%`,
              transition: "opacity 0.15s",
              filter: isLight ? "none" : "invert(1) hue-rotate(180deg)",
            }}
          />
        ))}
        
        {/* Drag preview - apply inverse filter in dark mode */}
        {dragging && dragRect && (
          <div style={{
            position: "absolute",
            left: `${dragRect.x * 100}%`, top: `${dragRect.y * 100}%`,
            width: `${dragRect.w * 100}%`, height: `${dragRect.h * 100}%`,
            border: `1.5px dashed ${TOKENS.rust}`,
            background: "rgba(139,58,30,0.07)",
            pointerEvents: "none", zIndex: 5,
            borderRadius: 2,
            filter: isLight ? "none" : "invert(1) hue-rotate(180deg)",
          }} />
        )}
      </div>

      {/* Interaction overlay */}
      <div
        style={{
          position: "absolute", inset: 0,
          cursor: mode === "select" ? "default" : mode === "highlight" ? "crosshair" : mode === "note" ? "cell" : "pointer",
          userSelect: "none",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={() => mode === "bookmark" && onBookmark(pageNum)}
      />

      {/* Unlock CTA — gradient fade at the bottom of the last unlocked page */}
      {showUnlockCTA && (
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(180deg, transparent 0%, rgba(26,18,8,0.95) 35%, #1a1208 100%)",
          padding: isMobile ? "60px 20px 30px" : "80px 40px 40px",
          textAlign: "center",
          pointerEvents: "none",           // let clicks pass through to PDF except on the button
          zIndex: 10,
        }}>
          {/* Decorative background pattern */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.03,
            backgroundImage: `repeating-linear-gradient(45deg, ${TOKENS.amber} 0px, ${TOKENS.amber} 1px, transparent 1px, transparent 40px)`,
          }} />

          <div style={{ position: "relative", zIndex: 1, pointerEvents: "auto" }}>
            {/* Lock icon ring */}
            <div style={{
              width: isMobile ? 52 : 64,
              height: isMobile ? 52 : 64,
              borderRadius: "50%",
              background: "rgba(201,150,12,0.12)",
              border: `1.5px solid ${TOKENS.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 14px",
              boxShadow: "0 0 24px rgba(201,150,12,0.15)",
            }}>
              <Icon d={ICONS.lock} size={isMobile ? 22 : 28} />
            </div>

            <div style={{
              fontSize: isMobile ? 16 : 18,
              color: TOKENS.bodyText,
              fontFamily: "'Georgia', serif",
              fontStyle: "italic",
              marginBottom: 6,
              lineHeight: 1.3,
            }}>
              Continue Reading
            </div>

            <div style={{
              fontSize: isMobile ? 12 : 13,
              color: TOKENS.subtleText,
              marginBottom: 18,
              lineHeight: 1.6,
            }}>
              Unlock the next page to keep reading
            </div>

            {/* Balance badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 10px",
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${TOKENS.border}`,
              borderRadius: 16,
              fontSize: 11,
              color: TOKENS.warmGray,
              marginBottom: 12,
              fontFamily: "monospace",
            }}>
              <span style={{ color: TOKENS.amber, fontSize: 12 }}>◆</span>
              {walletBalance} coins
            </div>

            {/* Unlock button */}
            <button
              onClick={() => onUnlockPage(pageNum + 1)}
              style={{
                display: "block",
                width: "100%",
                padding: isMobile ? "10px 16px" : "12px 20px",
                background: canAfford
                  ? "linear-gradient(135deg, #8b3a1e 0%, #a3451f 50%, #8b3a1e 100%)"
                  : "rgba(255,255,255,0.06)",
                backgroundSize: "200% 100%",
                border: `1px solid ${canAfford ? TOKENS.rustLight : TOKENS.borderLight}`,
                borderRadius: 6,
                color: canAfford ? "#fff" : TOKENS.dimText,
                fontSize: isMobile ? 12 : 13,
                fontFamily: "'Georgia', serif",
                letterSpacing: "0.03em",
                cursor: canAfford ? "pointer" : "not-allowed",
                transition: "all 0.2s ease",
                boxShadow: canAfford ? "0 3px 12px rgba(139,58,30,0.35)" : "none",
              }}
              onMouseEnter={e => {
                if (canAfford) {
                  e.currentTarget.style.backgroundPosition = "100% 0";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={e => {
                if (canAfford) {
                  e.currentTarget.style.backgroundPosition = "0% 0";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              {canAfford
                ? `Unlock Page ${pageNum + 1} — ${perPageCost} coins`
                : `Need ${perPageCost - walletBalance} more coins`}
            </button>
          </div>
        </div>
      )}

      {/* Page number tag */}
      <div style={{
        position: "absolute", bottom: -22, left: "50%", transform: "translateX(-50%)",
        fontSize: 10, color: TOKENS.dimText, fontFamily: "monospace",
        whiteSpace: "nowrap", letterSpacing: "0.08em",
      }}>
        — {pageNum} —
      </div>
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
        cursor: "pointer",
        borderRadius: 4,
        overflow: "hidden",
        border: `2px solid ${active ? TOKENS.rust : hovered ? TOKENS.parchmentDim : "transparent"}`,
        background: "#fff",
        boxShadow: active
          ? "0 2px 12px rgba(139,58,30,0.35)"
          : hovered ? "0 2px 8px rgba(0,0,0,0.15)" : "0 1px 4px rgba(0,0,0,0.1)",
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

// ─── Sidebar section empty state ──────────────────────────────────────────────
function EmptyState({ icon, text }) {
  return (
    <div style={{
      textAlign: "center",
      padding: "32px 16px",
      color: TOKENS.warmGray,
    }}>
      <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.5 }}>{icon}</div>
      <div style={{ fontSize: 12, fontStyle: "italic", lineHeight: 1.7, opacity: 0.8 }}>{text}</div>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
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

  // Check if we're in preview mode
  const isPreviewMode = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('preview') === 'true' || urlParams.get('mode') === 'preview';
  }, []);

  // Theme
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("dkituyiacademy-theme") || "dark"; } catch { return "dark"; }
  });
  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem("dkituyiacademy-theme", next); } catch {}
  }, [theme]);

  // Responsive
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  useEffect(() => {
    const handle = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
      if (w < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  // Mobile annotation drawer
  const [showMobileTools, setShowMobileTools] = useState(false);

  // Book / locking
  const [book, setBook] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [unlockedPages, setUnlockedPages] = useState(new Set());
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const [pendingPage, setPendingPage] = useState(null);
  const [perPageCost, setPerPageCost] = useState(0);
  const [unlockLoading, setUnlockLoading] = useState(false);

  // PDF state
  const [pdf, setPdf] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [mode, setMode] = useState("select");
  const [hlColor, setHlColor] = useState("yellow");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [activeTab, setActiveTab] = useState("thumbs");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pageInput, setPageInput] = useState("1");
  const [progress, setProgress] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchPages, setSearchPages] = useState([]);
  const [searchIdx, setSearchIdx] = useState(0);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [annotPopup, setAnnotPopup] = useState(null);
  const [annotText, setAnnotText] = useState("");

  // Annotations
  const [bookmarks, setBookmarks] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`lmn_bm_${bookId}`) || "[]"); } catch { return []; }
  });
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`lmn_notes_${bookId}`) || "[]"); } catch { return []; }
  });
  const [highlights, setHighlights] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`lmn_hl_${bookId}`) || "[]"); } catch { return []; }
  });

  const viewerRef = useRef(null);
  const pageRefs = useRef({});
  const toastTimer = useRef(null);

  const authAxios = useRef(
    axios.create({ headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } })
  ).current;

// Public axios for preview mode (no auth required)
const publicAxios = useRef(
    axios.create({ headers: { "Content-Type": "application/json" } })
  ).current;

  const toast = useCallback((msg) => {
    setToastMsg(msg); setToastVisible(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2400);
  }, []);

  // Persist annotations
  useEffect(() => { try { localStorage.setItem(`lmn_bm_${bookId}`, JSON.stringify(bookmarks)); } catch {} }, [bookmarks, bookId]);
  useEffect(() => { try { localStorage.setItem(`lmn_notes_${bookId}`, JSON.stringify(notes)); } catch {} }, [notes, bookId]);
  useEffect(() => { try { localStorage.setItem(`lmn_hl_${bookId}`, JSON.stringify(highlights)); } catch {} }, [highlights, bookId]);

  // Load unlocked pages separately with better error handling
  const loadUnlockedPages = async () => {
    // In preview mode, don't try to load unlocked pages
    if (isPreviewMode()) {
      setUnlockedPages(new Set());
      return true;
    }
    
    try {
      const unlockedRes = await authAxios.get(`/api/reader/features/unlocked_pages/${bookId}/`);
      console.log('🔍 Loading unlocked pages:', unlockedRes.data.unlocked_pages);
      setUnlockedPages(new Set(unlockedRes.data.unlocked_pages || []));
      return true;
    } catch (err) {
      console.error("Failed to load unlocked pages:", err);
      // Don't fail the whole experience if unlocked pages fail to load
      setUnlockedPages(new Set());
      return false;
    }
  };

  // Retry loading unlocked pages if they're empty after initial load
  useEffect(() => {
    if (!loading && book && unlockedPages.size === 0) {
      const retryTimer = setTimeout(async () => {
        console.log('🔍 Retrying unlocked pages load...');
        await loadUnlockedPages();
      }, 1000);
      return () => clearTimeout(retryTimer);
    }
  }, [loading, book, unlockedPages.size]);

  // Fetch book + wallet
  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      if (!mounted) return;
      try {
        const isPreview = isPreviewMode();
        const axiosInstance = isPreview ? publicAxios : authAxios;
        
        // In preview mode, only fetch book data (no wallet needed)
        if (isPreview) {
          const bookRes = await axiosInstance.get(`/api/books/${bookId}/`);
          if (!mounted) return;
          setBook(bookRes.data);
          setWalletBalance(0); // No wallet in preview mode
          setPerPageCost(bookRes.data.per_page_cost || 1);
          setUnlockedPages(new Set()); // No unlocked pages in preview mode
        } else {
          const [bookRes, walletRes] = await Promise.all([
            axiosInstance.get(`/api/books/${bookId}/`),
            axiosInstance.get("/api/payments/wallet/"),
          ]);
          if (!mounted) return;
          setBook(bookRes.data);
          setWalletBalance(walletRes.data.balance);
          setPerPageCost(bookRes.data.per_page_cost || 1);
          
          // Load unlocked pages separately
          await loadUnlockedPages();
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Fetch error:", err);
        if (mounted) { setLoadError(true); setLoading(false); }
      }
    }
    if (bookId && (token || isPreviewMode()) && !book) fetchData();
    return () => { mounted = false; };
  }, [bookId, token, book, authAxios, publicAxios, isPreviewMode]);

  // Page lock check — only valid once totalPages is known
  const isPageUnlocked = useCallback((n) => {
    if (!totalPages) return false;
    const freePages = Math.max(1, Math.ceil(totalPages * 0.2));
    return n <= freePages || unlockedPages.has(n);
  }, [totalPages, unlockedPages]);

  // The last sequential unlocked page (free pages + any individually unlocked pages in order)
  const getLastUnlockedPage = useCallback(() => {
    if (!totalPages) return 1;
    const freePages = Math.max(1, Math.ceil(totalPages * 0.2));
    let last = freePages;
    // Walk forward: if the next page is individually unlocked, advance last
    for (let n = freePages + 1; n <= totalPages; n++) {
      if (unlockedPages.has(n)) last = n;
      else break;
    }
    return Math.min(last, totalPages);
  }, [totalPages, unlockedPages]);

  const shouldShowUnlockCTA = useCallback((n) => {
    const lastUnlocked = getLastUnlockedPage();
    return n === lastUnlocked && lastUnlocked < totalPages;
  }, [getLastUnlockedPage, totalPages]);

  // Load PDF
  const loadPDF = useCallback(async (source) => {
    if (!window.pdfjsLib) return;
    setLoading(true); setLoadError(false);
    try {
      let docInit;
      if (source instanceof ArrayBuffer) {
        docInit = { data: source };
      } else {
        const axiosInstance = isPreviewMode() ? publicAxios : authAxios;
        const res = await axiosInstance.get(source, { responseType: "arraybuffer" });
        docInit = { data: res.data };
      }
      const doc = await window.pdfjsLib.getDocument(docInit).promise;
      setPdf(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1); setPageInput("1"); setProgress(0);
      setLoading(false);
    } catch (e) {
      console.error("PDF load error:", e);
      setLoading(false); setLoadError(true);
    }
  }, [authAxios, publicAxios, isPreviewMode]);

  useEffect(() => {
    if (pdfJsReady && book?.id && !pdf) loadPDF(`/api/books/${book.id}/pdf/`);
  }, [pdfJsReady, book, pdf, loadPDF, isPreviewMode]);

  // Scroll tracking
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
      setPendingPage(n);
      setShowUnlockPrompt(true);
      return;
    }
    setCurrentPage(n); setPageInput(String(n));
    setProgress(((n - 1) / Math.max(1, totalPages - 1)) * 100);
    const el = pageRefs.current[n];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [totalPages, isPageUnlocked]);

  // Inline unlock (triggered from PageCanvas CTA or locked-page button)
  const handleInlineUnlock = useCallback(async (pageNum) => {
    if (unlockLoading) return;
    if (walletBalance < perPageCost) {
      toast(`Need ${perPageCost - walletBalance} more coins`);
      return;
    }
    
    // Check if page is already unlocked to prevent duplicate requests
    if (isPageUnlocked(pageNum)) {
      toast("Page already unlocked");
      return;
    }
    
    setUnlockLoading(true);
    try {
      const res = await authAxios.post(`/api/reader/features/unlock_page/`, { 
        book_id: bookId, 
        page_number: pageNum 
      });
      if (res.data.message) {
        setUnlockedPages(prev => new Set([...prev, pageNum]));
        setWalletBalance(res.data.remaining_balance);
        toast("Page unlocked ✓");
        
        // Force re-render by updating a timestamp trigger
        setRenderKey(prev => prev + 1);
        
        // Refresh unlocked pages from backend to ensure sync
        setTimeout(async () => {
          try {
            const unlockedRes = await authAxios.get(`/api/reader/features/unlocked_pages/${bookId}/`);
            setUnlockedPages(new Set(unlockedRes.data.unlocked_pages || []));
          } catch (err) {
            console.error("Failed to refresh unlocked pages:", err);
          }
        }, 500);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        toast("Unlock feature not available. Contact support.");
      } else if (err.response?.status === 400) {
        // Page might already be unlocked but frontend state is out of sync
        toast("Page already unlocked");
        // Refresh unlocked pages from backend to sync state
        setTimeout(async () => {
          try {
            const unlockedRes = await authAxios.get(`/api/reader/features/unlocked_pages/${bookId}/`);
            setUnlockedPages(new Set(unlockedRes.data.unlocked_pages || []));
            setRenderKey(prev => prev + 1); // Force re-render
          } catch (refreshErr) {
            console.error("Failed to refresh unlocked pages:", refreshErr);
          }
        }, 200);
      } else {
        toast("Failed to unlock. Try again.");
      }
    } finally {
      setUnlockLoading(false);
    }
  }, [unlockLoading, walletBalance, perPageCost, bookId, authAxios, toast]);

  // Modal unlock (triggered from goToPage when navigating to a locked page)
  const handleModalUnlock = useCallback(async () => {
    if (!pendingPage || unlockLoading) return;
    
    // Check if page is already unlocked to prevent duplicate requests
    if (isPageUnlocked(pendingPage)) {
      toast("Page already unlocked");
      setShowUnlockPrompt(false);
      setPendingPage(null);
      return;
    }
    
    setUnlockLoading(true);
    try {
      const res = await authAxios.post(`/api/reader/features/unlock_page/`, { 
        book_id: bookId, 
        page_number: pendingPage 
      });
      if (res.data.message) {
        setUnlockedPages(prev => new Set([...prev, pendingPage]));
        setWalletBalance(res.data.remaining_balance);
        setShowUnlockPrompt(false);
        setPendingPage(null);
        toast("Page unlocked ✓");
        
        // Force re-render by updating a timestamp trigger
        setRenderKey(prev => prev + 1);
        
        // Navigate to the unlocked page after a short delay
        setTimeout(() => {
          goToPage(pendingPage);
        }, 300);
        
        // Refresh unlocked pages from backend to ensure sync
        setTimeout(async () => {
          try {
            const unlockedRes = await authAxios.get(`/api/reader/features/unlocked_pages/${bookId}/`);
            setUnlockedPages(new Set(unlockedRes.data.unlocked_pages || []));
          } catch (err) {
            console.error("Failed to refresh unlocked pages:", err);
          }
        }, 500);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        toast("Unlock feature not available. Contact support.");
      } else {
        toast("Failed to unlock. Try again.");
      }
    } finally {
      setUnlockLoading(false);
    }
  }, [pendingPage, unlockLoading, bookId, authAxios, toast]);

  // Keyboard shortcuts
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

  // Annotation handlers
  const handleHighlight = useCallback((pageNum, rect, color) => {
    setHighlights(prev => [...prev, { id: Date.now() + Math.random(), page: pageNum, ...rect, color, note: "", createdAt: new Date().toISOString() }]);
    toast("Highlighted ✓");
  }, [toast]);

  const handleNote = useCallback((pageNum, rect, cx, cy, color) => {
    setAnnotPopup({ x: Math.min(cx, window.innerWidth - 260), y: Math.min(cy + 12, window.innerHeight - 180), pageNum, rect, color });
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

  // Search
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

  // Theme-aware color helpers
  const isLight = theme === "light";
  const sidebarBg    = isLight ? "#f9f3e8" : "#1a1208";
  const sidebarBdr   = isLight ? "#e0d0b0" : TOKENS.border;
  const sidebarText  = isLight ? TOKENS.inkBrown : TOKENS.bodyText;
  const sidebarMuted = isLight ? TOKENS.warmGray : "rgba(240,230,211,0.45)";

  // ── Unlock modal (for goToPage navigation to locked pages) ───────────────
  if (showUnlockPrompt && pendingPage) {
    const freePages = Math.max(1, Math.ceil((totalPages * 0.2) || 1));
    const isFreePage = pendingPage <= freePages;
    const canAfford = walletBalance >= perPageCost;

    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}>
        <div style={{
          background: isLight ? TOKENS.parchment : "#1a1208",
          border: `1px solid ${TOKENS.border}`,
          borderRadius: 14,
          padding: isMobile ? 24 : 40,
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}>
          <div style={{
            width: 60, height: 60,
            borderRadius: "50%",
            background: "rgba(201,150,12,0.1)",
            border: `1px solid ${TOKENS.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <Icon d={ICONS.lock} size={26} />
          </div>

          <h2 style={{
            textAlign: "center", margin: "0 0 12px",
            fontSize: isMobile ? 20 : 24,
            fontFamily: "'Georgia', serif", fontStyle: "italic",
            color: sidebarText,
          }}>
            {isPreviewMode() && !isFreePage ? "Preview Complete" : (isFreePage ? "Free Preview" : "Unlock Page")}
          </h2>

          <p style={{
            textAlign: "center", margin: "0 0 24px",
            fontSize: 14, color: sidebarMuted, lineHeight: 1.7,
          }}>
            {isPreviewMode() && !isFreePage
              ? `You've reached the end of your free preview (${freePages} pages). Sign up to continue reading the full book!`
              : (isFreePage
                ? `Page ${pendingPage} is part of your free preview (first ${freePages} pages).`
                : `Unlock page ${pendingPage} for ${perPageCost} coins. You have ${walletBalance} coins.`)
            }
          </p>

          {!isFreePage && !canAfford && (
            <div style={{
              textAlign: "center", marginBottom: 16,
              fontSize: 13, color: TOKENS.rosewood,
              padding: "8px 14px",
              background: "rgba(230,80,140,0.08)",
              border: "1px solid rgba(230,80,140,0.2)",
              borderRadius: 6,
            }}>
              Insufficient balance — please top up your wallet.
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              onClick={() => { setShowUnlockPrompt(false); setPendingPage(null); }}
              style={{
                padding: "11px 22px",
                background: "transparent",
                border: `1px solid ${sidebarBdr}`,
                borderRadius: 8, fontSize: 14, cursor: "pointer",
                color: sidebarMuted, fontFamily: "'Georgia', serif",
              }}
            >
              Cancel
            </button>

            {isPreviewMode() && !isFreePage ? (
              <button
                onClick={() => {
                  window.location.href = `/login?redirect=/reader/${bookId}`;
                }}
                style={{
                  padding: "11px 22px",
                  background: "linear-gradient(135deg, #c9960c, #e8c98a)",
                  border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer",
                  color: "#fff", fontFamily: "'Georgia', serif", fontWeight: 600,
                  boxShadow: "0 2px 8px rgba(201,150,12,0.3)",
                }}
              >
                Sign In to Continue
              </button>
            ) : isFreePage ? (
              <button
                onClick={() => {
                  setShowUnlockPrompt(false);
                  // Navigate directly since it's free
                  setCurrentPage(pendingPage); setPageInput(String(pendingPage));
                  setProgress(((pendingPage - 1) / Math.max(1, totalPages - 1)) * 100);
                  const el = pageRefs.current[pendingPage];
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  setPendingPage(null);
                }}
                style={{
                  padding: "11px 22px",
                  background: "linear-gradient(135deg, #8b3a1e, #a3451f)",
                  border: `1px solid ${TOKENS.rustLight}`,
                  borderRadius: 8, fontSize: 14, cursor: "pointer",
                  color: "#fff", fontFamily: "'Georgia', serif",
                  boxShadow: "0 4px 14px rgba(139,58,30,0.35)",
                }}
              >
                Read Free Page
              </button>
            ) : canAfford ? (
              <button
                onClick={handleModalUnlock}
                disabled={unlockLoading}
                style={{
                  padding: "11px 22px",
                  background: unlockLoading ? "rgba(139,58,30,0.5)" : "linear-gradient(135deg, #8b3a1e, #a3451f)",
                  border: `1px solid ${TOKENS.rustLight}`,
                  borderRadius: 8, fontSize: 14,
                  cursor: unlockLoading ? "not-allowed" : "pointer",
                  color: "#fff", fontFamily: "'Georgia', serif",
                  boxShadow: "0 4px 14px rgba(139,58,30,0.35)",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                {unlockLoading && <Spinner size={14} color="#fff" />}
                {unlockLoading ? "Unlocking…" : `Unlock — ${perPageCost} coins`}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // ── Tool mode definitions ─────────────────────────────────────────────────
  const toolModes = [
    { id: "select",    icon: ICONS.cursor,    label: "Select",    tip: "S" },
    { id: "highlight", icon: ICONS.highlight, label: "Highlight", tip: "H – drag to highlight" },
    { id: "note",      icon: ICONS.note,      label: "Note",      tip: "N – drag to annotate" },
    { id: "bookmark",  icon: ICONS.bookmark,  label: "Bookmark",  tip: "B – click a page" },
  ];

  // ── MAIN RENDER ───────────────────────────────────────────────────────────
  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      fontFamily: "'Georgia', serif",
      background: "#f5f5f5", 
      color: isLight ? TOKENS.inkBrown : TOKENS.bodyText,
      overflow: "hidden",
    }}>
      {/* Reading progress bar */}
      <div style={{ height: 2, background: isLight ? "rgba(139,58,30,0.1)" : "rgba(255,255,255,0.05)", flexShrink: 0, position: "relative" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${TOKENS.rust}, ${TOKENS.amber})`,
          transition: "width 0.35s ease",
          boxShadow: `0 0 8px ${TOKENS.amber}`,
        }} />
      </div>

      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center",
        gap: isMobile ? 2 : 3,
        padding: isMobile ? "0 8px" : "0 14px",
        height: isMobile ? 46 : 50,
        flexShrink: 0,
        background: isLight ? TOKENS.parchmentMid : TOKENS.surfaceDeep,
        borderBottom: `1px solid ${isLight ? TOKENS.parchmentDim : TOKENS.border}`,
        boxShadow: isLight ? "0 2px 20px rgba(0,0,0,0.1)" : "0 2px 20px rgba(0,0,0,0.4)",
      }}>
        <TbBtn onClick={() => navigate("/dashboard")} title="Dashboard" compact={isMobile}>
          <Icon d={ICONS.prev} size={15} />
          {!isMobile && <span>Back</span>}
        </TbBtn>

        {!isMobile && (
          <>
            <div style={{ width: 1, height: 24, background: TOKENS.borderLight, margin: "0 6px" }} />
            <span style={{
              fontStyle: "italic", fontSize: 17, color: TOKENS.amber,
              letterSpacing: "0.04em", userSelect: "none", flexShrink: 0,
            }}>
              Dkituyiacademy
            </span>
            <div style={{ width: 1, height: 24, background: TOKENS.borderLight, margin: "0 6px" }} />
            
            {/* Preview indicator */}
            {isPreviewMode() && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 10px",
                background: "rgba(201,150,12,0.15)",
                border: `1px solid ${TOKENS.amber}`,
                borderRadius: 16,
                fontSize: 11,
                color: TOKENS.amber,
                fontFamily: "system-ui, sans-serif",
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}>
                <Icon d={ICONS.eye} size={10} />
                Preview Mode
              </div>
            )}
          </>
        )}

        {isMobile && (
          <TbBtn active={sidebarOpen} onClick={() => setSidebarOpen(o => !o)} title="Pages" compact>
            <Icon d={ICONS.menu} size={15} />
          </TbBtn>
        )}

        {!isMobile && (
          <TbBtn active={sidebarOpen} onClick={() => setSidebarOpen(o => !o)} title="Pages & Annotations">
            <Icon d={ICONS.menu} size={15} />
            {!isMobile && <span>Menu</span>}
          </TbBtn>
        )}

        {/* Refresh button for debugging sync issues */}
        <TbBtn onClick={async () => {
          try {
            const unlockedRes = await authAxios.get(`/api/reader/features/unlocked_pages/${bookId}/`);
            console.log('🔍 Manual refresh unlocked pages:', unlockedRes.data.unlocked_pages);
            setUnlockedPages(new Set(unlockedRes.data.unlocked_pages || []));
            setRenderKey(prev => prev + 1);
            toast("Unlocked pages refreshed");
          } catch (err) {
            console.error("Failed to refresh unlocked pages:", err);
            toast("Failed to refresh");
          }
        }} title="Refresh unlocked pages" compact={isMobile}>
          <Icon d={ICONS.refresh} size={15} />
          {!isMobile && <span>Refresh</span>}
        </TbBtn>

        <TbBtn onClick={() => goToPage(currentPage - 1)} title="Previous page (←)" compact={isMobile}>
          <Icon d={ICONS.prev} size={15} />
        </TbBtn>
        <input
          value={pageInput}
          onChange={e => setPageInput(e.target.value)}
          onBlur={() => goToPage(parseInt(pageInput) || 1)}
          onKeyDown={e => e.key === "Enter" && goToPage(parseInt(pageInput) || 1)}
          style={{
            width: isMobile ? 38 : 44, height: 28,
            textAlign: "center",
            background: "rgba(255,255,255,0.07)",
            border: `1px solid ${TOKENS.borderLight}`,
            borderRadius: 5, color: "#fff",
            fontSize: 12, fontFamily: "monospace",
            outline: "none",
          }}
        />
        {!isMobile && (
          <span style={{ fontSize: 11, color: TOKENS.dimText, fontFamily: "monospace" }}>
            / {totalPages || "—"}
          </span>
        )}
        <TbBtn onClick={() => goToPage(currentPage + 1)} title="Next page (→)" compact={isMobile}>
          <Icon d={ICONS.next} size={15} />
        </TbBtn>

        {!isMobile && <div style={{ width: 1, height: 24, background: TOKENS.borderLight, margin: "0 4px" }} />}

        <TbBtn onClick={zoomOut} title="Zoom out" compact={isMobile}>
          <Icon d={ICONS.zoomOut} size={15} />
        </TbBtn>
        {!isMobile && (
          <select
            value={scale}
            onChange={e => setScale(e.target.value === "fit" ? "fit" : parseFloat(e.target.value))}
            style={{
              height: 28,
              background: "rgba(255,255,255,0.07)",
              border: `1px solid ${TOKENS.borderLight}`,
              borderRadius: 5, color: "#fff",
              fontSize: 11, padding: "0 4px", cursor: "pointer", outline: "none",
            }}
          >
            {ZOOM_LEVELS.map(z => <option key={z} value={z}>{Math.round(z * 100)}%</option>)}
            <option value="fit">Fit</option>
          </select>
        )}
        <TbBtn onClick={zoomIn} title="Zoom in" compact={isMobile}>
          <Icon d={ICONS.zoomIn} size={15} />
        </TbBtn>

        {!isMobile && (
          <>
            <div style={{ width: 1, height: 24, background: TOKENS.borderLight, margin: "0 4px" }} />
            {toolModes.map(({ id, icon, label, tip }) => (
              <TbBtn key={id} active={mode === id} onClick={() => { setMode(id); if (id !== "select") toast(tip); }} title={tip}>
                <Icon d={icon} size={14} />
                <span>{label}</span>
              </TbBtn>
            ))}
          </>
        )}

        {!isMobile && (
          <>
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

        {isMobile && (
          <TbBtn active={showMobileTools} onClick={() => setShowMobileTools(o => !o)} compact>
            <Icon d={ICONS.highlight} size={14} />
          </TbBtn>
        )}

        <div style={{ flex: 1 }} />

        {!isMobile && (
          <div style={{
            fontSize: 9, padding: "3px 8px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${TOKENS.borderLight}`,
            color: { select: TOKENS.cobalt, highlight: TOKENS.amber, note: TOKENS.rust, bookmark: TOKENS.rosewood }[mode] || "#fff",
            fontFamily: "monospace", letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>
            {mode}
          </div>
        )}

        {!isMobile && walletBalance > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 10px",
            background: TOKENS.amberDim,
            border: `1px solid ${TOKENS.border}`,
            borderRadius: 20,
            fontSize: 11,
            color: TOKENS.amber,
            fontFamily: "monospace",
            marginLeft: 4,
          }}>
            <span style={{ fontSize: 12 }}>◆</span>
            {walletBalance}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* Sidebar */}
        <div style={{
          width: sidebarOpen ? (isMobile ? "100%" : isTablet ? 290 : 250) : 0,
          flexShrink: 0, overflow: "hidden",
          transition: "width 0.22s ease",
          background: sidebarBg,
          borderRight: isMobile ? "none" : `1px solid ${sidebarBdr}`,
          display: "flex", flexDirection: "column",
          position: isMobile ? "absolute" : "relative",
          top: 0, left: 0, height: "100%",
          zIndex: 100,
          boxShadow: isMobile && sidebarOpen ? "4px 0 24px rgba(0,0,0,0.3)" : "none",
        }}>
          {/* Tabs */}
          <div style={{
            display: "flex",
            borderBottom: `1px solid ${sidebarBdr}`,
            flexShrink: 0, background: sidebarBg,
          }}>
            {["thumbs", "bookmarks", "notes", "highlights"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                title={tab === "thumbs" ? "Page thumbnails" : 
                       tab === "bookmarks" ? "Your bookmarks" : 
                       tab === "notes" ? "Your notes" : 
                       "Your highlights"}
                style={{
                  flex: 1, padding: isMobile ? "8px 2px" : "12px 4px",
                  background: "transparent", border: "none",
                  borderBottom: `2px solid ${activeTab === tab ? TOKENS.rust : "transparent"}`,
                  color: activeTab === tab ? TOKENS.rust : sidebarMuted,
                  fontSize: isMobile ? 8 : 10,
                  cursor: "pointer", fontFamily: "'Georgia', serif",
                  textTransform: "uppercase", letterSpacing: "0.07em",
                  transition: "all 0.15s",
                  outline: "none",
                  fontWeight: activeTab === tab ? "bold" : "normal",
                }}
              >
                {tab === "thumbs" ? "Pages" : tab === "highlights" ? "Marks" : tab[0].toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px", color: sidebarText }}>
            {activeTab === "thumbs" && pdf && (
              <ThumbnailStrip pdf={pdf} totalPages={totalPages} currentPage={currentPage} onGoTo={goToPage} />
            )}

            {activeTab === "bookmarks" && (
              bookmarks.length === 0 ? (
                <EmptyState icon="◆" text={'No bookmarks yet.\nUse "Bookmark" mode and click a page.'} />
              ) : (
                [...bookmarks].sort((a, b) => a.page - b.page).map(bm => (
                  <div
                    key={bm.id}
                    onClick={() => goToPage(bm.page)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 8,
                      padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                      transition: "background 0.12s",
                      marginBottom: 4,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = isLight ? TOKENS.parchmentMid : TOKENS.amberDim}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ color: TOKENS.amber, fontSize: 12, marginTop: 1 }}>◆</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: sidebarMuted, fontFamily: "monospace", letterSpacing: "0.06em" }}>PAGE {bm.page}</div>
                      <div style={{ fontSize: 12, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bm.title}</div>
                    </div>
                    <span
                      onClick={e => { e.stopPropagation(); setBookmarks(prev => prev.filter(b => b.id !== bm.id)); toast("Removed"); }}
                      style={{ fontSize: 11, color: sidebarMuted, cursor: "pointer", padding: "0 2px", flexShrink: 0 }}
                    >✕</span>
                  </div>
                ))
              )
            )}

            {activeTab === "notes" && (
              notes.length === 0 ? (
                <EmptyState icon="✎" text={'No notes yet.\nUse "Note" mode and drag a region.'} />
              ) : (
                [...notes].sort((a, b) => a.page - b.page).map(n => (
                  <div
                    key={n.id}
                    onClick={() => goToPage(n.page)}
                    style={{
                      background: isLight ? "#fffdf5" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${isLight ? "rgba(201,150,12,0.2)" : TOKENS.border}`,
                      borderLeft: `3px solid ${TOKENS.amber}`,
                      borderRadius: 6, padding: "9px 10px",
                      marginBottom: 8, cursor: "pointer",
                      position: "relative", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = TOKENS.amber}
                    onMouseLeave={e => e.currentTarget.style.borderColor = isLight ? "rgba(201,150,12,0.2)" : TOKENS.border}
                  >
                    <div style={{ fontSize: 9, color: sidebarMuted, fontFamily: "monospace", marginBottom: 4, letterSpacing: "0.05em" }}>
                      P.{n.page} · {new Date(n.createdAt).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.6, wordBreak: "break-word" }}>{n.text}</div>
                    <span
                      onClick={e => { e.stopPropagation(); setNotes(prev => prev.filter(x => x.id !== n.id)); toast("Removed"); }}
                      style={{ position: "absolute", top: 7, right: 8, fontSize: 11, color: sidebarMuted, cursor: "pointer" }}
                    >✕</span>
                  </div>
                ))
              )
            )}

            {activeTab === "highlights" && (
              highlights.length === 0 ? (
                <EmptyState icon="◐" text={'No highlights yet.\nUse "Highlight" mode and drag.'} />
              ) : (
                [...highlights].sort((a, b) => a.page - b.page).map(hl => (
                  <div
                    key={hl.id}
                    onClick={() => goToPage(hl.page)}
                    style={{
                      padding: "8px 10px", borderRadius: 6, marginBottom: 7,
                      cursor: "pointer", background: HL_COLORS[hl.color] || HL_COLORS.yellow,
                      position: "relative", fontSize: 12, transition: "opacity 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    <div style={{ fontSize: 9, fontFamily: "monospace", marginBottom: 3, opacity: 0.65, letterSpacing: "0.05em", color: TOKENS.inkBrown }}>
                      PAGE {hl.page}
                    </div>
                    <div style={{ fontStyle: hl.note ? "normal" : "italic", opacity: hl.note ? 1 : 0.55, color: TOKENS.inkBrown }}>
                      {hl.note || "Highlighted region"}
                    </div>
                    <span
                      onClick={e => { e.stopPropagation(); setHighlights(prev => prev.filter(h => h.id !== hl.id)); toast("Removed"); }}
                      style={{ position: "absolute", top: 7, right: 8, fontSize: 11, cursor: "pointer", opacity: 0.5, color: TOKENS.inkBrown }}
                    >✕</span>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* PDF Viewer — renders ALL pages; PageCanvas decides what to show */}
        <div
          ref={viewerRef}
          onScroll={handleViewerScroll}
          style={{
            flex: 1, overflowY: "auto", overflowX: "hidden",
            background: isLight ? TOKENS.parchment : TOKENS.surfaceMid,
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: isMobile ? "20px 12px 60px" : "32px 24px 80px",
            gap: isMobile ? 32 : 48,
          }}
        >
          {loading && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", flex: 1, gap: 20, padding: "80px 20px",
            }}>
              <div style={{ fontStyle: "italic", fontSize: 22, color: TOKENS.amber, letterSpacing: "0.06em" }}>
                Dkituyiacademy
              </div>
              <Spinner size={36} />
              <div style={{ fontSize: 13, color: TOKENS.dimText, fontFamily: "monospace", letterSpacing: "0.04em" }}>
                {!book ? "Loading book…" : !pdf ? "Loading PDF…" : "Preparing reader…"}
              </div>
            </div>
          )}

          {loadError && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", flex: 1, gap: 14, padding: "80px 20px", textAlign: "center",
            }}>
              <div style={{ fontSize: 36, opacity: 0.3 }}>⚠</div>
              <div style={{ fontSize: 16, color: TOKENS.rosewood }}>Could not load document</div>
              <div style={{ fontSize: 13, color: TOKENS.dimText, maxWidth: 300, lineHeight: 1.7 }}>
                There was a problem loading this PDF. Please try again.
              </div>
            </div>
          )}

          {/* Render ALL pages — unlocked ones show PDF, locked ones show the lock screen */}
          {!loading && !loadError && pdf && Array.from({ length: totalPages }, (_, i) => i + 1).map(n => {
            const locked = !isPageUnlocked(n);
            const showCTA = shouldShowUnlockCTA(n);
            return (
              <div key={`${n}-${renderKey}`} ref={el => { if (el) pageRefs.current[n] = el; }}>
                <PageCanvas
                  pdf={pdf}
                  pageNum={n}
                  scale={scale}
                  highlights={highlights}
                  mode={mode}
                  hlColor={hlColor}
                  onHighlight={handleHighlight}
                  onNote={handleNote}
                  onBookmark={handleBookmark}
                  isMobile={isMobile}
                  isLocked={locked}
                  showUnlockCTA={showCTA}
                  perPageCost={perPageCost}
                  walletBalance={walletBalance}
                  onUnlockPage={handleInlineUnlock}
                  isLight={isLight}
                />
              </div>
            );
          })}

          {/* Preview End CTA - Only shown in preview mode */}
          {isPreviewMode() && totalPages > 0 && (
            <div style={{
              padding: "60px 40px",
              textAlign: "center",
              background: isLight ? TOKENS.parchmentMid : TOKENS.surfaceMid,
              borderTop: `1px solid ${TOKENS.border}`,
              margin: "40px 0",
            }}>
              <div style={{
                width: 80, height: 80,
                borderRadius: "50%",
                background: "rgba(201,150,12,0.1)",
                border: `2px solid ${TOKENS.amber}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 24px",
              }}>
                <Icon d={ICONS.lock} size={32} style={{ color: TOKENS.amber }} />
              </div>
              
              <h2 style={{
                fontSize: isMobile ? 24 : 28,
                color: isLight ? TOKENS.inkBrown : TOKENS.bodyText,
                fontFamily: "'Georgia', serif",
                fontStyle: "italic",
                marginBottom: 16,
                fontWeight: 700,
              }}>
                Preview Complete
              </h2>
              
              <p style={{
                fontSize: isMobile ? 15 : 17,
                color: isLight ? TOKENS.warmGray : TOKENS.subtleText,
                lineHeight: 1.7,
                marginBottom: 32,
                maxWidth: 400,
                margin: "0 auto 32px",
              }}>
                You've reached the end of your free preview ({Math.max(1, Math.ceil(totalPages * 0.2))} pages). 
                {token 
                  ? "Add this book to your library to continue reading the full book and unlock all features."
                  : "Sign in to continue reading the full book and unlock all features."
                }
              </p>
              
              <div style={{
                display: "flex",
                gap: 16,
                justifyContent: "center",
                flexDirection: isMobile ? "column" : "row",
                alignItems: "center",
              }}>
                {token ? (
                  <>
                    <button
                      onClick={async () => {
                        try {
                          await axios.post('/api/library/user/library/', { book_id: bookId });
                          toast("Added to your library! Redirecting...");
                          setTimeout(() => {
                            navigate(`/reader/${bookId}`);
                          }, 1500);
                        } catch (err) {
                          toast(err.response?.data?.error || "Failed to add to library");
                        }
                      }}
                      style={{
                        padding: "14px 32px",
                        background: "linear-gradient(135deg, #8b3a1e, #a3451f)",
                        border: "none", 
                        borderRadius: 8, 
                        fontSize: 16, 
                        cursor: "pointer",
                        color: "#fff", 
                        fontFamily: "'Georgia', serif", 
                        fontWeight: 600,
                        boxShadow: "0 4px 12px rgba(139,58,30,0.3)",
                        transition: "all 0.3s ease",
                      }}
                      onMouseOver={(e) => {
                        e.target.style.transform = "translateY(-2px)";
                        e.target.style.boxShadow = "0 6px 16px rgba(139,58,30,0.4)";
                      }}
                      onMouseOut={(e) => {
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "0 4px 12px rgba(139,58,30,0.3)";
                      }}
                    >
                      Add to Library
                    </button>
                    <button
                      onClick={() => navigate("/books")}
                      style={{
                        padding: "14px 32px",
                        background: "transparent",
                        border: `1px solid ${TOKENS.border}`, 
                        borderRadius: 8, 
                        fontSize: 16, 
                        cursor: "pointer",
                        color: isLight ? TOKENS.inkBrown : TOKENS.bodyText, 
                        fontFamily: "'Georgia', serif", 
                        fontWeight: 600,
                        transition: "all 0.3s ease",
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = isLight ? TOKENS.parchment : TOKENS.surfaceDark;
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = "transparent";
                      }}
                    >
                      Browse More Books
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        window.location.href = `/login?redirect=/reader/${bookId}`;
                      }}
                      style={{
                        padding: "14px 32px",
                        background: "linear-gradient(135deg, #c9960c, #e8c98a)",
                        border: "none", 
                        borderRadius: 8, 
                        fontSize: 16, 
                        cursor: "pointer",
                        color: "#fff", 
                        fontFamily: "'Georgia', serif", 
                        fontWeight: 600,
                        boxShadow: "0 4px 12px rgba(201,150,12,0.3)",
                        transition: "all 0.3s ease",
                      }}
                      onMouseOver={(e) => {
                        e.target.style.transform = "translateY(-2px)";
                        e.target.style.boxShadow = "0 6px 16px rgba(201,150,12,0.4)";
                      }}
                      onMouseOut={(e) => {
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "0 4px 12px rgba(201,150,12,0.3)";
                      }}
                    >
                      Sign In to Continue Reading
                    </button>
                    <button
                      onClick={() => navigate("/books")}
                      style={{
                        padding: "14px 32px",
                        background: "transparent",
                        border: `1px solid ${TOKENS.border}`, 
                        borderRadius: 8, 
                        fontSize: 16, 
                        cursor: "pointer",
                        color: isLight ? TOKENS.inkBrown : TOKENS.bodyText, 
                        fontFamily: "'Georgia', serif", 
                        fontWeight: 600,
                        transition: "all 0.3s ease",
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = isLight ? TOKENS.parchment : TOKENS.surfaceDark;
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = "transparent";
                      }}
                    >
                      Browse More Books
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Annotation Toolbar - Always Visible */}
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
        {/* Annotation Mode Buttons */}
        {toolModes.map(({ id, icon, label, tip }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            title={tip}
            style={{
              width: isMobile ? 40 : 48,
              height: isMobile ? 40 : 48,
              borderRadius: "50%",
              background: mode === id 
                ? `linear-gradient(135deg, ${TOKENS.rust}, ${TOKENS.amber})` 
                : isLight 
                  ? "rgba(255,255,255,0.95)" 
                  : "rgba(30,20,15,0.95)",
              border: mode === id 
                ? `2px solid ${TOKENS.rustLight}` 
                : `2px solid ${isLight ? TOKENS.parchmentDim : TOKENS.borderLight}`,
              color: mode === id ? "#fff" : (isLight ? TOKENS.rust : TOKENS.amber),
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: mode === id 
                ? `0 4px 16px ${TOKENS.rust}40` 
                : isLight 
                  ? "0 4px 12px rgba(0,0,0,0.15)" 
                  : "0 4px 12px rgba(0,0,0,0.3)",
              transition: "all 0.2s ease",
              pointerEvents: "auto",
              fontSize: isMobile ? 16 : 18,
              fontFamily: "'Georgia', serif",
            }}
            onMouseEnter={(e) => {
              if (mode !== id) {
                e.currentTarget.style.transform = "scale(1.1)";
                e.currentTarget.style.boxShadow = isLight 
                  ? "0 6px 16px rgba(0,0,0,0.2)" 
                  : "0 6px 16px rgba(0,0,0,0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== id) {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = isLight 
                  ? "0 4px 12px rgba(0,0,0,0.15)" 
                  : "0 4px 12px rgba(0,0,0,0.3)";
              }
            }}
          >
            <Icon d={icon} size={isMobile ? 18 : 20} />
          </button>
        ))}

        {/* Color Picker for Highlight Mode */}
        {mode === "highlight" && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: 8,
            background: isLight ? TOKENS.parchmentMid : TOKENS.surfaceDeep,
            border: `1px solid ${isLight ? TOKENS.parchmentDim : TOKENS.border}`,
            borderRadius: 12,
            boxShadow: isLight 
              ? "0 4px 12px rgba(0,0,0,0.15)" 
              : "0 4px 12px rgba(0,0,0,0.3)",
            pointerEvents: "auto",
          }}>
            {Object.entries(HL_SWATCHES).map(([name, hex]) => (
              <button
                key={name}
                onClick={() => setHlColor(name)}
                title={name}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: hex,
                  border: hlColor === name 
                    ? `2px solid ${TOKENS.rust}` 
                    : `2px solid ${isLight ? TOKENS.parchmentDim : TOKENS.borderLight}`,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobile annotation drawer - hidden since we have floating toolbar */}
      {false && isMobile && showMobileTools && (
        <div style={{
          position: "fixed",
          top: "50%",
          right: 16,
          transform: "translateY(-50%)",
          background: isLight ? TOKENS.parchmentMid : TOKENS.surfaceDeep,
          border: `1px solid ${isLight ? TOKENS.parchmentDim : TOKENS.border}`,
          borderRadius: 12,
          padding: "12px",
          zIndex: 500,
          boxShadow: isLight ? "0 8px 32px rgba(0,0,0,0.15)" : "0 8px 32px rgba(0,0,0,0.5)",
          animation: "pdfrSlideUp 0.2s ease",
          minWidth: 140,
          maxWidth: 160,
        }}>
          <div style={{
            width: 24, height: 3, borderRadius: 2,
            background: isLight ? "rgba(139,58,30,0.2)" : "rgba(255,255,255,0.15)",
            margin: "0 auto 12px",
          }} />

          <div style={{ fontSize: 9, color: TOKENS.dimText, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10, fontFamily: "monospace", textAlign: "center" }}>
            Tools
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {toolModes.map(({ id, icon, label }) => (
              <button
                key={id}
                onClick={() => { setMode(id); setShowMobileTools(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                  background: mode === id ? "rgba(139,58,30,0.25)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${mode === id ? TOKENS.rustLight : TOKENS.borderLight}`,
                  color: mode === id ? TOKENS.bodyText : TOKENS.subtleText,
                  fontSize: 11, fontFamily: "'Georgia', serif",
                  transition: "all 0.15s",
                  justifyContent: "flex-start",
                }}
              >
                <Icon d={icon} size={14} />
                <span style={{ fontSize: 10 }}>{label}</span>
              </button>
            ))}
          </div>

          <div style={{ fontSize: 9, color: TOKENS.dimText, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8, fontFamily: "monospace", textAlign: "center" }}>
            Color
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, justifyContent: "center", marginBottom: 12 }}>
            {Object.entries(HL_SWATCHES).map(([name, hex]) => (
              <Swatch key={name} name={name} hex={hex} active={hlColor === name} onClick={setHlColor} />
            ))}
          </div>

          <button
            onClick={() => setShowMobileTools(false)}
            style={{
              width: "100%", padding: "8px",
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${TOKENS.borderLight}`,
              borderRadius: 6,
              color: TOKENS.subtleText,
              fontSize: 11, cursor: "pointer",
              fontFamily: "'Georgia', serif",
            }}
          >
            Done
          </button>
        </div>
      )}

      {/* Annotation popup */}
      {annotPopup && (
        <div style={{
          position: "fixed",
          left: annotPopup.x, top: annotPopup.y,
          background: isLight ? TOKENS.parchment : "#1e1510",
          border: `1px solid ${isLight ? TOKENS.parchmentDim : TOKENS.border}`,
          borderRadius: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
          padding: 14,
          width: isMobile ? Math.min(window.innerWidth - 32, 300) : 248,
          zIndex: 300,
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
              resize: "vertical", outline: "none", boxSizing: "border-box",
              lineHeight: 1.6,
            }}
          />
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 8 }}>
            <button
              onClick={() => setAnnotPopup(null)}
              style={{
                padding: "5px 12px", borderRadius: 5, fontSize: 12, cursor: "pointer",
                background: "transparent",
                border: `1px solid ${isLight ? TOKENS.parchmentDim : TOKENS.borderLight}`,
                color: TOKENS.warmGray, fontFamily: "'Georgia', serif",
              }}
            >Cancel</button>
            <button
              onClick={saveAnnot}
              style={{
                padding: "5px 12px", borderRadius: 5, fontSize: 12, cursor: "pointer",
                background: "linear-gradient(135deg, #8b3a1e, #a3451f)",
                border: `1px solid ${TOKENS.rustLight}`,
                color: "#fff", fontFamily: "'Georgia', serif",
                boxShadow: "0 2px 8px rgba(139,58,30,0.3)",
              }}
            >Save</button>
          </div>
        </div>
      )}

      {/* Search panel */}
      {searchOpen && (
        <div style={{
          position: "fixed",
          top: isMobile ? 52 : 60,
          right: 16,
          background: isLight ? TOKENS.parchment : "#1a1208",
          border: `1px solid ${sidebarBdr}`,
          borderRadius: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
          padding: 14,
          width: isMobile ? Math.min(window.innerWidth - 32, 300) : 288,
          zIndex: 200,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: sidebarMuted, fontFamily: "monospace", letterSpacing: "0.06em", textTransform: "uppercase" }}>Search</span>
            <button onClick={() => setSearchOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: sidebarMuted, padding: 2, display: "flex" }}>
              <Icon d={ICONS.x} size={14} />
            </button>
          </div>
          <input
            autoFocus
            value={searchText}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search in document…"
            style={{
              width: "100%", height: 34,
              border: `1px solid ${sidebarBdr}`,
              borderRadius: 5, padding: "0 10px",
              fontFamily: "'Georgia', serif", fontSize: 13,
              color: isLight ? TOKENS.inkBrown : TOKENS.bodyText,
              background: isLight ? "#fffdf8" : "rgba(255,255,255,0.06)",
              marginBottom: 8, boxSizing: "border-box", outline: "none",
            }}
          />
          {searchPages.length > 0 && (
            <div style={{ fontSize: 11, color: TOKENS.rust, marginBottom: 8, fontFamily: "monospace" }}>
              {searchPages.length} page{searchPages.length > 1 ? "s" : ""} — {searchIdx + 1}/{searchPages.length}
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            {["↑ Prev", "↓ Next"].map((label, i) => (
              <button
                key={label}
                onClick={() => {
                  if (!searchPages.length) return;
                  const idx = ((searchIdx + (i === 0 ? -1 : 1)) + searchPages.length) % searchPages.length;
                  setSearchIdx(idx); goToPage(searchPages[idx]);
                }}
                style={{
                  flex: 1, padding: "6px 0", borderRadius: 5, fontSize: 12, cursor: "pointer",
                  background: "transparent",
                  border: `1px solid ${sidebarBdr}`,
                  color: sidebarMuted, fontFamily: "'Georgia', serif",
                  transition: "all 0.12s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toast */}
      <div style={{
        position: "fixed", bottom: isMobile ? 20 : 24,
        left: "50%", transform: "translateX(-50%)",
        background: TOKENS.surfaceDeep,
        color: TOKENS.bodyText,
        padding: "7px 18px", borderRadius: 20,
        fontSize: 12, zIndex: 400,
        opacity: toastVisible ? 1 : 0,
        transition: "opacity 0.25s ease",
        pointerEvents: "none",
        border: `1px solid ${TOKENS.border}`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        fontFamily: "monospace", letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}>
        {toastMsg}
      </div>

      <style>{`
        @keyframes pdfrSpin { to { transform: rotate(360deg); } }
        @keyframes pdfrSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(201,150,12,0.25); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(201,150,12,0.45); }
        select option { background: #1a1208; color: #f0e6d3; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}