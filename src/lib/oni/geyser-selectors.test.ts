import { describe, expect, it } from "vitest";
import type { SaveGame } from "@/lib/save-parser/model";
import { getHashedStringHash } from "./minion-interests";
import { selectGeysers } from "./geyser-selectors";

function gameObject(id: number, x: number, behaviors: object[] = []) {
  return {
    position: { x, y: 20, z: 0 },
    behaviors: [
      { name: "KPrefabID", templateData: { InstanceID: id } },
      ...behaviors,
    ],
  };
}

const geyserSave = {
  gameObjects: [
    {
      name: "GeyserGeneric_steam",
      gameObjects: [
        gameObject(1, 10, [
          {
            name: "Geyser",
            templateData: {
              configuration: {
                typeId: { hash: getHashedStringHash("steam") },
                rateRoll: 2,
                yearLengthRoll: 3,
                yearPercentRoll: 0.4,
                iterationPercentRoll: 0.5,
                iterationLengthRoll: 6,
              },
            },
          },
        ]),
      ],
    },
    {
      name: "SmallReefGeyser",
      gameObjects: [gameObject(2, 30)],
    },
    {
      name: "UnderwaterVent",
      gameObjects: [gameObject(3, 40)],
    },
  ],
} as unknown as SaveGame;

describe("Aquatic geyser selection", () => {
  it("includes opaque Aquatic world features as read-only geysers", () => {
    const geysers = selectGeysers(geyserSave);

    expect(geysers).toHaveLength(3);
    expect(geysers[0]).toMatchObject({
      geyserType: "steam",
      isEditable: true,
      emitRate: 2,
    });
    expect(geysers[1]).toMatchObject({
      geyserType: "tidal_spring",
      isEditable: false,
      position: { x: 30, y: 20, z: 0 },
    });
    expect(geysers[2]).toMatchObject({
      geyserType: "thermal_gas_fissure",
      isEditable: false,
    });
  });
});
