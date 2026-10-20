import { expect, it } from "vitest";
import type { SaveGame } from "@/lib/save-parser/model";
import { getBuildingDisplayName, selectBuildings } from "./building-selectors";

it("reuses building data across callers and invalidates it after an edit", () => {
  const save = {
    gameObjects: [
      {
        name: "AirFilter",
        gameObjects: [
          {
            behaviors: [
              { name: "KPrefabID", templateData: { InstanceID: 1 } },
              { name: "BuildingComplete", templateData: {} },
              { name: "UserNameable", templateData: { savedName: "First" } },
            ],
          },
        ],
      },
    ],
  } as unknown as SaveGame;
  const first = selectBuildings(save);
  expect(selectBuildings({ ...save })).toBe(first);
  const edited = structuredClone(save);
  edited.gameObjects[0].gameObjects[0].behaviors[2].templateData.savedName =
    "Second";
  expect(selectBuildings(edited)[0].customName).toBe("Second");
  expect(selectBuildings(edited)).not.toBe(first);
  expect(first[0].customName).toBe("First");
});

it("uses the game name and keeps a readable fallback for unknown buildings", () => {
  expect(getBuildingDisplayName("AirFilter")).toBe("Deodorizer");
  expect(getBuildingDisplayName("ModdedAirCleaner")).toBe("Modded Air Cleaner");
});
