import { HAIR_OFFSET_BASES } from "@/lib/oni/hair-offsets";
import type { HairOffset } from "@/lib/oni/hair-offsets";
import { getSafeAccessoryOrdinal } from "@/lib/oni/accessory-constraints";

const ACCESSORY_BASE_PATH = "/images/oni";

function formatAccessoryOrdinal(ordinal: number): string {
  const safe = Number.isFinite(ordinal) ? Math.max(1, Math.floor(ordinal)) : 1;
  return String(safe);
}

// Resolves the local sprite path for a head/hair accessory, falling back to a
// bundled asset when the requested ordinal has no image.
export function getAccessorySrc(
  type: "hair" | "head",
  ordinal: number,
): string {
  const safeType = type === "hair" ? "hair" : "head";
  const safeOrdinal = getSafeAccessoryOrdinal(safeType, ordinal);
  const padded = formatAccessoryOrdinal(safeOrdinal);
  return `${ACCESSORY_BASE_PATH}/${type}/${type}_${padded}.png`;
}

// Combines the per-style base offset with any stored user offset for a hair
// ordinal. Returns raw (unscaled) values; callers apply their own render scale.
export function getHairAdjustments(
  hairOrdinal: number,
  hairOffsets: Record<string, unknown>,
) {
  const storedOffset =
    hairOffsets?.[String(hairOrdinal)] ?? hairOffsets?.[hairOrdinal];
  const hairOffset: Partial<HairOffset> | undefined =
    storedOffset && typeof storedOffset === "object"
      ? (storedOffset as Partial<HairOffset>)
      : undefined;
  const baseOffset: Partial<HairOffset> = HAIR_OFFSET_BASES[hairOrdinal] || {};
  const rawOffsetX =
    (Number.isFinite(baseOffset.x) ? (baseOffset.x as number) : 0) +
    (Number.isFinite(hairOffset?.x) ? (hairOffset?.x as number) : 0);
  const rawOffsetY =
    (Number.isFinite(baseOffset.y) ? (baseOffset.y as number) : 0) +
    (Number.isFinite(hairOffset?.y) ? (hairOffset?.y as number) : 0);
  const rawScale =
    (Number.isFinite(baseOffset.scale) ? (baseOffset.scale as number) : 1) *
    (Number.isFinite(hairOffset?.scale) ? (hairOffset?.scale as number) : 1);
  return { rawOffsetX, rawOffsetY, rawScale };
}
