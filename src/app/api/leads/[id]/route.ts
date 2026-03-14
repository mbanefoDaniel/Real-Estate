import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromRequest, isAdminFromRequest } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";

type LeadStatusValue = "NEW" | "CONTACTED" | "CLOSED";

function parseLeadStatus(value: unknown): LeadStatusValue | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.toUpperCase();
  if (normalized === "NEW" || normalized === "CONTACTED" || normalized === "CLOSED") {
    return normalized as LeadStatusValue;
  }

  return null;
}

function sessionEmail(request: NextRequest) {
  return getSessionUserFromRequest(request)?.email?.toLowerCase() ?? null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            ownerEmail: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const isAdmin = isAdminFromRequest(request);
    const owner = sessionEmail(request);

    if (!isAdmin && (!owner || owner !== lead.property.ownerEmail.toLowerCase())) {
      return NextResponse.json(
        { error: "Unauthorized. Only the listing owner or admin can update this lead." },
        { status: 403 }
      );
    }

    const status = parseLeadStatus(body.status);
    if (!status) {
      return NextResponse.json(
        { error: "status must be one of NEW, CONTACTED, or CLOSED." },
        { status: 400 }
      );
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: { status },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            ownerEmail: true,
          },
        },
      },
    });

    if (isAdmin && owner) {
      await logAdminAction({
        adminEmail: owner,
        action: "updated_lead_status",
        entityType: "LEAD",
        entityId: updated.id,
        metadata: {
          propertyId: updated.property.id,
          status,
        },
      });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Unable to update lead." },
      { status: 500 }
    );
  }
}
