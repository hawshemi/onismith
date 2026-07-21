import { describe, expect, it } from "vitest";
import {
  localSaveFixtureExists,
  parseLocalSaveFixture,
} from "@/lib/save-parser/local-save-fixtures.test-utils";
import { selectPlanetoids } from "./planet-selectors";

const AQUATIC_FIXTURE = "aquatic_fresh_revealed_build.sav";

describe.skipIf(!localSaveFixtureExists(AQUATIC_FIXTURE))(
  "Spaced Out planetoid selection",
  () => {
    it("associates world metadata and Aquatic biomes with each asteroid", () => {
      const planetoids = selectPlanetoids(
        parseLocalSaveFixture(AQUATIC_FIXTURE),
      );

      expect(planetoids).toHaveLength(8);
      expect(planetoids[0]).toMatchObject({
        id: 0,
        name: "Tidalolin",
        worldName: "dlc5::worlds/AquaticClassicAsteroid",
        starmapLocation: { q: 0, r: 0 },
        worldSize: { x: 240, y: 380 },
        isStartWorld: true,
        isDiscovered: true,
      });
      expect(planetoids[0].biomes).toEqual(
        expect.arrayContaining([
          { zoneType: 24, names: ["Kelp Forest"], cellCount: 14 },
          { zoneType: 25, names: ["Reef"], cellCount: 14 },
          { zoneType: 26, names: ["Abyss"], cellCount: 9 },
          { zoneType: 27, names: ["Beach"], cellCount: 6 },
        ]),
      );
    });
  },
);
