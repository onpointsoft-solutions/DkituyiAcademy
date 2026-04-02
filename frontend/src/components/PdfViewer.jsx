// PdfViewer.jsx — improved and production-ready
import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Configure worker once
pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const THEME = {
  light: { bg: "#fdfaf4", fg: "#1a1008", border: "#d4c4a8" },
  dark: { bg: "#1a1008", fg: "#fdfaf4", border: "#7a6a52" },
};

const PdfViewer = ({
  pdfUrl,
  currentPage = 1,
  onPageChange,
  scale = 1.0,
  onScaleChange,
  theme = "light",
  unlockedPages,
  unlockingPage,
  userBalance,
  pageCost,
  onUnlockPage,
  className = "",
  style = {},
}) => {

  const [numPages, setNumPages] = useState(null);
  const containerRef = useRef(null);
  const colors = THEME[theme] ?? THEME.light;

  /* -----------------------------------------------------
     Page Change with Smooth Scrolling
  -----------------------------------------------------*/
  useEffect(() => {
    if (!currentPage || !numPages) return;

    const pageElement = document.querySelector(`[data-page-number="${currentPage}"]`);
    if (pageElement) {
      pageElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    }
  }, [currentPage, numPages]);

  /* -----------------------------------------------------
     Keyboard Navigation with Enhanced UX
  -----------------------------------------------------*/
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey) return;

      if (e.key === "ArrowRight" && currentPage < numPages) {
        onPageChange(currentPage + 1);
        document.body.classList.add("page-transition-right");
        setTimeout(() => document.body.classList.remove("page-transition-right"), 300);
      }

      if (e.key === "ArrowLeft" && currentPage > 1) {
        onPageChange(currentPage - 1);
        document.body.classList.add("page-transition-left");
        setTimeout(() => document.body.classList.remove("page-transition-left"), 300);
      }

      if (e.key === "Home") onPageChange(1);
      if (e.key === "End") onPageChange(numPages);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentPage, numPages, onPageChange]);

  /* -----------------------------------------------------
     Page Render Success
  -----------------------------------------------------*/
  const onPageRenderSuccess = useCallback((page) => {
    console.log(`Page ${page._pageIndex + 1} rendered`);
  }, []);

  /* -----------------------------------------------------
     All Pages List
  -----------------------------------------------------*/
  const allPages = useMemo(() => {
    if (!numPages) return [];
    return Array.from({ length: numPages }, (_, i) => i + 1);
  }, [numPages]);

  /* -----------------------------------------------------
     Intersection Observer (lazy rendering)
  -----------------------------------------------------*/
  const [visiblePages, setVisiblePages] = useState(new Set());

  useEffect(() => {
    if (!containerRef.current || !numPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNumber = parseInt(entry.target.dataset.pageNumber);
          if (entry.isIntersecting) {
            setVisiblePages((prev) => new Set(prev).add(pageNumber));
          }
        });
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    containerRef.current
      .querySelectorAll("[data-page-number]")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [numPages]);

  /* -----------------------------------------------------
     Render Single Page
  -----------------------------------------------------*/
  const renderPage = useCallback(
    (pageNumber) => {
      const isUnlocked = unlockedPages.has(pageNumber);
      const isUnlocking = unlockingPage === pageNumber;

      const wrapStyle = {
        marginBottom: 20,
        borderRadius: 8,
        overflow: "hidden",
        border: `1px solid ${colors.border}`,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      };

      const shouldRender =
        Math.abs(pageNumber - currentPage) <= 5 ||
        unlockedPages.has(pageNumber) ||
        pageNumber === 1 ||
        visiblePages.has(pageNumber);

      if (!shouldRender) {
        return (
          <div
            key={pageNumber}
            data-page-number={pageNumber}
            style={{
              ...wrapStyle,
              minHeight: 400,
              backgroundColor: colors.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.fg,
              opacity: 0.6,
            }}
          >
            <div style={{ fontSize: 14 }}>Page {pageNumber} — Scroll to load</div>
          </div>
        );
      }

      /* ---------- LOCKED PAGE ---------- */
      if (!isUnlocked) {
        return (
          <div
            key={pageNumber}
            data-page-number={pageNumber}
            style={{
              ...wrapStyle,
              minHeight: 400,
              backgroundColor: colors.bg,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
              textAlign: "center",
              color: colors.fg,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>
              Page {pageNumber} — Locked
            </div>
            <div style={{ fontSize: 14, marginBottom: 8, opacity: 0.8 }}>
              Unlock for {pageCost} coins
            </div>
            <div style={{ fontSize: 12, marginBottom: 16, opacity: 0.6 }}>
              Your balance: {userBalance} coins
            </div>
            <button
              onClick={() => onUnlockPage(pageNumber)}
              disabled={isUnlocking || userBalance < pageCost}
              className={`unlock-button ${isUnlocking ? "unlocking" : ""}`}
              style={{
                padding: "12px 24px",
                backgroundColor: userBalance >= pageCost ? "#4CAF50" : "#ccc",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: userBalance >= pageCost ? "pointer" : "not-allowed",
                fontSize: 14,
                fontWeight: "bold",
                opacity: isUnlocking ? 0.7 : 1,
                transition: "all 0.3s ease",
                transform: isUnlocking ? "scale(0.95)" : "scale(1)",
              }}
            >
              {isUnlocking ? (
                <div className="unlocking-animation">
                  <span className="unlock-spinner"></span>
                  Unlocking...
                </div>
              ) : (
                <span>🔓 Unlock for {pageCost} coins</span>
              )}
            </button>
          </div>
        );
      }

      /* ---------- UNLOCKED PAGE ---------- */
      return (
        <div key={pageNumber} data-page-number={pageNumber} style={wrapStyle}>
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderMode="canvas"
            renderTextLayer
            renderAnnotationLayer
            onRenderSuccess={onPageRenderSuccess}
            loading={
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: colors.fg,
                  backgroundColor: colors.bg,
                }}
              >
                Loading page {pageNumber}...
              </div>
            }
          />
        </div>
      );
    },
    [
      scale,
      colors,
      unlockedPages,
      unlockingPage,
      userBalance,
      pageCost,
      onUnlockPage,
      onPageRenderSuccess,
      currentPage,
      visiblePages,
    ]
  );

  /* -----------------------------------------------------
     Document Loaded
  -----------------------------------------------------*/
  const onDocumentLoadSuccess = useCallback(({ numPages: total }) => {
    setNumPages(total);
  }, []);

  /* -----------------------------------------------------
     UI
  -----------------------------------------------------*/
  return (
    <div
      ref={containerRef}
      className={`pdf-viewer ${className}`}
      style={{
        width: "100%",
        maxWidth: "1200px",
        margin: "0 auto",
        backgroundColor: colors.bg,
        color: colors.fg,
        ...style,
      }}
    >
      <Document
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={
          <div className="page-loading">
            <div style={{ fontSize: 18, marginBottom: 16, color: colors.fg }}>
              Loading PDF document...
            </div>
            <div style={{ fontSize: 14, opacity: 0.7, color: colors.fg }}>
              Preparing your book
            </div>
          </div>
        }
        error={
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "#d32f2f",
              backgroundColor: "#fff5f5",
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 16 }}>❌ Failed to load PDF</div>
            <div style={{ fontSize: 14, opacity: 0.7 }}>Please try again later</div>
          </div>
        }
      >
        {allPages.map(renderPage)}
      </Document>

      <style>{`
        .pdf-viewer {
          max-width: 100%;
          overflow-x: hidden;
          padding: 20px;
          box-sizing: border-box;
        }

        .react-pdf__Page {
          margin: 0 auto;
          display: block;
          max-width: 100%;
          transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
        }

        .react-pdf__Page canvas {
          max-width: 100% !important;
          height: auto !important;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .page-transition-right .react-pdf__Page {
          animation: slideInRight 0.3s ease-out;
        }

        .page-transition-left .react-pdf__Page {
          animation: slideInLeft 0.3s ease-out;
        }

        @keyframes slideInRight {
          from { transform: translateX(20px); opacity: 0.7; }
          to   { transform: translateX(0);    opacity: 1;   }
        }

        @keyframes slideInLeft {
          from { transform: translateX(-20px); opacity: 0.7; }
          to   { transform: translateX(0);     opacity: 1;   }
        }

        .page-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          background: linear-gradient(45deg, #f8f9fa, #e9ecef);
          border-radius: 12px;
          position: relative;
          overflow: hidden;
        }

        .page-loading::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0%   { left: -100%; }
          100% { left:  100%; }
        }

        @media (max-width: 768px) {
          .pdf-viewer { padding: 10px; }
          .react-pdf__Page { margin-bottom: 10px; }
          .react-pdf__Page canvas { max-height: 70vh !important; }
        }

        @media (max-width: 480px) {
          .pdf-viewer { padding: 5px; }
          .react-pdf__Page { margin-bottom: 5px; }
          .react-pdf__Page canvas { max-height: 60vh !important; }
        }

        .page-enter {
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.5s ease-out;
        }

        .page-enter-active {
          opacity: 1;
          transform: translateY(0);
        }

        .unlock-button {
          position: relative;
          overflow: hidden;
        }

        .unlock-button.unlocking {
          transform: scale(0.95);
        }

        .unlocking-animation {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .unlock-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid #ffffff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .unlocking-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(2px);
        }

        .unlocking-content {
          background: white;
          padding: 20px;
          border-radius: 12px;
          animation: unlockPulse 1.5s ease-in-out;
        }

        @keyframes unlockPulse {
          0%, 100% { transform: scale(1);    }
          50%       { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default PdfViewer;