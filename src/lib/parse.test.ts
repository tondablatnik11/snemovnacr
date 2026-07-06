// Testy pro sdílené parse utility

import { describe, it, expect } from "vitest";
import {
  nullIfEmpty,
  nullIfInt,
  parseDate,
  parseDateTime,
  inferOrganTyp,
  inferDruhTisku,
} from "./parse";

describe("parse utilities", () => {
  describe("nullIfEmpty", () => {
    it("returns null for empty string", () => {
      expect(nullIfEmpty("")).toBe(null);
    });
    it("returns null for _null_ token", () => {
      expect(nullIfEmpty("_null_")).toBe(null);
    });
    it("returns null for whitespace only", () => {
      expect(nullIfEmpty("   ")).toBe(null);
    });
    it("returns trimmed value", () => {
      expect(nullIfEmpty("  foo  ")).toBe("foo");
    });
    it("returns null for null/undefined", () => {
      expect(nullIfEmpty(null)).toBe(null);
      expect(nullIfEmpty(undefined)).toBe(null);
    });
  });

  describe("nullIfInt", () => {
    it("parses valid integer", () => {
      expect(nullIfInt("42")).toBe(42);
    });
    it("returns null for invalid", () => {
      expect(nullIfInt("abc")).toBe(null);
    });
    it("returns null for empty", () => {
      expect(nullIfInt("")).toBe(null);
    });
  });

  describe("parseDate", () => {
    it("converts DD.MM.YYYY to YYYY-MM-DD", () => {
      expect(parseDate("25.12.2023")).toBe("2023-12-25");
    });
    it("zero-pads single digit day/month", () => {
      expect(parseDate("1.1.2024")).toBe("2024-01-01");
    });
    it("passes through ISO date", () => {
      expect(parseDate("2024-01-15")).toBe("2024-01-15");
    });
    it("returns null for empty", () => {
      expect(parseDate("")).toBe(null);
    });
  });

  describe("parseDateTime", () => {
    it("parses YYYY-MM-DD HH:MM:SS", () => {
      const d = parseDateTime("2024-01-15 14:30:00");
      expect(d).toBeInstanceOf(Date);
      expect(d?.getFullYear()).toBe(2024);
    });
    it("parses YYYY-MM-DD HH:MM (no seconds)", () => {
      const d = parseDateTime("2024-01-15 14:30");
      expect(d).toBeInstanceOf(Date);
    });
    it("returns null for invalid", () => {
      expect(parseDateTime("not a date")).toBe(null);
    });
  });

  describe("inferOrganTyp", () => {
    it("maps known codes", () => {
      expect(inferOrganTyp("1")).toBe("KLUB");
      expect(inferOrganTyp("2")).toBe("VYBOR");
      expect(inferOrganTyp("5")).toBe("DELEGACE");
    });
    it("defaults to JINY", () => {
      expect(inferOrganTyp("99")).toBe("JINY");
      expect(inferOrganTyp(undefined)).toBe("JINY");
    });
  });

  describe("inferDruhTisku", () => {
    it("maps known codes", () => {
      expect(inferDruhTisku("1")).toBe("NAVRH_ZAKONA");
      expect(inferDruhTisku("6")).toBe("INTERPELACE");
    });
    it("defaults to JINY", () => {
      expect(inferDruhTisku("99")).toBe("JINY");
    });
  });
});