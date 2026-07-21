import { existsSync, readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseSaveGame, writeSaveGame } from "./index";

const FIXTURE_DIRECTORY = new URL("./test-fixtures/", import.meta.url);

const fixtures = [
  {
    fileName: "base_terra_fresh_build.sav",
    clusterId: "expansion1::clusters/VanillaSandstoneCluster",
    groupCount: 37,
    objectCount: 131,
  },
  {
    fileName: "aquatic_fresh_fogged_build.sav",
    clusterId: "dlc5::clusters/AquaticClassicCluster",
    groupCount: 58,
    objectCount: 164,
  },
  {
    fileName: "aquatic_fresh_revealed_build.sav",
    clusterId: "dlc5::clusters/AquaticClassicCluster",
    groupCount: 189,
    objectCount: 2109,
  },
] as const;

const hasLocalFixtures = fixtures.every(({ fileName }) =>
  existsSync(fileURLToPath(new URL(fileName, FIXTURE_DIRECTORY))),
);

function readFixture(fileName: string): ArrayBuffer {
  const bytes = readFileSync(
    fileURLToPath(new URL(fileName, FIXTURE_DIRECTORY)),
  );
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

describe.skipIf(!hasLocalFixtures)("local ONI save fixtures", () => {
  it.each(fixtures)(
    "parses and semantically round-trips $fileName",
    ({ fileName, clusterId, groupCount, objectCount }) => {
      const parsed = parseSaveGame(readFixture(fileName), {
        versionStrictness: "minor",
      });

      expect(parsed.version).toEqual({ major: 7, minor: 38 });
      expect(parsed.header.gameInfo.clusterId).toBe(clusterId);
      expect(parsed.gameObjects).toHaveLength(groupCount);
      expect(
        parsed.gameObjects.reduce(
          (total, group) => total + (group.gameObjects?.length ?? 0),
          0,
        ),
      ).toBe(objectCount);

      const reparsed = parseSaveGame(writeSaveGame(parsed), {
        versionStrictness: "minor",
      });
      expect(isDeepStrictEqual(reparsed, parsed)).toBe(true);
    },
    30_000,
  );
});
