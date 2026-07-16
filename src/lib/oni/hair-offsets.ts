export const HAIR_OFFSETS_STORAGE_KEY = "onismith.hairOffsets";

// Reads the persisted per-hairstyle offset overrides. Safe to call as a lazy
// useState initializer: returns {} on the server and for malformed/missing
// storage. The offset UI only renders after a save is loaded (client-only,
// post-hydration), so reading during the initial client render is mismatch-free.
export function readStoredHairOffsets(): HairOffsets {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const stored = window.localStorage.getItem(HAIR_OFFSETS_STORAGE_KEY);
    if (!stored) {
      return {};
    }
    const parsed: unknown = JSON.parse(stored);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      // Stored entries may be partial/malformed; consumers guard each field.
      return parsed as HairOffsets;
    }
  } catch {
    // Ignore malformed storage.
  }
  return {};
}

export interface HairOffset {
  x: number;
  y: number;
  scale: number;
}

export type HairOffsets = Record<string, HairOffset>;

export const HAIR_OFFSET_BASES: Record<number, HairOffset> = {
  1: { x: -3, y: -37, scale: 1 },
  2: { x: -3, y: -59, scale: 1 },
  3: { x: -4, y: -44, scale: 1.2 },
  4: { x: 2, y: -5, scale: 1.6 },
  5: { x: -12, y: -52, scale: 1.3 },
  6: { x: -1, y: -11, scale: 1.4 },
  7: { x: -3, y: -41, scale: 0.9 },
  8: { x: -19, y: -45, scale: 1.5 },
  9: { x: 19, y: -62, scale: 1.2 },
  10: { x: 0, y: -9, scale: 1.5 },
  11: { x: -3, y: -53, scale: 0.9 },
  12: { x: -26, y: -50, scale: 1.3 },
  13: { x: -10, y: -49, scale: 1.3 },
  14: { x: 1, y: -18, scale: 1.5 },
  16: { x: 2, y: -19, scale: 1.5 },
  17: { x: 9, y: -40, scale: 1.3 },
  18: { x: 19, y: -23, scale: 1.2 },
  19: { x: 0, y: -43, scale: 0.95 },
  20: { x: 2, y: -20, scale: 1.5 },
  21: { x: -12, y: -52, scale: 1.3 },
  22: { x: 21, y: -22, scale: 1.2 },
  27: { x: 19, y: -59, scale: 1.2 },
  28: { x: -29, y: -50, scale: 1.3 },
  29: { x: -13, y: -69, scale: 1.1 },
  30: { x: -19, y: -48, scale: 1.5 },
  31: { x: -3, y: -55, scale: 0.85 },
  32: { x: 19, y: -62, scale: 1.2 },
  33: { x: 3, y: -1, scale: 1.6 },
  36: { x: 0, y: -35, scale: 1 },
  37: { x: -9, y: -43, scale: 1.7 },
  38: { x: -5, y: -39, scale: 1.6 },
  44: { x: -5, y: -31, scale: 1.1 },
  54: { x: -3, y: -52, scale: 1.2 },
};
