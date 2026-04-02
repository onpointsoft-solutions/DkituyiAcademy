import { useState, useEffect } from "react";

// ─── icons ───────────────────────────────────────────────────────────────────

const FacebookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const YoutubeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#1a1a1a" />
  </svg>
);

const InstagramIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const TikTokIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
  </svg>
);

// ─── constants ────────────────────────────────────────────────────────────────

const TEAL = "#00c9a7";
const DARK = "#1a1a1a";
const WHITE = "#ffffff";

const NAV_LINKS = [
  { label: "About",          href: "https://dkituyiacademy.org/about/"    },
  { label: "Dashboard",      href: "/dashboard" },
  { label: "Publishing",     href: "https://dkituyiacademy.org/about-us" },
  { label: "eBooks",         href: "https://dkituyiacademy.org/ebooks"    },
  { label: "Physical Books", href: "https://dkituyiacademy.org/about/physical-books"     },
];

const SOCIAL_LINKS = [
  { icon: <FacebookIcon />,  label: "Facebook",  href: "#" },
  { icon: <YoutubeIcon />,   label: "YouTube",   href: "#" },
  { icon: <InstagramIcon />, label: "Instagram", href: "#" },
  { icon: <TikTokIcon />,    label: "TikTok",    href: "#" },
];

const FOOTER_COLS = [
  { title: "Explore",  links: ["About", "eBooks", "Physical Books"] },
  { title: "Platform", links: ["Dashboard", "Publishing", "Newsletter"] },
];

// ─── shared sub-components ────────────────────────────────────────────────────

