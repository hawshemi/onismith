import { describe, expect, it } from "vitest";
import { assertSaveGameHeader, type SaveGameHeader } from "./header";

const validHeader: SaveGameHeader = {
  buildVersion: 1,
  headerVersion: 1,
  isCompressed: true,
  gameInfo: {
    numberOfCycles: 1,
    numberOfDuplicants: 3,
    baseName: "Onismith",
    isAutoSave: false,
    originalSaveName: "Onismith",
    saveMajorVersion: 7,
    saveMinorVersion: 31,
    clusterId: "clusters/Onismith",
    sandboxEnabled: false,
    colonyGuid: "test",
    dlcId: "",
  },
};

describe("save header validation", () => {
  it("accepts a valid header", () => {
    expect(() => assertSaveGameHeader(validHeader)).not.toThrow();
  });

  it.each([
    ["buildVersion", Number.NaN],
    ["headerVersion", Number.POSITIVE_INFINITY],
    ["isCompressed", "yes"],
    ["gameInfo", null],
  ])("rejects an invalid %s", (key, value) => {
    expect(() =>
      assertSaveGameHeader({ ...validHeader, [key]: value } as SaveGameHeader),
    ).toThrow();
  });
});
