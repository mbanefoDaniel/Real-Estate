import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, getAuthCookieName, getSessionTtlSeconds } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { verifyCaptchaToken } from "@/lib/captcha";

function parseRequiredString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: NextRequest) {
  try {
    const rate = await enforceRateLimit(request, "auth:signup", {
      limit: 10,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      const response = NextResponse.json(
        { error: "Too many signup attempts. Please try again shortly." },
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

    const name = parseRequiredString(body.name);
    const email = parseRequiredString(body.email)?.toLowerCase();
    const password = parseRequiredString(body.password);

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "USER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    const token = createSessionToken(user);
    const response = NextResponse.json(user, { status: 201 });

    response.cookies.set(getAuthCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getSessionTtlSeconds(),
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Unable to create account." },
      { status: 500 }
    );
  }
}
