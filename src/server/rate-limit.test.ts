// Testy pro rate limiter.

import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, cleanupRateLimitStore, getClientIp } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    cleanupRateLimitStore();
  });

  it("allows requests under the limit", () => {
    const result = rateLimit("user-1", 3, 1000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("counts multiple requests in the same window", () => {
    rateLimit("user-2", 3, 1000);
    rateLimit("user-2", 3, 1000);
    const result = rateLimit("user-2", 3, 1000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("blocks requests over the limit", () => {
    rateLimit("user-3", 2, 1000);
    rateLimit("user-3", 2, 1000);
    const result = rateLimit("user-3", 2, 1000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("resets after window expires", async () => {
    rateLimit("user-4", 1, 50); // 50ms window
    const blocked = rateLimit("user-4", 1, 50);
    expect(blocked.allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    const afterReset = rateLimit("user-4", 1, 50);
    expect(afterReset.allowed).toBe(true);
  });

  it("isolates different keys", () => {
    rateLimit("user-5", 1, 1000);
    const result = rateLimit("user-6", 1, 1000);
    expect(result.allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("192.168.1.1");
  });

  it("extracts IP from x-real-ip when no x-forwarded-for", () => {
    const req = new Request("https://example.com", {
      headers: { "x-real-ip": "10.0.0.5" },
    });
    expect(getClientIp(req)).toBe("10.0.0.5");
  });

  it("returns 'unknown' when no IP headers present", () => {
    const req = new Request("https://example.com");
    expect(getClientIp(req)).toBe("unknown");
  });

  it("trims whitespace from IP", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "  192.168.1.1  , 10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("192.168.1.1");
  });
});

describe("cleanupRateLimitStore", () => {
  it("resets bucket when its window expires (regardless of count)", async () => {
    // 10ms window, 1 limit — rychle vyčerpáme limit
    rateLimit("temp", 1, 10);
    rateLimit("temp", 1, 10); // blokován (count=1, limit=1)
    await new Promise((r) => setTimeout(r, 20));
    // Po 20ms je window (10ms) dávno pryč → nové okno, allowed=true
    const result = rateLimit("temp", 1, 10);
    expect(result.allowed).toBe(true);
  });

  it("keeps recent buckets alive", () => {
    rateLimit("recent", 1, 60000); // 60s window
    cleanupRateLimitStore();
    // Recent bucket by měl přežít
    const result = rateLimit("recent", 1, 60000);
    expect(result.allowed).toBe(false); // Stále na limitu
  });
});