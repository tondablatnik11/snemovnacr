import { describe, it, expect } from "vitest";
import { formatFullName, formatTiskId, formatRelative } from "~/lib/format";

describe("format helpers", () => {
  it("formatFullName with all parts", () => {
    expect(
      formatFullName({
        titulPred: "Ing.",
        jmeno: "Jan",
        prijmeni: "Novák",
        titulZa: "Ph.D.",
      })
    ).toBe("Ing., Jan Novák, Ph.D.");
  });

  it("formatFullName minimal", () => {
    expect(formatFullName({ jmeno: "Jan", prijmeni: "Novák" })).toBe("Jan Novák");
  });

  it("formatTiskId without slash number", () => {
    expect(formatTiskId(123, 0)).toBe("123");
    expect(formatTiskId(123, -1)).toBe("123");
  });

  it("formatTiskId with slash number", () => {
    expect(formatTiskId(123, 1)).toBe("123/1");
    expect(formatTiskId(456, 5)).toBe("456/5");
  });

  it("formatRelative returns Czech format", () => {
    const now = new Date();
    const future = new Date(now.getTime() + 60_000); // +1 min
    expect(formatRelative(future)).toMatch(/za\s+1\s+minutu/);
  });
});