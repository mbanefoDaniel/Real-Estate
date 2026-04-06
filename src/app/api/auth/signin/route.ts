import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, getAuthCookieName, getSessionTtlSeconds, buildAuthSetCookieHeader } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { verifyCaptchaToken } from "@/lib/captcha";
import { sendOtp } from "@/lib/otp";

function parseRequiredString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: NextRequest) {
  try {
    const rate = await enforceRateLimit(request, "auth:signin", {
      limit: 20,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      const response = NextResponse.json(
        { error: "Too many sign-in attempts. Please try again shortly." },
        { status: 429 }
      );
      response.headers.set("Retry-After", String(Math.ceil(rate.retryAfterMs / 1000)));
      return response;
    }

    const body = await request.json();

    const captcha = await verifyCaptchaToken(request, typeof body.captchaToken === "string" ? body.captchaToken : null);
    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error }, { status: 400 });
    }

    const email = parseRequiredString(body.email)?.toLowerCase();
    const password = parseRequiredString(body.password);

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // If email is not verified, resend OTP and ask user to verify
    if (!user.emailVerified) {
      await sendOtp(user.id, user.email, "email-verify");
      return NextResponse.json(
        { requiresVerification: true, email: user.email },
        { status: 200 }
      );
    }

    const token = createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    const responseBody = JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });

    const setCookieHeader = buildAuthSetCookieHeader(token);

    return new Response(responseBody, {
      status: 200,
      headers: [
        ["Content-Type", "application/json"],
        ["Set-Cookie", setCookieHeader],
      ],
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to sign in." },
      { status: 500 }
    );
  }
}
