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
  position: { x: number; y: number; z: number };
  opaqueStateBytes: number;
}

const BUILDING_DISPLAY_NAMES: Record<string, string> = {
  SnowTile: "Snow Tile",
  WoodTile: "Wood Tile",
};

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

  for (const group of groups) {
    const type = asString(group?.name);
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
      buildings.push({
        id,
        type,
        displayName: getBuildingDisplayName(type),
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

  return buildings.sort((a, b) => a.id - b.id);
}
