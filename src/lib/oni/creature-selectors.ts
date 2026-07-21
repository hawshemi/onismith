import type { SaveGame } from "@/lib/save-parser/model";
import {
  asNumber,
  asString,
  getBehavior,
  getBehaviorAny,
  getGameObjectId,
} from "./save-selector-utils";

export interface CreaturePosition {
  x: number;
  y: number;
  z: number;
}

export interface Creature {
  id: number;
  type: string;
  displayName: string;
  traits: string[];
  position: CreaturePosition;
}

const CREATURE_DISPLAY_NAMES: Record<string, string> = {
  AlgaeStego: "Blum Lumb",
  Butterfly: "Mimika",
  Chameleon: "Dartle",
  IceBelly: "Bammoth",
  Mosquito: "Gnit",
  MosquitoBaby: "Gnit Larva",
  PrehistoricPacu: "Jawbo",
  Raptor: "Rhex",
  Seal: "Spigot Seal",
  Stego: "Lumb",
  WoodDeer: "Flox",
};

export function getCreatureDisplayName(type: string): string {
  return CREATURE_DISPLAY_NAMES[type] ?? type;
}

export function selectCreatures(saveGame: SaveGame | null): Creature[] {
  const allGroups = saveGame?.gameObjects;
  const groups = Array.isArray(allGroups) ? allGroups : [];
  const list: Creature[] = [];

  for (const group of groups) {
    const groupGameObjects = group?.gameObjects;
    const gameObjects = Array.isArray(groupGameObjects) ? groupGameObjects : [];
    for (const gameObject of gameObjects) {
      const id = getGameObjectId(gameObject);
      if (id === null) {
        continue;
      }
      const hasCreatureBrain = Boolean(
        getBehavior(gameObject, "CreatureBrain"),
      );
      if (!hasCreatureBrain) {
        continue;
      }

      const traitsBehavior = getBehaviorAny(gameObject, [
        "Klei.AI.Traits",
        "MinionTraits",
      ]);
      const traitIds = traitsBehavior?.templateData?.TraitIds;
      const traits = Array.isArray(traitIds) ? traitIds : [];

      const position = gameObject?.position;
      const type = asString(group?.name, "Creature");
      list.push({
        id,
        type,
        displayName: getCreatureDisplayName(type),
        traits,
        position: {
          x: asNumber(position?.x),
          y: asNumber(position?.y),
          z: asNumber(position?.z),
        },
      });
    }
  }

  return list.sort((a, b) => a.id - b.id);
}

export function selectCreatureEditorModel(
  saveGame: SaveGame | null,
  creatureId: number | null,
): Creature | null {
  if (creatureId === null || !Number.isFinite(creatureId)) {
    return null;
  }
  const creatures = selectCreatures(saveGame);
  const creature = creatures.find((item) => item.id === creatureId);
  if (!creature) {
    return null;
  }
  return creature;
}
