import React, { useCallback, useMemo, useState } from "react";

export default function WhatsAppShare({
  type = "quote",
  content,
  bookTitle,
  authorName,
  userName,
  highlightId,
  noteId,
  achievementType,
  bookId,
  floating = false,
  position,
  onClose,
  className = "",
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = useMemo(() => {
    try {
      return localStorage.getItem("token");
    } catch {
      return null;
    }
  }, []);

  const postJson = useCallback(async (url, body) => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body || {}),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = { success: false, error: "Invalid server response" };
    }

    if (!res.ok && (data?.success === undefined || data?.success === true)) {
      return { success: false, error: data?.detail || "Request failed" };
    }

    return data;
  }, [token]);

  const handleShare = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let data;

      if (type === "quote") {
        const quoteText = (content || "").trim();
        if (!quoteText) {
          setError("Select some text to share");
          return;
        }

        data = await postJson("/api/reader/share/quote-image/", {
          quote_text: quoteText,
          book_title: bookTitle,
          author_name: authorName,
          user_name: userName,
        });
      } else if (type === "highlight") {
        data = await postJson("/api/reader/share/highlight/", { highlight_id: highlightId });
      } else if (type === "note") {
        data = await postJson("/api/reader/share/note/", { note_id: noteId });
      } else if (type === "achievement") {
        data = await postJson("/api/reader/share/achievement/", {
          achievement_type: achievementType,
          book_id: bookId,
        });
      } else {
        setError("Invalid share type");
        return;
      }

      if (!data?.success) {
        setError(data?.error || "Failed to generate share content");
        return;
      }

      if (data?.whatsapp_url) {
        window.open(data.whatsapp_url, "_blank", "noopener,noreferrer");
      }

      if (floating && onClose) {
        onClose();
      }
    } catch (e) {
      setError(e?.message || "Failed to share");
    } finally {
      setLoading(false);
    }
  }, [achievementType, authorName, bookId, bookTitle, content, floating, highlightId, noteId, onClose, postJson, type, userName]);

  const buttonStyle = useMemo(() => {
    if (!floating) return undefined;
    if (!position) return undefined;

    return {
      position: "fixed",
      left: Math.max(10, Math.min(position.x, window.innerWidth - 58)),
      top: Math.max(10, Math.min(position.y, window.innerHeight - 58)),
      zIndex: 10000,
      width: 48,
      height: 48,
      borderRadius: 999,
      background: "#25D366",
      color: "#fff",
      border: "none",
      boxShadow: "0 8px 22px rgba(0,0,0,0.35)",
      cursor: loading ? "not-allowed" : "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 0,
    };
  }, [floating, position, loading]);

  const wrapStyle = useMemo(() => {
    return floating ? undefined : { display: "inline-flex", flexDirection: "column" };
  }, [floating]);

  return (
    <div className={className} style={wrapStyle}>
      <button
        type="button"
        onClick={handleShare}
        disabled={loading}
        style={
          floating
            ? buttonStyle
            : {
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#25D366",
                color: "#fff",
                border: "none",
                padding: "8px 12px",
                borderRadius: 10,
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 600,
              }
        }
        title={type === "quote" ? "Share selected text to WhatsApp" : "Share to WhatsApp"}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>{loading ? "…" : "WA"}</span>
        {!floating && <span>Share</span>}
      </button>

      {!floating && error && (
        <div style={{ marginTop: 6, color: "#ef4444", fontSize: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
