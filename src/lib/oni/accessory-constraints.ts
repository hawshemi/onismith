// Derived from checked-in image assets under public/images/oni/{head,hair}.
// Update these lists whenever assets are added or removed.
export const HEAD_ASSET_ORDINALS = [1, 2, 3, 4, 5, 6, 7];

export const HAIR_ASSET_ORDINALS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 27,
  28, 29, 30, 31, 32, 33, 36, 37, 38, 44, 54,
];

const HEAD_ASSET_ORDINAL_SET = new Set(HEAD_ASSET_ORDINALS);
const HAIR_ASSET_ORDINAL_SET = new Set(HAIR_ASSET_ORDINALS);

function toOrdinal(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.max(1, Math.floor(parsed));
}

function getAccessoryAssetOrdinals(type: string): number[] {
  return type === "hair" ? HAIR_ASSET_ORDINALS : HEAD_ASSET_ORDINALS;
}

export function isAccessoryAssetAvailable(
  type: string,
  value: unknown,
): boolean {
  const ordinal = toOrdinal(value);
  if (ordinal === null || !Number.isFinite(ordinal)) {
    return false;
  }
  if (type === "hair") {
    return HAIR_ASSET_ORDINAL_SET.has(ordinal);
  }
  return HEAD_ASSET_ORDINAL_SET.has(ordinal);
}

export function getSafeAccessoryOrdinal(type: string, value: unknown): number {
  const list = getAccessoryAssetOrdinals(type);
  if (list.length === 0) {
    return 1;
  }
  const ordinal = toOrdinal(value);
  if (
    ordinal !== null &&
    Number.isFinite(ordinal) &&
    isAccessoryAssetAvailable(type, ordinal)
  ) {
    return ordinal;
  }
  return list[0];
}
