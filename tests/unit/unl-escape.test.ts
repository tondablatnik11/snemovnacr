import { describe, it, expect } from "vitest";
import { parseUnlLine } from "~/lib/unl";

describe("UNL escape sequences", () => {
  it("backslash followed by valid octal digits is decoded", () => {
    // \\013 = 0x0B = vertical tab (valid octal, all digits 0-7)
    expect(parseUnlLine("a\\013b")).toEqual(["a\vb"]);
  });

  it("multiple octal escapes in one field", () => {
    // \\073 = 0x3B = ';' ; \\055 = 0x2D = '-'
    expect(parseUnlLine("hello\\073\\055world")).toEqual(["hello;-world"]);
  });

  it("literal pipe is treated as separator", () => {
    expect(parseUnlLine("a|b")).toEqual(["a", "b"]);
  });

  it("null token in single-field line returns null", () => {
    expect(parseUnlLine("_null_")).toEqual([null]);
  });

  it("decodes backslash via valid octal escape (\\134 = 0x5C)", () => {
    expect(parseUnlLine("foo\\134bar")).toEqual(["foo\\bar"]);
  });

  it("decodes pipe via octal escape (\\174 = 0x7C)", () => {
    expect(parseUnlLine("a\\174b")).toEqual(["a|b"]);
  });

  it("backslash followed by non-octal digit is emitted as literal backslash", () => {
    // V PSP UNL spec jsou \NNN pouze octal (0-7). '9' není octal cifra.
    // Parser proto emituje '\\' doslova a pokračuje zpracováním '9b'.
    expect(parseUnlLine("a\\9b")).toEqual(["a\\9b"]);
  });
});