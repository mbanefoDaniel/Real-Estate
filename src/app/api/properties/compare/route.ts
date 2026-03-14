import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseIds(value: string | null) {
  if (!value) {
    return [] as string[];
  }

  return value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .slice(0, 8);
}

export async function GET(request: NextRequest) {
  try {
    const ids = parseIds(request.nextUrl.searchParams.get("ids"));
    if (ids.length === 0) {
      return NextResponse.json([]);
    }

    const properties = await prisma.property.findMany({
      where: {
        id: { in: ids },
        isArchived: false,
        status: "APPROVED",
      },
      select: {
        id: true,
        title: true,
        city: true,
        address: true,
        kind: true,
        listingTerm: true,
        price: true,
        bedrooms: true,
        bathrooms: true,
        areaSqft: true,
        imageUrl: true,
        featured: true,
      },
    });

    const byId = new Map(properties.map((property) => [property.id, property]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
    return NextResponse.json(ordered);
  } catch {
    return NextResponse.json({ error: "Unable to load compared properties." }, { status: 500 });
  }
}
