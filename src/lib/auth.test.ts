import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/auth";

describe("auth session token", () => {
  it("creates and verifies a valid token", () => {
    process.env.AUTH_JWT_SECRET = "test-secret";

    const token = createSessionToken({
      id: "user-1",
      email: "user@example.com",
      role: "USER",
      name: "User One",
    });

    const decoded = verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.email).toBe("user@example.com");
    expect(decoded?.role).toBe("USER");
  });

  it("returns null for an invalid token", () => {
    process.env.AUTH_JWT_SECRET = "test-secret";

    const decoded = verifySessionToken("bad-token-value");
    expect(decoded).toBeNull();
  });
});
