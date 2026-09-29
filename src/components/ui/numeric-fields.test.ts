import { describe, expect, it } from "vitest";
import { getNumberFieldError } from "./numeric-fields";

describe("number field validation", () => {
  it.each(["", " ", "-", "1e", "Infinity"])(
    "rejects the incomplete or invalid draft %j instead of committing a value",
    (draft) => {
      expect(getNumberFieldError(draft)).toBe("Enter a number.");
    },
  );

  it("accepts zero as an explicit value", () => {
    expect(getNumberFieldError("0", 0, 100)).toBeNull();
  });

  it("explains the bound instead of silently changing the value", () => {
    expect(getNumberFieldError("-1", 0, 100)).toBe("Enter 0 or more.");
    expect(getNumberFieldError("101", "0", "100")).toBe("Enter 100 or less.");
    expect(getNumberFieldError("100", 0, 100)).toBeNull();
  });
});
