import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromRequest } from "@/lib/auth";

function parseRequiredString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOptionalInt(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return null;
}

function parseAlertFrequency(value: unknown): "INSTANT" | "DAILY" | "WEEKLY" {
  if (value === "INSTANT" || value === "DAILY" || value === "WEEKLY") {
    return value;
  }

  return "DAILY";
}

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const items = await prisma.savedSearch.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Unable to load saved searches." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();

    const location = parseRequiredString(body.location);
    const category = body.category === "LAND" || body.category === "HOUSE" || body.category === "APARTMENT" ? body.category : null;
    const listingTerm =
      body.type === "SALE" ||
      body.type === "LEASE" ||
      body.listingTerm === "SALE" ||
      body.listingTerm === "LEASE"
        ? (body.type ?? body.listingTerm)
        : null;
    const beds = parseOptionalInt(body.beds);
    const plotSize = parseOptionalInt(body.plotSize);
    const minPrice = parseOptionalInt(body.minPrice);
    const maxPrice = parseOptionalInt(body.maxPrice);
    const alertFrequency = parseAlertFrequency(body.alertFrequency);

    const label =
      parseRequiredString(body.label) ||
      [location || "All locations", category || "All categories", listingTerm || "Sale/Lease"].join(" • ");

    const created = await prisma.savedSearch.create({
      data: {
        userId: user.id,
        label,
        location,
        category,
        listingTerm,
        beds,
        plotSize,
        minPrice,
        maxPrice,
        alertEnabled: true,
        alertFrequency,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to save search." }, { status: 500 });
  }
}
