import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getAuthCookieName } from "@/lib/auth";

function clearAuthCookie(response: NextResponse) {
  response.cookies.set(getAuthCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function POST() {
  const response = NextResponse.json({ success: true });

  return clearAuthCookie(response);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/auth/sign-in";
  const redirectUrl = new URL(next, url.origin);
  const response = NextResponse.redirect(redirectUrl);

  return clearAuthCookie(response);
}
