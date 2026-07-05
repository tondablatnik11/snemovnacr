import { describe, it, expect } from "vitest";
import { decodeVote, isYes, isNo, isAbstain, isAbsent, voteTone } from "~/lib/vote-codes";

describe("vote codes", () => {
  it("A = yes", () => {
    const v = decodeVote("A");
    expect(v.code).toBe("A");
    expect(v.tone).toBe("yes");
    expect(isYes("A")).toBe(true);
  });

  it("B and N = no", () => {
    expect(decodeVote("B").tone).toBe("no");
    expect(decodeVote("N").tone).toBe("no");
    expect(isNo("B")).toBe(true);
    expect(isNo("N")).toBe(true);
  });

  it("C = abstain", () => {
    expect(decodeVote("C").label).toBe("zdržel se");
    expect(isAbstain("C")).toBe(true);
  });

  it("@ and F = absent (different labels)", () => {
    expect(decodeVote("@").label).toBe("nepřihlášen");
    expect(decodeVote("F").label).toBe("nehlasoval");
    expect(isAbsent("@")).toBe(true);
    expect(isAbsent("F")).toBe(true);
  });

  it("M = excused (absent)", () => {
    expect(decodeVote("M").label).toBe("omluven");
    expect(isAbsent("M")).toBe(true);
  });

  it("W = pre-oath (absent)", () => {
    expect(decodeVote("W").label).toContain("slibu");
    expect(isAbsent("W")).toBe(true);
  });

  it("K = legacy abstain", () => {
    expect(isAbstain("K")).toBe(true);
  });

  it("lowercase normalized to uppercase", () => {
    expect(decodeVote("a").code).toBe("A");
  });

  it("unknown falls back to @", () => {
    const v = decodeVote("X");
    expect(v.code).toBe("@");
  });

  it("voteTone returns correct category", () => {
    expect(voteTone("A")).toBe("yes");
    expect(voteTone("B")).toBe("no");
    expect(voteTone("C")).toBe("abstain");
    expect(voteTone("M")).toBe("absent");
  });
});