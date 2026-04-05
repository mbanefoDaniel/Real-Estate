import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { isAdminFromRequest } from "@/lib/auth";

function parseLimit(value: string | null) {
  if (!value) {
    return 100;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 100;
  }

  return Math.min(parsed, 300);
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdminFromRequest(request)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const limit = parseLimit(request.nextUrl.searchParams.get("limit"));

    const items = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Unable to load audit logs." }, { status: 500 });
  }
}
