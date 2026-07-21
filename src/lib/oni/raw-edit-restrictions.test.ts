import { describe, expect, it } from "vitest";
import type { SaveGame } from "@/lib/save-parser/model";
import { getRawEditRestriction } from "./raw-edit-restrictions";

const saveGame = {
  world: {
    active_mods: [{ id: "example" }],
    streamed: [["GridVisible", new Uint8Array(1)]],
  },
  gameData: {
    worldDetail: { globalWorldSeed: 7 },
  },
  gameObjects: [
    {
      name: "Asteroid",
      gameObjects: [
        {
          behaviors: [
            {
              name: "WorldContainer",
              templateData: { isDiscovered: false },
            },
          ],
        },
      ],
    },
  ],
} as unknown as SaveGame;

describe("getRawEditRestriction", () => {
  it.each([
    ["streamed fog", ["world", "streamed", "0", "1", "0"]],
    ["active mods", ["world", "active_mods", "0", "id"]],
    ["world generation", ["gameData", "worldDetail", "globalWorldSeed"]],
    ["object group identifiers", ["gameObjects", "0", "name"]],
    [
      "planetoid discovery",
      [
        "gameObjects",
        "0",
        "gameObjects",
        "0",
        "behaviors",
        "0",
        "templateData",
        "isDiscovered",
      ],
    ],
    [
      "behavior identifiers",
      ["gameObjects", "0", "gameObjects", "0", "behaviors", "0", "name"],
    ],
  ])("protects %s data", (_label, path) => {
    expect(getRawEditRestriction(saveGame, path)).toBeTruthy();
  });

  it("leaves unrelated primitive fields editable", () => {
    expect(getRawEditRestriction(saveGame, ["settings", "gameID"])).toBeNull();
  });
});
