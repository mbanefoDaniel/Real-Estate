import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { createSessionToken, buildAuthSetCookieHeader } from "@/lib/auth";
import { verifyOtp } from "@/lib/otp";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const rate = await enforceRateLimit(request, "auth:verify-email", {
      limit: 15,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again shortly." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and verification code are required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid verification request." },
        { status: 400 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified." },
        { status: 400 }
      );
    }

    const result = await verifyOtp(user.id, code, "email-verify");
    if (!result.valid) {
      return NextResponse.json(
        { error: result.error || "Invalid or expired code." },
        { status: 400 }
      );
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    // Issue session token
    const token = createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    return new Response(
      JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      }),
      {
        status: 200,
        headers: [
          ["Content-Type", "application/json"],
          ["Set-Cookie", buildAuthSetCookieHeader(token)],
        ],
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to verify email." },
      { status: 500 }
    );
  }
}
