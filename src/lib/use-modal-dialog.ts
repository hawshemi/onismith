"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

// Wires the WAI-ARIA modal-dialog behavior for a panel element: move focus in
// on open, keep Tab within the panel, close on Escape, and restore focus to the
// previously focused element on close. `onClose` is read through a ref so an
// inline (non-memoized) callback does not re-run the trap on every render.
export function useModalDialog<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    const panel = ref.current;
    if (!panel) {
      return;
    }
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

    const first = focusables()[0];
    if (first) {
      first.focus();
    } else {
      panel.setAttribute("tabindex", "-1");
      panel.focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === firstItem || !panel.contains(active)) {
          event.preventDefault();
          lastItem.focus();
        }
      } else if (active === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
    // onClose is intentionally omitted: it is read through onCloseRef, so an
    // inline (non-memoized) callback must not re-run the trap and steal focus.
  }, [open]);

  return ref;
}
