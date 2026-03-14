import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromRequest, isAdminFromRequest } from "@/lib/auth";
import { applyFeaturedPaymentStatus } from "@/lib/featured-payments";

type PaystackVerifyResponse = {
  status?: boolean;
  data?: {
    status?: string;
  };
};

function mapPaystackStatus(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "success") {
    return "PAID" as const;
  }

  if (normalized === "failed") {
    return "FAILED" as const;
  }

  if (normalized === "abandoned" || normalized === "cancelled") {
    return "CANCELLED" as const;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = getSessionUserFromRequest(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const reference = typeof body.reference === "string" ? body.reference.trim() : "";
    if (!reference) {
      return NextResponse.json({ error: "reference is required." }, { status: 400 });
    }

    const payment = await prisma.featuredPayment.findUnique({ where: { reference } });
    if (!payment) {
      return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    }

    const isAdmin = isAdminFromRequest(request);
    if (!isAdmin && payment.ownerEmail.toLowerCase() !== sessionUser.email.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return NextResponse.json({
        success: true,
        reference,
        status: payment.status,
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
      return NextResponse.json(
        { error: "Unable to verify payment with provider right now." },
        { status: 502 }
      );
    }

    const verifyData = (await verifyResponse.json()) as PaystackVerifyResponse;
    const providerStatus = String(verifyData.data?.status || "");
    const mappedStatus = mapPaystackStatus(providerStatus);

    if (mappedStatus) {
      await applyFeaturedPaymentStatus(reference, mappedStatus);
    }

    const refreshed = await prisma.featuredPayment.findUnique({ where: { reference } });

    return NextResponse.json({
      success: true,
      reference,
      providerStatus,
      status: refreshed?.status ?? payment.status,
      source: "provider",
    });
  } catch {
    return NextResponse.json({ error: "Unable to verify payment." }, { status: 500 });
  }
}
