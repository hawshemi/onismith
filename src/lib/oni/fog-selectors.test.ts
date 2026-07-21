import { describe, expect, it } from "vitest";
import type { SaveGame } from "@/lib/save-parser/model";
import { selectFogSummary } from "./fog-selectors";

describe("selectFogSummary", () => {
  it("returns an empty summary without a save", () => {
    expect(selectFogSummary(null)).toEqual({
      width: 0,
      height: 0,
      cellCount: 0,
      hasVisibilityData: false,
      visibleEntryCount: null,
      visibleEntryRatio: null,
      streams: [],
      totalBytes: 0,
    });
  });

  it("summarizes streamed visibility without interpreting it as coverage", () => {
    const saveGame = {
      world: {
        WidthInCells: 3,
        HeightInCells: 2,
        streamed: [
          ["GridVisible", new Uint8Array([0, 1, 0, 255, 4, 0])],
          ["Camera", new Uint8Array(44)],
        ],
      },
    } as unknown as SaveGame;

    expect(selectFogSummary(saveGame)).toEqual({
      width: 3,
      height: 2,
      cellCount: 6,
      hasVisibilityData: true,
      visibleEntryCount: 3,
      visibleEntryRatio: 0.5,
      streams: [
        { name: "Camera", bytes: 44 },
        { name: "GridVisible", bytes: 6 },
      ],
      totalBytes: 50,
    });
  });
});
