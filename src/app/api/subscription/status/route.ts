import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ active: false, subscription: null }, { status: 200 });
    }

    const active = await hasActiveSubscription(user.id);

    return NextResponse.json(
      {
        active: Boolean(active),
        subscription: active
          ? {
              status: active.status,
              expiresAt: active.expiresAt,
            }
          : null,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ active: false, subscription: null }, { status: 200 });
  }
}
