import type { SaveGame } from "@/lib/save-parser/model";
import { asString } from "./save-selector-utils";

export interface DlcMixingSetting {
  id: string;
  label: string;
  value: string;
}

const MIXING_SETTING_LABELS: Record<string, string> = {
  DLC2_ID: "The Frosty Planet",
  IceCavesMixing: "Ice Caves",
  CarrotQuarryMixing: "Cool Pool",
  SugarWoodsMixing: "Nectar",
  CeresAsteroidMixing: "Ceres Asteroid",
  DLC3_ID: "The Bionic Booster",
  DLC4_ID: "The Prehistoric Planet",
  GardenMixing: "Garden",
  RaptorMixing: "Feather",
  WetlandsMixing: "Wetlands",
  PrehistoricAsteroidMixing: "Prehistoric Asteroid",
  DLC5_ID: "The Aquatic Planet",
  BeachMixing: "Beach",
  ReefMixing: "Reef",
  KelpForestMixing: "Kelp Forest",
  AbyssMixing: "Abyss",
  AquaticAsteroidMixing: "Aquatic Asteroid",
};

function humanizeIdentifier(value: string): string {
  return value
    .replace(/Mixing$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function selectDlcMixingSettings(
  saveGame: SaveGame | null,
): DlcMixingSetting[] {
  const pairs =
    saveGame?.gameData?.customGameSettings?.CurrentMixingLevelsBySetting;
  if (!Array.isArray(pairs)) {
    return [];
  }

  return pairs
    .map((pair) => {
      if (!Array.isArray(pair) || pair.length < 2) {
        return null;
      }
      const id = asString(pair[0]);
      const value = asString(pair[1]);
      if (!id || !value) {
        return null;
      }
      return {
        id,
        label: MIXING_SETTING_LABELS[id] ?? (humanizeIdentifier(id) || id),
        value,
      } satisfies DlcMixingSetting;
    })
    .filter((setting): setting is DlcMixingSetting => setting !== null);
}
