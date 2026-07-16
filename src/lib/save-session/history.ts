// Bounded undo/redo history, kept pure and framework-free so it can be unit
// tested without the React/parser module graph. Snapshots are stored by
// reference: every save mutation already produces a new object via structural
// sharing, so unchanged subtrees are shared between snapshots and the memory
// cost scales with what changed, not with save size.

// Cap the number of retained snapshots so a long editing session can't grow the
// past stack without bound. 50 steps is deep enough to be useful and shallow
// enough that even large saves stay cheap (references, not clones).
export const MAX_HISTORY = 50;

export interface History<T> {
  past: T[];
  future: T[];
}

export const EMPTY_HISTORY: History<never> = { past: [], future: [] };

// Append `present` to the past stack, dropping the oldest entries past the cap,
// and clear the redo stack (a fresh edit invalidates any redo branch).
export function record<T>(
  history: History<T>,
  present: T,
  max: number = MAX_HISTORY,
): History<T> {
  const kept =
    history.past.length >= max
      ? history.past.slice(history.past.length - (max - 1))
      : history.past;
  return { past: [...kept, present], future: [] };
}

export interface Transition<T> {
  history: History<T>;
  present: T;
}

// Move one step back: the top of `past` becomes the new present, and the
// current present is pushed onto `future`. Returns null when there is nothing
// to undo so callers can no-op without mutating state.
export function undo<T>(
  history: History<T>,
  present: T,
  max: number = MAX_HISTORY,
): Transition<T> | null {
  if (history.past.length === 0) {
    return null;
  }
  const previous = history.past[history.past.length - 1];
  const nextFuture = [present, ...history.future].slice(0, max);
  return {
    history: { past: history.past.slice(0, -1), future: nextFuture },
    present: previous,
  };
}

// Move one step forward: the head of `future` becomes the new present, and the
// current present is pushed back onto `past`. Returns null when there is
// nothing to redo.
export function redo<T>(
  history: History<T>,
  present: T,
  max: number = MAX_HISTORY,
): Transition<T> | null {
  if (history.future.length === 0) {
    return null;
  }
  const next = history.future[0];
  const kept =
    history.past.length >= max
      ? history.past.slice(history.past.length - (max - 1))
      : history.past;
  return {
    history: { past: [...kept, present], future: history.future.slice(1) },
    present: next,
  };
}
