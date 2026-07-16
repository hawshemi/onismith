import { describe, expect, it } from "vitest";
import { getHashedStringHash } from "./minion-interests";

// getHashedStringHash reimplements Klei's string hash. It is the round-trip key
// for interests and geyser types: if it drifts, both reads and writes silently
// target the wrong entries. These cases pin the algorithm.
describe("getHashedStringHash", () => {
  it("matches the hash stored in a real save for a known geyser id", () => {
    // GeyserGeneric_murky_brine (Aquatic Planet Pack Polluted Brine Vent),
    // confirmed against the stored typeId hash in a real DLC5 save.
    expect(getHashedStringHash("murky_brine")).toBe(1190971945);
  });

  it("is deterministic", () => {
    expect(getHashedStringHash("steam")).toBe(getHashedStringHash("steam"));
  });

  it("is case-insensitive (input is lowercased)", () => {
    expect(getHashedStringHash("Steam")).toBe(getHashedStringHash("steam"));
  });

  it("returns 0 for the empty string", () => {
    expect(getHashedStringHash("")).toBe(0);
  });

  it("returns 0 for non-string input", () => {
    expect(getHashedStringHash(null)).toBe(0);
    expect(getHashedStringHash(undefined)).toBe(0);
    expect(getHashedStringHash(42)).toBe(0);
  });
});
