"use client";

import { useState } from "react";

/**
 * Runs `sync` during render whenever any entry in `deps` changes (including the
 * first render). This is React's "adjust state during render" pattern for
 * resetting local state when a prop or derived value changes, without an effect
 * It avoids the extra commit that `useEffect(() => setState(...))` causes and
 * satisfies react-hooks/set-state-in-effect.
 *
 * `sync` should only call setState of the current component.
 */
export function useSyncOnChange(
  deps: readonly unknown[],
  sync: () => void,
): void {
  const [previous, setPrevious] = useState<readonly unknown[] | null>(null);
  const changed =
    previous === null ||
    previous.length !== deps.length ||
    deps.some((value, index) => !Object.is(value, previous[index]));
  if (changed) {
    setPrevious(deps);
    sync();
  }
}
