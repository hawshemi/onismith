"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModalDialog } from "@/lib/use-modal-dialog";

type M3DialogProps = {
  open: boolean;
  onClose: () => void;
  role?: "dialog" | "alertdialog";
  labelledBy?: string;
  describedBy?: string;
  // Sizing/spacing for the raised surface (e.g. "w-full max-w-lg p-5").
  className?: string;
  children: ReactNode;
};

// Shared modal shell: a backdrop plus a focus-trapped raised surface that closes
// on backdrop click or Escape. Callers toggle a single `open` boolean; the
// backdrop, focus handling, and ARIA wiring live here instead of at each site.
export default function M3Dialog({
  open,
  onClose,
  role = "dialog",
  labelledBy,
  describedBy,
  className = "",
  children,
}: M3DialogProps) {
  const dialogRef = useModalDialog<HTMLDivElement>(open, onClose);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-[var(--scrim)] p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className={`m3-surface-raised m3-scrollbar min-h-0 overscroll-contain ${className}`.trim()}
        style={{
          maxHeight: "min(48rem, calc(100dvh - 2rem))",
          overflowY: "auto",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
