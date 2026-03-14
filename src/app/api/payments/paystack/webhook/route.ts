import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { applyFeaturedPaymentStatus } from "@/lib/featured-payments";
import { logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { activateSubscriptionByReference } from "@/lib/subscriptions";

type SubscriptionWebhookModel = {
  update: (args: unknown) => Promise<unknown>;
};

const subscriptionModel = (prisma as unknown as { subscription: SubscriptionWebhookModel }).subscription;

type PaystackWebhookBody = {
  event?: string;
  data?: {
    reference?: string;
    status?: string;
  };
};

function isValidPaystackSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) {
    return false;
  }

  const computed = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return computed === signature;
}

export async function POST(request: NextRequest) {
  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return NextResponse.json({ error: "Paystack secret is not configured." }, { status: 500 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    if (!isValidPaystackSignature(rawBody, signature, paystackSecret)) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as PaystackWebhookBody;
    const reference = payload.data?.reference;
    const providerStatus = String(payload.data?.status || "").toLowerCase();

    if (!reference) {
      return NextResponse.json({ success: true });
    }

    if (reference.startsWith("sub_")) {
      if (payload.event === "charge.success" || providerStatus === "success") {
        await activateSubscriptionByReference(reference);
      } else if (providerStatus === "failed") {
        await subscriptionModel.update({
          where: { reference },
          data: { status: "FAILED" },
        });
      } else if (providerStatus === "abandoned" || providerStatus === "cancelled") {
        await subscriptionModel.update({
          where: { reference },
          data: { status: "CANCELLED" },
        });
      }

      return NextResponse.json({ success: true });
    }

    if (payload.event === "charge.success" || providerStatus === "success") {
      await applyFeaturedPaymentStatus(reference, "PAID");
    } else if (providerStatus === "failed") {
      await applyFeaturedPaymentStatus(reference, "FAILED");
    } else if (providerStatus === "abandoned" || providerStatus === "cancelled") {
      await applyFeaturedPaymentStatus(reference, "CANCELLED");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("Paystack webhook processing failed", {
      scope: "paystack-webhook",
      error,
    });

    return NextResponse.json({ error: "Unable to process webhook." }, { status: 500 });
  }
}
