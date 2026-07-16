"use client";

import { useEffect } from "react";
import M3TonalButton from "@/components/ui/m3-tonal-button";
import M3OutlinedButton from "@/components/ui/m3-outlined-button";

// Route-segment error boundary. The SaveSessionProvider lives in the root
// layout, above this boundary, so a thrown render here does not lose the loaded
// save: `reset()` re-renders the segment with session state intact.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // No telemetry backend; surface it in the console for debugging.
    console.error(error);
  }, [error]);

  return (
    <section
      role="alert"
      className="m3-card mx-auto max-w-xl p-6 text-center sm:p-8"
    >
      <h2 className="m3-error-text text-2xl font-semibold">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm opacity-80">
        This page hit an unexpected error. Your loaded save is still in memory,
        so try again first; if it keeps happening, reload the app and re-open
        the file.
      </p>
      {error?.message ? (
        <p className="mt-3 text-xs opacity-70">
          <code>{error.message}</code>
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <M3TonalButton onClick={reset} className="px-3 py-2 text-sm">
          Try again
        </M3TonalButton>
        <M3OutlinedButton
          onClick={() => window.location.reload()}
          className="px-3 py-2 text-sm"
        >
          Reload app
        </M3OutlinedButton>
      </div>
    </section>
  );
}
