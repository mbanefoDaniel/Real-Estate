import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, buildAuthSetCookieHeader } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/establish?token=<jwt>&next=<path>
 *
 * Sets the auth cookie via a direct page navigation (not fetch).
 * This is more reliable than setting cookies from fetch() responses,
 * which some browsers/platforms silently discard.
 *
 * The token is a self-signed JWT, so it can't be forged.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const next = url.searchParams.get("next") || "/my-listings";

  // Validate the redirect destination is same-origin
  const destination = next.startsWith("/") ? next : "/my-listings";

  if (!token) {
    return NextResponse.redirect(new URL("/auth/sign-in", url.origin));
  }

  // Verify the token is a valid JWT (prevents misuse)
  const user = verifySessionToken(token);
  if (!user) {
    return NextResponse.redirect(new URL("/auth/sign-in", url.origin));
  }

  // Redirect to destination with Set-Cookie header
  const redirectUrl = new URL(destination, url.origin);
  return new Response(null, {
    status: 302,
    headers: [
      ["Location", redirectUrl.toString()],
      ["Set-Cookie", buildAuthSetCookieHeader(token)],
      ["Cache-Control", "no-store"],
    ],
  });
}
