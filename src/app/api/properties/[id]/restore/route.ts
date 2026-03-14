import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminFromRequest, getSessionUserFromRequest } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdminFromRequest(request)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const adminEmail = getSessionUserFromRequest(request)?.email?.toLowerCase();
    if (!adminEmail) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await context.params;

    const existing = await prisma.property.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    const restored = await prisma.property.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedByEmail: null,
      },
    });

    await logAdminAction({
      adminEmail,
      action: "restored_property",
      entityType: "PROPERTY",
      entityId: id,
      metadata: {
        title: restored.title,
      },
    });

    return NextResponse.json(restored);
  } catch {
    return NextResponse.json({ error: "Unable to restore property." }, { status: 500 });
  }
}
