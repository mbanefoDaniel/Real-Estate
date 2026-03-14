import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminFromRequest } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { logError } from "@/lib/logger";

function buildWhereFromSearch(search: {
  location: string | null;
  category: "LAND" | "HOUSE" | "APARTMENT" | null;
  listingTerm: "SALE" | "LEASE" | null;
  beds: number | null;
  plotSize: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  lastAlertSentAt: Date | null;
}) {
  const where: Record<string, unknown> = {
    status: "APPROVED",
    isArchived: false,
  };

  if (search.location) {
    where.city = { contains: search.location, mode: "insensitive" };
  }

  if (search.category) {
    where.kind = search.category;
  }

  if (search.listingTerm) {
    where.listingTerm = search.listingTerm;
  }

  if (search.beds !== null) {
    where.bedrooms = { gte: search.beds };
  }

  if (search.plotSize !== null) {
    where.areaSqft = { gte: search.plotSize };
  }

  if (search.minPrice !== null || search.maxPrice !== null) {
    const price: Record<string, number> = {};
    if (search.minPrice !== null) {
      price.gte = search.minPrice;
    }
    if (search.maxPrice !== null) {
      price.lte = search.maxPrice;
    }
    where.price = price;
  }

  if (search.lastAlertSentAt) {
    where.createdAt = { gt: search.lastAlertSentAt };
  }

  return where;
}

function isAlertDue(
  frequency: "INSTANT" | "DAILY" | "WEEKLY",
  lastAlertSentAt: Date | null
) {
  if (!lastAlertSentAt) {
    return true;
  }

  if (frequency === "INSTANT") {
    return true;
  }

  const diffMs = Date.now() - lastAlertSentAt.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (frequency === "DAILY") {
    return diffMs >= dayMs;
  }

  return diffMs >= dayMs * 7;
}

function isAuthorizedCronRequest(request: NextRequest) {
  const secret = process.env.CRON_ALERTS_SECRET;
  if (!secret) {
    return false;
  }

  const bearer = request.headers.get("authorization");
  if (bearer && bearer.startsWith("Bearer ")) {
    return bearer.slice("Bearer ".length).trim() === secret;
  }

  const headerSecret = request.headers.get("x-cron-secret");
  return headerSecret === secret;
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = isAdminFromRequest(request);
    const isCron = isAuthorizedCronRequest(request);

    if (!isAdmin && !isCron) {
      return NextResponse.json(
        { error: "Unauthorized. Admin session or cron token required." },
        { status: 403 }
      );
    }

    const searches = await prisma.savedSearch.findMany({
      where: { alertEnabled: true },
      include: { user: { select: { email: true } } },
      orderBy: { updatedAt: "asc" },
      take: 100,
    });

    let sentCount = 0;

    for (const search of searches) {
      if (!isAlertDue(search.alertFrequency, search.lastAlertSentAt)) {
        continue;
      }

      const where = buildWhereFromSearch(search);
      const matches = await prisma.property.findMany({
        where: where as never,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          title: true,
          city: true,
          price: true,
          listingTerm: true,
        },
      });

      if (matches.length === 0) {
        continue;
      }

      const lines = matches.map((item) =>
        `- ${item.title} (${item.city}) • ${item.listingTerm} • NGN ${item.price.toLocaleString("en-NG")}`
      );

      await sendEmail({
        to: search.user.email,
        subject: `New listings for saved search: ${search.label}`,
        text: [
          `We found ${matches.length} new listing(s) for your saved search \"${search.label}\".`,
          "",
          ...lines,
          "",
          "Sign in to NaijaProperty Hub to view all matching properties.",
        ].join("\n"),
      });

      sentCount += 1;

      await prisma.savedSearch.update({
        where: { id: search.id },
        data: { lastAlertSentAt: new Date() },
      });
    }

    return NextResponse.json({ success: true, searchesProcessed: searches.length, alertsSent: sentCount });
  } catch (error) {
    logError("Saved search alert run failed", {
      scope: "saved-search-alerts",
      error,
    });

    return NextResponse.json({ error: "Unable to run saved search alerts." }, { status: 500 });
  }
}
