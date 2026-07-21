import { describe, expect, it } from "vitest";
import {
  localSaveFixtureExists,
  parseLocalSaveFixture,
} from "@/lib/save-parser/local-save-fixtures.test-utils";
import { selectGeysers } from "./geyser-selectors";

const AQUATIC_FIXTURE = "aquatic_fresh_revealed_build.sav";

describe.skipIf(!localSaveFixtureExists(AQUATIC_FIXTURE))(
  "Aquatic geyser selection",
  () => {
    it("includes opaque Aquatic world features as read-only geysers", () => {
      const geysers = selectGeysers(parseLocalSaveFixture(AQUATIC_FIXTURE));

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
  },
);
