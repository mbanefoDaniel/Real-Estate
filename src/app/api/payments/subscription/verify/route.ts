import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromRequest, isAdminFromRequest } from "@/lib/auth";
import { activateSubscriptionByReference } from "@/lib/subscriptions";

type SubscriptionRecord = {
  userId: string;
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELLED" | "FAILED";
  expiresAt: Date | null;
};

type SubscriptionVerifyModel = {
  findUnique: (args: unknown) => Promise<SubscriptionRecord | null>;
  update: (args: unknown) => Promise<unknown>;
};

const subscriptionModel = (prisma as unknown as { subscription: SubscriptionVerifyModel }).subscription;

type PaystackVerifyResponse = {
  status?: boolean;
  data?: {
    status?: string;
  };
};

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const reference = typeof body.reference === "string" ? body.reference.trim() : "";
    if (!reference) {
      return NextResponse.json({ error: "reference is required." }, { status: 400 });
    }

    const subscription = await subscriptionModel.findUnique({ where: { reference } });
    if (!subscription) {
      return NextResponse.json({ error: "Subscription payment not found." }, { status: 404 });
    }

    const isAdmin = isAdminFromRequest(request);
    if (!isAdmin && subscription.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (subscription.status === "ACTIVE" && subscription.expiresAt && subscription.expiresAt > new Date()) {
      return NextResponse.json({ success: true, status: "ACTIVE", source: "local" });
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      const activated = await activateSubscriptionByReference(reference);
      return NextResponse.json({
        success: true,
        status: activated.status,
        expiresAt: activated.expiresAt,
        source: "local",
      });
    }

    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
      },
    });

    if (!verifyResponse.ok) {
      return NextResponse.json({ error: "Unable to verify subscription payment right now." }, { status: 502 });
    }

    const verifyData = (await verifyResponse.json()) as PaystackVerifyResponse;
    const providerStatus = String(verifyData.data?.status || "").toLowerCase();

    if (providerStatus === "success") {
      const activated = await activateSubscriptionByReference(reference);
      return NextResponse.json({
        success: true,
        status: activated.status,
        expiresAt: activated.expiresAt,
        source: "provider",
      });
    }

    await subscriptionModel.update({
      where: { reference },
      data: {
        status: providerStatus === "failed" ? "FAILED" : "CANCELLED",
      },
    });

    return NextResponse.json({
      success: true,
      status: providerStatus === "failed" ? "FAILED" : "CANCELLED",
      source: "provider",
    });
  } catch {
    return NextResponse.json({ error: "Unable to verify subscription payment." }, { status: 500 });
  }
}
