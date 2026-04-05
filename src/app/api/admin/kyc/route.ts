import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromRequest, isAdminFromRequest } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { sendKycStatusNotification } from "@/lib/notifications";

type KycStatusValue = "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED";

function parseKycStatus(value: string | null): KycStatusValue | null {
  if (value === "NOT_SUBMITTED" || value === "PENDING" || value === "VERIFIED" || value === "REJECTED") {
    return value;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdminFromRequest(request)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const statusParam = request.nextUrl.searchParams.get("status");
    const status = parseKycStatus(statusParam);

    const users = await prisma.user.findMany({
      where: status ? { kycStatus: status } : undefined,
      orderBy: [{ kycSubmittedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        email: true,
        profileImageUrl: true,
        kycStatus: true,
        kycDocumentUrl: true,
        kycSubmittedAt: true,
        kycVerifiedAt: true,
        createdAt: true,
      },
    } as unknown as Parameters<typeof prisma.user.findMany>[0]);

    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: "Unable to load KYC queue." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!isAdminFromRequest(request)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const admin = getSessionUserFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    const status = parseKycStatus(typeof body.kycStatus === "string" ? body.kycStatus : null);

    if (!userId || !status) {
      return NextResponse.json({ error: "userId and valid kycStatus are required." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: status,
        kycVerifiedAt: status === "VERIFIED" ? new Date() : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        profileImageUrl: true,
        kycStatus: true,
        kycDocumentUrl: true,
        kycSubmittedAt: true,
        kycVerifiedAt: true,
        createdAt: true,
      },
    } as unknown as Parameters<typeof prisma.user.update>[0]);

    await logAdminAction({
      adminEmail: admin.email,
      action: `kyc_${status.toLowerCase()}`,
      entityType: "USER",
      entityId: updated.id,
      metadata: {
        email: updated.email,
      },
    });

    try {
      await sendKycStatusNotification({
        email: updated.email,
        status,
        reviewedByEmail: admin.email,
      });
    } catch (error) {
      console.error("Unable to send KYC status notification", error);
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Unable to update KYC status." }, { status: 500 });
  }
}
