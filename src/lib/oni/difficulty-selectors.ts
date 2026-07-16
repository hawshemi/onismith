import type { SaveGame } from "@/lib/save-parser/model";

export interface DifficultySettingsModel {
  optionsBySetting: Record<string, string[]>;
  selectedValues: Record<string, string>;
  settingOrder: string[];
}

const DIFFICULTY_SETTING_ORDER = [
  "ImmuneSystem",
  "CalorieBurn",
  "Morale",
  "Durability",
  "MeteorShowers",
  "Radiation",
  "Stress",
  "StressBreaks",
  "CarePackages",
  "SandboxMode",
  "FastWorkersMode",
  "Teleporters",
  "BionicWattage",
  "DemoliorDifficulty",
];

const DIFFICULTY_SETTING_IGNORE = new Set([
  "ClusterLayout",
  "WorldgenSeed",
  "SaveToCloud",
]);
const TOGGLE_OPTIONS = ["Disabled", "Enabled"];
const DIFFICULTY_SCALE_OPTIONS = [
  "VeryHard",
  "Hard",
  "Default",
  "Easy",
  "VeryEasy",
];

const DEFAULT_DIFFICULTY_OPTIONS: Record<string, string[]> = {
  ImmuneSystem: ["Compromised", "Weak", "Default", "Strong", "Invincible"],
  Stress: ["Doomed", "Pessimistic", "Default", "Optimistic", "Indomitable"],
  Morale: ["VeryHard", "Hard", "Default", "Easy", "Disabled"],
  CalorieBurn: ["VeryHard", "Hard", "Default", "Easy", "Disabled"],
  StressBreaks: ["Disabled", "Default"],
  SandboxMode: TOGGLE_OPTIONS,
  CarePackages: TOGGLE_OPTIONS,
  FastWorkersMode: TOGGLE_OPTIONS,
  Teleporters: TOGGLE_OPTIONS,
  Durability: [
    "Threadbare",
    "Flimsy",
    "Default",
    "Reinforced",
    "Indestructible",
  ],
  MeteorShowers: [
    "ClearSkies",
    "SpringShowers",
    "Default",
    "Intense",
    "Doomsday",
  ],
  Radiation: [
    "NukeProof",
    "HealthyGlow",
    "Default",
    "ToxicPositivity",
    "CriticalMass",
  ],
  BionicWattage: DIFFICULTY_SCALE_OPTIONS,
  DemoliorDifficulty: DIFFICULTY_SCALE_OPTIONS,
};

const DIFFICULTY_SETTING_LABELS: Record<string, string> = {
  ImmuneSystem: "Disease",
  CalorieBurn: "Hunger",
  Morale: "Morale",
  Durability: "Durability",
  MeteorShowers: "Meteor Showers",
  Radiation: "Radiation",
  Stress: "Stress",
  StressBreaks: "Stress Reactions",
  CarePackages: "Care Packages",
  SandboxMode: "Sandbox Mode",
  FastWorkersMode: "Fast Workers",
  Teleporters: "Teleporters",
  BionicWattage: "Bionic Wattage",
  DemoliorDifficulty: "Demolior Impact",
};

const DIFFICULTY_VALUE_LABELS: Record<string, Record<string, string>> = {
  ImmuneSystem: {
    Compromised: "Outbreak Prone",
    Weak: "Germ Susceptible",
    Default: "Default",
    Strong: "Germ Resistant",
    Invincible: "Total Immunity",
  },
  CalorieBurn: {
    VeryHard: "Ravenous",
    Hard: "Rumbly Tummies",
    Default: "Default",
    Easy: "Fasting",
    Disabled: "Tummyless",
  },
  Morale: {
    VeryHard: "Draconian",
    Hard: "A Bit Persnickety",
    Default: "Default",
    Easy: "Chill",
    Disabled: "Totally Blase",
  },
  Durability: {
    Indestructible: "Indestructible",
    Reinforced: "Reinforced",
    Default: "Default",
    Flimsy: "Flimsy",
    Threadbare: "Threadbare",
  },
  MeteorShowers: {
    ClearSkies: "Clear Skies",
    SpringShowers: "Spring Showers",
    Default: "Default",
    Intense: "Cosmic Storm",
    Doomsday: "Doomsday",
  },
  Radiation: {
    NukeProof: "Nuke-Proof",
    HealthyGlow: "Healthy Glow",
    Default: "Default",
    ToxicPositivity: "Toxic Positivity",
    CriticalMass: "Critical Mass",
  },
  Stress: {
    Doomed: "Frankly Depressing",
    Pessimistic: "Glum",
    Default: "Default",
    Optimistic: "Chipper",
    Indomitable: "Cloud Nine",
  },
  StressBreaks: {
    Disabled: "Disabled",
    Default: "Default",
  },
  CarePackages: {
    Disabled: "Disabled",
    Enabled: "Enabled",
  },
  SandboxMode: {
    Disabled: "Disabled",
    Enabled: "Enabled",
  },
  FastWorkersMode: {
    Disabled: "Disabled",
    Enabled: "Enabled",
  },
  Teleporters: {
    Disabled: "Disabled",
    Enabled: "Enabled",
  },
  BionicWattage: {
    VeryEasy: "Analog",
    Easy: "Energy Efficient",
    Default: "Default",
    Hard: "Power Hungry",
    VeryHard: "Energy Vampire",
  },
  DemoliorDifficulty: {
    VeryEasy: "Far-Off Forecast",
    Easy: "Slightly Delayed",
    Default: "Default",
    Hard: "Early Arrival",
    VeryHard: "Imminent Extinction",
  },
};

export function selectDifficultySettings(
  saveGame: SaveGame | null,
): DifficultySettingsModel {
  const pairs =
    saveGame?.gameData?.customGameSettings?.CurrentQualityLevelsBySetting;
  const selectedValues: Record<string, string> = {};
  if (Array.isArray(pairs)) {
    for (const pair of pairs) {
      if (Array.isArray(pair) && pair.length >= 2) {
        selectedValues[pair[0]] = pair[1];
      }
    }
  }

  const settingOrder = [
    ...DIFFICULTY_SETTING_ORDER.filter((key) => key in selectedValues),
    ...Object.keys(selectedValues).filter(
      (key) =>
        !DIFFICULTY_SETTING_IGNORE.has(key) &&
        !DIFFICULTY_SETTING_ORDER.includes(key),
    ),
  ];

  const optionsBySetting: Record<string, string[]> = {};
  for (const settingName of settingOrder) {
    const selected = selectedValues[settingName];
    const baseOptions = DEFAULT_DIFFICULTY_OPTIONS[settingName];
    if (Array.isArray(baseOptions) && baseOptions.length) {
      optionsBySetting[settingName] =
        selected && !baseOptions.includes(selected)
          ? [...baseOptions, selected]
          : baseOptions;
      continue;
    }
    if (selected === "Enabled" || selected === "Disabled") {
      optionsBySetting[settingName] = TOGGLE_OPTIONS;
      continue;
    }
    optionsBySetting[settingName] = [];
  }
  return {
    optionsBySetting,
    selectedValues,
    settingOrder,
  };
}

export function getDifficultySettingLabel(settingName: string): string {
  return DIFFICULTY_SETTING_LABELS[settingName] || settingName;
}

export function getDifficultyValueLabel(
  settingName: string,
  value: string,
): string {
  const labels = DIFFICULTY_VALUE_LABELS[settingName];
  if (labels && labels[value]) {
    return labels[value];
  }
  if (!value) {
    return "";
  }
  return String(value).replace(/([a-z])([A-Z])/g, "$1 $2");
}
