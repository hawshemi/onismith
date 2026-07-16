import { isObjectLike } from "@/lib/oni/raw-path-utils";

interface ProbeTerm {
  id: string;
  label: string;
  patterns: string[];
}

const PROBE_TERMS: ProbeTerm[] = [
  { id: "disease", label: "Disease", patterns: ["disease", "germ", "germs"] },
  {
    id: "hunger",
    label: "Hunger",
    patterns: ["hunger", "calorie", "calories"],
  },
  { id: "morale", label: "Morale", patterns: ["morale"] },
  { id: "durability", label: "Durability", patterns: ["durability"] },
  {
    id: "meteor_showers",
    label: "Meteor Showers",
    patterns: ["meteor", "meteors"],
  },
  { id: "radiation", label: "Radiation", patterns: ["radiation"] },
  { id: "stress", label: "Stress", patterns: ["stress"] },
  {
    id: "stress_reactions",
    label: "Stress Reactions",
    patterns: ["stressreaction", "stressreactions"],
  },
  {
    id: "care_packages",
    label: "Care Packages",
    patterns: ["carepackage", "carepackages"],
  },
  {
    id: "sandbox_mode",
    label: "Sandbox Mode",
    patterns: ["sandbox", "sandboxmode"],
  },
  {
    id: "fast_workers",
    label: "Fast Workers",
    patterns: ["fastworker", "fastworkers"],
  },
  {
    id: "teleporters",
    label: "Teleporters",
    patterns: ["teleporter", "teleporters"],
  },
  {
    id: "bionic_wattage",
    label: "Bionic Wattage",
    patterns: ["bionicwattage", "bionic"],
  },
  { id: "demolior_impact", label: "Demolior Impact", patterns: ["demolior"] },
];

interface ProbeMatch {
  path: string;
  key: string;
  type: string;
  preview: string;
}

interface ProbeTermResult extends ProbeTerm {
  matches: ProbeMatch[];
}

interface StackNode {
  value: unknown;
  path: (string | number)[];
}

export interface ProbeOptions {
  maxNodes?: number;
  maxMatchesPerTerm?: number;
  fileName?: string | null;
}

