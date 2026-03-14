import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromRequest, isAdminFromRequest } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { sendKycStatusNotification } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  try {
    if (!isAdminFromRequest(request)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
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
    return NextResponse.json({ error: "Unable to load users." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!isAdminFromRequest(request)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const adminUser = getSessionUserFromRequest(request);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    const role = body.role === "USER" || body.role === "ADMIN" ? body.role : null;
    const kycStatus =
      body.kycStatus === "NOT_SUBMITTED" ||
      body.kycStatus === "PENDING" ||
      body.kycStatus === "VERIFIED" ||
      body.kycStatus === "REJECTED"
        ? body.kycStatus
        : null;

    if (!userId || (!role && !kycStatus)) {
      return NextResponse.json({ error: "userId and at least one update field are required." }, { status: 400 });
    }

    if (role && userId === adminUser.id && role !== "ADMIN") {
      return NextResponse.json({ error: "You cannot remove your own admin role." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role ? { role } : {}),
        ...(kycStatus
          ? {
              kycStatus,
              kycVerifiedAt: kycStatus === "VERIFIED" ? new Date() : null,
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profileImageUrl: true,
        kycStatus: true,
        kycDocumentUrl: true,
        kycSubmittedAt: true,
        kycVerifiedAt: true,
        createdAt: true,
      },
    } as unknown as Parameters<typeof prisma.user.update>[0]);

    if (role) {
      await logAdminAction({
        adminEmail: adminUser.email,
        action: role === "ADMIN" ? "promoted_user" : "demoted_user",
        entityType: "USER",
        entityId: updated.id,
        metadata: {
          email: updated.email,
        },
      });
    }

    if (kycStatus) {
      await logAdminAction({
        adminEmail: adminUser.email,
        action: `kyc_${kycStatus.toLowerCase()}`,
        entityType: "USER",
        entityId: updated.id,
        metadata: {
          email: updated.email,
        },
      });

      try {
        await sendKycStatusNotification({
          email: updated.email,
          status: kycStatus,
          reviewedByEmail: adminUser.email,
        });
      } catch (error) {
        console.error("Unable to send KYC status notification", error);
      }
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Unable to update role." }, { status: 500 });
  }
}
