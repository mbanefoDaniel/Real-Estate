import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromRequest } from "@/lib/auth";

function parseOptionalString(value: unknown) {
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const existing = await prisma.savedSearch.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Saved search not found." }, { status: 404 });
    }

    const updated = await prisma.savedSearch.update({
      where: { id },
      data: {
        alertEnabled: typeof body.alertEnabled === "boolean" ? body.alertEnabled : existing.alertEnabled,
        alertFrequency: parseAlertFrequency(body.alertFrequency ?? existing.alertFrequency),
        label: parseOptionalString(body.label) ?? existing.label,
        location:
          body.location === undefined
            ? existing.location
            : body.location === null
              ? null
              : parseOptionalString(body.location),
        category:
          body.category === "LAND" || body.category === "HOUSE" || body.category === "APARTMENT"
            ? body.category
            : body.category === null
              ? null
              : existing.category,
        listingTerm:
          body.listingTerm === "SALE" || body.listingTerm === "LEASE"
            ? body.listingTerm
            : body.listingTerm === null
              ? null
              : existing.listingTerm,
        beds: body.beds === undefined ? existing.beds : body.beds === null ? null : parseOptionalInt(body.beds),
        plotSize:
          body.plotSize === undefined
            ? existing.plotSize
            : body.plotSize === null
              ? null
              : parseOptionalInt(body.plotSize),
        minPrice:
          body.minPrice === undefined
            ? existing.minPrice
            : body.minPrice === null
              ? null
              : parseOptionalInt(body.minPrice),
        maxPrice:
          body.maxPrice === undefined
            ? existing.maxPrice
            : body.maxPrice === null
              ? null
              : parseOptionalInt(body.maxPrice),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Unable to update saved search." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await prisma.savedSearch.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Saved search not found." }, { status: 404 });
    }

    await prisma.savedSearch.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete saved search." }, { status: 500 });
  }
}