function normalizeKey(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getIn(root: unknown, keys: string[]): unknown {
  let cursor: unknown = root;
  for (const key of keys) {
    if (!isObjectLike(cursor)) {
      return undefined;
    }
    cursor = cursor[key];
  }
  return cursor;
}

function formatPath(pathParts: (string | number)[]): string {
  if (!Array.isArray(pathParts) || pathParts.length === 0) {
    return "root";
  }
  return pathParts
    .map((part) => (typeof part === "number" ? `[${part}]` : part))
    .join(".");
}

function previewValue(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return value.length > 120 ? `${value.slice(0, 120)}…` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  if (typeof value === "object") {
    return "{...}";
  }
  return String(value);
}

function extractQualityLevels(
  saveGame: unknown,
): { name: unknown; value: unknown }[] | null {
  const entries = getIn(saveGame, [
    "gameData",
    "customGameSettings",
    "CurrentQualityLevelsBySetting",
  ]);
  if (!Array.isArray(entries)) {
    return null;
  }
  return entries
    .filter(
      (entry): entry is unknown[] => Array.isArray(entry) && entry.length >= 2,
    )
    .map((entry) => ({
      name: entry[0],
      value: entry[1],
    }));
}

const ACCESSORY_PREFIX = "Root.Accessories.";

function getAccessoryGuid(accessory: unknown): unknown {
  if (typeof accessory === "string") {
    return accessory;
  }
  if (isObjectLike(accessory)) {
    const guid = accessory.guid;
    return (isObjectLike(guid) ? guid.Guid : undefined) ?? null;
  }
  return null;
}

function parseAccessoryName(accessory: unknown): string | null {
  const guid = getAccessoryGuid(accessory);
  if (typeof guid !== "string" || !guid.startsWith(ACCESSORY_PREFIX)) {
    return null;
  }
  return guid.slice(ACCESSORY_PREFIX.length);
}

interface AppearanceCategorySummary {
  total: number;
  unique: number;
  names: string[];
}

interface AppearanceSummary {
  hair: AppearanceCategorySummary;
  headshape: AppearanceCategorySummary;
  eyes: AppearanceCategorySummary;
}

function extractAppearanceSummary(saveGame: unknown): AppearanceSummary {
  const gameObjectsValue = getIn(saveGame, ["gameObjects"]);
  const groups = Array.isArray(gameObjectsValue) ? gameObjectsValue : [];
  const minionGroup = groups.find(
    (group) => isObjectLike(group) && group.name === "Minion",
  );
  const minionGameObjects = isObjectLike(minionGroup)
    ? minionGroup.gameObjects
    : undefined;
  const minions = Array.isArray(minionGameObjects) ? minionGameObjects : [];

  const hairNames = new Set<string>();
  const headshapeNames = new Set<string>();
  const eyeNames = new Set<string>();
  let hairTotal = 0;
  let headshapeTotal = 0;
  let eyesTotal = 0;

  for (const gameObject of minions) {
    const behaviorsValue = isObjectLike(gameObject)
      ? gameObject.behaviors
      : undefined;
    const behaviors = Array.isArray(behaviorsValue) ? behaviorsValue : [];
    const accessorizer = behaviors.find(
      (behavior) => isObjectLike(behavior) && behavior.name === "Accessorizer",
    );
    const accessoriesValue = getIn(accessorizer, [
      "templateData",
      "accessories",
    ]);
    const accessories = Array.isArray(accessoriesValue) ? accessoriesValue : [];

    for (const accessory of accessories) {
      const name = parseAccessoryName(accessory);
      if (!name) {
        continue;
      }
      if (name.startsWith("hair_")) {
        hairTotal += 1;
        hairNames.add(name);
        continue;
      }
      if (name.startsWith("headshape_")) {
        headshapeTotal += 1;
        headshapeNames.add(name);
        continue;
      }
      if (name.startsWith("eyes_")) {
        eyesTotal += 1;
        eyeNames.add(name);
      }
    }
  }

  return {
    hair: {
      total: hairTotal,
      unique: hairNames.size,
      names: [...hairNames].sort(),
    },
    headshape: {
      total: headshapeTotal,
      unique: headshapeNames.size,
      names: [...headshapeNames].sort(),
    },
    eyes: {
      total: eyesTotal,
      unique: eyeNames.size,
      names: [...eyeNames].sort(),
    },
  };
}

export function probeSaveGame(saveGame: unknown, options: ProbeOptions = {}) {
  const maxNodes = Number.isFinite(options.maxNodes)
    ? Number(options.maxNodes)
    : 250000;
  const maxMatchesPerTerm = Number.isFinite(options.maxMatchesPerTerm)
    ? Number(options.maxMatchesPerTerm)
    : 120;
  const fileName = options.fileName || null;

  const results: ProbeTermResult[] = PROBE_TERMS.map((term) => ({
    ...term,
    matches: [],
  }));
  const patterns: string[][] = PROBE_TERMS.map((term) =>
    term.patterns.map(normalizeKey),
  );

  const stack: StackNode[] = [{ value: saveGame, path: [] }];
  let scanned = 0;
  let truncated = false;

  while (stack.length > 0) {
    const next = stack.pop();
    if (!next) {
      continue;
    }
    scanned += 1;
    if (scanned > maxNodes) {
      truncated = true;
      break;
    }

    const value = next.value;
    if (!isObjectLike(value)) {
      continue;
    }

    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        if (!(index in value)) {
          continue;
        }
        stack.push({ value: value[index], path: [...next.path, index] });
      }
      continue;
    }

    for (const key of Object.keys(value)) {
      const normalizedKey = normalizeKey(key);
      if (normalizedKey) {
        for (let termIndex = 0; termIndex < results.length; termIndex += 1) {
          const termResult = results[termIndex];
          const termPatterns = patterns[termIndex];
          if (termResult.matches.length >= maxMatchesPerTerm) {
            continue;
          }
          if (termPatterns.some((pattern) => normalizedKey.includes(pattern))) {
            const matchValue = value[key];
            termResult.matches.push({
              path: formatPath([...next.path, key]),
              key,
              type: Array.isArray(matchValue) ? "array" : typeof matchValue,
              preview: previewValue(matchValue),
            });
          }
        }
      }

      stack.push({ value: value[key], path: [...next.path, key] });
    }
  }

  const summary = results.map((term) => ({
    id: term.id,
    label: term.label,
    count: term.matches.length,
  }));

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      fileName,
      saveMajorVersion:
        getIn(saveGame, ["header", "gameInfo", "saveMajorVersion"]) ?? null,
      saveMinorVersion:
        getIn(saveGame, ["header", "gameInfo", "saveMinorVersion"]) ?? null,
      baseName: getIn(saveGame, ["header", "gameInfo", "baseName"]) ?? null,
      dlcIds: getIn(saveGame, ["header", "gameInfo", "dlcIds"]) ?? [],
    },
    scan: {
      scannedNodes: scanned,
      maxNodes,
      truncated,
      maxMatchesPerTerm,
    },
    appearance: extractAppearanceSummary(saveGame),
    qualityLevels: extractQualityLevels(saveGame),
    terms: summary,
    matches: results.reduce<Record<string, ProbeMatch[]>>((acc, term) => {
      acc[term.id] = term.matches;
      return acc;
    }, {}),
  };
}
