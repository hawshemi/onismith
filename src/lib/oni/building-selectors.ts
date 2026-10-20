import type { SaveGame } from "@/lib/save-parser/model";
import {
  asNumber,
  asString,
  getBehavior,
  getGameObjectId,
} from "./save-selector-utils";

export interface Building {
  id: number;
  type: string;
  displayName: string;
  customName: string | null;
  position: { x: number; y: number; z: number };
  opaqueStateBytes: number;
}

// Game names from STRINGS.BUILDINGS.PREFABS.*.NAME in strings_template.pot.
const BUILDING_DISPLAY_NAMES: Record<string, string> = {
  AirConditioner: "Thermo Regulator",
  AirFilter: "Deodorizer",
  AlgaeDistillery: "Algae Distiller",
  AlgaeHabitat: "Algae Terrarium",
  CookingStation: "Electric Grill",
  GourmetCookingStation: "Gas Range",
  LiquidConditioner: "Thermo Aquatuner",
  ManualPressureDoor: "Manual Airlock",
  PressureDoor: "Mechanized Airlock",
  SolidConduitInbox: "Conveyor Loader",
  SolidConduitOutbox: "Conveyor Receptacle",
  WaterPurifier: "Water Sieve",
  SnowTile: "Snow Tile",
  WoodTile: "Wood Tile",
};

// Keep one view so undo history cannot retain a full list for every edit.
let buildingCache: {
  groups: SaveGame["gameObjects"];
  buildings: Building[];
} | null = null;

function humanizeIdentifier(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getBuildingDisplayName(type: string): string {
  return BUILDING_DISPLAY_NAMES[type] ?? (humanizeIdentifier(type) || type);
}

export function selectBuildings(saveGame: SaveGame | null): Building[] {
  const groups = Array.isArray(saveGame?.gameObjects)
    ? saveGame.gameObjects
    : [];
  const buildings: Building[] = [];
  if (buildingCache?.groups === groups) return buildingCache.buildings;

  for (const group of groups) {
    const type = asString(group?.name);
    const displayName = getBuildingDisplayName(type);
    const gameObjects = Array.isArray(group?.gameObjects)
      ? group.gameObjects
      : [];
    for (const gameObject of gameObjects) {
      if (!getBehavior(gameObject, "BuildingComplete")) {
        continue;
      }
      const id = getGameObjectId(gameObject);
      if (id === null) {
        continue;
      }
      const opaqueState = getBehavior(
        gameObject,
        "StateMachineController",
      )?.extraRaw;
      const savedName = getBehavior(gameObject, "UserNameable")?.templateData
        ?.savedName;
      buildings.push({
        id,
        type,
        displayName,
        customName: typeof savedName === "string" ? savedName : null,
        position: {
          x: asNumber(gameObject.position?.x),
          y: asNumber(gameObject.position?.y),
          z: asNumber(gameObject.position?.z),
        },
        opaqueStateBytes:
          opaqueState instanceof ArrayBuffer ? opaqueState.byteLength : 0,
      });
    }
  }

  buildings.sort((a, b) => a.id - b.id);
  buildingCache = { groups, buildings };
  return buildings;
}
