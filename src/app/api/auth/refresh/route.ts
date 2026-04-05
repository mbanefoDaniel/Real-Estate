import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import {
  getSessionUserFromRequest,
  createSessionToken,
  buildAuthSetCookieHeader,
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

  response.headers.append("Set-Cookie", buildAuthSetCookieHeader(token));

  return response;
}
