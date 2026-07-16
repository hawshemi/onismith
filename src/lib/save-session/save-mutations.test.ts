import { describe, expect, it } from "vitest";
import { setEffectCycles, setMasteryValues } from "./save-mutations";

describe("setMasteryValues", () => {
  it("enables a group without changing unrelated mastery entries", () => {
    expect(
      setMasteryValues(
        [
          ["Existing", true],
          ["Mining1", false],
        ],
        ["Mining1", "Mining2"],
        true,
      ),
    ).toEqual([
      ["Existing", true],
      ["Mining1", true],
      ["Mining2", true],
    ]);
  });

  it("removes every selected mastery entry when disabling a group", () => {
    expect(
      setMasteryValues(
        [
          ["Mining1", true],
          ["Existing", true],
          ["Mining2", true],
        ],
        ["Mining1", "Mining2"],
        false,
      ),
    ).toEqual([["Existing", true]]);
  });
});

describe("setEffectCycles", () => {
  const duplicatedEffects = [
    { id: "Showered", timeRemaining: 20 },
    { id: "OtherEffect", timeRemaining: 40 },
    { id: "Showered", timeRemaining: 60 },
  ];

  it("updates one effect and removes its duplicate entries", () => {
    expect(setEffectCycles(duplicatedEffects, "Showered", 2)).toEqual([
      { id: "Showered", timeRemaining: 400 },
      { id: "OtherEffect", timeRemaining: 40 },
    ]);
  });

  it("does not add a duplicate effect", () => {
    expect(setEffectCycles(duplicatedEffects, "Showered", 3, "add")).toEqual([
      { id: "Showered", timeRemaining: 600 },
      { id: "OtherEffect", timeRemaining: 40 },
    ]);
  });

  it("removes every duplicate entry for an effect", () => {
    expect(setEffectCycles(duplicatedEffects, "Showered", 0, "remove")).toEqual(
      [{ id: "OtherEffect", timeRemaining: 40 }],
    );
  });
});
