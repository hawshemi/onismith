export const DUPLICANT_INTEREST_NAMES = [
  "Farming",
  "Ranching",
  "Mining",
  "Cooking",
  "Art",
  "Building",
  "Research",
  "Rocketry",
  "Suits",
  "Hauling",
  "Technicals",
  "MedicalAid",
  "Basekeeping",
];

// Older saves can still carry this group, so we keep it readable.
const LEGACY_INTEREST_NAMES = ["Management"];

// Present in save data, but not editable for non-bionic flows yet.
const BIONIC_ONLY_INTEREST_NAMES = ["BionicSkills"];

const MINION_SKILL_GROUP_NAMES = [
  ...DUPLICANT_INTEREST_NAMES,
  ...LEGACY_INTEREST_NAMES,
  ...BIONIC_ONLY_INTEREST_NAMES,
];

// Source: ONI CHOREGROUPS names.
const MINION_SKILL_GROUP_DISPLAY_NAMES: Record<string, string> = {
  Art: "Decorating",
  Building: "Building",
  Cooking: "Cooking",
  Farming: "Farming",
  Ranching: "Ranching",
  Mining: "Digging",
  Research: "Researching",
  Rocketry: "Rocketry",
  Suits: "Suit Wearing",
  Hauling: "Supplying",
  Technicals: "Operating",
  MedicalAid: "Doctoring",
  Basekeeping: "Tidying",
  Management: "Management",
  BionicSkills: "Bionic Skills",
};

const HASH_TO_NAME: Record<string, string> = Object.fromEntries(
  MINION_SKILL_GROUP_NAMES.map((name) => [
    String(getSkillGroupHash(name)),
    name,
  ]),
);

export function getHashedStringHash(name: unknown): number {
  if (typeof name !== "string") {
    return 0;
  }
  let hash = 0;
  const text = name.toLowerCase();
  for (let index = 0; index < text.length; index += 1) {
    hash = text.charCodeAt(index) + (hash << 6) + (hash << 16) - hash;
    hash |= 0;
  }
  return hash;
}

export function getSkillGroupHash(name: string): number {
  return getHashedStringHash(name);
}

export function getSkillGroupNameByHash(hash: unknown): string | null {
  if (!Number.isFinite(hash)) {
    return null;
  }
  return HASH_TO_NAME[String(hash)] || null;
}

export function getSkillGroupDisplayName(skillGroupId: string): string {
  if (typeof skillGroupId !== "string" || !skillGroupId.trim()) {
    return "";
  }
  const normalized = skillGroupId.trim();
  return MINION_SKILL_GROUP_DISPLAY_NAMES[normalized] || normalized;
}
