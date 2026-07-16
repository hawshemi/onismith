import { describe, expect, it } from "vitest";
import { selectCreatures } from "./save-selectors";

type SaveGameArg = Parameters<typeof selectCreatures>[0];

// Minimal save-tree fixture: a group of game objects, each identified by a
// KPrefabID.InstanceID, optionally carrying a CreatureBrain (the marker
// selectCreatures keys on) and traits.
function makeSaveGame(
  groups: Array<{
    name: string;
    gameObjects: Array<{
      id?: number;
      creature?: boolean;
      traits?: string[];
      position?: { x: number; y: number; z: number };
    }>;
  }>,
): SaveGameArg {
  return {
    gameObjects: groups.map((group) => ({
      name: group.name,
      gameObjects: group.gameObjects.map((object) => ({
        position: object.position ?? { x: 0, y: 0, z: 0 },
        behaviors: [
          object.id !== undefined
            ? { name: "KPrefabID", templateData: { InstanceID: object.id } }
            : null,
          object.creature ? { name: "CreatureBrain", templateData: {} } : null,
          object.traits
            ? {
                name: "Klei.AI.Traits",
                templateData: { TraitIds: object.traits },
              }
            : null,
        ].filter(Boolean),
      })),
    })),
  } as unknown as SaveGameArg;
}

describe("selectCreatures", () => {
  it("returns an empty array for a missing save", () => {
    expect(selectCreatures(null)).toEqual([]);
  });

  it("includes only game objects with a CreatureBrain", () => {
    const saveGame = makeSaveGame([
      {
        name: "Hatch",
        gameObjects: [
          { id: 1, creature: true },
          { id: 2, creature: false },
        ],
      },
    ]);
    const creatures = selectCreatures(saveGame);
    expect(creatures.map((creature) => creature.id)).toEqual([1]);
    expect(creatures[0].type).toBe("Hatch");
  });

  it("extracts traits and position and sorts by id", () => {
    const saveGame = makeSaveGame([
      {
        name: "Pacu",
        gameObjects: [
          { id: 7, creature: true, position: { x: 3, y: 4, z: 5 } },
        ],
      },
      {
        name: "Hatch",
        gameObjects: [{ id: 2, creature: true, traits: ["CritterFast"] }],
      },
    ]);
    const creatures = selectCreatures(saveGame);
    expect(creatures.map((creature) => creature.id)).toEqual([2, 7]);
    expect(creatures[0].traits).toEqual(["CritterFast"]);
    expect(creatures[1].position).toEqual({ x: 3, y: 4, z: 5 });
  });
});
