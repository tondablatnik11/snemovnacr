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

    it("decodes octal escape sequences (\\134 → backslash, 0x5C = 134 octal)", () => {
      // PSP UNL spec: \NNN jsou 3-ciferné octal sekvence (cifry 0-7).
      // 0x5C (backslash) = 134 octal. \134 → backslash.
      const line = "foo\\134bar|baz";
      expect(parseUnlLine(line)).toEqual(["foo\\bar", "baz"]);
    });

    it("decodes vertical tab via octal (\\013)", () => {
      expect(parseUnlLine("a\\013b")).toEqual(["a\vb"]);
    });

    it("decodes multiple octal escapes in one field", () => {
      // \073 = 0x3B = ';' ; \055 = 0x2D = '-'
      expect(parseUnlLine("hello\\073\\055world")).toEqual(["hello;-world"]);
    });

    it("treats literal pipe as separator, not as content", () => {
      expect(parseUnlLine("a|b")).toEqual(["a", "b"]);
    });

    it("parses line with only _null_ token", () => {
      expect(parseUnlLine("_null_")).toEqual([null]);
    });

    it("handles Czech diacritics already decoded in input", () => {
      // parseUnlLine přijímá string typicky po iconv.decode z win1250 —
      // v tomto stavu jsou české znaky přímo v Unicode (ř = U+0159).
      // Parser nesmí narušit tyto Unicode znaky.
      expect(parseUnlLine("Přítel|Jiří")).toEqual(["Přítel", "Jiří"]);
      expect(parseUnlLine("Sněmovna|Česko")).toEqual(["Sněmovna", "Česko"]);
    });

    it("octal escape with 3-digit codepoint", () => {
      // \377 = 255 = 0xFF = 'ÿ' (latin1)
      expect(parseUnlLine("a\\377b")).toEqual(["aÿb"]);
    });
  });

  describe("unlRows (full buffer)", () => {
    it("decodes windows-1250 buffer with Czech characters", () => {
      const buffer = iconv.encode("Příliš|žluťoučký|kůň\núpěl|ďábelské|ódy", "win1250");
      const rows = unlRows(buffer);
      expect(rows).toEqual([
        ["Příliš", "žluťoučký", "kůň"],
        ["úpěl", "ďábelské", "ódy"],
      ]);
    });

    it("handles _null_ tokens in win1250 buffer", () => {
      const buffer = iconv.encode("Ahoj|_null_|světe", "win1250");
      const rows = unlRows(buffer);
      expect(rows[0]).toEqual(["Ahoj", null, "světe"]);
    });

    it("skips empty lines and comment lines", () => {
      const buffer = iconv.encode("a|b\n\n# komentář\nc|d", "win1250");
      const rows = unlRows(buffer);
      expect(rows).toEqual([
        ["a", "b"],
        ["c", "d"],
      ]);
    });
  });
});