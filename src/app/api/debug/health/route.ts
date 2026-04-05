import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const envCheck = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    AUTH_JWT_SECRET: Boolean(process.env.AUTH_JWT_SECRET),
    CLOUDINARY_CLOUD_NAME: Boolean(process.env.CLOUDINARY_CLOUD_NAME),
    CLOUDINARY_API_KEY: Boolean(process.env.CLOUDINARY_API_KEY),
    CLOUDINARY_API_SECRET: Boolean(process.env.CLOUDINARY_API_SECRET),
    PAYSTACK_SECRET_KEY: Boolean(process.env.PAYSTACK_SECRET_KEY),
    TURNSTILE_SECRET_KEY: Boolean(process.env.TURNSTILE_SECRET_KEY),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
    NODE_ENV: process.env.NODE_ENV,
  };

  const cookieName = "nph_auth";
  const hasCookie = Boolean(request.cookies.get(cookieName)?.value);

  let sessionUser = null;
  let authError = null;
  try {
    sessionUser = getSessionUserFromRequest(request);
  } catch (e) {
    authError = e instanceof Error ? e.message : String(e);
  }

  let dbStatus = "unknown";
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (e) {
    dbStatus = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json({
    env: envCheck,
    auth: {
      hasCookie,
      sessionUser: sessionUser ? { id: sessionUser.id, email: sessionUser.email, role: sessionUser.role } : null,
      authError,
    },
    db: dbStatus,
    timestamp: new Date().toISOString(),
  });
}
