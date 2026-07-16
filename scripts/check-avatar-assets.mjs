// Guardrail for duplicant avatar assets.
//
// The app renders heads and hairs from public/images/oni/{head,hair} and relies
// on the ordinal lists in src/lib/oni/accessory-constraints.ts to know which
// assets exist (so it never points <Image> at a missing file). Those two must
// stay in sync by hand, which drifts silently. This script is the check:
//
//   - fails if the checked-in ordinal lists disagree with the files on disk
//   - fails if the head set is incomplete (heads are required, 1..HEAD_MAX)
//   - reports (without failing) which hair ordinals are still missing art
//
// Run: node scripts/check-avatar-assets.mjs   (also `npm run check:assets`)

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const imagesDir = join(rootDir, "public", "images", "oni");
const constraintsPath = join(
  rootDir,
  "src",
  "lib",
  "oni",
  "accessory-constraints.ts",
);

// Full expected range per the asset import plan. Heads are complete; hairs are
// backfilled from source art over time, so gaps here are reported, not fatal.
const HEAD_MAX = 7;
const HAIR_MAX = 99;

function ordinalsOnDisk(type) {
  let entries;
  try {
    entries = readdirSync(join(imagesDir, type));
  } catch {
    return [];
  }
  const pattern = new RegExp(`^${type}_(\\d+)\\.png$`);
  return entries
    .map((name) => pattern.exec(name))
    .filter((match) => match !== null)
    .map((match) => Number(match[1]))
    .sort((a, b) => a - b);
}

function ordinalsInConstants(constantName) {
  const source = readFileSync(constraintsPath, "utf8");
  const match = new RegExp(`${constantName}\\s*=\\s*\\[([\\s\\S]*?)\\]`).exec(
    source,
  );
  if (!match) {
    throw new Error(`Could not find ${constantName} in ${constraintsPath}`);
  }
  return match[1]
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map(Number)
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
}

function diff(a, b) {
  const setB = new Set(b);
  return a.filter((value) => !setB.has(value));
}

function missingInRange(present, max) {
  const set = new Set(present);
  const missing = [];
  for (let ordinal = 1; ordinal <= max; ordinal += 1) {
    if (!set.has(ordinal)) {
      missing.push(ordinal);
    }
  }
  return missing;
}

let failed = false;

for (const { type, constant, max, required } of [
  {
    type: "head",
    constant: "HEAD_ASSET_ORDINALS",
    max: HEAD_MAX,
    required: true,
  },
  {
    type: "hair",
    constant: "HAIR_ASSET_ORDINALS",
    max: HAIR_MAX,
    required: false,
  },
]) {
  const disk = ordinalsOnDisk(type);
  const declared = ordinalsInConstants(constant);

  const onDiskNotDeclared = diff(disk, declared);
  const declaredNotOnDisk = diff(declared, disk);
  const missing = missingInRange(disk, max);

  console.log(`\n${type}: ${disk.length} file(s), ${declared.length} declared`);

  if (onDiskNotDeclared.length > 0) {
    failed = true;
    console.error(
      `  DRIFT: files present but missing from ${constant}: ${onDiskNotDeclared.join(", ")}`,
    );
  }
  if (declaredNotOnDisk.length > 0) {
    failed = true;
    console.error(
      `  DRIFT: ${constant} lists ordinals with no file: ${declaredNotOnDisk.join(", ")}`,
    );
  }
  if (required && missing.length > 0) {
    failed = true;
    console.error(
      `  INCOMPLETE: required ${type} art missing: ${missing.join(", ")}`,
    );
  } else if (missing.length > 0) {
    console.log(
      `  gaps (no art yet, ok): ${missing.length} of ${max} missing -> ${missing.join(", ")}`,
    );
  }
  if (
    onDiskNotDeclared.length === 0 &&
    declaredNotOnDisk.length === 0 &&
    (!required || missing.length === 0)
  ) {
    console.log("  ok: constants match disk");
  }
}

if (failed) {
  console.error("\nAvatar asset check failed.");
  process.exit(1);
}
console.log("\nAvatar asset check passed.");
