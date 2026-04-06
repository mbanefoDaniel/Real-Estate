import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/notifications";
import { enforceRateLimit } from "@/lib/rate-limit";
import { verifyCaptchaToken } from "@/lib/captcha";

function parseRequiredString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const rate = await enforceRateLimit(request, "auth:forgot-password", {
      limit: 6,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      const response = NextResponse.json(
        { error: "Too many reset requests. Please try again shortly." },
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

    if (!email) {
      return NextResponse.json({ error: "email is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const baseUrl =
      process.env.APP_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      "http://localhost:3001";
    const resetUrl = `${baseUrl}/auth/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail({
        email: user.email,
        resetUrl,
      });
    } catch (error) {
      console.error("Unable to send password reset email", error);
    }

    const payload: Record<string, unknown> = { success: true };

    // Dev convenience until email delivery is integrated.
    if (process.env.NODE_ENV !== "production") {
      payload.resetToken = rawToken;
      payload.resetUrl = resetUrl;
    }

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { error: "Unable to process reset request." },
      { status: 500 }
    );
  }
}
