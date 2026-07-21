import type { GameObject, SaveGame } from "@/lib/save-parser/model";

export const DUPLICANT_GROUP_NAMES = ["Minion", "BionicMinion"] as const;

export type DuplicantGroupName = (typeof DUPLICANT_GROUP_NAMES)[number];

const DUPLICANT_GROUP_NAME_SET = new Set<string>(DUPLICANT_GROUP_NAMES);

export function isDuplicantGroupName(
  value: unknown,
): value is DuplicantGroupName {
  return typeof value === "string" && DUPLICANT_GROUP_NAME_SET.has(value);
}

export function getDuplicantGameObjects(
  saveGame: SaveGame | null | undefined,
): GameObject[] {
  const groups = Array.isArray(saveGame?.gameObjects)
    ? saveGame.gameObjects
    : [];
  return groups
    .filter((group) => isDuplicantGroupName(group?.name))
    .flatMap((group) =>
      Array.isArray(group?.gameObjects) ? group.gameObjects : [],
    );
}
