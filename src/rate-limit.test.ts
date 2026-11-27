import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows requests up to the limit and then blocks with a retry delay", () => {
    const limiter = createRateLimiter(3, 60_000);
    const start = 1_000_000;
    expect(limiter.check("a", start)).toEqual({ allowed: true });
    expect(limiter.check("a", start + 1)).toEqual({ allowed: true });
    expect(limiter.check("a", start + 2)).toEqual({ allowed: true });
    expect(limiter.check("a", start + 10_000)).toEqual({ allowed: false, retryAfterSeconds: 50 });
  });

  it("tracks keys independently", () => {
    const limiter = createRateLimiter(1, 60_000);
    expect(limiter.check("a", 0)).toEqual({ allowed: true });
    expect(limiter.check("b", 0)).toEqual({ allowed: true });
    expect(limiter.check("a", 1).allowed).toBe(false);
  });

  it("starts a new window once the previous one has expired", () => {
    const limiter = createRateLimiter(1, 1000);
    expect(limiter.check("a", 0)).toEqual({ allowed: true });
    expect(limiter.check("a", 999).allowed).toBe(false);
    expect(limiter.check("a", 1000)).toEqual({ allowed: true });
  });

  it("always reports a retry delay of at least one second", () => {
    const limiter = createRateLimiter(1, 1000);
    limiter.check("a", 0);
    expect(limiter.check("a", 999)).toEqual({ allowed: false, retryAfterSeconds: 1 });
  });

  it("stays bounded when more keys than the cap are seen", () => {
    const limiter = createRateLimiter(1, 60_000, 3);
    for (const key of ["a", "b", "c", "d"]) limiter.check(key, 0);
    // "a" was evicted to stay within the cap, so it gets a fresh window.
    expect(limiter.check("a", 1)).toEqual({ allowed: true });
    // "d" is still tracked and is blocked.
    expect(limiter.check("d", 1).allowed).toBe(false);
  });
});
