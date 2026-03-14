import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserComplianceStatus } from "@/lib/compliance";

export async function GET(request: NextRequest) {
  try {
    const sessionUser = getSessionUserFromRequest(request);

    if (!sessionUser) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        profileImageUrl: true,
        kycStatus: true,
        kycDocumentUrl: true,
        kycSubmittedAt: true,
        kycVerifiedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const compliance = await getUserComplianceStatus(user.id);

    return NextResponse.json({ user, compliance }, { status: 200 });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
