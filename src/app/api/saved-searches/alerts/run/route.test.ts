import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
  propertyFindMany: vi.fn(),
  sendEmail: vi.fn(),
  isAdminFromRequest: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    savedSearch: {
      findMany: mocks.findMany,
      update: mocks.update,
    },
    property: {
      findMany: mocks.propertyFindMany,
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  isAdminFromRequest: mocks.isAdminFromRequest,
}));

vi.mock("@/lib/email", () => ({
  sendEmail: mocks.sendEmail,
}));

import { POST } from "@/app/api/saved-searches/alerts/run/route";

describe("saved search alert runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_ALERTS_SECRET;
  });

  it("rejects requests without admin session or cron token", async () => {
    mocks.isAdminFromRequest.mockReturnValue(false);

    const request = new NextRequest("http://localhost/api/saved-searches/alerts/run", {
      method: "POST",
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain("Unauthorized");
  });

  it("accepts valid cron token and processes searches", async () => {
    process.env.CRON_ALERTS_SECRET = "cron-secret";
    mocks.isAdminFromRequest.mockReturnValue(false);
    mocks.findMany.mockResolvedValue([]);

    const request = new NextRequest("http://localhost/api/saved-searches/alerts/run", {
      method: "POST",
      headers: {
        "x-cron-secret": "cron-secret",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.alertsSent).toBe(0);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
