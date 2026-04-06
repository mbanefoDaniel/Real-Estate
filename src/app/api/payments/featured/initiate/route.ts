import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromRequest } from "@/lib/auth";
import { getUserComplianceStatus } from "@/lib/compliance";

type PaystackInitResponse = {
  status: boolean;
  data?: {
    authorization_url?: string;
  };
};

type PlanType = "STANDARD" | "PLUS" | "PREMIUM";

function parsePlan(value: unknown): PlanType {
  if (value === "PLUS" || value === "PREMIUM") {
    return value;
  }

  return "STANDARD";
}

function getPlanAmountNgn(plan: PlanType) {
  if (plan === "PLUS") {
    return Number(process.env.FEATURED_LISTING_PLUS_PRICE_NGN || 12000);
  }

  if (plan === "PREMIUM") {
    return Number(process.env.FEATURED_LISTING_PREMIUM_PRICE_NGN || 25000);
  }

  return Number(process.env.FEATURED_LISTING_PRICE_NGN || 5000);
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const compliance = await getUserComplianceStatus(user.id);
    if (compliance.blocked) {
      return NextResponse.json(
        { error: compliance.reason || "Compliance requirements must be completed." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const propertyId = typeof body.propertyId === "string" ? body.propertyId.trim() : "";
    const plan = parsePlan(body.plan);

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required." }, { status: 400 });
    }

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    if (property.ownerEmail.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: "Only listing owner can initiate payment." }, { status: 403 });
    }

    const amountNgn = getPlanAmountNgn(plan);
    const amountKobo = Number.isFinite(amountNgn) && amountNgn > 0 ? Math.round(amountNgn * 100) : 500000;
    const reference = `feat_${plan.toLowerCase()}_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const baseUrl =
      process.env.APP_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      "http://localhost:3001";

    let paymentUrl: string | null = null;

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (paystackSecret) {
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
          callback_url: `${baseUrl}/my-listings?featuredPayment=success&ref=${reference}`,
          metadata: {
            propertyId,
            featureType: "listing_boost",
            plan,
          },
        }),
      });

      if (paystackResponse.ok) {
        const paystackData = (await paystackResponse.json()) as PaystackInitResponse;
        paymentUrl = paystackData.data?.authorization_url || null;
      }
    }

    if (!paymentUrl) {
      paymentUrl = `${baseUrl}/my-listings?featuredPayment=pending&ref=${reference}`;
    }

    await prisma.featuredPayment.create({
      data: {
        propertyId,
        ownerEmail: user.email.toLowerCase(),
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
      amountKobo,
      plan,
      checkoutUrl: paymentUrl,
      provider: "PAYSTACK",
    });
  } catch {
    return NextResponse.json({ error: "Unable to initiate featured payment." }, { status: 500 });
  }
}
