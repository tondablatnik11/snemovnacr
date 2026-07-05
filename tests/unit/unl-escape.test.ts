import { describe, it, expect } from "vitest";
import { parseUnlLine } from "~/lib/unl";

describe("UNL escape sequences", () => {
  it("backslash followed by octal digits is decoded", () => {
    // \\013 = 0x0B = vertical tab
    expect(parseUnlLine("a\\013b")).toEqual(["a\vb"]);
  });

  it("multiple escapes in one field", () => {
    // \\073 = ':' \\055 = '-'
    expect(parseUnlLine("hello\\073\\055world")).toEqual(["hello:-world"]);
  });

  it("literal pipe is not special-cased", () => {
    expect(parseUnlLine("a|b")).toEqual(["a", "b"]);
  });

  it("null token in single-field line returns null", () => {
    expect(parseUnlLine("_null_")).toEqual([null]);
  });
});