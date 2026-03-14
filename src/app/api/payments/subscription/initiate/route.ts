import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromRequest } from "@/lib/auth";

type SubscriptionCreateModel = {
  create: (args: unknown) => Promise<unknown>;
};

const subscriptionModel = (prisma as unknown as { subscription: SubscriptionCreateModel }).subscription;

type PaystackInitResponse = {
  status: boolean;
  data?: {
    authorization_url?: string;
  };
};

function getMonthlyAmountNgn() {
  const value = Number(process.env.MONTHLY_SUBSCRIPTION_PRICE_NGN || 15000);
  if (!Number.isFinite(value) || value <= 0) {
    return 15000;
  }

  return Math.round(value);
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const amountNgn = getMonthlyAmountNgn();
    const amountKobo = amountNgn * 100;
    const reference = `sub_monthly_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const baseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${baseUrl}/pricing?subscription=success&ref=${encodeURIComponent(reference)}`;

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecret) {
      // Local/dev fallback when provider is not configured.
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await subscriptionModel.create({
        data: {
          userId: user.id,
          plan: "MONTHLY",
          provider: "PAYSTACK",
          status: "ACTIVE",
          reference,
          amount: amountKobo,
          startsAt: now,
          expiresAt,
          paidAt: now,
          paymentUrl: callbackUrl,
        },
      });

      return NextResponse.json({
        success: true,
        reference,
        checkoutUrl: callbackUrl,
        amountKobo,
        provider: "LOCAL",
      });
    }

    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountKobo,
        reference,
        callback_url: callbackUrl,
        metadata: {
          paymentType: "monthly_subscription",
          plan: "MONTHLY",
          userId: user.id,
        },
      }),
    });

    if (!paystackResponse.ok) {
      return NextResponse.json({ error: "Unable to start subscription checkout." }, { status: 502 });
    }

    const paystackData = (await paystackResponse.json()) as PaystackInitResponse;
    const paymentUrl = paystackData.data?.authorization_url || callbackUrl;

    await subscriptionModel.create({
      data: {
        userId: user.id,
        plan: "MONTHLY",
        provider: "PAYSTACK",
        status: "PENDING",
        reference,
        amount: amountKobo,
        paymentUrl,
      },
    });

    return NextResponse.json({
      success: true,
      reference,
      checkoutUrl: paymentUrl,
      amountKobo,
      provider: "PAYSTACK",
    });
  } catch {
    return NextResponse.json({ error: "Unable to initiate subscription payment." }, { status: 500 });
  }
}
