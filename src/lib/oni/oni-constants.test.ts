import { describe, expect, it } from "vitest";
import {
  BIONIC_MINION_SKILL_GROUPS,
  STANDARD_MINION_SKILL_GROUPS,
} from "./oni-constants";

function skillIds(
  groups: readonly {
    skills: readonly { skillId: string }[];
  }[],
): string[] {
  return groups.flatMap((group) => group.skills.map((skill) => skill.skillId));
}

describe("ONI skill definitions", () => {
  it("contains every standard skill ID in the current game registry", () => {
    const ids = skillIds(STANDARD_MINION_SKILL_GROUPS);

    expect(ids).toHaveLength(44);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining([
        "Mining4",
        "Researching4",
        "AtomicResearch",
        "Astronomy",
        "SpaceResearch",
        "RocketPiloting1",
        "RocketPiloting2",
        "Cooking3",
        "ThermalSuits",
        "Pyrotechnics",
        "Swimming",
        "Swimming2",
      ]),
    );
  });

  it("contains every bionic skill ID in the current game registry", () => {
    const ids = skillIds(BIONIC_MINION_SKILL_GROUPS);

    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      "BionicsA1",
      "BionicsA2",
      "BionicsA3",
      "BionicsB1",
      "BionicsB2",
      "BionicsC1",
      "BionicsC2",
      "BionicsC3",
      "BionicsD1",
      "BionicsD2",
    ]);
  });
});
