// Testy pro middleware helpers (withTracing, cache).

import { describe, it, expect, beforeEach } from "vitest";
import { cache, invalidateCache, withTracing } from "./middleware-helpers";

describe("cache", () => {
  beforeEach(() => {
    invalidateCache();
  });

  it("returns factory result on first call", async () => {
    let calls = 0;
    const result = await cache("test-1", async () => {
      calls++;
      return "value";
    });
    expect(result).toBe("value");
    expect(calls).toBe(1);
  });

  it("returns cached value on second call", async () => {
    let calls = 0;
    const factory = async () => {
      calls++;
      return "cached";
    };
    await cache("test-2", factory);
    const result = await cache("test-2", factory);
    expect(result).toBe("cached");
    expect(calls).toBe(1); // factory se volala jen jednou
  });

  it("expires after ttlMs", async () => {
    let calls = 0;
    const factory = async () => {
      calls++;
      return `value-${calls}`;
    };
    const first = await cache("test-3", factory, 50);
    await new Promise((r) => setTimeout(r, 60));
    const second = await cache("test-3", factory, 50);
    expect(first).toBe("value-1");
    expect(second).toBe("value-2");
    expect(calls).toBe(2);
  });

  it("isolates different keys", async () => {
    const a = await cache("key-a", async () => "a");
    const b = await cache("key-b", async () => "b");
    expect(a).toBe("a");
    expect(b).toBe("b");
  });
});

describe("invalidateCache", () => {
  beforeEach(() => {
    invalidateCache();
  });

  it("clears all cache when no prefix", async () => {
    await cache("foo", async () => "v");
    await cache("bar", async () => "v");
    invalidateCache();
    // Po invalidaci by se factory měla zavolat znovu
    let calls = 0;
    await cache("foo", async () => {
      calls++;
      return "new";
    });
    expect(calls).toBe(1);
  });

  it("clears only matching prefix", async () => {
    await cache("user:1", async () => "a");
    await cache("user:2", async () => "b");
    await cache("post:1", async () => "c");
    invalidateCache("user:");
    let user1Calls = 0;
    let post1Calls = 0;
    await cache("user:1", async () => {
      user1Calls++;
      return "x";
    });
    await cache("post:1", async () => {
      post1Calls++;
      return "y";
    });
    expect(user1Calls).toBe(1); // user:1 byl invalidován
    expect(post1Calls).toBe(0); // post:1 zůstal v cache
  });
});

describe("withTracing", () => {
  it("adds X-Request-Id header", async () => {
    const handler = withTracing(async () => {
      return new Response("ok");
    });
    const res = await handler(new Request("https://x"), {});
    expect(res.headers.get("X-Request-Id")).toBeTruthy();
    expect(res.headers.get("X-Response-Time")).toMatch(/^\d+ms$/);
  });

  it("passes through handler response body", async () => {
    const handler = withTracing(async () => {
      return new Response("hello world", { status: 200 });
    });
    const res = await handler(new Request("https://x"), {});
    expect(await res.text()).toBe("hello world");
    expect(res.status).toBe(200);
  });

  it("preserves response status code", async () => {
    const handler = withTracing(async () => {
      return new Response("not found", { status: 404 });
    });
    const res = await handler(new Request("https://x"), {});
    expect(res.status).toBe(404);
  });

  it("passes context to handler", async () => {
    let receivedCtx: unknown = null;
    const handler = withTracing(async (_req, ctx) => {
      receivedCtx = ctx;
      return new Response("ok");
    });
    await handler(new Request("https://x"), { id: "123", extra: true });
    expect(receivedCtx).toEqual({ id: "123", extra: true });
  });
});