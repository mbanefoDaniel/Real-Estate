import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { buildAuthClearCookieHeader } from "@/lib/auth";

function clearAuthCookie(response: NextResponse) {
  response.headers.append("Set-Cookie", buildAuthClearCookieHeader());
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
