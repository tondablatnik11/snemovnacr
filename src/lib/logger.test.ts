// Testy pro logger helpers.

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logger exists and is a pino instance", async () => {
    const { logger } = await import("./logger");
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  it("withContext creates child logger with metadata", async () => {
    const { logger, withContext } = await import("./logger");
    const child = withContext({ requestId: "test-123", userId: "user-1" });
    expect(child).toBeDefined();
    expect(typeof child.info).toBe("function");
  });

  it("getRequestContext generates UUID when not provided", async () => {
    const { getRequestContext } = await import("./logger");
    const req = new Request("https://example.com");
    const ctx = getRequestContext(req);
    expect(ctx.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(ctx.headers["X-Request-Id"]).toBe(ctx.requestId);
  });

  it("getRequestContext uses existing X-Request-Id header", async () => {
    const { getRequestContext } = await import("./logger");
    const req = new Request("https://example.com", {
      headers: { "x-request-id": "existing-id-456" },
    });
    const ctx = getRequestContext(req);
    expect(ctx.requestId).toBe("existing-id-456");
    expect(ctx.headers["X-Request-Id"]).toBe("existing-id-456");
  });

  it("logger respects LOG_LEVEL env var", async () => {
    const origLogLevel = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = "debug";
    // Reload module to pick up new env
    vi.resetModules();
    const { logger: debugLogger } = await import("./logger");
    expect((debugLogger as { level?: string }).level).toBe("debug");
    process.env.LOG_LEVEL = origLogLevel;
  });
});