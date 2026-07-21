import { describe, expect, it } from "vitest";
import type { SaveGame } from "@/lib/save-parser/model";
import { selectPlanetoids } from "./planet-selectors";

const planetoidSave = {
  gameObjects: [
    {
      name: "Asteroid",
      gameObjects: [
        {
          behaviors: [
            {
              name: "WorldContainer",
              templateData: {
                id: 0,
                worldName: "dlc5::worlds/AquaticClassicAsteroid",
                worldType: "StartWorld",
                worldOffset: { x: 100, y: 200 },
                worldSize: { x: 240, y: 380 },
                isStartWorld: true,
                isDiscovered: true,
                isDupeVisited: false,
                isSurfaceRevealed: true,
              },
            },
            {
              name: "AsteroidGridEntity",
              templateData: {
                m_name: "Tidalolin",
                m_location: { q: 0, r: 0 },
              },
            },
          ],
        },
      ],
    },
  ],
  gameData: {
    worldDetail: {
      overworldCells: [
        [24, "KelpForest"],
        [25, "Reef"],
        [26, "Abyss"],
        [27, "Beach"],
      ].map(([zoneType, name], index) => ({
        zoneType,
        biomeIdx: index,
        poly: {
          vertices: [
            { x: 110 + index, y: 210 },
            { x: 111 + index, y: 210 },
            { x: 110 + index, y: 211 },
          ],
        },
        tags: {
          tags: [
            { name, hash: index },
            { name: "Overworld", hash: 100 + index },
          ],
        },
      })),
    },
  },
} as unknown as SaveGame;

describe("Spaced Out planetoid selection", () => {
  it("associates world metadata and Aquatic biomes with each asteroid", () => {
    const planetoids = selectPlanetoids(planetoidSave);

    expect(planetoids).toHaveLength(1);
    expect(planetoids[0]).toMatchObject({
      id: 0,
      name: "Tidalolin",
      worldName: "dlc5::worlds/AquaticClassicAsteroid",
      starmapLocation: { q: 0, r: 0 },
      worldSize: { x: 240, y: 380 },
      isStartWorld: true,
      isDiscovered: true,
    });
    expect(planetoids[0].biomes).toEqual([
      { zoneType: 24, names: ["Kelp Forest"], cellCount: 1 },
      { zoneType: 25, names: ["Reef"], cellCount: 1 },
      { zoneType: 26, names: ["Abyss"], cellCount: 1 },
      { zoneType: 27, names: ["Beach"], cellCount: 1 },
    ]);
  });
});
