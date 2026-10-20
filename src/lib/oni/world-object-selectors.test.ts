import { describe, expect, it } from "vitest";
import type { SaveGame } from "@/lib/save-parser/model";
import { selectWorldObjectGroups } from "./world-object-selectors";

function behavior(name: string, rawBytes = 0) {
  return {
    name,
    templateData: {},
    extraRaw: rawBytes > 0 ? new ArrayBuffer(rawBytes) : undefined,
  };
}

describe("selectWorldObjectGroups", () => {
  it("uses game names for buildings without changing serialized identifiers", () => {
    const saveGame = {
      gameObjects: [
        {
          name: "AirFilter",
          gameObjects: [{ behaviors: [behavior("BuildingComplete")] }],
        },
      ],
    } as unknown as SaveGame;
    expect(selectWorldObjectGroups(saveGame)[0]).toMatchObject({
      type: "AirFilter",
      displayName: "Deodorizer",
      category: "Building",
    });
  });
  it("classifies and summarizes serialized object groups", () => {
    const saveGame = {
      gameObjects: [
        {
          name: "HarvestableSpacePOI_DLC5AquaticMixingField",
          gameObjects: [
            { behaviors: [behavior("KPrefabID"), behavior("State", 12)] },
          ],
        },
        {
          name: "PrickleFlower",
          gameObjects: [
            { behaviors: [behavior("Growing"), behavior("Uprootable")] },
            { behaviors: [behavior("Growing")] },
          ],
        },
        {
          name: "Hatch",
          gameObjects: [{ behaviors: [behavior("CreatureBrain")] }],
        },
      ],
    } as unknown as SaveGame;

    const groups = selectWorldObjectGroups(saveGame);
    expect(
      groups.map(({ type, category, count }) => ({ type, category, count })),
    ).toEqual([
      { type: "Hatch", category: "Creature", count: 1 },
      { type: "PrickleFlower", category: "Plant", count: 2 },
      {
        type: "HarvestableSpacePOI_DLC5AquaticMixingField",
        category: "Space POI",
        count: 1,
      },
    ]);
    expect(groups[2].opaqueStateBytes).toBe(12);
  });
});
