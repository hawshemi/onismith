import { SimHashNames, type SaveGame } from "@/lib/save-parser/model";
import { asString } from "./save-selector-utils";
import { getBuildingDisplayName } from "./building-selectors";

export type WorldObjectCategory =
  | "Building"
  | "Creature"
  | "Geyser"
  | "Material"
  | "Plant"
  | "Space POI"
  | "World POI"
  | "System"
  | "Other";

export interface WorldObjectGroupSummary {
  type: string;
  displayName: string;
  category: WorldObjectCategory;
  count: number;
  behaviorNames: string[];
  opaqueStateBytes: number;
}

const MATERIAL_NAMES = new Set<string>(SimHashNames);
const SYSTEM_GROUPS = new Set([
  "Asteroid",
  "Minion",
  "MinionAssignablesProxy",
  "OrbitalBG",
  "SaveGame",
  "StarmapHexCellInventory",
  "TilePOI",
]);

function humanizeIdentifier(value: string): string {
  return value
    .replace(/^HarvestableSpacePOI_/, "")
    .replace(/^ArtifactSpacePOI_/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyGroup(
  type: string,
  behaviorNames: Set<string>,
): WorldObjectCategory {
  if (behaviorNames.has("BuildingComplete")) return "Building";
  if (behaviorNames.has("CreatureBrain")) return "Creature";
  if (
    behaviorNames.has("Geyser") ||
    type === "SmallReefGeyser" ||
    type === "UnderwaterVent"
  ) {
    return "Geyser";
  }
  if (MATERIAL_NAMES.has(type)) return "Material";
  if (
    behaviorNames.has("Crop") ||
    behaviorNames.has("Growing") ||
    behaviorNames.has("SeedProducer") ||
    behaviorNames.has("Uprootable")
  ) {
    return "Plant";
  }
  if (
    type.startsWith("HarvestableSpacePOI_") ||
    type.startsWith("ArtifactSpacePOI_") ||
    type.startsWith("ClusterMapMeteorShower_") ||
    type === "TemporalTear"
  ) {
    return "Space POI";
  }
  if (
    type.includes("POI") ||
    type.startsWith("Fossil") ||
    type.startsWith("Geothermal") ||
    type.startsWith("Warp") ||
    type === "OilWell"
  ) {
    return "World POI";
  }
  if (SYSTEM_GROUPS.has(type)) return "System";
  return "Other";
}

export function selectWorldObjectGroups(
  saveGame: SaveGame | null,
): WorldObjectGroupSummary[] {
  const groups = Array.isArray(saveGame?.gameObjects)
    ? saveGame.gameObjects
    : [];

  return groups
    .map((group) => {
      const type = asString(group?.name, "Unknown");
      const objects = Array.isArray(group?.gameObjects)
        ? group.gameObjects
        : [];
      const behaviorNames = new Set<string>();
      let opaqueStateBytes = 0;

      for (const object of objects) {
        for (const behavior of Array.isArray(object?.behaviors)
          ? object.behaviors
          : []) {
          const name = asString(behavior?.name);
          if (name) behaviorNames.add(name);
          if (behavior?.extraRaw instanceof ArrayBuffer) {
            opaqueStateBytes += behavior.extraRaw.byteLength;
          }
        }
      }

      const category = classifyGroup(type, behaviorNames);
      return {
        type,
        displayName:
          category === "Building"
            ? getBuildingDisplayName(type)
            : humanizeIdentifier(type) || type,
        category,
        count: objects.length,
        behaviorNames: [...behaviorNames].sort((a, b) => a.localeCompare(b)),
        opaqueStateBytes,
      } satisfies WorldObjectGroupSummary;
    })
    .filter((group) => group.count > 0)
    .sort(
      (a, b) =>
        a.category.localeCompare(b.category) ||
        a.displayName.localeCompare(b.displayName),
    );
}