function SocialBtn({ icon, label, href }) {
  const [hov, setHov] = useState(false);
  return (
    <a
      href={href}
      aria-label={label}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 36, height: 36, borderRadius: "50%",
        border: `1px solid ${hov ? TEAL : "rgba(255,255,255,0.18)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: hov ? TEAL : "rgba(255,255,255,0.5)",
        background: hov ? "rgba(0,201,167,0.08)" : "transparent",
        transition: "all 0.2s", textDecoration: "none", flexShrink: 0,
      }}
    >
      {icon}
    </a>
  );
}

function LogoMark({ color = WHITE }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <img 
        src="/logo.png"
        alt="DK Academy Logo"
        width={206}   // 🔥 increased from 38 → 56
        height={206}
        loading="eager"
        decoding="async"
        style={{
          objectFit: "contain",
          flexShrink: 0,
        }}
      />
      <span style={{
        fontSize: 28,   // 🔥 increased text size
        fontWeight: 700,
        color,
        fontFamily: "'Playfair Display', serif",
      }}>
      </span>
    </div>
  );
}

// ─── main layout component ────────────────────────────────────────────────────

/**
 * DKituyiNavFooter
 *
 * Layout wrapper that renders the fixed navbar, your page content (children),
 * and the footer. Use it like:
 *
 *   <DKituyiNavFooter>
 *     <YourPageContent />
 *   </DKituyiNavFooter>
 */
export default function DKituyiNavFooter({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile]   = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [hovNav, setHovNav]       = useState(null);
  const [hovMob, setHovMob]       = useState(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Inject Google Fonts once
  useEffect(() => {
    if (!document.getElementById("dk-gfont")) {
      const link = document.createElement("link");
      link.id   = "dk-gfont";
      link.rel  = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Jost:wght@400;500;600&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <div style={{ fontFamily: "'Jost', sans-serif", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: DARK, height: 72,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "0 20px" : "0 48px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        boxSizing: "border-box",
      }}>
        <a href="/" style={{ textDecoration: "none" }}>
          <LogoMark />
        </a>

        {/* Desktop links */}
        {!isMobile && (
          <ul style={{ display: "flex", alignItems: "center", gap: 32, listStyle: "none", margin: 0, padding: 0 }}>
            {NAV_LINKS.map(({ label, href }) => (
              <li key={label}>
                <a
                  href={href}
                  onMouseEnter={() => setHovNav(label)}
                  onMouseLeave={() => setHovNav(null)}
                  style={{
                    color: hovNav === label ? TEAL : "rgba(255,255,255,0.72)",
                    textDecoration: "none", fontSize: 12,
                    letterSpacing: "1.5px", textTransform: "uppercase",
                    fontWeight: 500, fontFamily: "'Jost', sans-serif",
                    transition: "color 0.2s",
                  }}
                >{label}</a>
              </li>
            ))}
          </ul>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
            style={{ background: "none", border: "none", color: WHITE, cursor: "pointer", padding: 4, lineHeight: 0 }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
      </nav>

      {/* ── MOBILE MENU OVERLAY ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: DARK,
          display: "flex", flexDirection: "column",
          padding: "28px 32px 40px",
          transform: menuOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.38s cubic-bezier(0.77,0,0.175,1)",
          overflowY: "auto", boxSizing: "border-box",
        }}
      >
        {/* Menu header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 52 }}>
          <div>
            <LogoMark />
            <p style={{
              fontSize: 11, color: "rgba(255,255,255,0.38)",
              letterSpacing: "1.2px", textTransform: "uppercase",
              marginTop: 8, fontFamily: "'Jost', sans-serif",
            }}>Books &amp; Media Online Store</p>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation menu"
            style={{
              background: "none", border: "none", color: "rgba(255,255,255,0.6)",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, letterSpacing: "1px", textTransform: "uppercase",
              fontFamily: "'Jost', sans-serif", marginTop: 6,
            }}
          >
            Close
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Mobile nav links */}
        <ul style={{ listStyle: "none", margin: 0, padding: 0, flex: 1 }}>
          {NAV_LINKS.map(({ label, href }) => (
            <li key={label} style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <a
                href={href}
                onClick={() => setMenuOpen(false)}
                onMouseEnter={() => setHovMob(label)}
                onMouseLeave={() => setHovMob(null)}
                style={{
                  display: "block",
                  color: hovMob === label ? TEAL : WHITE,
                  textDecoration: "none", fontSize: 34, fontWeight: 600,
                  fontFamily: "'Playfair Display', serif",
                  padding: "15px 0",
                  paddingLeft: hovMob === label ? 10 : 0,
                  transition: "color 0.2s, padding-left 0.2s",
                }}
              >{label}</a>
            </li>
          ))}
        </ul>

        {/* Mobile social icons */}
        <div style={{ display: "flex", gap: 14, paddingTop: 32 }}>
          {SOCIAL_LINKS.map(s => <SocialBtn key={s.label} {...s} />)}
        </div>
      </div>

      {/* ── PAGE CONTENT (children) ── */}
      <main style={{ marginTop: 72, flex: 1 }}>
        {children}
      </main>

      {/* ── FOOTER ── */}
      <footer style={{ background: DARK, padding: isMobile ? "48px 24px 28px" : "60px 48px 32px", boxSizing: "border-box" }}>
        {/* Footer top */}
        <div style={{
          display: "flex", flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between", alignItems: "flex-start",
          paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.08)", gap: 40,
        }}>
          <div>
            <LogoMark />
            <p style={{
              fontSize: 11, color: "rgba(255,255,255,0.3)",
              letterSpacing: "1.2px", textTransform: "uppercase",
              marginTop: 10, fontFamily: "'Jost', sans-serif",
            }}>Books &amp; Media Online Store</p>
          </div>

          <div style={{ display: "flex", gap: isMobile ? 36 : 56, flexWrap: "wrap" }}>
            {FOOTER_COLS.map(col => (
              <div key={col.title}>
                <h4 style={{
                  fontSize: 10, letterSpacing: "2px", textTransform: "uppercase",
                  color: "rgba(255,255,255,0.28)", marginBottom: 14, marginTop: 0,
                  fontFamily: "'Jost', sans-serif", fontWeight: 600,
                }}>{col.title}</h4>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map(l => (
                    <li key={l}>
                      <a href="#" style={{
                        color: "rgba(255,255,255,0.55)", textDecoration: "none",
                        fontSize: 14, fontFamily: "'Jost', sans-serif",
                      }}>{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Footer bottom */}
        <div style={{
          display: "flex", flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between", paddingTop: 28, gap: 16,
        }}>
          <p style={{
            fontSize: 12, color: "rgba(255,255,255,0.28)",
            fontFamily: "'Jost', sans-serif", margin: 0,
          }}>
            Crafted with <span style={{ color: TEAL }}>♥</span> by Riconets · DKituyi Academy © 2025. All Rights Reserved.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            {SOCIAL_LINKS.map(s => <SocialBtn key={s.label} {...s} />)}
          </div>
        </div>
      </footer>
    </div>
  );
}