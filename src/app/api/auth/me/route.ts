import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserComplianceStatus } from "@/lib/compliance";

export const dynamic = "force-dynamic";

function noCacheJson(data: unknown, status = 200) {
  const res = NextResponse.json(data, { status });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  return res;
}

export async function GET(request: NextRequest) {
  const sessionUser = getSessionUserFromRequest(request);

  if (!sessionUser) {
    return noCacheJson({ user: null });
  }

  try {
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
      return noCacheJson({ user: null });
    }

    const compliance = await getUserComplianceStatus(user.id);

    return noCacheJson({ user, compliance });
  } catch {
    return noCacheJson({
      user: {
        id: sessionUser.id,
        email: sessionUser.email,
        role: sessionUser.role,
        name: sessionUser.name ?? null,
        createdAt: null,
        profileImageUrl: null,
        kycStatus: null,
        kycDocumentUrl: null,
        kycSubmittedAt: null,
        kycVerifiedAt: null,
      },
    });
  }
}
