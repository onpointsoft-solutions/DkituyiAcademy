import { useState, useEffect, useRef, useCallback } from "react";

// ─── Load PDF.js from CDN ───────────────────────────────────────────────────
const PDFJS_VERSION = "3.11.174";
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const WORKER_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
const SAMPLE_PDF = "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf";

const HL_COLORS = {
  yellow: "rgba(255,218,60,0.45)",
  green:  "rgba(80,200,110,0.42)",
  blue:   "rgba(80,150,240,0.42)",
  pink:   "rgba(230,80,140,0.38)",
};
const HL_SWATCHES = {
  yellow: "#ffd93c",
  green:  "#50c86e",
  blue:   "#5096f0",
  pink:   "#e6508c",
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const S = {
  root: {
    display: "flex", flexDirection: "column", height: "100vh",
    fontFamily: "'Georgia', serif",
    background: "#1a1208", color: "#f0e6d3", overflow: "hidden",
  },
  toolbar: {
    display: "flex", alignItems: "center", gap: 2,
    padding: "0 12px", height: 52, flexShrink: 0,
    background: "#120d06",
    borderBottom: "1px solid rgba(201,150,12,0.25)",
    boxShadow: "0 2px 16px rgba(0,0,0,0.5)",
  },
  brand: {
    fontFamily: "'Georgia', serif", fontStyle: "italic",
    fontSize: 20, color: "#c9960c", marginRight: 10,
    letterSpacing: "0.04em", userSelect: "none",
  },
  sep: { width: 1, height: 28, background: "rgba(255,255,255,0.1)", margin: "0 6px" },
  tbBtn: (active) => ({
    height: 34, minWidth: 34, padding: "0 8px",
    background: active ? "#8b3a1e" : "transparent",
    border: `1px solid ${active ? "#c4622d" : "transparent"}`,
    borderRadius: 6, color: active ? "#fff" : "rgba(255,255,255,0.7)",
    cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
    fontSize: 12, fontFamily: "inherit", transition: "all 0.15s",
    whiteSpace: "nowrap",
  }),
  pageInput: {
    width: 46, height: 30, textAlign: "center",
    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 5, color: "#fff", fontSize: 13,
    fontFamily: "monospace",
  },
  pageTotal: { fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" },
  zoomSel: {
    height: 30, background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.18)", borderRadius: 5,
    color: "#fff", fontSize: 12, padding: "0 6px", cursor: "pointer",
  },
  main: { flex: 1, display: "flex", overflow: "hidden" },
  sidebar: (open) => ({
    width: open ? 260 : 0, flexShrink: 0, overflow: "hidden",
    transition: "width 0.25s ease",
    background: "#f5ead8", borderRight: "1px solid #e0d0b0",
    display: "flex", flexDirection: "column",
  }),
  sideTabs: {
    display: "flex", borderBottom: "1px solid #e0d0b0", flexShrink: 0,
  },
  sideTab: (active) => ({
    flex: 1, padding: "9px 2px", textAlign: "center",
    fontSize: 10, cursor: "pointer", fontFamily: "inherit",
    color: active ? "#8b3a1e" : "#9b7a5a",
    borderBottom: `2px solid ${active ? "#8b3a1e" : "transparent"}`,
    background: "transparent", border: "none",
    borderBottom: `2px solid ${active ? "#8b3a1e" : "transparent"}`,
    textTransform: "uppercase", letterSpacing: "0.06em",
    transition: "all 0.15s",
  }),
  sideBody: {
    flex: 1, overflowY: "auto", padding: 10,
    color: "#2c1810",
  },
  viewer: {
    flex: 1, overflowY: "auto", overflowX: "hidden",
    background: "#2e2010",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "24px 16px", gap: 20,
  },
  pageWrap: {
    position: "relative", flexShrink: 0,
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    borderRadius: 2, background: "#fff",
  },
  overlay: (mode) => ({
    position: "absolute", inset: 0,
    cursor: mode === "select" ? "default" : mode === "highlight" ? "crosshair" : mode === "note" ? "cell" : "pointer",
    userSelect: "none",
  }),
  progress: {
    height: 3, background: "#8b3a1e",
    transition: "width 0.3s", position: "absolute", top: 0, left: 0,
  },
  progressBar: {
    position: "relative", height: 3,
    background: "rgba(255,255,255,0.08)", flexShrink: 0,
  },
  hlRect: (color) => ({
    position: "absolute", background: HL_COLORS[color] || HL_COLORS.yellow,
    mixBlendMode: "multiply", borderRadius: 2, cursor: "pointer",
  }),
  annotPopup: {
    position: "fixed", background: "#f5ead8",
    border: "1px solid #e0d0b0", borderRadius: 8,
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    padding: 14, width: 240, zIndex: 300,
  },
  annotTextarea: {
    width: "100%", minHeight: 80, border: "1px solid #e0d0b0",
    borderRadius: 4, padding: 8, fontFamily: "inherit",
    fontSize: 13, color: "#2c1810", background: "#fffdf8",
    resize: "vertical", marginBottom: 8, outline: "none",
    boxSizing: "border-box",
  },
  toast: (show) => ({
    position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
    background: "#120d06", color: "#f0e6d3",
    padding: "7px 18px", borderRadius: 20, fontSize: 13, zIndex: 400,
    opacity: show ? 1 : 0, transition: "opacity 0.3s", pointerEvents: "none",
    border: "1px solid rgba(201,150,12,0.3)",
  }),
  emptyState: {
    textAlign: "center", color: "#9b7a5a", fontSize: 13,
    padding: "2rem 1rem", fontStyle: "italic",
  },
  noteCard: {
    background: "#fffdf5", border: "1px solid rgba(201,150,12,0.25)",
    borderLeft: "3px solid #c9960c", borderRadius: 6,
    padding: "9px 10px", marginBottom: 9, position: "relative", cursor: "pointer",
  },
  bookmarkItem: {
    display: "flex", alignItems: "flex-start", gap: 8,
    padding: 8, borderRadius: 6, cursor: "pointer",
    transition: "background 0.12s",
  },
  hlItem: (color) => ({
    padding: "8px 10px", borderRadius: 6, marginBottom: 8,
    cursor: "pointer", background: HL_COLORS[color] || HL_COLORS.yellow,
    position: "relative", fontSize: 13,
  }),
  searchPanel: {
    position: "fixed", top: 60, right: 16,
    background: "#f5ead8", border: "1px solid #e0d0b0",
    borderRadius: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    padding: 12, width: 280, zIndex: 200,
  },
  searchInput: {
    width: "100%", height: 34, border: "1px solid #e0d0b0",
    borderRadius: 4, padding: "0 10px", fontFamily: "inherit",
    fontSize: 13, color: "#2c1810", background: "#fffdf8",
    marginBottom: 8, boxSizing: "border-box", outline: "none",
  },
  modeChip: (mode) => {
    const colors = { select:"#4a9eff", highlight:"#ffd93c", note:"#c9960c", bookmark:"#e6508c" };
    return {
      fontSize: 10, padding: "3px 8px", borderRadius: 10,
      background: "rgba(255,255,255,0.1)", color: colors[mode] || "#fff",
      fontFamily: "monospace", letterSpacing: "0.05em", border: `1px solid ${colors[mode]}44`,
    };
  },
};

// ─── Icons ───────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
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
  cursor:    "M9.5 4C5.36 4 2 7.36 2 11.5S5.36 19 9.5 19c1.61 0 3.09-.49 4.3-1.32l4.55 4.55 1.41-1.41-4.55-4.55C16.51 14.59 17 13.11 17 11.5 17 7.36 13.64 4 9.5 4zm0 2c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5z",
  fullscreen:"M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z",
  upload:    "M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z",
};

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
function PageCanvas({ pdf, pageNum, scale, highlights, mode, hlColor, onHighlight, onNote, onBookmark }) {
  const canvasRef = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragRect, setDragRect] = useState(null);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    let cancelled = false;

    async function render() {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
      }
      const page = await pdf.getPage(pageNum);
      let sc = scale;
      if (sc === "fit") {
        const vp0 = page.getViewport({ scale: 1 });
        const viewerW = canvasRef.current?.parentElement?.parentElement?.clientWidth - 32 || 600;
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
  }, [pdf, pageNum, scale]);

  const getRelPos = (e, el) => {
    const r = el.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width,
      y: (e.clientY - r.top) / r.height,
    };
  };

  const handleMouseDown = (e) => {
    if (mode === "select" || mode === "bookmark") return;
    e.preventDefault();
    const pos = getRelPos(e, e.currentTarget);
    setDragStart(pos);
    setDragging(true);
    setDragRect(null);
  };

  const handleMouseMove = (e) => {
    if (!dragging || !dragStart) return;
    const pos = getRelPos(e, e.currentTarget);
    setDragRect({
      x: Math.min(dragStart.x, pos.x),
      y: Math.min(dragStart.y, pos.y),
      w: Math.abs(pos.x - dragStart.x),
      h: Math.abs(pos.y - dragStart.y),
    });
  };

  const handleMouseUp = (e) => {
    if (!dragging || !dragStart) return;
    setDragging(false);
    const pos = getRelPos(e, e.currentTarget);
    const rect = {
      x: Math.min(dragStart.x, pos.x),
      y: Math.min(dragStart.y, pos.y),
      w: Math.abs(pos.x - dragStart.x),
      h: Math.abs(pos.y - dragStart.y),
    };
    setDragRect(null);
    setDragStart(null);
    if (rect.w < 0.01 || rect.h < 0.005) return;
    if (mode === "highlight") onHighlight(pageNum, rect, hlColor);
    if (mode === "note") onNote(pageNum, rect, e.clientX, e.clientY, hlColor);
  };

  const handleClick = (e) => {
    if (mode === "bookmark") onBookmark(pageNum);
  };

  const pageHls = highlights.filter(h => h.page === pageNum);

  return (
    <div style={{ ...S.pageWrap, width: dims.w || "auto" }}>
      <canvas ref={canvasRef} style={{ display: "block", borderRadius: 2 }} />
      {/* Highlights */}
      {pageHls.map(hl => (
        <div
          key={hl.id}
          title={hl.note || ""}
          style={{
            ...S.hlRect(hl.color),
            left: `${hl.x * 100}%`, top: `${hl.y * 100}%`,
            width: `${hl.w * 100}%`, height: `${hl.h * 100}%`,
          }}
        />
      ))}
      {/* Drag selection preview */}
      {dragging && dragRect && (
        <div style={{
          position: "absolute",
          left: `${dragRect.x * 100}%`, top: `${dragRect.y * 100}%`,
          width: `${dragRect.w * 100}%`, height: `${dragRect.h * 100}%`,
          border: "1.5px dashed #8b3a1e",
          background: "rgba(139,58,30,0.08)",
          pointerEvents: "none", zIndex: 5,
        }} />
      )}
      {/* Interaction overlay */}
      <div
        style={{ ...S.overlay(mode), position: "absolute", inset: 0 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
      />
      {/* Page number badge */}
      <div style={{
        position: "absolute", bottom: -22, left: "50%", transform: "translateX(-50%)",
        fontSize: 11, color: "rgba(240,230,211,0.5)", fontFamily: "monospace", whiteSpace: "nowrap",
      }}>
        {pageNum}
      </div>
    </div>
  );
}

// ─── ThumbnailStrip ───────────────────────────────────────────────────────────
function ThumbnailStrip({ pdf, totalPages, currentPage, onGoTo }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
        <ThumbnailItem key={n} pdf={pdf} pageNum={n} active={n === currentPage} onGoTo={onGoTo} />
      ))}
    </div>
  );
}
function ThumbnailItem({ pdf, pageNum, active, onGoTo }) {
  const ref = useRef(null);
  const [rendered, setRendered] = useState(false);

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
    }, { rootMargin: "100px" });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [pdf, pageNum, rendered]);

  return (
    <div
      onClick={() => onGoTo(pageNum)}
      style={{
        cursor: "pointer", borderRadius: 4, overflow: "hidden",
        border: `2px solid ${active ? "#8b3a1e" : "transparent"}`,
        background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        transition: "border-color 0.15s",
      }}
    >
      <canvas ref={ref} style={{ width: "100%", display: "block" }} />
      <div style={{ textAlign: "center", fontSize: 10, padding: "3px 0", color: "#6b4f3a", fontFamily: "monospace" }}>
        {pageNum}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function PDFReader() {
  const pdfJsReady = usePdfJs();

  const [pdf, setPdf] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [mode, setMode] = useState("select");
  const [hlColor, setHlColor] = useState("yellow");
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
  const [annotPopup, setAnnotPopup] = useState(null); // { x, y, pageNum, rect, hlColor }
  const [annotText, setAnnotText] = useState("");

  const [bookmarks, setBookmarks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("lmn_bm") || "[]"); } catch { return []; }
  });
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("lmn_notes") || "[]"); } catch { return []; }
  });
  const [highlights, setHighlights] = useState(() => {
    try { return JSON.parse(localStorage.getItem("lmn_hl") || "[]"); } catch { return []; }
  });

  const viewerRef = useRef(null);
  const pageRefs = useRef({});
  const toastTimer = useRef(null);

  // Persist
  useEffect(() => { try { localStorage.setItem("lmn_bm", JSON.stringify(bookmarks)); } catch {} }, [bookmarks]);
  useEffect(() => { try { localStorage.setItem("lmn_notes", JSON.stringify(notes)); } catch {} }, [notes]);
  useEffect(() => { try { localStorage.setItem("lmn_hl", JSON.stringify(highlights)); } catch {} }, [highlights]);

  const toast = useCallback((msg) => {
    setToastMsg(msg); setToastVisible(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2200);
  }, []);

  // Load PDF
  const loadPDF = useCallback(async (source) => {
    if (!window.pdfjsLib) return;
    setLoading(true); setLoadError(false);
    try {
      let docInit;
      if (source instanceof ArrayBuffer) {
        docInit = { data: source };
      } else {
        // Fetch as ArrayBuffer to avoid CORS/postMessage blob issues
        const res = await fetch(source);
        if (!res.ok) throw new Error("fetch failed");
        const buf = await res.arrayBuffer();
        docInit = { data: buf };
      }
      const doc = await window.pdfjsLib.getDocument(docInit).promise;
      setPdf(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      setPageInput("1");
      setProgress(0);
      setLoading(false);
    } catch (e) {
      console.error("PDF load error:", e);
      setLoading(false);
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    if (pdfJsReady) loadPDF(SAMPLE_PDF);
  }, [pdfJsReady, loadPDF]);

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
    setCurrentPage(n);
    setPageInput(String(n));
    setProgress(((n - 1) / Math.max(1, totalPages - 1)) * 100);
    const el = pageRefs.current[n];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [totalPages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goToPage(currentPage + 1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goToPage(currentPage - 1);
      if (e.key === "h") { setMode("highlight"); toast("Drag to highlight"); }
      if (e.key === "n") { setMode("note"); toast("Drag to add note"); }
      if (e.key === "s") setMode("select");
      if (e.key === "b") { setMode("bookmark"); toast("Click a page to bookmark"); }
      if ((e.ctrlKey || e.metaKey) && e.key === "f") { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentPage, goToPage, toast]);

  // Drag-and-drop file
  useEffect(() => {
    const over = (e) => e.preventDefault();
    const drop = (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.type === "application/pdf") {
        const reader = new FileReader();
        reader.onload = (ev) => loadPDF(ev.target.result);
        reader.readAsArrayBuffer(file);
        setBookmarks([]); setNotes([]); setHighlights([]);
      }
    };
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => { window.removeEventListener("dragover", over); window.removeEventListener("drop", drop); };
  }, [loadPDF]);

  // Handlers
  const handleHighlight = useCallback((pageNum, rect, color) => {
    const hl = { id: Date.now() + Math.random(), page: pageNum, ...rect, color, note: "", createdAt: new Date().toISOString() };
    setHighlights(prev => [...prev, hl]);
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
      toast(`Bookmarked page ${pageNum} ✓`);
      return [...prev, { id: Date.now(), page: pageNum, title: `Page ${pageNum}`, createdAt: new Date().toISOString() }];
    });
  }, [toast]);

  const saveAnnot = () => {
    if (!annotText.trim()) { toast("Please enter a note"); return; }
    const { pageNum, rect, color } = annotPopup;
    const note = { id: Date.now(), page: pageNum, text: annotText.trim(), rect, color, createdAt: new Date().toISOString() };
    setNotes(prev => [...prev, note]);
    if (rect) {
      const hl = { id: Date.now() + 1, page: pageNum, ...rect, color, note: annotText.trim() };
      setHighlights(prev => [...prev, hl]);
    }
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
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const str = content.items.map(t => t.str).join(" ");
      if (str.toLowerCase().includes(text.toLowerCase())) matches.push(i);
    }
    setSearchPages(matches);
    setSearchIdx(0);
    if (matches.length) goToPage(matches[0]);
    else toast("No matches found");
  }, [pdf, totalPages, goToPage, toast]);

  // File input
  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      loadPDF(ev.target.result);
      setBookmarks([]); setNotes([]); setHighlights([]);
    };
    reader.readAsArrayBuffer(file);
  };

  const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const zoomIn = () => {
    const i = ZOOM_LEVELS.indexOf(scale);
    if (i < ZOOM_LEVELS.length - 1) setScale(ZOOM_LEVELS[i + 1]);
  };
  const zoomOut = () => {
    const i = ZOOM_LEVELS.indexOf(scale);
    if (i > 0) setScale(ZOOM_LEVELS[i - 1]);
  };

  const isBookmarked = bookmarks.some(b => b.page === currentPage);

  return (
    <div style={S.root}>
      {/* Progress bar */}
      <div style={S.progressBar}>
        <div style={{ ...S.progress, width: `${progress}%` }} />
      </div>

      {/* Toolbar */}
      <div style={S.toolbar}>
        <span style={S.brand}>Lumina</span>
        <div style={S.sep} />

        <button style={S.tbBtn(false)} onClick={() => setSidebarOpen(o => !o)} title="Toggle sidebar">
          <Icon d={ICONS.menu} />
        </button>

        <div style={S.sep} />

        <button style={S.tbBtn(false)} onClick={() => goToPage(currentPage - 1)} title="Previous (←)">
          <Icon d={ICONS.prev} />
        </button>
        <input
          style={S.pageInput}
          value={pageInput}
          onChange={e => setPageInput(e.target.value)}
          onBlur={() => goToPage(parseInt(pageInput) || 1)}
          onKeyDown={e => e.key === "Enter" && goToPage(parseInt(pageInput) || 1)}
        />
        <span style={S.pageTotal}>/ {totalPages || "—"}</span>
        <button style={S.tbBtn(false)} onClick={() => goToPage(currentPage + 1)} title="Next (→)">
          <Icon d={ICONS.next} />
        </button>

        <div style={S.sep} />

        <button style={S.tbBtn(false)} onClick={zoomOut} title="Zoom out (-)">
          <Icon d={ICONS.zoomOut} />
        </button>
        <select
          style={S.zoomSel}
          value={scale}
          onChange={e => setScale(e.target.value === "fit" ? "fit" : parseFloat(e.target.value))}
        >
          {ZOOM_LEVELS.map(z => <option key={z} value={z}>{Math.round(z * 100)}%</option>)}
          <option value="fit">Fit</option>
        </select>
        <button style={S.tbBtn(false)} onClick={zoomIn} title="Zoom in (+)">
          <Icon d={ICONS.zoomIn} />
        </button>

        <div style={S.sep} />

        {[
          { id: "select",    icon: ICONS.cursor,    label: "Select",    tip: "S" },
          { id: "highlight", icon: ICONS.highlight, label: "Highlight", tip: "H — drag to highlight" },
          { id: "note",      icon: ICONS.note,      label: "Note",      tip: "N — drag to annotate" },
          { id: "bookmark",  icon: ICONS.bookmark,  label: "Mark",      tip: "B — click to bookmark" },
        ].map(({ id, icon, label, tip }) => (
          <button
            key={id}
            style={S.tbBtn(mode === id)}
            onClick={() => {
              setMode(id);
              if (id !== "select") toast(tip);
            }}
            title={tip}
          >
            <Icon d={icon} />
            <span style={{ fontSize: 11 }}>{label}</span>
          </button>
        ))}

        <div style={S.sep} />

        {/* Highlight color swatches */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {Object.entries(HL_SWATCHES).map(([name, hex]) => (
            <div
              key={name}
              onClick={() => { setHlColor(name); }}
              title={name}
              style={{
                width: 18, height: 18, borderRadius: "50%", background: hex,
                cursor: "pointer", border: hlColor === name ? "2px solid #fff" : "2px solid transparent",
                transition: "transform 0.12s", transform: hlColor === name ? "scale(1.25)" : "scale(1)",
              }}
            />
          ))}
        </div>

        <div style={S.sep} />

        <button style={S.tbBtn(searchOpen)} onClick={() => setSearchOpen(o => !o)} title="Search (Ctrl+F)">
          <Icon d={ICONS.search} />
        </button>

        <span style={S.modeChip(mode)}>{mode.toUpperCase()}</span>

        <div style={{ flex: 1 }} />

        <label style={{ ...S.tbBtn(false), cursor: "pointer" }} title="Open PDF file">
          <Icon d={ICONS.upload} />
          <span style={{ fontSize: 11 }}>Open</span>
          <input type="file" accept=".pdf" style={{ display: "none" }} onChange={handleFileInput} />
        </label>
      </div>

      {/* Main */}
      <div style={S.main}>
        {/* Sidebar */}
        <div style={S.sidebar(sidebarOpen)}>
          <div style={S.sideTabs}>
            {["thumbs", "bookmarks", "notes", "highlights"].map(tab => (
              <button key={tab} style={S.sideTab(activeTab === tab)} onClick={() => setActiveTab(tab)}>
                {tab === "thumbs" ? "Pages" : tab === "highlights" ? "Hilights" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <div style={S.sideBody}>
            {activeTab === "thumbs" && pdf && (
              <ThumbnailStrip pdf={pdf} totalPages={totalPages} currentPage={currentPage} onGoTo={goToPage} />
            )}
            {activeTab === "bookmarks" && (
              bookmarks.length === 0
                ? <div style={S.emptyState}>No bookmarks yet.<br />Use "Mark" mode and click a page.</div>
                : [...bookmarks].sort((a, b) => a.page - b.page).map(bm => (
                  <div
                    key={bm.id}
                    style={S.bookmarkItem}
                    onClick={() => goToPage(bm.page)}
                    onMouseEnter={e => e.currentTarget.style.background = "#eedfc4"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ color: "#c9960c", fontSize: 14 }}>◆</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: "#9b7a5a", fontFamily: "monospace" }}>Page {bm.page}</div>
                      <div style={{ fontSize: 13 }}>{bm.title}</div>
                    </div>
                    <span
                      style={{ fontSize: 12, color: "#9b7a5a", cursor: "pointer" }}
                      onClick={e => { e.stopPropagation(); setBookmarks(prev => prev.filter(b => b.id !== bm.id)); toast("Removed"); }}
                    >✕</span>
                  </div>
                ))
            )}
            {activeTab === "notes" && (
              notes.length === 0
                ? <div style={S.emptyState}>No notes yet.<br />Use "Note" mode and drag a region.</div>
                : [...notes].sort((a, b) => a.page - b.page).map(n => (
                  <div key={n.id} style={S.noteCard} onClick={() => goToPage(n.page)}>
                    <div style={{ fontSize: 10, color: "#9b7a5a", fontFamily: "monospace", marginBottom: 4 }}>
                      Page {n.page} · {new Date(n.createdAt).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, wordBreak: "break-word" }}>{n.text}</div>
                    <span
                      style={{ position: "absolute", top: 8, right: 8, fontSize: 12, color: "#9b7a5a", cursor: "pointer", opacity: 0.7 }}
                      onClick={e => { e.stopPropagation(); setNotes(prev => prev.filter(x => x.id !== n.id)); toast("Note removed"); }}
                    >✕</span>
                  </div>
                ))
            )}
            {activeTab === "highlights" && (
              highlights.length === 0
                ? <div style={S.emptyState}>No highlights yet.<br />Use "Highlight" mode and drag.</div>
                : [...highlights].sort((a, b) => a.page - b.page).map(hl => (
                  <div key={hl.id} style={S.hlItem(hl.color)} onClick={() => goToPage(hl.page)}>
                    <div style={{ fontSize: 10, fontFamily: "monospace", marginBottom: 3, opacity: 0.7 }}>Page {hl.page}</div>
                    <div style={{ fontStyle: hl.note ? "normal" : "italic", opacity: hl.note ? 1 : 0.6 }}>
                      {hl.note || "Highlighted region"}
                    </div>
                    <span
                      style={{ position: "absolute", top: 8, right: 8, fontSize: 12, cursor: "pointer", opacity: 0.7 }}
                      onClick={e => { e.stopPropagation(); setHighlights(prev => prev.filter(h => h.id !== hl.id)); toast("Removed"); }}
                    >✕</span>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* PDF Viewer */}
        <div ref={viewerRef} style={S.viewer} onScroll={handleViewerScroll}>
          {loading && (
            <div style={{ color: "rgba(240,230,211,0.6)", fontSize: 14, padding: "4rem", textAlign: "center" }}>
              <div style={{ fontStyle: "italic", fontSize: 22, color: "#c9960c", marginBottom: 12 }}>Lumina</div>
              <div style={{
                width: 36, height: 36, border: "3px solid rgba(255,255,255,0.1)",
                borderTopColor: "#8b3a1e", borderRadius: "50%",
                animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
              }} />
              Loading document…
            </div>
          )}
          {loadError && (
            <div style={{ color: "rgba(240,230,211,0.7)", textAlign: "center", padding: "3rem" }}>
              <div style={{ fontSize: 18, marginBottom: 12, color: "#e6508c" }}>Could not load sample PDF</div>
              <div style={{ fontSize: 13, marginBottom: 16 }}>Drag & drop a PDF file, or use the Open button above.</div>
            </div>
          )}
          {!loading && !loadError && pdf && (
            Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <div key={n} ref={el => { if (el) pageRefs.current[n] = el; }} style={{ marginBottom: 44 }}>
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
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Annotation Popup */}
      {annotPopup && (
        <div style={{ ...S.annotPopup, left: annotPopup.x, top: annotPopup.y }}>
          <div style={{ fontSize: 12, color: "#9b7a5a", marginBottom: 8 }}>Add note — Page {annotPopup.pageNum}</div>
          <textarea
            autoFocus
            style={S.annotTextarea}
            value={annotText}
            onChange={e => setAnnotText(e.target.value)}
            placeholder="Type your note here…"
            onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) saveAnnot(); }}
          />
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button
              style={{ padding: "5px 12px", borderRadius: 4, fontSize: 12, cursor: "pointer", background: "#e8ddc8", border: "1px solid #d0c0a0", color: "#2c1810", fontFamily: "inherit" }}
              onClick={() => setAnnotPopup(null)}
            >Cancel</button>
            <button
              style={{ padding: "5px 12px", borderRadius: 4, fontSize: 12, cursor: "pointer", background: "#8b3a1e", border: "1px solid #c4622d", color: "#fff", fontFamily: "inherit" }}
              onClick={saveAnnot}
            >Save</button>
          </div>
        </div>
      )}

      {/* Search Panel */}
      {searchOpen && (
        <div style={S.searchPanel}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "#6b4f3a", fontWeight: "bold" }}>Search</span>
            <span style={{ cursor: "pointer", color: "#9b7a5a", fontSize: 14 }} onClick={() => setSearchOpen(false)}>✕</span>
          </div>
          <input
            autoFocus
            style={S.searchInput}
            value={searchText}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search in document…"
          />
          {searchPages.length > 0 && (
            <div style={{ fontSize: 12, color: "#8b3a1e", marginBottom: 6 }}>
              Found on {searchPages.length} page(s) — showing {searchIdx + 1}/{searchPages.length}
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{ padding: "5px 10px", borderRadius: 4, fontSize: 12, cursor: "pointer", background: "#e8ddc8", border: "1px solid #d0c0a0", color: "#2c1810", fontFamily: "inherit" }}
              onClick={() => { if (!searchPages.length) return; const i = (searchIdx - 1 + searchPages.length) % searchPages.length; setSearchIdx(i); goToPage(searchPages[i]); }}
            >↑ Prev</button>
            <button style={{ padding: "5px 10px", borderRadius: 4, fontSize: 12, cursor: "pointer", background: "#e8ddc8", border: "1px solid #d0c0a0", color: "#2c1810", fontFamily: "inherit" }}
              onClick={() => { if (!searchPages.length) return; const i = (searchIdx + 1) % searchPages.length; setSearchIdx(i); goToPage(searchPages[i]); }}
            >↓ Next</button>
          </div>
        </div>
      )}

      {/* Toast */}
      <div style={S.toast(toastVisible)}>{toastMsg}</div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(201,150,12,0.3); border-radius: 3px; }
        select option { background: #2c1810; color: #f0e6d3; }
      `}</style>
    </div>
  );
}