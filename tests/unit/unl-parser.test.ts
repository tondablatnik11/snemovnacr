import { describe, it, expect } from "vitest";
import iconv from "iconv-lite";
import { parseUnlLine, unlRows } from "~/lib/unl";

describe("UNL parser", () => {
  describe("parseUnlLine", () => {
    it("parses simple pipe-delimited line", () => {
      const line = "1|2|3";
      expect(parseUnlLine(line)).toEqual(["1", "2", "3"]);
    });

    it("converts _null_ to null", () => {
      const line = "1|_null_|3";
      expect(parseUnlLine(line)).toEqual(["1", null, "3"]);
    });

    it("parses empty fields", () => {
      const line = "1||3";
      expect(parseUnlLine(line)).toEqual(["1", "", "3"]);
    });

    it("decodes octal escape sequences (\\\\092 → backslash)", () => {
      const line = "foo\\092bar|baz";
      expect(parseUnlLine(line)).toEqual(["foo\\bar", "baz"]);
    });

    it("decodes Czech diacritics via octal", () => {
      // 'ř' = 0xF8 (windows-1250) = 0370 octal = "\\370"
      const line = "P\\351tel|P\\350\\350li";
      // Přátel = "Přátel" ; Pštělí... wait — test actual octal
      // ě = 0xEC = 0354
      const line2 = "P\\354tel|Ji\\350\\355";
      expect(parseUnlLine(line2)).toEqual(["Pětel", "Jiří"]);
    });
  });

  describe("unlRows (full buffer)", () => {
    it("decodes windows-1250 buffer", () => {
      const buffer = iconv.encode("Příliš|žluťoučký|kůň\núpěl|ďábelské|ódy", "win1250");
      const rows = unlRows(buffer);
      expect(rows).toEqual([
        ["Příliš", "žluťoučký", "kůň"],
        ["úpěl", "ďábelské", "ódy"],
      ]);
    });

    it("handles _null_ tokens", () => {
      const buffer = Buffer.from("Ahoj|_null_|světe", "utf-8");
      // ale encoder je utf-8, ne windows-1250 — parser by měl vrátit správné hodnoty
      const rows = unlRows(buffer);
      expect(rows[0]).toEqual(["Ahoj", null, "světe"]);
    });
  });
});