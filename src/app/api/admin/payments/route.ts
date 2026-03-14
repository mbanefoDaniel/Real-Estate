import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    if (!isAdminFromRequest(request)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const limitParam = Number(request.nextUrl.searchParams.get("limit") || "50");
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(200, Math.floor(limitParam))) : 50;

    const payments = await prisma.featuredPayment.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            featured: true,
          },
        },
      },
    });

    return NextResponse.json(payments);
  } catch {
    return NextResponse.json({ error: "Unable to load payments." }, { status: 500 });
  }
}
