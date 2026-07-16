"use client";

import { useEffect } from "react";

// Last-resort boundary for errors thrown in the root layout itself. It replaces
// the entire document (including the provider and globals.css), so it must ship
// its own <html>/<body> and inline styles, and any in-memory save is already
// gone by the time this renders, so the only recovery is a reload.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c0e12",
          color: "#e7ecec",
          fontFamily: "'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
          padding: "1rem",
        }}
      >
        <div
          role="alert"
          style={{
            maxWidth: "32rem",
            width: "100%",
            textAlign: "center",
            border: "1px solid rgba(110, 231, 183, 0.3)",
            borderRadius: "1.25rem",
            background: "#1e2530",
            padding: "1.5rem",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#fb7185",
            }}
          >
            The app failed to load
          </h2>
          <p
            style={{ marginTop: "0.5rem", fontSize: "0.875rem", opacity: 0.85 }}
          >
            A fatal error occurred before the editor could start. Reload to try
            again. Any unsaved changes were not written.
          </p>
          <div
            style={{
              marginTop: "1.25rem",
              display: "flex",
              gap: "0.5rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                border: "1px solid transparent",
                borderRadius: "9999px",
                background: "#6ee7b7",
                color: "#000",
                fontWeight: 600,
                padding: "0.5rem 0.75rem",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                border: "1px solid rgba(110, 231, 183, 0.3)",
                borderRadius: "9999px",
                background: "transparent",
                color: "#e7ecec",
                fontWeight: 600,
                padding: "0.5rem 0.75rem",
                cursor: "pointer",
              }}
            >
              Reload app
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
