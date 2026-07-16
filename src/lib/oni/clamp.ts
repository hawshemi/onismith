// Numeric clamping helpers shared by the numeric input fields and the save
// mutators. Framework-free so they can be unit tested directly.

const FLOAT32_MAX = 3.4028234663852886e38;

// Clamp a finite double to the representable float32 range. Geyser parameters
// and creature coordinates serialize as float32, so a larger finite double
// (e.g. 1e40) would round-trip to Infinity and corrupt the save on write.
export function clampToFloat32(value: number): number {
  if (value > FLOAT32_MAX) {
    return FLOAT32_MAX;
  }
  if (value < -FLOAT32_MAX) {
    return -FLOAT32_MAX;
  }
  return value;
}

function toBound(value: string | number | undefined): number | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// Constrain a committed value to the [min, max] a field advertises. The native
// number input only enforces its min/max via the spinner, not on typed input,
// so without this a user can type an out-of-range value that gets written
// verbatim into the binary save. Bounds may be strings (raw HTML attributes) or
// numbers; undefined/blank bounds are ignored.
export function clampToRange(
  value: number,
  min?: string | number,
  max?: string | number,
): number {
  const lo = toBound(min);
  const hi = toBound(max);
  let next = value;
  if (lo !== undefined && next < lo) {
    next = lo;
  }
  if (hi !== undefined && next > hi) {
    next = hi;
  }
  return next;
}
