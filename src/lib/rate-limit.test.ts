import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";

function makeRequest(ip: string) {
  return new NextRequest("http://localhost/api/test", {
    headers: {
      "x-forwarded-for": ip,
    },
  });
}

describe("rate limit", () => {
  it("allows requests up to limit and then blocks", async () => {
    const request = makeRequest("203.0.113.10");
    const config = { limit: 2, windowMs: 60_000 };

    const first = await enforceRateLimit(request, "test:limit", config);
    const second = await enforceRateLimit(request, "test:limit", config);
    const third = await enforceRateLimit(request, "test:limit", config);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks different IPs independently", async () => {
    const config = { limit: 1, windowMs: 60_000 };

    const firstA = await enforceRateLimit(makeRequest("203.0.113.20"), "test:ip", config);
    const firstB = await enforceRateLimit(makeRequest("203.0.113.21"), "test:ip", config);

    expect(firstA.allowed).toBe(true);
    expect(firstB.allowed).toBe(true);
  });
});
