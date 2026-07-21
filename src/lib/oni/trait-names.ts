import baseTraits from "./traits-data/oni_traits.json";
import knownTraits from "./traits-data/oni_traits_known.json";
import { BIONIC_TRAITS, DUPE_TRAITS } from "@/lib/save-parser/model";

export type TraitCategory = "positive" | "negative" | "universal";

interface RegisterableTrait {
  id?: unknown;
  traits?: unknown;
  desc?: unknown;
  status?: unknown;
}

export interface KnownTrait {
  id: string;
  name: string;
  description: string;
  category: TraitCategory;
}

const TRAIT_STATUSES = new Set<string>([
  "positive",
  "negative",
  "universal",
  "overjoyed",
  "stress",
]);

export function normalizeTraitId(id: unknown): string {
  return typeof id === "string" ? id.trim().toUpperCase() : "";
}

const traitMap = new Map<string, string>();
const traitDescMap = new Map<string, string>();
const traitStatusMap = new Map<string, string>();
const traitIds = new Set<string>();

function registerTraits(
  list: RegisterableTrait[] | undefined,
  options: { includeStatus?: boolean } = {},
): void {
  const includeStatus = options.includeStatus === true;
  if (!Array.isArray(list)) {
    return;
  }
  for (const entry of list) {
    const id = typeof entry?.id === "string" ? entry.id.trim() : "";
    const name = typeof entry?.traits === "string" ? entry.traits.trim() : "";
    const desc = typeof entry?.desc === "string" ? entry.desc.trim() : "";
    const status =
      typeof entry?.status === "string"
        ? entry.status.trim().toLowerCase()
        : "";
    if (!id || !name) {
      continue;
    }
    const key = id.toUpperCase();
    traitMap.set(key, name);
    traitIds.add(key);
    if (desc) {
      traitDescMap.set(key, desc);
    }
    if (includeStatus && TRAIT_STATUSES.has(status)) {
      traitStatusMap.set(key, status);
    }
  }
}

registerTraits(DUPE_TRAITS, { includeStatus: true });
registerTraits(BIONIC_TRAITS, { includeStatus: true });
registerTraits(baseTraits);
registerTraits(knownTraits);

export const OVERJOYED_TRAIT_IDS = new Set(
  [...traitStatusMap.entries()]
    .filter(([, status]) => status === "overjoyed")
    .map(([id]) => id),
);

export const STRESS_REACTION_TRAIT_IDS = new Set(
  [...traitStatusMap.entries()]
    .filter(([, status]) => status === "stress")
    .map(([id]) => id),
);

const BIONIC_TRAIT_IDS = new Set(
  BIONIC_TRAITS.map((trait) => normalizeTraitId(trait.id)).filter(Boolean),
);

const BIONIC_IDENTITY_TRAIT_IDS = new Set(
  BIONIC_TRAITS.map((trait) => normalizeTraitId(trait.id)).filter((id) =>
    id.startsWith("BIONICBUG"),
  ),
);

const POSITIVE_TRAIT_IDS = new Set(
  [...traitStatusMap.entries()]
    .filter(([, status]) => status === "positive" || status === "overjoyed")
    .map(([id]) => id),
);

const NEGATIVE_TRAIT_IDS = new Set(
  [...traitStatusMap.entries()]
    .filter(([, status]) => status === "negative" || status === "stress")
    .map(([id]) => id),
);

export function isBionicTraitId(id: unknown): boolean {
  const normalized = normalizeTraitId(id);
  return BIONIC_TRAIT_IDS.has(normalized);
}

export function isBionicIdentityTraitId(id: unknown): boolean {
  const normalized = normalizeTraitId(id);
  return BIONIC_IDENTITY_TRAIT_IDS.has(normalized);
}

export function isBionicStarterBoosterTraitId(id: unknown): boolean {
  return normalizeTraitId(id).startsWith("STARTWITHBOOSTER_");
}

export interface TraitReactionSplit {
  overjoyedReactions: string[];
  stressReactions: string[];
  nonReactionTraits: string[];
}

// Partitions a duplicant's trait ids into overjoyed reactions, stress
// reactions, and everything else, matching on the normalized id.
export function splitTraitsByReaction(
  traitIds: readonly string[],
): TraitReactionSplit {
  const overjoyedReactions = traitIds.filter((traitId) =>
    OVERJOYED_TRAIT_IDS.has(normalizeTraitId(traitId)),
  );
  const stressReactions = traitIds.filter((traitId) =>
    STRESS_REACTION_TRAIT_IDS.has(normalizeTraitId(traitId)),
  );
  const nonReactionTraits = traitIds.filter((traitId) => {
    const normalized = normalizeTraitId(traitId);
    return (
      normalized &&
      !OVERJOYED_TRAIT_IDS.has(normalized) &&
      !STRESS_REACTION_TRAIT_IDS.has(normalized)
    );
  });
  return { overjoyedReactions, stressReactions, nonReactionTraits };
}

export function getTraitDisplayName(id: string): string {
  const key = normalizeTraitId(id);
  if (!key) {
    return "";
  }
  return traitMap.get(key) || id;
}

export function getTraitDescription(id: string): string {
  const key = normalizeTraitId(id);
  if (!key) {
    return "";
  }
  return traitDescMap.get(key) || "";
}

export function getTraitCategory(id: string): TraitCategory {
  const key = normalizeTraitId(id);
  if (!key) {
    return "universal";
  }
  if (NEGATIVE_TRAIT_IDS.has(key)) {
    return "negative";
  }
  if (POSITIVE_TRAIT_IDS.has(key)) {
    return "positive";
  }
  if (traitStatusMap.get(key) === "universal") {
    return "universal";
  }
  return "universal";
}

export function getAllKnownTraits(): KnownTrait[] {
  return [...traitIds]
    .map((id) => ({
      id,
      name: getTraitDisplayName(id),
      description: getTraitDescription(id),
      category: getTraitCategory(id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
