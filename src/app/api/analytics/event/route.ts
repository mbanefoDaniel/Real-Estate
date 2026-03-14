import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = typeof body?.event === "string" ? body.event : "unknown_event";
    const metadata = body?.metadata && typeof body.metadata === "object" ? body.metadata : {};

    console.info("[analytics:event]", {
      event,
      metadata,
      timestamp: new Date().toISOString(),
      path: request.nextUrl.pathname,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
