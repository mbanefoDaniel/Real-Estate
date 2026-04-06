import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { sendOtp } from "@/lib/otp";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const rate = await enforceRateLimit(request, "auth:resend-otp", {
      limit: 5,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before requesting another code." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const purpose = body.purpose === "password-change" ? "password-change" as const : "email-verify" as const;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success to avoid email enumeration
      return NextResponse.json({ sent: true });
    }

    if (purpose === "email-verify" && user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified." },
        { status: 400 }
      );
    }

    await sendOtp(user.id, email, purpose);

    return NextResponse.json({ sent: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to send verification code." },
      { status: 500 }
    );
  }
}
