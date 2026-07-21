import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseSaveGame } from "@/lib/save-parser";
import { selectPlanetoids } from "./planet-selectors";

const AQUATIC_FIXTURE = new URL(
  "../save-parser/test-fixtures/aquatic_fresh_revealed_build.sav",
  import.meta.url,
);

function readAquaticFixture() {
  const path = fileURLToPath(AQUATIC_FIXTURE);
  const bytes = readFileSync(path);
  return parseSaveGame(
    bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer,
    { versionStrictness: "minor" },
  );
}

describe.skipIf(!existsSync(fileURLToPath(AQUATIC_FIXTURE)))(
  "Spaced Out planetoid selection",
  () => {
    it("associates world metadata and Aquatic biomes with each asteroid", () => {
      const planetoids = selectPlanetoids(readAquaticFixture());

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
