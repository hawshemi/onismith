import { describe, expect, it } from "vitest";
import { getClusterDisplayName, getWorldDisplayName } from "./world-names";

describe("world display names", () => {
  it("names the Klei Fest lab cluster and world", () => {
    expect(
      getClusterDisplayName("expansion1::clusters/KleiFest2023Cluster"),
    ).toBe("The Lab");
    expect(
      getWorldDisplayName(
        "expansion1::worlds/StrangeAsteroidKleiFest2023Cluster",
      ),
    ).toBe("The Lab");
  });

  it("humanizes unknown identifiers", () => {
    expect(getWorldDisplayName("example::worlds/NewTestAsteroid")).toBe(
      "New Test Asteroid",
    );
  });
});
