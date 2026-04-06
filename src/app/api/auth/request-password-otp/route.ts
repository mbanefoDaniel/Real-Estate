import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromRequest } from "@/lib/auth";
import { sendOtp } from "@/lib/otp";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = getSessionUserFromRequest(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const rate = await enforceRateLimit(request, "auth:password-otp", {
      limit: 5,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before requesting another code." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    await sendOtp(user.id, user.email, "password-change");

    return NextResponse.json({ sent: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to send OTP." },
      { status: 500 }
    );
  }
}
