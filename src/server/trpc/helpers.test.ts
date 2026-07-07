// Testy pro tRPC helpers — pagination, schemas, cache keys.

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { paginationSchema, offsetFrom, buildCacheKey } from "./helpers";

describe("paginationSchema", () => {
  it("applies defaults", () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });
  it("rejects pageSize > 200", () => {
    expect(() => paginationSchema.parse({ pageSize: 500 })).toThrow();
  });
  it("rejects page < 1", () => {
    expect(() => paginationSchema.parse({ page: 0 })).toThrow();
  });
  it("accepts valid input", () => {
    const result = paginationSchema.parse({ page: 3, pageSize: 50 });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(50);
  });
  it("extend works with additional fields", () => {
    const extended = paginationSchema.extend({ term: z.number().default(10) });
    const result = extended.parse({ page: 2 });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(20);
    expect(result.term).toBe(10);
  });
});

describe("offsetFrom", () => {
  it("computes offset from page 1", () => {
    expect(offsetFrom({ page: 1, pageSize: 20 })).toBe(0);
  });
  it("computes offset from page 5", () => {
    expect(offsetFrom({ page: 5, pageSize: 20 })).toBe(80);
  });
  it("handles custom page size", () => {
    expect(offsetFrom({ page: 3, pageSize: 50 })).toBe(100);
  });
});

describe("buildCacheKey", () => {
  it("includes name and serialized input", () => {
    expect(buildCacheKey("hlasovani.list", { page: 1, term: 10 })).toBe(
      "hlasovani.list:{\"page\":1,\"term\":10}"
    );
  });
  it("handles undefined input", () => {
    expect(buildCacheKey("foo", undefined)).toBe("foo:undefined");
  });
  it("handles complex objects", () => {
    const key = buildCacheKey("test", { a: 1, b: [2, 3] });
    expect(key).toContain('"a":1');
    expect(key).toContain("[2,3]");
  });
});