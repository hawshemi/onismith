import { describe, expect, it } from "vitest";
import { clampToFloat32, clampToRange } from "./clamp";

describe("clampToRange", () => {
  it("returns the value when within bounds", () => {
    expect(clampToRange(0.5, 0, 1)).toBe(0.5);
  });

  it("clamps above max", () => {
    expect(clampToRange(99, 0, 1)).toBe(1);
  });

  it("clamps below min", () => {
    expect(clampToRange(-5, 0, 1)).toBe(0);
  });

  it("accepts string bounds (raw HTML min/max attributes)", () => {
    expect(clampToRange(50, "0", "10")).toBe(10);
  });

  it("ignores undefined or blank bounds", () => {
    expect(clampToRange(1e9, undefined, undefined)).toBe(1e9);
    expect(clampToRange(-1e9, "", "")).toBe(-1e9);
  });

  it("ignores a non-finite bound", () => {
    expect(clampToRange(5, "abc", 10)).toBe(5);
  });
});

describe("clampToFloat32", () => {
  it("passes through values within the float32 range", () => {
    expect(clampToFloat32(1234.5)).toBe(1234.5);
    expect(clampToFloat32(-1234.5)).toBe(-1234.5);
    expect(clampToFloat32(0)).toBe(0);
  });

  it("clamps values beyond float32 max so they don't serialize to Infinity", () => {
    expect(clampToFloat32(1e40)).toBe(3.4028234663852886e38);
    expect(clampToFloat32(-1e40)).toBe(-3.4028234663852886e38);
  });
});
