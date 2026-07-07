// Testy pro typové helpers a konverze z raw SQL row na typované objekty.

import { describe, it, expect } from "vitest";
import { asNumber, asString, asDate } from "./types";

describe("asNumber", () => {
  it("returns null for null/undefined", () => {
    expect(asNumber(null)).toBe(null);
    expect(asNumber(undefined)).toBe(null);
  });
  it("returns number unchanged", () => {
    expect(asNumber(42)).toBe(42);
    expect(asNumber(0)).toBe(0);
    expect(asNumber(-1.5)).toBe(-1.5);
  });
  it("parses numeric strings", () => {
    expect(asNumber("42")).toBe(42);
    expect(asNumber("3.14")).toBe(3.14);
  });
  it("returns null for non-numeric strings", () => {
    expect(asNumber("abc")).toBe(null);
    expect(asNumber("")).toBe(null);
  });
  it("returns null for unsupported types", () => {
    expect(asNumber({})).toBe(null);
    expect(asNumber([])).toBe(null);
  });
});

describe("asString", () => {
  it("returns null for null/undefined", () => {
    expect(asString(null)).toBe(null);
    expect(asString(undefined)).toBe(null);
  });
  it("stringifies non-strings", () => {
    expect(asString(42)).toBe("42");
    expect(asString(true)).toBe("true");
  });
});

describe("asDate", () => {
  it("returns null for null/undefined", () => {
    expect(asDate(null)).toBe(null);
    expect(asDate(undefined)).toBe(null);
  });
  it("returns Date unchanged", () => {
    const d = new Date("2024-01-15");
    expect(asDate(d)).toBe(d);
  });
  it("parses ISO string", () => {
    const result = asDate("2024-01-15T10:00:00Z");
    expect(result).toBeInstanceOf(Date);
    expect(result?.getUTCFullYear()).toBe(2024);
  });
  it("returns null for invalid strings", () => {
    expect(asDate("not a date")).toBe(null);
  });
  it("accepts numeric timestamps", () => {
    const ts = 1705314600000; // 2024-01-15T10:30:00Z
    const result = asDate(ts);
    expect(result).toBeInstanceOf(Date);
  });
});