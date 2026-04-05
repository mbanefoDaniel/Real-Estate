import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest, getAuthCookieName } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const envCheck = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    AUTH_JWT_SECRET: Boolean(process.env.AUTH_JWT_SECRET),
    AUTH_JWT_SECRET_LENGTH: process.env.AUTH_JWT_SECRET?.length ?? 0,
    CLOUDINARY_CLOUD_NAME: Boolean(process.env.CLOUDINARY_CLOUD_NAME),
    CLOUDINARY_API_KEY: Boolean(process.env.CLOUDINARY_API_KEY),
    CLOUDINARY_API_SECRET: Boolean(process.env.CLOUDINARY_API_SECRET),
    PAYSTACK_SECRET_KEY: Boolean(process.env.PAYSTACK_SECRET_KEY),
    TURNSTILE_SECRET_KEY: Boolean(process.env.TURNSTILE_SECRET_KEY),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
    NODE_ENV: process.env.NODE_ENV,
  };

  const cookieName = getAuthCookieName();
  const cookieValue = request.cookies.get(cookieName)?.value;
  const hasCookie = Boolean(cookieValue);
  const allCookieNames = Array.from(request.cookies.getAll()).map(c => c.name);

  let sessionUser = null;
  let authError = null;
  let tokenPreview = null;
  try {
    if (cookieValue) {
      tokenPreview = cookieValue.substring(0, 20) + "...";
    }
    sessionUser = getSessionUserFromRequest(request);
  } catch (e) {
    authError = e instanceof Error ? e.message : String(e);
  }

  let jwtTest = null;
  try {
    const jwt = await import("jsonwebtoken");
    const testToken = jwt.default.sign({ test: true }, process.env.AUTH_JWT_SECRET!, { expiresIn: 60 });
    const decoded = jwt.default.verify(testToken, process.env.AUTH_JWT_SECRET!);
    jwtTest = { signWorks: true, verifyWorks: Boolean(decoded) };
  } catch (e) {
    jwtTest = { error: e instanceof Error ? e.message : String(e) };
  }

  let dbStatus = "unknown";
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (e) {
    dbStatus = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Set a test cookie to verify Set-Cookie headers work on Vercel
  const response = NextResponse.json({
    env: envCheck,
    auth: {
      cookieName,
      hasCookie,
      tokenPreview,
      allCookieNames,
      sessionUser: sessionUser ? { id: sessionUser.id, email: sessionUser.email, role: sessionUser.role } : null,
      authError,
    },
    jwt: jwtTest,
    db: dbStatus,
    testCookie: "A test cookie 'debug_test' was set. Refresh this page — if allCookieNames still shows empty, cookies are blocked by your browser for this domain.",
    timestamp: new Date().toISOString(),
  });

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.cookies.set("debug_test", "hello", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 3600,
  });

  return response;
}
