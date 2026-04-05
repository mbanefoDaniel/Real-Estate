import { NextRequest, NextResponse } from "next/server";
import {
  getSessionUserFromRequest,
  createSessionToken,
  getAuthCookieName,
  getSessionTtlSeconds,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ refreshed: false }, { status: 401 });
  }

  const token = createSessionToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  const response = NextResponse.json({ refreshed: true });

  response.cookies.set(getAuthCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // No maxAge — session cookie is cleared when browser closes
  });

  return response;
}
