import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseSaveGame } from "@/lib/save-parser";
import { selectGeysers } from "./geyser-selectors";

function readAquaticFixture() {
  const path = fileURLToPath(
    new URL(
      "../save-parser/test-fixtures/aquatic_fresh_revealed_build.sav",
      import.meta.url,
    ),
  );
  const bytes = readFileSync(path);
  return parseSaveGame(
    bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer,
    { versionStrictness: "minor" },
  );
}

describe("Aquatic geyser selection", () => {
  it("includes opaque Aquatic world features as read-only geysers", () => {
    const geysers = selectGeysers(readAquaticFixture());

    expect(geysers).toHaveLength(38);
    expect(geysers.filter((geyser) => geyser.isEditable)).toHaveLength(19);
    expect(
      geysers.filter((geyser) => geyser.geyserType === "tidal_spring"),
    ).toHaveLength(13);
    expect(
      geysers.filter((geyser) => geyser.geyserType === "thermal_gas_fissure"),
    ).toHaveLength(6);
    expect(
      geysers
        .filter((geyser) => !geyser.isEditable)
        .every((geyser) => Number.isFinite(geyser.position.x)),
    ).toBe(true);
  });
});
