import { describe, expect, it } from "vitest";
import {
  OVERJOYED_TRAIT_IDS,
  STRESS_REACTION_TRAIT_IDS,
  getAllKnownTraits,
  getTraitCategory,
  isBionicIdentityTraitId,
  isBionicTraitId,
} from "./trait-names";

describe("trait classification", () => {
  it("matches the standard duplicant trait registry", () => {
    const standardTraits = getAllKnownTraits().filter(
      (trait) =>
        !isBionicTraitId(trait.id) &&
        !OVERJOYED_TRAIT_IDS.has(trait.id) &&
        !STRESS_REACTION_TRAIT_IDS.has(trait.id),
    );

    expect(
      standardTraits.filter((trait) => trait.category === "positive"),
    ).toHaveLength(47);
    expect(
      standardTraits.filter((trait) => trait.category === "universal"),
    ).toHaveLength(7);
    expect(
      standardTraits.filter((trait) => trait.category === "negative"),
    ).toHaveLength(31);
  });

  it("keeps the seven general traits in the universal data category", () => {
    const generalTraitIds = [
      "CLAUSTROPHOBIC",
      "SENSITIVEFEET",
      "FASHIONABLE",
      "PREFERSCOOLER",
      "PREFERSWARMER",
      "SOLITARYSLEEPER",
      "CLIMACOPHOBIC",
    ];

    for (const traitId of generalTraitIds) {
      expect(getTraitCategory(traitId)).toBe("universal");
    }
  });

  it("recognizes bionic reactions without relying on an id prefix", () => {
    expect(isBionicTraitId("DATARAINER")).toBe(true);
    expect(isBionicTraitId("ROBODANCER")).toBe(true);
    expect(isBionicTraitId("STRESSSHOCKER")).toBe(true);
    expect(isBionicIdentityTraitId("DATARAINER")).toBe(false);
    expect(isBionicIdentityTraitId("ROBODANCER")).toBe(false);
    expect(isBionicIdentityTraitId("STRESSSHOCKER")).toBe(false);
    expect(isBionicIdentityTraitId("BIONICBUG1")).toBe(true);
    expect(OVERJOYED_TRAIT_IDS.has("DATARAINER")).toBe(true);
    expect(STRESS_REACTION_TRAIT_IDS.has("STRESSSHOCKER")).toBe(true);
  });
});
