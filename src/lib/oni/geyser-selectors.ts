import type { SaveGame } from "@/lib/save-parser/model";
import { GEYSER_TYPE_NAMES } from "./oni-constants";
import { getHashedStringHash } from "./minion-interests";
import {
  asNumber,
  asString,
  getBehavior,
  getGameObjectId,
} from "./save-selector-utils";

export interface Geyser {
  id: number;
  objectType: string;
  geyserType: string;
  isEditable: boolean;
  position: { x: number; y: number; z: number };
  emitRate: number;
  lifecycleLength: number;
  activeFraction: number;
  emissionFraction: number;
  iterationLength: number;
}

const SPECIAL_GEYSER_TYPES: Record<string, string> = {
  SmallReefGeyser: "tidal_spring",
  UnderwaterVent: "thermal_gas_fissure",
};

const GEYSER_TYPE_BY_HASH: Record<string, string> = Object.fromEntries(
  GEYSER_TYPE_NAMES.map((typeName) => [
    String(getHashedStringHash(typeName)),
    typeName,
  ]),
);

export function selectGeysers(saveGame: SaveGame | null): Geyser[] {
  const allGroups = saveGame?.gameObjects;
  const groups = Array.isArray(allGroups) ? allGroups : [];
  const list: Geyser[] = [];

  for (const group of groups) {
    const groupGameObjects = group?.gameObjects;
    const gameObjects = Array.isArray(groupGameObjects) ? groupGameObjects : [];
    for (const gameObject of gameObjects) {
      const geyserBehavior = getBehavior(gameObject, "Geyser");
      const specialType = SPECIAL_GEYSER_TYPES[asString(group?.name)];
      if (!geyserBehavior && !specialType) {
        continue;
      }
      const id = getGameObjectId(gameObject);
      if (id === null || !Number.isFinite(id)) {
        continue;
      }
      const config = geyserBehavior?.templateData?.configuration || {};
      const typeHash = config.typeId?.hash;
      const resolvedType =
        specialType ||
        (Number.isFinite(typeHash)
          ? GEYSER_TYPE_BY_HASH[String(typeHash)]
          : null) ||
        asString(group?.name).replace(/^GeyserGeneric_/, "") ||
        "steam";

      list.push({
        id,
        objectType: asString(group?.name, "Geyser"),
        geyserType: resolvedType,
        isEditable: Boolean(geyserBehavior),
        position: {
          x: asNumber(gameObject.position?.x, 0),
          y: asNumber(gameObject.position?.y, 0),
          z: asNumber(gameObject.position?.z, 0),
        },
        emitRate: asNumber(config.rateRoll, 0),
        lifecycleLength: asNumber(config.yearLengthRoll, 0),
        activeFraction: asNumber(config.yearPercentRoll, 0),
        emissionFraction: asNumber(config.iterationPercentRoll, 0),
        iterationLength: asNumber(config.iterationLengthRoll, 0),
      });
    }
  }

  return list.sort((a, b) => a.id - b.id);
}

// A game-object group is "loose material" debris when its name is an element
// sim-hash name. This mirrors the delete action's matching (deleteLooseMaterial
// filters gameObject groups by SimHashNames), so the list and the delete stay
// in agreement about what counts as a material.
