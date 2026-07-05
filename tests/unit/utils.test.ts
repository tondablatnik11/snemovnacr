import { describe, it, expect } from "vitest";
import { cn, slugify, clamp, pct } from "~/lib/utils";

describe("utils", () => {
  it("cn merges tailwind classes", () => {
    expect(cn("foo", "bar", false && "baz")).toBe("foo bar");
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("slugify handles Czech characters", () => {
    expect(slugify("Příliš žluťoučký kůň")).toBe("prilis-zlutoucky-kun");
    expect(slugify("Návrh zákona č. 123")).toBe("navrh-zakona-c-123");
    expect(slugify("  spaces  ")).toBe("spaces");
  });

  it("clamp", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it("pct", () => {
    expect(pct(25, 100)).toBe(25);
    expect(pct(0, 0)).toBe(0);
    expect(pct(150, 100)).toBe(100);
  });
});